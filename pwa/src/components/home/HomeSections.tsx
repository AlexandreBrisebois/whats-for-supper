'use client';

import { ChevronRight, Plus } from 'lucide-react';
import Link from 'next/link';
import { ROUTES } from '@/lib/constants/routes';
import { useLocale } from '@/components/common/LocaleProvider';
import { t } from '@/locales';
import { SuccessCard } from '@/components/ui/SuccessCard';

export function QuickCaptureTrigger() {
  const { locale } = useLocale();
  return (
    <Link
      href={ROUTES.CAPTURE}
      data-testid="quick-capture-trigger"
      className="group relative flex items-center justify-between w-full bg-white text-ink-body p-4 sm:p-6 rounded-[2.5rem] border-2 border-chrome-line transition-all active:scale-[0.98] hover:border-hearth-line focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-hearth-ink"
    >
      <div className="flex items-center gap-3 sm:gap-5">
        <div className="flex h-11 w-11 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-terracotta/10 text-hearth-ink transition-colors group-hover:bg-hearth-fill group-hover:text-white">
          <Plus
            size={28}
            strokeWidth={2.2}
            data-testid="quick-capture-plus-icon"
            aria-hidden="true"
          />
        </div>
        <div className="flex flex-col">
          <span className="font-heading text-[1.05rem] sm:text-xl font-black tracking-tighter leading-none">
            {t('home.captureRecipe', 'Capture a Recipe', locale)}
          </span>
          <span className="text-ink-muted text-xs font-medium mt-1">
            {t('home.snapPasteUploadDescribe', 'Snap, paste, upload, or describe', locale)}
          </span>
        </div>
      </div>
      <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full border border-chrome-line flex items-center justify-center group-hover:border-hearth-line">
        <ChevronRight
          size={20}
          className="text-icon-affordance group-hover:text-hearth-ink transition-all group-hover:translate-x-0.5"
        />
      </div>
    </Link>
  );
}
export function CookedSuccessCard({ onDismiss }: { onDismiss?: () => void }) {
  return (
    <SuccessCard
      testId="cooked-success-card"
      titleTestId="cooked-success-title"
      actionTestId="cooked-success-dismiss"
      title={t('home.enjoyMeal', 'Enjoy your meal!')}
      description={t('home.markedAsCooked', 'Recipe marked as cooked')}
      actionLabel={t('home.dismiss', 'Dismiss')}
      onAction={onDismiss}
    />
  );
}
