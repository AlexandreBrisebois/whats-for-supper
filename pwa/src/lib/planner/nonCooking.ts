import type { NonCookingPlanDto } from '@/lib/api/generated/models';
import { getLocale, t } from '@/locales';

export function nonCookingLabel(plan?: NonCookingPlanDto | null): string {
  if (plan?.kind === 'custom') return plan.customLabel ?? '';
  if (plan?.kind === 'mystery') return t('planner.mysteryNight', 'Mystery night');
  if (plan?.kind === 'eating_out') return t('planner.eatingOut', 'Eating out');
  return t('home.orderingIn', 'Order In');
}

export function formatSupperPlanDate(date: string): string {
  return new Intl.DateTimeFormat(getLocale() === 'fr' ? 'fr-CA' : 'en-CA', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T12:00:00Z`));
}
