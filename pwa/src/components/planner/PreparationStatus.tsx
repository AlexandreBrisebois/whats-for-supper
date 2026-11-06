import type { SupperPreparation } from '@/lib/api/generated/models';
import { getLocale, t, tWithVars } from '@/locales';

export function PreparationStatus({ preparation }: { preparation: SupperPreparation }) {
  const date = preparation.preparedOn?.toString();
  const formatted = date
    ? new Intl.DateTimeFormat(getLocale() === 'fr' ? 'fr-CA' : 'en-CA', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      }).format(new Date(date + 'T12:00:00Z'))
    : '';
  return (
    <span
      data-testid="preparation-status"
      className="flex min-w-0 flex-col gap-1 text-sm leading-relaxed text-sage-700"
    >
      <span className="font-semibold">{t('cook.alreadyPrepared', 'Already prepared')}</span>
      {formatted && (
        <span>{tWithVars('cook.preparedOn', 'Prepared {{date}}', { date: formatted })}</span>
      )}
    </span>
  );
}
