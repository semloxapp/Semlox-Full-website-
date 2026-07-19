export const AWAY_GRACE_MS = 60_000;
export const INACTIVITY_GRACE_MS = 180_000;
export const CHECKPOINT_INTERVAL_MS = 60_000;
export const REVIEW_LOCK_EXPIRY_MS = 30_000;

export type ReviewOwnershipLock = {
  tabId: string;
  lastHeartbeatAt: number;
};

export type ReviewTimerMode =
  | "active"
  | "visible_inactive"
  | "away"
  | "paused"
  | "completed";

export type ReviewTimerState = {
  accumulatedActiveMs: number;
  currentMode: ReviewTimerMode;
  lastMeaningfulActivityAt: number | null;
  awayStartedAt: number | null;
  activeAccountingCursorAt: number | null;
  awayGraceAccountedMs: number;
  awayGraceEligible: boolean;
};

export type ReviewTimerAction =
  | { type: "MEANINGFUL_ACTIVITY"; now: number }
  | { type: "ENTER_AWAY"; now: number }
  | { type: "AWAY_GRACE_EXPIRED"; now: number }
  | { type: "RETURN_VISIBLE"; now: number }
  | { type: "INACTIVITY_EXPIRED"; now: number }
  | { type: "PAUSE"; now: number }
  | { type: "COMPLETE"; now: number };

export function initialReviewTimerState(
  accumulatedActiveMs = 0
): ReviewTimerState {
  return {
    accumulatedActiveMs: Math.max(0, accumulatedActiveMs),
    currentMode: "paused",
    lastMeaningfulActivityAt: null,
    awayStartedAt: null,
    activeAccountingCursorAt: null,
    awayGraceAccountedMs: 0,
    awayGraceEligible: false,
  };
}

export function canTakeReviewOwnership(
  lock: ReviewOwnershipLock | null,
  tabId: string,
  now: number
) {
  return (
    !lock ||
    lock.tabId === tabId ||
    !Number.isFinite(lock.lastHeartbeatAt) ||
    now - lock.lastHeartbeatAt >= REVIEW_LOCK_EXPIRY_MS
  );
}

export function cappedVisibleActiveDuration(
  intervalStart: number,
  intervalEnd: number,
  lastMeaningfulActivityAt: number
) {
  if (
    !Number.isFinite(intervalStart) ||
    !Number.isFinite(intervalEnd) ||
    !Number.isFinite(lastMeaningfulActivityAt) ||
    intervalEnd <= intervalStart
  ) {
    return 0;
  }
  const allowedEnd = Math.min(
    intervalEnd,
    lastMeaningfulActivityAt + INACTIVITY_GRACE_MS
  );
  return Math.max(0, allowedEnd - intervalStart);
}

export function cappedAwayGraceDuration(awayStart: number, awayEnd: number) {
  if (
    !Number.isFinite(awayStart) ||
    !Number.isFinite(awayEnd) ||
    awayEnd <= awayStart
  ) {
    return 0;
  }
  return Math.min(awayEnd - awayStart, AWAY_GRACE_MS);
}

function accountVisible(state: ReviewTimerState, now: number) {
  if (
    state.currentMode !== "active" ||
    state.activeAccountingCursorAt === null ||
    state.lastMeaningfulActivityAt === null
  ) {
    return state;
  }
  return {
    ...state,
    accumulatedActiveMs:
      state.accumulatedActiveMs +
      cappedVisibleActiveDuration(
        state.activeAccountingCursorAt,
        now,
        state.lastMeaningfulActivityAt
      ),
    activeAccountingCursorAt: now,
  };
}

function accountAway(state: ReviewTimerState, now: number) {
  if (
    state.currentMode !== "away" ||
    !state.awayGraceEligible ||
    state.awayStartedAt === null
  ) {
    return state;
  }
  const allowed = cappedAwayGraceDuration(state.awayStartedAt, now);
  const additional = Math.max(0, allowed - state.awayGraceAccountedMs);
  return {
    ...state,
    accumulatedActiveMs: state.accumulatedActiveMs + additional,
    awayGraceAccountedMs: Math.max(state.awayGraceAccountedMs, allowed),
  };
}

export function accountReviewTimerAt(state: ReviewTimerState, now: number) {
  if (state.currentMode === "active") return accountVisible(state, now);
  if (state.currentMode === "away") return accountAway(state, now);
  return state;
}

export function transitionReviewTimer(
  state: ReviewTimerState,
  action: ReviewTimerAction
): ReviewTimerState {
  if (!Number.isFinite(action.now) || state.currentMode === "completed") {
    return state;
  }

  if (action.type === "MEANINGFUL_ACTIVITY") {
    const accounted = accountReviewTimerAt(state, action.now);
    return {
      ...accounted,
      currentMode: "active",
      lastMeaningfulActivityAt: action.now,
      awayStartedAt: null,
      activeAccountingCursorAt: action.now,
      awayGraceAccountedMs: 0,
      awayGraceEligible: false,
    };
  }

  if (action.type === "ENTER_AWAY") {
    if (state.currentMode === "away") return state;
    const wasActive = state.currentMode === "active";
    const accounted = accountReviewTimerAt(state, action.now);
    return {
      ...accounted,
      currentMode: "away",
      awayStartedAt: action.now,
      activeAccountingCursorAt: null,
      awayGraceAccountedMs: 0,
      awayGraceEligible: wasActive,
    };
  }

  if (action.type === "AWAY_GRACE_EXPIRED") {
    return accountAway(state, action.now);
  }

  if (action.type === "RETURN_VISIBLE") {
    if (state.currentMode !== "away") return state;
    const accounted = accountAway(state, action.now);
    return {
      ...accounted,
      currentMode: "paused",
      awayStartedAt: null,
      activeAccountingCursorAt: null,
      awayGraceAccountedMs: 0,
      awayGraceEligible: false,
    };
  }

  if (action.type === "INACTIVITY_EXPIRED") {
    if (state.currentMode !== "active") return state;
    const accounted = accountVisible(state, action.now);
    return {
      ...accounted,
      currentMode: "visible_inactive",
      activeAccountingCursorAt: null,
    };
  }

  if (action.type === "PAUSE") {
    const accounted = accountReviewTimerAt(state, action.now);
    return {
      ...accounted,
      currentMode: "paused",
      awayStartedAt: null,
      activeAccountingCursorAt: null,
      awayGraceAccountedMs: 0,
      awayGraceEligible: false,
    };
  }

  const accounted = accountReviewTimerAt(state, action.now);
  return {
    ...accounted,
    currentMode: "completed",
    awayStartedAt: null,
    activeAccountingCursorAt: null,
    awayGraceAccountedMs: 0,
    awayGraceEligible: false,
  };
}
