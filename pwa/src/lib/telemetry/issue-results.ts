import { emitDocumentIssueResult } from './opening';
import type { BrowserObservation } from './navigation';

// Fixed response classifications only. Submission/recipe identity stays with its UI owner.
export const issueResultReasons = [
  'saved_manual',
  'processing_acknowledged',
  'saved_launch_failed',
  'unconfirmed',
] as const;
export type IssueResultReason = (typeof issueResultReasons)[number];
export function isIssueResultReason(value: unknown): value is IssueResultReason {
  return typeof value === 'string' && (issueResultReasons as readonly string[]).includes(value);
}

// The mounted detail owner guards its current submission before calling once.
// The document owner supplies existing context, visibility/readiness and shared cap.
export function observeIssueResult(
  owner: Document,
  reason: IssueResultReason,
  submit: (input: BrowserObservation) => Promise<void>
): void {
  try {
    if (!isIssueResultReason(reason)) return;
    emitDocumentIssueResult(owner, reason, submit);
  } catch {
    /* Reporting cannot change Save response/error/draft handling. */
  }
}
