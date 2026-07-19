"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  AWAY_GRACE_MS,
  CHECKPOINT_INTERVAL_MS,
  INACTIVITY_GRACE_MS,
  accountReviewTimerAt,
  canTakeReviewOwnership,
  initialReviewTimerState,
  transitionReviewTimer,
  type ReviewOwnershipLock,
  type ReviewTimerAction,
  type ReviewTimerState,
} from "@/lib/awb/activeReviewTimer";
import type { ReviewCheckpoint } from "@/lib/awb/timingMetrics";

type StoredTimer = {
  sessionId: string;
  accumulatedActiveMs: number;
  checkpointSequence: number;
  lastCheckpointedActiveMs: number;
};

const LOCK_HEARTBEAT_MS = 10_000;
const SCROLL_THROTTLE_MS = 3_000;

export type ActiveReviewDebugSnapshot = {
  activeMs: number;
  acceptedMs: number;
  localUnpersistedMs: number;
  mode: ReviewTimerState["currentMode"] | "waiting" | "another_tab";
  sessionId: string | null;
  checkpointSequence: number;
  ownsTab: boolean;
  trackingEnabled: boolean | null;
};

function storageKey(documentId: string) {
  return `semlox:awb-review-timer:${documentId}`;
}

function lockKey(documentId: string) {
  return `semlox:awb-review-owner:${documentId}`;
}

function restoredTimer(documentId: string): StoredTimer {
  try {
    const value = JSON.parse(sessionStorage.getItem(storageKey(documentId)) || "null");
    if (
      value &&
      typeof value.sessionId === "string" &&
      Number.isFinite(value.accumulatedActiveMs) &&
      Number.isInteger(value.checkpointSequence)
    ) {
      return {
        sessionId: value.sessionId,
        accumulatedActiveMs: Math.max(0, value.accumulatedActiveMs),
        checkpointSequence: Math.max(0, value.checkpointSequence),
        lastCheckpointedActiveMs: Math.max(0, value.lastCheckpointedActiveMs || 0),
      };
    }
  } catch {}
  return {
    sessionId: crypto.randomUUID(),
    accumulatedActiveMs: 0,
    checkpointSequence: 0,
    lastCheckpointedActiveMs: 0,
  };
}

function readLock(documentId: string): ReviewOwnershipLock | null {
  try {
    const value = JSON.parse(localStorage.getItem(lockKey(documentId)) || "null");
    if (
      value &&
      typeof value.tabId === "string" &&
      typeof value.lastHeartbeatAt === "number"
    ) {
      return value;
    }
  } catch {}
  return null;
}

