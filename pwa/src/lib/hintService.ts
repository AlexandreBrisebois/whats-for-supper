import { apiClient } from './api/client';
import type { HintStep, HintTourConfig, CompletedTour, CompletionInfo } from '@/types/domain';
import type { Locale } from '@/lib/i18n';

// Static tour step definitions — selectors match data-hint attributes in the DOM
const TOUR_STEPS: Record<string, HintStep[]> = {
  'phase0-onboarding': [
    {
      targetSelector: '[data-hint="family-list"]',
      titleKey: 'phase0-onboarding.step1.title',
      descriptionKey: 'phase0-onboarding.step1.description',
      position: 'bottom',
      allowSkip: true,
    },
    {
      targetSelector: '[data-hint="member-select"]',
      titleKey: 'phase0-onboarding.step2.title',
      descriptionKey: 'phase0-onboarding.step2.description',
      position: 'bottom',
      allowSkip: true,
    },
    {
      targetSelector: '[data-hint="add-member-toggle"]',
      titleKey: 'phase0-onboarding.step3.title',
      descriptionKey: 'phase0-onboarding.step3.description',
      position: 'top',
      allowSkip: true,
    },
    {
      targetSelector: '[data-hint="member-name-input"]',
      titleKey: 'phase0-onboarding.step4.title',
      descriptionKey: 'phase0-onboarding.step4.description',
      position: 'bottom',
      allowSkip: true,
    },
    {
      targetSelector: '[data-hint="save-member"]',
      titleKey: 'phase0-onboarding.step5.title',
      descriptionKey: 'phase0-onboarding.step5.description',
      position: 'top',
      allowSkip: true,
    },
    {
      targetSelector: '[data-hint="welcome"]',
      titleKey: 'phase0-onboarding.step6.title',
      descriptionKey: 'phase0-onboarding.step6.description',
      position: 'bottom',
      allowSkip: false,
    },
  ],
  'phase0-capture': [
    {
      targetSelector: '[data-hint="add-recipe"]',
      titleKey: 'phase0-capture.step1.title',
      descriptionKey: 'phase0-capture.step1.description',
      position: 'bottom',
      allowSkip: true,
    },
    {
      targetSelector: '[data-hint="camera-input"]',
      titleKey: 'phase0-capture.step2.title',
      descriptionKey: 'phase0-capture.step2.description',
      position: 'top',
      allowSkip: true,
    },
    {
      targetSelector: '[data-hint="photo-review"]',
      titleKey: 'phase0-capture.step3.title',
      descriptionKey: 'phase0-capture.step3.description',
      position: 'bottom',
      allowSkip: true,
    },
    {
      targetSelector: '[data-hint="dish-photo-select"]',
      titleKey: 'phase0-capture.step4.title',
      descriptionKey: 'phase0-capture.step4.description',
      position: 'bottom',
      allowSkip: true,
    },
    {
      targetSelector: '[data-hint="recipe-rating"]',
      titleKey: 'phase0-capture.step5.title',
      descriptionKey: 'phase0-capture.step5.description',
      position: 'top',
      allowSkip: true,
    },
    {
      targetSelector: '[data-hint="save-recipe"]',
      titleKey: 'phase0-capture.step6.title',
      descriptionKey: 'phase0-capture.step6.description',
      position: 'top',
      allowSkip: true,
    },
    {
      targetSelector: '[data-hint="recipe-saved"]',
      titleKey: 'phase0-capture.step7.title',
      descriptionKey: 'phase0-capture.step7.description',
      position: 'bottom',
      allowSkip: false,
    },
    {
      targetSelector: '[data-hint="add-another"]',
      titleKey: 'phase0-capture.step8.title',
      descriptionKey: 'phase0-capture.step8.description',
      position: 'bottom',
      allowSkip: true,
    },
    {
      targetSelector: '[data-hint="add-another"]',
      titleKey: 'phase0-capture.step9.title',
      descriptionKey: 'phase0-capture.step9.description',
      position: 'top',
      allowSkip: false,
    },
  ],
};

export function getHints(tourId: string, locale: Locale): HintTourConfig {
  return {
    tourId,
    steps: TOUR_STEPS[tourId] ?? [],
    locale,
  };
}

export async function getTourCompletionState(
  familyMemberId: string
): Promise<Record<string, CompletionInfo>> {
  try {
    const { data } = await apiClient.get<{
      data: { completed_tours?: Record<string, CompletedTour> };
    }>(`/api/family/${familyMemberId}`);

    const raw = data.data.completed_tours ?? {};
    return Object.fromEntries(
      Object.entries(raw).map(([tourId, info]) => [
        tourId,
        { completedAt: info.completed_at, deviceId: info.device_id },
      ])
    );
  } catch {
    return {};
  }
}

export async function completeTour(familyMemberId: string, tourId: string): Promise<void> {
  try {
    await apiClient.post(`/api/family/${familyMemberId}/tours`, { tourId });
  } catch {
    // Persist locally even when the API is unavailable
  }
}

export function shouldAutoPlayTour(
  completedTours: Record<string, unknown>,
  tourId: string
): boolean {
  return !(tourId in completedTours);
}

// Async entry point for lazy-load patterns — synchronous for Phase 0
export async function loadLocalizedHints(tourId: string, locale: Locale): Promise<HintTourConfig> {
  return getHints(tourId, locale);
}
