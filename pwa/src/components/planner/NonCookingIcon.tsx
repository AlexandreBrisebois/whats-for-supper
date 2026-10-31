import { CalendarDays, Sparkles, ShoppingBag, UtensilsCrossed } from 'lucide-react';
import type { NonCookingPlanDto } from '@/lib/api/generated/models';

export function NonCookingIcon({
  kind,
  size = 24,
  strokeWidth = 2,
  className,
}: {
  kind?: NonCookingPlanDto['kind'] | null;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  const Icon =
    kind === 'custom'
      ? CalendarDays
      : kind === 'mystery'
        ? Sparkles
        : kind === 'eating_out'
          ? UtensilsCrossed
          : ShoppingBag;
  return <Icon size={size} strokeWidth={strokeWidth} className={className} aria-hidden="true" />;
}
