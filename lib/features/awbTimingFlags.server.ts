import "server-only";

import { isFeatureFlagEnabled } from "./featureFlag";

export const awbTimingServerFlags = {
  trackingEnabled: isFeatureFlagEnabled(
    process.env.AWB_TIMING_TRACKING_ENABLED
  ),
} as const;
