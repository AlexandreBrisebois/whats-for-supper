'use client';

import { createContext, useContext, useId, type ReactNode } from 'react';
import { useLocale } from '@/components/common/LocaleProvider';
import { t } from '@/locales';
import type { AppIdentity } from '@/lib/server/app-identity';

type InstallIdentity = Pick<AppIdentity, 'demo' | 'channel'>;
const IdentityContext = createContext<InstallIdentity>({ demo: false, channel: 'stable' });

export function InstallIdentityProvider({
  identity,
  children,
}: {
  identity: InstallIdentity;
  children: ReactNode;
}) {
  return <IdentityContext.Provider value={identity}>{children}</IdentityContext.Provider>;
}

/** Informational only: identity never grants access or changes demo behavior. */
export function IdentityHint({ className = '' }: { className?: string }) {
  const { demo, channel } = useContext(IdentityContext);
  const { locale } = useLocale();
  const descriptionId = useId();
  if (!demo && channel === 'stable') return null;

  const label = demo
    ? t('installIdentity.demo', 'Demo', locale)
    : t('installIdentity.beta', 'Beta', locale);
  const overlap = demo && channel === 'beta';
  return (
    <span
      role="note"
      aria-label={label}
      aria-describedby={overlap ? descriptionId : undefined}
      data-testid="identity-hint"
      className={`absolute pointer-events-none select-none whitespace-nowrap text-[9px] leading-[10px] font-medium text-charcoal/70 ${className}`}
    >
      {label}
      {overlap && (
        <span id={descriptionId} className="sr-only">
          {t('installIdentity.betaChannel', 'Beta release channel', locale)}
        </span>
      )}
    </span>
  );
}
