import { isFeatureFlagEnabled } from "./featureFlag";

export const awbTimingClientFlags = {
  debugUiEnabled: isFeatureFlagEnabled(
    process.env.NEXT_PUBLIC_AWB_TIMING_DEBUG_UI
  ),
  adminAnalyticsEnabled: isFeatureFlagEnabled(
    process.env.NEXT_PUBLIC_ADMIN_TIMING_ANALYTICS_ENABLED
  ),
} as const;
