import { Check } from 'lucide-react';
import type { SupperPreparation } from '@/lib/api/generated/models';
import { getLocale, t, tWithVars } from '@/locales';

export function PreparationStatus({
  preparation,
  variant = 'default',
}: {
  preparation: SupperPreparation;
  variant?: 'default' | 'compact';
}) {
  const locale = getLocale() === 'fr' ? 'fr-CA' : 'en-CA';
  const date = preparation.preparedOn?.toString() ?? '';
  const formatted = date
    ? new Intl.DateTimeFormat(locale, {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      }).format(new Date(date + 'T12:00:00Z'))
    : '';

  if (variant === 'compact') {
    return (
      <span
        data-testid="preparation-status"
        title={
          formatted
            ? tWithVars('cook.preparedOn', 'Prepared {{date}}', { date: formatted })
            : undefined
        }
        className="inline-flex w-fit items-center gap-1 whitespace-nowrap rounded-full border border-garden-line bg-sage-50 px-2 py-0.5 text-xs font-semibold text-garden-ink"
      >
        <Check size={12} strokeWidth={2.5} aria-hidden="true" className="shrink-0" />
        <span>{t('cook.prepared', 'Prepared')}</span>
      </span>
    );
  }

  return (
    <span
      data-testid="preparation-status"
      className="flex min-w-0 flex-col gap-1 text-sm leading-relaxed text-garden-ink"
    >
      <span className="font-semibold">{t('cook.alreadyPrepared', 'Already prepared')}</span>
      {formatted && (
        <span>{tWithVars('cook.preparedOn', 'Prepared {{date}}', { date: formatted })}</span>
      )}
    </span>
  );
}
