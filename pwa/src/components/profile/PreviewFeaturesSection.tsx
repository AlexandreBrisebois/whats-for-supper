'use client';

import { useState } from 'react';
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
        className="w-full min-w-0 max-w-full rounded-[2rem] border border-terracotta/20 bg-white/40 p-6 shadow-glass backdrop-blur-xl"
      >
        <p className="text-sm font-semibold text-charcoal" role="alert">
          {error}
        </p>
        <button
          type="button"
          onClick={() => void refresh()}
          className="mt-3 min-h-11 rounded-xl px-3 text-sm font-bold text-terracotta underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta"
        >
          Retry
        </button>
      </section>
    );
  }

  const change = async (key: string, enabled: boolean) => {
    const saved = await setEnabled(key, enabled);
    if (saved) setAnnouncement(enabled ? 'Preview enabled' : 'Preview turned off');
  };

  return (
    <section
      data-testid="preview-features-section"
      className="w-full min-w-0 max-w-full rounded-[2rem] border border-ochre/20 bg-white/40 shadow-glass backdrop-blur-xl"
    >
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls="preview-features-list"
        onClick={() => setExpanded((value) => !value)}
        className="flex min-h-14 w-full items-center justify-between gap-4 rounded-[2rem] px-6 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta"
      >
        <span>
          <span className="block font-heading text-lg font-bold text-charcoal">
            Preview features
          </span>
          <span className="text-sm text-charcoal/70">Try upcoming ideas when you want to.</span>
        </span>
        <span className="flex items-center gap-3">
          <span className="rounded-full bg-ochre/15 px-2.5 py-1 text-xs font-bold text-charcoal">
            {available.length}
          </span>
          <ChevronDown className={`h-5 w-5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {expanded && (
        <div id="preview-features-list" className="border-t border-charcoal/10 px-6 py-5">
          <p className="mb-5 text-sm text-charcoal/70">
            Previews may change, and you can turn them off at any time.
          </p>
          <ul className="space-y-4">
            {available.map((flag) => (
              <li key={flag.key} className="rounded-2xl bg-cream/70 p-4">
                <div className="flex items-start justify-between gap-4">
                  <label htmlFor={`feature-${flag.key}`} className="min-w-0 flex-1 cursor-pointer">
                    <span className="mb-2 inline-flex rounded-full bg-ochre/20 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-charcoal">
                      Preview
                    </span>
                    <span className="block font-heading text-base font-bold text-charcoal">
                      {flag.displayName}
                    </span>
                    <span className="mt-1 block text-sm leading-relaxed text-charcoal/70">
                      {flag.description}
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
                    className="mt-2 h-11 w-11 shrink-0 accent-terracotta"
                  />
                </div>
                {pending[flag.key] && <p className="mt-2 text-sm text-charcoal/70">Saving…</p>}
                {errors[flag.key] && (
                  <p className="mt-2 text-sm font-semibold text-terracotta" role="alert">
                    {errors[flag.key]}{' '}
                    <button
                      type="button"
                      className="min-h-11 underline"
                      onClick={() => void change(flag.key, !(flag.memberEnabled ?? false))}
                    >
                      Try again
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
