import { CalendarDays, ShoppingBag, UtensilsCrossed } from 'lucide-react';
import type { NonCookingPlanDto } from '@/lib/api/generated/models';

export function NonCookingIcon({
  kind,
  size = 24,
  className,
}: {
  kind?: NonCookingPlanDto['kind'] | null;
  size?: number;
  className?: string;
}) {
  const Icon =
    kind === 'custom' ? CalendarDays : kind === 'eating_out' ? UtensilsCrossed : ShoppingBag;
  return <Icon size={size} strokeWidth={2} className={className} aria-hidden="true" />;
}
