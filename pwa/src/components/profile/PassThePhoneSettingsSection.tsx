'use client';

import { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { t } from '@/locales';
import { useFamilyStore } from '@/store/familyStore';
import { setPassThePhoneEnabled, usePassThePhoneEnabled } from '@/lib/discovery/passThePhone';

export function PassThePhoneSettingsSection() {
  const enabled = usePassThePhoneEnabled();
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const familyMembers = useFamilyStore((s) => s.familyMembers);
  const hasLoaded = useFamilyStore((s) => s.hasLoaded);

  const headingId = useId();
  const subtitleId = useId();
  const howItWorksId = useId();

  const showSingleMemberHint = hasLoaded && familyMembers.length < 2;

  return (
    <section
      data-testid="pass-the-phone-settings"
      aria-labelledby={headingId}
      className="w-full min-w-0 rounded-3xl border border-chrome-line bg-white p-6 shadow-card"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h2 id={headingId} className="font-heading text-lg font-bold text-ink-body">
            {t('settings.passThePhone.title', 'Pass the phone')}
          </h2>
          <p id={subtitleId} className="mt-0.5 text-sm font-medium text-ink-muted">
            {t('settings.passThePhone.subtitle', 'Vote together on this device')}
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-labelledby={headingId}
          aria-describedby={subtitleId}
          data-testid="pass-the-phone-switch"
          onClick={() => setPassThePhoneEnabled(!enabled)}
          className="inline-flex min-h-12 min-w-14 shrink-0 items-center justify-end rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink-body"
        >
          <span
            aria-hidden="true"
            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors motion-reduce:transition-none ${
              enabled ? 'bg-garden-fill' : 'bg-charcoal-200'
            }`}
          >
            <span
              className={`inline-block h-6 w-6 rounded-full bg-white shadow-sm transition-transform motion-reduce:transition-none ${
                enabled ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </span>
        </button>
      </div>

      {showSingleMemberHint && (
        <p
          data-testid="pass-the-phone-single-member-hint"
          className="mt-4 rounded-2xl border border-sunlight-line bg-ochre-100 px-4 py-3 text-xs font-semibold text-sunlight-ink"
        >
          {t(
            'settings.passThePhone.singleMemberHint',
            'Add another family member above to use this.'
          )}
        </p>
      )}

      <div className="mt-4 border-t border-chrome-line pt-2">
        <button
          type="button"
          data-testid="pass-the-phone-how-it-works-toggle"
          aria-expanded={howItWorksOpen}
          aria-controls={howItWorksId}
          onClick={() => setHowItWorksOpen((open) => !open)}
          className="flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl px-1 py-2 text-left text-sm font-bold text-garden-ink transition-colors hover:bg-sage-50/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body"
        >
          <span>
            {howItWorksOpen
              ? t('settings.passThePhone.hideDetails', 'Hide details')
              : t('settings.passThePhone.howItWorks', 'How it works')}
          </span>
          <ChevronDown
            aria-hidden="true"
            className={`h-5 w-5 shrink-0 text-garden-ink transition-transform motion-reduce:transition-none ${
              howItWorksOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {howItWorksOpen && (
          <div
            id={howItWorksId}
            data-testid="pass-the-phone-how-it-works-body"
            className="mt-2 space-y-2.5 rounded-2xl border border-chrome-line bg-cream p-4"
          >
            <p className="text-sm font-bold text-ink-body">
              {t(
                'settings.passThePhone.howItWorksLead',
                'Let the kids help pick supper from your phone.'
              )}
            </p>
            <p className="text-sm leading-relaxed text-ink-muted">
              {t(
                'settings.passThePhone.howItWorksBody',
                'After you finish voting, pass your phone along — the rest of the app stays tucked away until they hand it back. For an OS-level lock, use iOS Guided Access or Android App Pinning.'
              )}
            </p>
            <p className="text-xs font-semibold text-garden-ink">
              {t('settings.passThePhone.deviceScopeNote', 'Only turns on for this device.')}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
