import { RetryHandlerOptions } from '@microsoft/kiota-http-fetchlibrary';
import { apiClient } from './api-client';
import type { SettingsDto_value } from './generated/models';

export const QUICK_VOTES_SETTING_KEY = 'quick_votes';
export const DEFAULT_QUICK_VOTES_TARGET_LIKES = 16;

export interface QuickVotesSettings {
  enabled: boolean;
  targetLikes: number;
}

export const DEFAULT_QUICK_VOTES_SETTINGS: QuickVotesSettings = {
  enabled: false,
  targetLikes: DEFAULT_QUICK_VOTES_TARGET_LIKES,
};

const noReplay = { options: [new RetryHandlerOptions({ maxRetries: 0 })] };

export function isValidQuickVotesTarget(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 1;
}

function extractRawSettingValue(
  value: SettingsDto_value | Record<string, unknown> | null | undefined
): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  const candidate =
    'additionalData' in value && value.additionalData && typeof value.additionalData === 'object'
      ? (value.additionalData as Record<string, unknown>)
      : (value as Record<string, unknown>);
  return candidate;
}

export function normalizeQuickVotesSettings(raw: unknown): QuickVotesSettings {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_QUICK_VOTES_SETTINGS };
  }
  const obj = raw as Record<string, unknown>;
  const enabled = typeof obj.enabled === 'boolean' ? obj.enabled : false;
  const targetLikes = isValidQuickVotesTarget(obj.targetLikes)
    ? obj.targetLikes
    : DEFAULT_QUICK_VOTES_TARGET_LIKES;
  return { enabled, targetLikes };
}

function isNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const status =
    (error as { responseStatusCode?: number; status?: number }).responseStatusCode ??
    (error as { status?: number }).status;
  return status === 404;
}

export async function readQuickVotesSettings(): Promise<QuickVotesSettings> {
  try {
    const response = await apiClient.api.settings.byKey(QUICK_VOTES_SETTING_KEY).get(noReplay);
    const raw = extractRawSettingValue(response?.data?.value);
    return normalizeQuickVotesSettings(raw);
  } catch (error) {
    if (isNotFoundError(error)) {
      return { ...DEFAULT_QUICK_VOTES_SETTINGS };
    }
    throw error;
  }
}

export async function saveQuickVotesSettings(
  settings: QuickVotesSettings
): Promise<QuickVotesSettings> {
  if (!isValidQuickVotesTarget(settings.targetLikes)) {
    throw new Error('Quick Votes target likes must be a whole number of at least 1.');
  }

  const response = await apiClient.api.settings.byKey(QUICK_VOTES_SETTING_KEY).post(
    {
      key: QUICK_VOTES_SETTING_KEY,
      value: {
        additionalData: {
          enabled: settings.enabled,
          targetLikes: settings.targetLikes,
        },
      },
    },
    noReplay
  );

  const raw = extractRawSettingValue(response?.data?.value);
  if (!raw) {
    return { enabled: settings.enabled, targetLikes: settings.targetLikes };
  }
  return normalizeQuickVotesSettings(raw);
}