export function useActiveReviewTimer(
  documentId: string,
  isReviewWorkspaceReady: boolean
) {
  const timer = useRef<StoredTimer | null>(null);
  const machine = useRef<ReviewTimerState>(initialReviewTimerState());
  const tabId = useRef(crypto.randomUUID());
  const ownsLock = useRef(false);
  const deadlineTimer = useRef<number | null>(null);
  const lastScrollSignalAt = useRef(Number.NEGATIVE_INFINITY);
  const checkpointSender = useRef<
    ((reason: ReviewCheckpoint["reason"]) => Promise<boolean>) | null
  >(null);
  const trackingEnabled = useRef<boolean | null>(null);
  const getDebugSnapshot = useCallback((): ActiveReviewDebugSnapshot => {
    const stored = timer.current;
    const preview = accountReviewTimerAt(machine.current, performance.now());
    const activeMs = Math.round(preview.accumulatedActiveMs);
    const acceptedMs = stored?.lastCheckpointedActiveMs ?? 0;
    return {
      activeMs,
      acceptedMs,
      localUnpersistedMs: Math.max(0, activeMs - acceptedMs),
      mode: !ownsLock.current
        ? "another_tab"
        : preview.lastMeaningfulActivityAt === null
          ? "waiting"
          : preview.currentMode,
      sessionId: stored?.sessionId ?? null,
      checkpointSequence: stored?.checkpointSequence ?? 0,
      ownsTab: ownsLock.current,
      trackingEnabled: trackingEnabled.current,
    };
  }, []);

  const persistLocal = useCallback(() => {
    if (!timer.current) return;
    timer.current.accumulatedActiveMs = machine.current.accumulatedActiveMs;
    sessionStorage.setItem(storageKey(documentId), JSON.stringify(timer.current));
  }, [documentId]);

  const applyAction = useCallback((action: ReviewTimerAction) => {
    machine.current = transitionReviewTimer(machine.current, action);
    persistLocal();
  }, [persistLocal]);

  const clearDeadline = useCallback(() => {
    if (deadlineTimer.current !== null) {
      window.clearTimeout(deadlineTimer.current);
      deadlineTimer.current = null;
    }
  }, []);

  const scheduleDeadline = useCallback(() => {
    clearDeadline();
    const state = machine.current;
    const now = performance.now();
    if (state.currentMode === "active" && state.lastMeaningfulActivityAt !== null) {
      const delay = Math.max(
        0,
        state.lastMeaningfulActivityAt + INACTIVITY_GRACE_MS - now
      );
      deadlineTimer.current = window.setTimeout(() => {
        applyAction({ type: "INACTIVITY_EXPIRED", now: performance.now() });
        void checkpointSender.current?.("inactive_timeout");
      }, delay);
    } else if (
      state.currentMode === "away" &&
      state.awayGraceEligible &&
      state.awayStartedAt !== null &&
      state.awayGraceAccountedMs < AWAY_GRACE_MS
    ) {
      const delay = Math.max(0, state.awayStartedAt + AWAY_GRACE_MS - now);
      deadlineTimer.current = window.setTimeout(() => {
        applyAction({ type: "AWAY_GRACE_EXPIRED", now: performance.now() });
        void checkpointSender.current?.("away_timeout");
      }, delay);
    }
  }, [applyAction, clearDeadline]);

  const writeOwnership = useCallback(() => {
    localStorage.setItem(
      lockKey(documentId),
      JSON.stringify({ tabId: tabId.current, lastHeartbeatAt: Date.now() })
    );
  }, [documentId]);

  const tryAcquireOwnership = useCallback(() => {
    const now = Date.now();
    const current = readLock(documentId);
    if (!canTakeReviewOwnership(current, tabId.current, now)) {
      ownsLock.current = false;
      return false;
    }
    writeOwnership();
    ownsLock.current = readLock(documentId)?.tabId === tabId.current;
    return ownsLock.current;
  }, [documentId, writeOwnership]);

  const releaseOwnership = useCallback(() => {
    const current = readLock(documentId);
    if (current?.tabId === tabId.current) {
      localStorage.removeItem(lockKey(documentId));
    }
    ownsLock.current = false;
  }, [documentId]);

  const enterAway = useCallback(() => {
    if (!isReviewWorkspaceReady || !ownsLock.current) return;
    applyAction({ type: "ENTER_AWAY", now: performance.now() });
    scheduleDeadline();
  }, [applyAction, isReviewWorkspaceReady, scheduleDeadline]);

  const returnVisible = useCallback(() => {
    if (
      !isReviewWorkspaceReady ||
      document.visibilityState !== "visible" ||
      !document.hasFocus()
    ) {
      return;
    }
    if (readLock(documentId)?.tabId !== tabId.current) {
      ownsLock.current = false;
    }
    if (!ownsLock.current) tryAcquireOwnership();
    if (!ownsLock.current) return;
    applyAction({ type: "RETURN_VISIBLE", now: performance.now() });
    scheduleDeadline();
  }, [
    applyAction,
    documentId,
    isReviewWorkspaceReady,
    scheduleDeadline,
    tryAcquireOwnership,
  ]);

  const markActivity = useCallback(() => {
    if (
      !isReviewWorkspaceReady ||
      document.visibilityState !== "visible" ||
      !document.hasFocus()
    ) {
      return;
    }
    if (!ownsLock.current && !tryAcquireOwnership()) return;
    applyAction({ type: "MEANINGFUL_ACTIVITY", now: performance.now() });
    scheduleDeadline();
  }, [applyAction, isReviewWorkspaceReady, scheduleDeadline, tryAcquireOwnership]);

  const markEditableFocus = useCallback((event: React.FocusEvent<HTMLDivElement>) => {
    const target = event.target;
    if (
      target instanceof HTMLElement &&
      target.matches("input, textarea, select, button, [contenteditable='true']")
    ) {
      markActivity();
    }
  }, [markActivity]);

  const markScrollActivity = useCallback(() => {
    const now = performance.now();
    if (now - lastScrollSignalAt.current < SCROLL_THROTTLE_MS) return;
    lastScrollSignalAt.current = now;
    markActivity();
  }, [markActivity]);

  const prepareCheckpoint = useCallback((reason: ReviewCheckpoint["reason"]) => {
    if (!timer.current || !ownsLock.current) return null;
    machine.current = accountReviewTimerAt(machine.current, performance.now());
    timer.current.accumulatedActiveMs = machine.current.accumulatedActiveMs;
    timer.current.checkpointSequence += 1;
    const checkpoint: ReviewCheckpoint = {
      sessionId: timer.current.sessionId,
      checkpointSequence: timer.current.checkpointSequence,
      activeMs: Math.round(timer.current.accumulatedActiveMs),
      reason,
    };
    persistLocal();
    return checkpoint;
  }, [persistLocal]);

  const sendCheckpoint = useCallback(async (reason: ReviewCheckpoint["reason"]) => {
    const checkpoint = prepareCheckpoint(reason);
    if (!checkpoint) return false;
    const response = await fetch(`/api/awb/documents/${documentId}/review-time`, {
      method: "POST",
      credentials: "include",
      keepalive:
        reason === "hidden" ||
        reason === "pagehide" ||
        reason === "route_change",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(checkpoint),
    }).catch(() => null);
    if (!response?.ok) return false;
    const payload = await response.json().catch(() => null);
    if (payload && typeof payload === "object") {
      if (
        timer.current &&
        typeof payload.activeMs === "number" &&
        Number.isFinite(payload.activeMs)
      ) {
        timer.current.lastCheckpointedActiveMs = checkpoint.activeMs;
        persistLocal();
      }
      if (typeof payload.trackingEnabled === "boolean") {
        trackingEnabled.current = payload.trackingEnabled;
      }
    }
    return true;
  }, [documentId, persistLocal, prepareCheckpoint]);

  useEffect(() => {
    checkpointSender.current = sendCheckpoint;
  }, [sendCheckpoint]);

  const startNewSession = useCallback(() => {
    timer.current = {
      sessionId: crypto.randomUUID(),
      accumulatedActiveMs: 0,
      checkpointSequence: 0,
      lastCheckpointedActiveMs: 0,
    };
    machine.current = initialReviewTimerState();
    persistLocal();
    clearDeadline();
  }, [clearDeadline, persistLocal]);

  const complete = useCallback(() => {
    applyAction({ type: "COMPLETE", now: performance.now() });
    clearDeadline();
    sessionStorage.removeItem(storageKey(documentId));
    timer.current = null;
    releaseOwnership();
  }, [applyAction, clearDeadline, documentId, releaseOwnership]);

  useEffect(() => {
    if (!isReviewWorkspaceReady) return;
    timer.current = restoredTimer(documentId);
    machine.current = initialReviewTimerState(timer.current.accumulatedActiveMs);
    if (document.visibilityState === "visible" && document.hasFocus()) {
      tryAcquireOwnership();
    }

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        enterAway();
        void sendCheckpoint("hidden");
      } else {
        returnVisible();
      }
    };
    const onBlur = () => enterAway();
    const onFocus = () => returnVisible();
    const onPageShow = () => returnVisible();
    const onPageHide = () => {
      enterAway();
      const checkpoint = prepareCheckpoint("pagehide");
      if (checkpoint) {
        navigator.sendBeacon(
          `/api/awb/documents/${documentId}/review-time`,
          new Blob([JSON.stringify(checkpoint)], { type: "application/json" })
        );
      }
      releaseOwnership();
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key !== lockKey(documentId)) return;
      const owner = readLock(documentId);
      const stillOwner = owner?.tabId === tabId.current;
      if (ownsLock.current && !stillOwner) {
        applyAction({ type: "PAUSE", now: performance.now() });
        clearDeadline();
        void sendCheckpoint("route_change");
      }
      ownsLock.current = stillOwner;
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("storage", onStorage);

    const checkpointInterval = window.setInterval(() => {
      if (machine.current.currentMode === "active") {
        void sendCheckpoint("periodic");
      }
    }, CHECKPOINT_INTERVAL_MS);
    const lockHeartbeat = window.setInterval(() => {
      if (
        ownsLock.current &&
        document.visibilityState === "visible" &&
        document.hasFocus()
      ) {
        writeOwnership();
      } else if (
        !ownsLock.current &&
        document.visibilityState === "visible" &&
        document.hasFocus()
      ) {
        tryAcquireOwnership();
      }
    }, LOCK_HEARTBEAT_MS);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("storage", onStorage);
      window.clearInterval(checkpointInterval);
      window.clearInterval(lockHeartbeat);
      clearDeadline();
      const checkpoint = prepareCheckpoint("route_change");
      if (checkpoint) {
        navigator.sendBeacon(
          `/api/awb/documents/${documentId}/review-time`,
          new Blob([JSON.stringify(checkpoint)], { type: "application/json" })
        );
      }
      releaseOwnership();
    };
  }, [
    applyAction,
    clearDeadline,
    documentId,
    enterAway,
    isReviewWorkspaceReady,
    prepareCheckpoint,
    releaseOwnership,
    returnVisible,
    sendCheckpoint,
    tryAcquireOwnership,
    writeOwnership,
  ]);

  return {
    markActivity,
    markEditableFocus,
    markScrollActivity,
    prepareCheckpoint,
    sendCheckpoint,
    startNewSession,
    complete,
    getDebugSnapshot,
  };
}
