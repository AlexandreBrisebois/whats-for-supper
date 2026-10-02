import { apiClient } from './api-client';
import type { FeatureFlagDto } from './generated/models/index';

export type FeatureFlagMode = 'off' | 'opt-in' | 'on';

export interface FeatureFlag {
  key: string;
  enabled: boolean;
  mode: FeatureFlagMode;
  memberEnabled?: boolean;
  displayName?: string;
  description?: string;
}

function toFeatureFlag(flag: FeatureFlagDto): FeatureFlag {
  return {
    key: flag.key ?? '',
    enabled: flag.enabled ?? false,
    mode: (flag.mode ?? 'off') as FeatureFlagMode,
    memberEnabled: flag.memberEnabled ?? undefined,
    displayName: flag.displayName ?? undefined,
    description: flag.description ?? undefined,
  };
}

export async function getFeatureFlags(): Promise<FeatureFlag[]> {
  const response = await apiClient.api.featureFlags.get();
  return (response?.data?.items ?? []).map(toFeatureFlag);
}

export async function updateFeatureFlag(key: string, enabled: boolean): Promise<FeatureFlag> {
  try {
    const response = await apiClient.api.featureFlags.byKey(key).patch({ enabled });
    if (!response?.data) throw new Error('Unable to save preview choice.');
    return toFeatureFlag(response.data);
  } catch (cause) {
    const status = (cause as { responseStatusCode?: number }).responseStatusCode;
    const error = new Error('Unable to save preview choice.', { cause }) as Error & {
      status?: number;
    };
    error.status = status;
    throw error;
  }
}
