import type { NonCookingPlanDto } from '@/lib/api/generated/models';
import { t } from '@/locales';

export function nonCookingLabel(plan?: NonCookingPlanDto | null): string {
  if (plan?.kind === 'custom') return plan.customLabel ?? '';
  if (plan?.kind === 'eating_out') return t('planner.eatingOut', 'Eating out');
  return t('home.orderingIn', 'Ordering In');
}
