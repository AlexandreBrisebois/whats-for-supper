import { afterEach, expect, it, vi } from 'vitest';
import { observeIssueResult, type IssueResultReason } from './issue-results';
import { observeOpening, observeOriginalRequest } from './opening';
import { parseBrowserObservation, type BrowserObservation } from './navigation';

const reasons = [
  'saved_manual',
  'processing_acknowledged',
  'saved_launch_failed',
  'unconfirmed',
] as const;
function owner() {
  const doc = document.implementation.createHTMLDocument();
  let visible = true;
  Object.defineProperty(doc, 'visibilityState', { get: () => (visible ? 'visible' : 'hidden') });
  return {
    doc,
    visibility: (value: boolean) => {
      visible = value;
    },
  };
}
const observe = (
  doc: Document,
  reason: string,
  submit: (input: BrowserObservation) => Promise<void>
) => observeIssueResult(doc, reason as IssueResultReason, submit);
afterEach(() => vi.restoreAllMocks());

it('admits four fixed result reasons in the existing document stream with new occurrence identity', () => {
  const { doc } = owner();
  const submit = vi.fn().mockResolvedValue(undefined);
  observeOpening(doc, true, '/recipes', submit);
  for (const reason of reasons) observe(doc, reason, submit);
  observeOriginalRequest(doc, submit);
  const stream = submit.mock.calls.map(([event]) => event);
  expect(stream.map((e) => e.eventName)).toEqual([
    'pwa.app.opened',
    'pwa.screen.presented',
    ...reasons.map(() => 'pwa.recipe_issue.save_result'),
    'pwa.original.requested',
  ]);
  expect(stream.slice(2, 6).map((e) => e.reason)).toEqual(reasons);
  expect(stream.map((e) => e.sequence)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  expect(new Set(stream.map((e) => e.eventId)).size).toBe(7);
  expect(new Set(stream.map((e) => e.sessionId)).size).toBe(1);
  expect(new Set(stream.map((e) => e.tabId)).size).toBe(1);
  for (const event of stream.slice(2, 6)) {
    expect(event.screen).toBe('search');
    expect(Object.keys(event).sort()).toEqual([
      'eventId',
      'eventName',
      'reason',
      'screen',
      'sequence',
      'sessionId',
      'tabId',
      'timestamp',
    ]);
    expect(parseBrowserObservation(event, Date.now())).toEqual(event);
  }
});

it('shares ten attempts across callers, navigation, rerenders and minute rollover without delivery rearming', () => {
  const { doc } = owner();
  const submit = vi.fn().mockRejectedValue(new Error('private-sentinel'));
  vi.spyOn(Date, 'now').mockReturnValue(1_800_000_000_000);
  observeOpening(doc, true, '/recipes', submit);
  for (let i = 0; i < 8; i++) observe(doc, reasons[i % 4], submit);
  observeOpening(doc, true, '/home', submit);
  vi.mocked(Date.now).mockReturnValue(1_800_000_060_001);
  observeOpening(doc, true, '/recipes', submit);
  for (let i = 0; i < 8; i++) observe(doc, reasons[i % 4], submit);
  const events = submit.mock.calls
    .map(([e]) => e)
    .filter((e) => e.eventName === 'pwa.recipe_issue.save_result');
  expect(events).toHaveLength(10);
  expect(new Set(events.map((e) => e.eventId)).size).toBe(10);
  const independent = owner().doc;
  observeOpening(independent, true, '/recipes', submit);
  observe(independent, 'saved_manual', submit);
  expect(
    submit.mock.calls.filter(([e]) => e.eventName === 'pwa.recipe_issue.save_result')
  ).toHaveLength(11);
});

it('drops hidden, disabled, unready and uninitialized settlements without replay or scope allocation', () => {
  const submit = vi.fn().mockResolvedValue(undefined);
  const { doc, visibility } = owner();
  observe(doc, 'saved_manual', submit);
  expect(submit).not.toHaveBeenCalled();
  observeOpening(doc, true, '/recipes', submit);
  visibility(false);
  observe(doc, 'saved_manual', submit);
  visibility(true);
  observeOpening(doc, true, '/recipes', submit);
  observeOpening(doc, true, null, submit);
  observe(doc, 'unconfirmed', submit);
  observeOpening(doc, false, '/recipes', submit);
  observe(doc, 'unconfirmed', submit);
  observeOpening(doc, true, '/recipes', submit);
  expect(
    submit.mock.calls.filter(([e]) => e.eventName === 'pwa.recipe_issue.save_result')
  ).toHaveLength(0);
  observe(doc, 'unconfirmed', submit);
  expect(
    submit.mock.calls.filter(([e]) => e.eventName === 'pwa.recipe_issue.save_result')
  ).toHaveLength(1);
});

it('contains synchronous submission failure and validates reason before consuming the cap', () => {
  const { doc } = owner();
  const submit = vi.fn().mockResolvedValue(undefined);
  observeOpening(doc, true, '/recipes', submit);
  const throws = vi.fn(() => {
    throw new Error('private-sentinel');
  });
  for (let i = 0; i < 20; i++) observe(doc, 'private-sentinel', throws);
  expect(throws).not.toHaveBeenCalled();
  for (let i = 0; i < 20; i++) expect(() => observe(doc, 'unconfirmed', throws)).not.toThrow();
  expect(throws).toHaveBeenCalledTimes(10);
});
