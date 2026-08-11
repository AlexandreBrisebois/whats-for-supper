import { Check, Flag } from 'lucide-react';
import type { RecipeImportIssueStatus } from '@/lib/api/recipes';

export function RecipeImportIssueBadge({ status }: { status: RecipeImportIssueStatus }) {
  const ready = status === 'readyToReview';
  const label = ready ? 'Ready to review' : 'Reported';

  return (
    <span
      data-testid={`recipe-import-issue-status-${status}`}
      aria-label={`Import issue status: ${label}`}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
        ready ? 'bg-sage-100 text-sage-800' : 'bg-ochre-50 text-ochre-800'
      }`}
    >
      {ready ? <Check size={14} aria-hidden="true" /> : <Flag size={14} aria-hidden="true" />}
      {label}
    </span>
  );
}
