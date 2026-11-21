'use client';

import { useState } from 'react';
import { t } from '@/locales';
import { ChevronDown } from 'lucide-react';
import { useFeatureFlagStore } from '@/store/featureFlagStore';

export function PreviewFeaturesSection() {
  const [expanded, setExpanded] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const flags = useFeatureFlagStore((state) => state.flags);
  const pending = useFeatureFlagStore((state) => state.pending);
  const errors = useFeatureFlagStore((state) => state.mutationErrors);
  const error = useFeatureFlagStore((state) => state.error);
  const refresh = useFeatureFlagStore((state) => state.refresh);
  const setEnabled = useFeatureFlagStore((state) => state.setEnabled);
  const available = Object.values(flags).filter((flag) => flag.mode === 'opt-in');

  if (available.length === 0) {
    if (!error) return null;

    return (
      <section
        data-testid="preview-features-section"
        className="w-full min-w-0 max-w-full rounded-[2rem] border border-hearth-line bg-white p-4 sm:p-6 shadow-glass"
      >
        <p className="text-sm font-semibold text-ink-body" role="alert">
          {t('previewFeatures.loadError', 'Unable to load preview features.')}
        </p>
        <button
          type="button"
          onClick={() => void refresh()}
          className="mt-3 min-h-11 rounded-xl px-3 text-sm font-bold text-hearth-ink underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hearth-ink"
        >
          {t('previewFeatures.retry', 'Retry')}
        </button>
      </section>
    );
  }

  const change = async (key: string, enabled: boolean) => {
    const saved = await setEnabled(key, enabled);
    if (saved)
      setAnnouncement(
        enabled
          ? t('previewFeatures.enabled', 'Preview enabled')
          : t('previewFeatures.disabled', 'Preview turned off')
      );
  };

  return (
    <section
      data-testid="preview-features-section"
      className="w-full min-w-0 max-w-full rounded-[2rem] border border-sunlight-line bg-white shadow-glass"
    >
      <button
        type="button"
        data-testid="preview-features-toggle"
        aria-expanded={expanded}
        aria-controls="preview-features-list"
        onClick={() => setExpanded((value) => !value)}
        className="flex min-h-14 w-full items-center justify-between gap-4 rounded-[2rem] px-4 sm:px-6 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hearth-ink"
      >
        <span className="min-w-0 flex-1 break-words">
          <span className="block font-heading text-lg font-bold text-ink-body">
            {t('previewFeatures.title', 'Preview features')}
          </span>
          <span className="text-sm text-ink-muted">
            {t('previewFeatures.subtitle', 'Try upcoming ideas when you want to.')}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-3">
          <span className="rounded-full bg-ochre-100 border border-sunlight-line px-2.5 py-1 text-xs font-bold text-sunlight-ink">
            {available.length}
          </span>
          <ChevronDown
            className={`h-5 w-5 text-icon-affordance transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
        </span>
      </button>

      {expanded && (
        <div id="preview-features-list" className="border-t border-chrome-line px-4 sm:px-6 py-5">
          <p className="mb-5 text-sm text-ink-muted">
            {t(
              'previewFeatures.notice',
              'Previews may change, and you can turn them off at any time.'
            )}
          </p>
          <ul className="space-y-4">
            {available.map((flag) => (
              <li
                key={flag.key}
                className="rounded-2xl border border-chrome-line bg-cream/70 p-3 sm:p-4"
              >
                <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:gap-4">
                  <label
                    htmlFor={`feature-${flag.key}`}
                    className="min-w-0 w-full flex-1 cursor-pointer break-words sm:w-auto"
                  >
                    <span className="block font-heading text-base font-bold text-ink-body">
                      {t(`previewFeatures.flags.${flag.key}.name`, flag.displayName ?? '')}
                    </span>
                    <span className="mt-1 block text-sm leading-relaxed text-ink-muted">
                      {t(`previewFeatures.flags.${flag.key}.description`, flag.description ?? '')}
                    </span>
                  </label>
                  <input
                    id={`feature-${flag.key}`}
                    data-testid={`feature-toggle-${flag.key}`}
                    type="checkbox"
                    role="switch"
                    checked={flag.memberEnabled ?? false}
                    disabled={pending[flag.key]}
                    onChange={(event) => void change(flag.key, event.currentTarget.checked)}
                    className="mt-2 h-11 w-11 shrink-0 accent-hearth-fill"
                  />
                </div>
                {pending[flag.key] && (
                  <p className="mt-2 text-sm text-ink-muted">
                    {t('previewFeatures.saving', 'Saving…')}
                  </p>
                )}
                {errors[flag.key] && (
                  <p className="mt-2 text-sm font-semibold text-hearth-ink" role="alert">
                    {t('previewFeatures.saveError', "Couldn't save. Try again.")}{' '}
                    <button
                      type="button"
                      className="min-h-11 underline"
                      onClick={() => void change(flag.key, !(flag.memberEnabled ?? false))}
                    >
                      {t('previewFeatures.tryAgain', 'Try again')}
                    </button>
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </section>
  );
}
