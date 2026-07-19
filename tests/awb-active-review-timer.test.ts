import test from "node:test";
import assert from "node:assert/strict";
// @ts-expect-error Node's strip-types runner requires explicit TypeScript extensions.
import { AWAY_GRACE_MS, INACTIVITY_GRACE_MS, accountReviewTimerAt, canTakeReviewOwnership, cappedAwayGraceDuration, initialReviewTimerState, transitionReviewTimer } from "../lib/awb/activeReviewTimer.ts";

const activity = (state: ReturnType<typeof initialReviewTimerState>, now: number) =>
  transitionReviewTimer(state, { type: "MEANINGFUL_ACTIVITY", now });

test("starts at zero and only begins on meaningful activity", () => {
  const initial = initialReviewTimerState();
  assert.equal(accountReviewTimerAt(initial, 120_000).accumulatedActiveMs, 0);
  assert.equal(activity(initial, 120_000).currentMode, "active");
});

test("counts visible activity under three minutes", () => {
  let state = activity(initialReviewTimerState(), 0);
  state = activity(state, 120_000);
  assert.equal(state.accumulatedActiveMs, 120_000);
});

test("caps visible inactivity at three minutes and resumes from the next interaction", () => {
  let state = activity(initialReviewTimerState(), 0);
  state = transitionReviewTimer(state, {
    type: "INACTIVITY_EXPIRED",
    now: 600_000,
  });
  assert.equal(state.accumulatedActiveMs, INACTIVITY_GRACE_MS);
  state = activity(state, 600_000);
  state = accountReviewTimerAt(state, 610_000);
  assert.equal(state.accumulatedActiveMs, INACTIVITY_GRACE_MS + 10_000);
});

test("counts actual away time when returning within one minute", () => {
  let state = activity(initialReviewTimerState(), 0);
  state = transitionReviewTimer(state, { type: "ENTER_AWAY", now: 10_000 });
  state = transitionReviewTimer(state, { type: "RETURN_VISIBLE", now: 55_000 });
  assert.equal(state.accumulatedActiveMs, 55_000);
  assert.equal(state.currentMode, "paused");
});

test("caps a long away interval at one minute and waits for interaction", () => {
  let state = activity(initialReviewTimerState(), 0);
  state = transitionReviewTimer(state, { type: "ENTER_AWAY", now: 10_000 });
  state = transitionReviewTimer(state, {
    type: "AWAY_GRACE_EXPIRED",
    now: 500_000,
  });
  state = transitionReviewTimer(state, {
    type: "RETURN_VISIBLE",
    now: 510_000,
  });
  assert.equal(state.accumulatedActiveMs, 10_000 + AWAY_GRACE_MS);
  assert.equal(accountReviewTimerAt(state, 600_000).accumulatedActiveMs, 70_000);
  state = activity(state, 600_000);
  assert.equal(state.activeAccountingCursorAt, 600_000);
});

test("deduplicates blur and visibility away transitions", () => {
  let state = activity(initialReviewTimerState(), 0);
  state = transitionReviewTimer(state, { type: "ENTER_AWAY", now: 10_000 });
  const duplicate = transitionReviewTimer(state, {
    type: "ENTER_AWAY",
    now: 11_000,
  });
  assert.deepEqual(duplicate, state);
});

test("hidden transition while inactivity is pending applies one continuous cap", () => {
  let state = activity(initialReviewTimerState(), 0);
  state = transitionReviewTimer(state, { type: "ENTER_AWAY", now: 170_000 });
  state = transitionReviewTimer(state, {
    type: "AWAY_GRACE_EXPIRED",
    now: 300_000,
  });
  assert.equal(state.accumulatedActiveMs, 170_000 + AWAY_GRACE_MS);
  state = transitionReviewTimer(state, {
    type: "INACTIVITY_EXPIRED",
    now: 300_000,
  });
  assert.equal(state.accumulatedActiveMs, 230_000);
});

test("return focus without interaction remains paused", () => {
  let state = activity(initialReviewTimerState(), 0);
  state = transitionReviewTimer(state, { type: "ENTER_AWAY", now: 10_000 });
  state = transitionReviewTimer(state, { type: "RETURN_VISIBLE", now: 20_000 });
  state = accountReviewTimerAt(state, 100_000);
  assert.equal(state.currentMode, "paused");
  assert.equal(state.accumulatedActiveMs, 20_000);
});

test("away grace helper rejects negative intervals", () => {
  assert.equal(cappedAwayGraceDuration(100, 50), 0);
});

test("only one fresh browser tab lock owns review timing", () => {
  assert.equal(canTakeReviewOwnership(null, "tab-a", 1_000), true);
  assert.equal(
    canTakeReviewOwnership({ tabId: "tab-a", lastHeartbeatAt: 1_000 }, "tab-b", 2_000),
    false
  );
  assert.equal(
    canTakeReviewOwnership({ tabId: "tab-a", lastHeartbeatAt: 1_000 }, "tab-b", 40_000),
    true
  );
});
