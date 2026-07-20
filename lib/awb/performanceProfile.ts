export type AwbPerformanceStageRecorder = (
  stage: string,
  durationMs: number
) => void;

export type AwbPerformanceProfile = {
  profileId: string;
  totalMeasuredMs: number;
  accountedStageMs: number;
  unaccountedMs: number;
  stagesMs: Record<string, number>;
};

function roundedMs(value: number) {
  return Math.round(Math.max(0, value) * 100) / 100;
}

export function createAwbPerformanceProfiler(
  profileId: string,
  now: () => number = () => performance.now()
) {
  const profileStartedAt = now();
  const stagesMs: Record<string, number> = {};

  const record: AwbPerformanceStageRecorder = (stage, durationMs) => {
    stagesMs[stage] = roundedMs((stagesMs[stage] ?? 0) + durationMs);
  };

  async function measure<T>(stage: string, operation: () => Promise<T>) {
    const startedAt = now();
    try {
      return await operation();
    } finally {
      record(stage, now() - startedAt);
    }
  }

  function measureSync<T>(stage: string, operation: () => T) {
    const startedAt = now();
    try {
      return operation();
    } finally {
      record(stage, now() - startedAt);
    }
  }

  function finish(): AwbPerformanceProfile {
    const totalMeasuredMs = roundedMs(now() - profileStartedAt);
    const accountedStageMs = roundedMs(
      Object.values(stagesMs).reduce((total, duration) => total + duration, 0)
    );
    return {
      profileId,
      totalMeasuredMs,
      accountedStageMs,
      unaccountedMs: roundedMs(totalMeasuredMs - accountedStageMs),
      stagesMs: { ...stagesMs },
    };
  }

  return { record, measure, measureSync, finish };
}
