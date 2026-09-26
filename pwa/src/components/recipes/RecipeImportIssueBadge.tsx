import { Check, Flag } from 'lucide-react';
import { t } from '@/locales';
import type { RecipeImportIssueStatus } from '@/lib/api/recipes';

type RecipeImportIssueBadgeProps = {
  status: RecipeImportIssueStatus;
  variant?: 'default' | 'compact';
};

export function RecipeImportIssueBadge({
  status,
  variant = 'default',
}: RecipeImportIssueBadgeProps) {
  const ready = status === 'readyToReview';
  const visualLabel = ready
    ? t('recipes.importIssueReview', 'Review')
    : t('recipes.importIssueReported', 'Reported');
  const accessibleLabel = ready
    ? t('recipes.importIssueReadyToReviewDescription', 'Recipe updated — ready to review')
    : t('recipes.importIssueReportedDescription', 'Recipe reported');
  const compact = variant === 'compact';

  return (
    <span
      data-testid={`recipe-import-issue-status-${status}`}
      aria-label={accessibleLabel}
      className={`inline-flex items-center rounded-full ${
        compact
          ? 'shrink-0 gap-1 whitespace-nowrap px-2 py-0.5 text-[10px] font-semibold uppercase leading-4'
          : 'gap-1.5 px-3 py-1 text-xs font-bold'
      } ${ready ? 'bg-sage-100 text-sage-800' : 'bg-ochre-50 text-ochre-800'}`}
    >
      {ready ? (
        <Check size={compact ? 12 : 14} aria-hidden="true" />
      ) : (
        <Flag size={compact ? 12 : 14} aria-hidden="true" />
      )}
      {visualLabel}
    </span>
  );
}
