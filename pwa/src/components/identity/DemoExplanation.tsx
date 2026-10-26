'use client';

import { useId, useRef } from 'react';
import { CircleHelp } from 'lucide-react';
import { DemoDialog } from '@/components/demo/DemoDialog';
import { useLocale } from '@/components/common/LocaleProvider';
import { t } from '@/locales';

/** One presentation and copy owner, independent of automatic introduction policy. */
export function DemoExplanation({
  open,
  onOpen,
  onDismiss,
  beta = false,
}: {
  open: boolean;
  onOpen: () => void;
  onDismiss: () => void;
  beta?: boolean;
}) {
  useLocale();
  const band = useRef<HTMLButtonElement>(null);
  const betaDescription = useId();
  return (
    <div
      className="relative z-40 bg-cream pt-[env(safe-area-inset-top)] text-charcoal"
      data-testid="demo-context"
    >
      <button
        ref={band}
        type="button"
        data-testid="demo-context-band"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-describedby={beta ? betaDescription : undefined}
        onClick={onOpen}
        className="group flex min-h-8 w-full items-center bg-sage-100 p-0 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-charcoal"
      >
        <span
          data-testid="demo-context-strip"
          className="flex min-h-8 w-full items-center justify-center gap-2 bg-sage-100 px-4 py-1 text-[0.8125rem] leading-[1.125rem] font-medium group-hover:bg-sage-200 group-active:bg-sage-300"
        >
          <CircleHelp size={16} className="shrink-0" aria-hidden="true" />
          <span className="min-w-0 break-words">
            {t('demoContext.label', 'Demo · What to know')}
          </span>
        </span>
      </button>
      {beta && (
        <span id={betaDescription} className="sr-only">
          {t('installIdentity.betaChannel', 'Beta release channel')}
        </span>
      )}
      {open && (
        <DemoDialog
          title={t('demoContext.label', 'Demo · What to know')}
          description={t(
            'demoContext.shared',
            'Welcome to What’s for Supper! You’re sharing this demo with other visitors, just like a family sharing the app. You’ll see their changes as you explore, and they’ll see yours.'
          )}
          onClose={onDismiss}
          returnFocus={band}
          showTitleFocusOutline={false}
          dismissLabel={t('demoContext.start', 'Start exploring')}
        >
          <>
            <p className="text-sm leading-relaxed">
              {t(
                'demoContext.temporary',
                'Try things out! Your changes are temporary and will be reset. Please don’t add personal information.'
              )}
            </p>
            <p className="text-sm leading-relaxed">
              {t(
                'demoContext.aiUnavailable',
                'AI capture and generation are turned off in this demo. Explore the recipes we’ve prepared for you instead.'
              )}
            </p>
            <p className="text-sm leading-relaxed">
              {t(
                'demoHosting.body',
                'When you set up your own What’s for Supper, AI features require your own subscription.'
              )}
            </p>
            <a
              href="https://github.com/AlexandreBrisebois/whats-for-supper/blob/main/docs/install/quick-start.md"
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center underline underline-offset-4"
            >
              {t('demoHosting.link', 'Set up your own household')}
            </a>
          </>
        </DemoDialog>
      )}
    </div>
  );
}
