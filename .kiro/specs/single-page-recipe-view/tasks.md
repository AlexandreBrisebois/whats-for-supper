# Recipe on one page — Tasks

**Status:** Tasks 1–4 approved for coupled implementation on 2026-09-30

**Requirements:** [requirements.md](requirements.md)

**Design:** [design.md](design.md)

## Task 1 — Preserve source identity while parsing

Add failing parser tests for flat strings, HowToStep objects, and structured
sections, then expose enough stable source identity to update the displayed step
without changing its normalized display contract.

**Test seam:** parser unit suite; no browser mock change is expected unless the
displayed recipe contract changes.

## Task 2 — Share Cook's Mode behavior and add the boundary

Add failing component tests, extract shared preparation/editing/completion behavior,
and select the focused or single-page instruction presentation through the approved
feature hook only after preparation.

**Test seam:** Cook's Mode component suite plus the feature-flag API mock in
`pwa/e2e/mock-api.ts`; `GET /api/feature-flags` supplies the effective-state
snapshot used by the Playwright scenario.

## Task 3 — Implement the single-page experience

Render ordered steps in one scrolling surface within the current responsive shell.
Implement per-row accessible edit, Save, Cancel, inline failure, Retry, live success,
issue reporting, and Done behavior without losing scroll or checklist state.

**Test seam:** in-place save uses the existing recipe-update API mock in
`pwa/e2e/mock-api.ts`; the Playwright scenario must exercise success and failed save
responses without bypassing the component boundary.

## Task 4 — Acceptance and rollout evidence

Exercise flag `off`, `opt-in`, and `on`; run focused unit/E2E checks; capture phone
and iPad landscape screenshots; and record rollback to the focused-step path. Do not
graduate or delete the legacy path in this task.

**Test seam:** extend the Cook's Mode Playwright spec or add one dedicated scenario;
use `mockFeatureFlags` for all three modes, the standard recipe-update mock for save,
and a test-local failed-save route. Expected feature snapshot envelope is
`{ data: FeatureFlagDto[] }`; update the mock owner with the contract task, before
the browser scenario is run.

## 2026-10-06 — Ingredient recovery and scan-friendly cards

Authorized by the cooking-experience owner's request to implement ingredient
recovery, a slimmer dock, and scan-friendly cards across varying extraction formats.
Implements SPRV-09; this does not graduate the preview or change extraction/API data.

- Ingredients preserves checklist checks and the stored step bookmark. Resume steps
  restores the exact reading offset. An open editor disables ingredient navigation.
- The single-page dock uses 48px buttons, compact padding, and the device safe area.
- Supplied step titles and section metadata provide context; untitled steps show
  their number and instructions. Sentence spacing improves scanning without rewriting
  or emphasizing instruction content. Unit coverage verifies exact text preservation,
  multiple languages, decimal quantities, and unavailable sentence segmentation.
- Passed: 649 PWA unit tests, PWA lint, TypeScript, formatting, diff whitespace, and
  static route/schema/mock reconciliation.
- Browser evidence from the earlier revision: tablet recovery/dock/bookmark scenario
  and legacy completion passed. Phone recovery failed because Next.js's development issues badge intercepted
  the tap. A test-local badge-collapse step was added; the rerun was blocked by
  `listen EPERM` on port 3000. Final phone/browser acceptance remains unverified,
  including the subsequent removal of automatic measurement emphasis requested by
  the owner to keep this change focused on card presentation.
- Blocked: API tests could not start their test-host socket; generated-client check
  timed out after 20 seconds. Neither is reported as passed.
- Formal begin/prepare/session/finish are blocked by the pre-existing stale ID-T4
  session. It was preserved. A separate private baseline and scope review are in
  `.task/cooks-mode-ingredients-scan-friendly/`; no unrelated API/PDF work was adopted.
- Local remaining checks: `task review` and
  `task test:e2e -- e2e/cook-mode-steps.spec.ts --reporter=list --workers=1`.


## 2026-10-06 — Cookbook step refinement

Authorized by the owner's request to implement the Mère-Designer recommendation
on `feature/single-page-recipe-view`. Task session: `single-page-cookbook-refinement`,
baseline `9459057b38b681f38609550921d21ef4ac61f066`; no ambient changes at begin.

- CooksMode places number, meaningful title and 44px edit action on one row.
  Untitled steps begin beside the number. A phone screenshot review found the
  first implementation reserved the pencil gutter for the entire paragraph;
  correction floats the pencil so following lines regain the available width.
- instructionPresentation preserves exact source strings and explicit blank-line
  paragraphs, rather than splitting every sentence. Saving uses the original text.
- Focused component/formatter checks: 28 passed. Cook Mode Playwright suite:
  3 passed, including 390px and 1180px layouts, paragraph count, body width,
  edit targets, bookmark/reopening, ingredient recovery and legacy completion.
- Mère-Designer screenshot review: step landmarks, reading rhythm and reachable
  controls meet the requested busy-parent criteria after the width correction.
  This is a design review, not user research. Test screenshots lack the remote
  recipe photograph because its request failed certificate validation.
- Scope: component and formatter implement the presentation; their existing tests
  and Cook Mode browser scenarios cover regression behavior; requirements/design
  record the authorized refinement. No API or stored recipe schema changed.
- Focused ESLint and diff whitespace passed. Broad completion results are recorded
  separately in `.task/agent-finish/last-run.json`; they must not be inferred from
  focused acceptance. .NET is unavailable in this execution environment.

- Subsequent broad PWA unit run: 653 passed across 71 files. PWA-wide ESLint,
  TypeScript and formatting passed. The bounded broad impact run was stopped at
  180 seconds; API/contract completion is unverified. The completion record also
  detects Next dev's generated next-env.d.ts import change. Only that known
  generated change was restored after the server stopped; no successful final
  repository-wide completion is claimed. Focused acceptance above remains the
  evidence for the implemented cooking interaction.


### Follow-up — Remove generated card numbering

Owner requested removing system-generated numbers to avoid duplication with
extracted numbering. Removed the visible number and its grid column in the
single-page cards. Source text, accessible Edit step N labels, internal step IDs,
scroll bookmarking and the top progress indicator retain their existing behavior.
The component regression fixture now includes extraction-supplied numbering and
checks that the card shows it exactly once.

Follow-up validation: all 17 CooksMode component tests and all 3 Cook Mode browser
scenarios passed (phone, tablet and legacy completion). Focused ESLint and diff
whitespace passed. Restored only the known Next dev generated import change.

The follow-up broad finish attempt remains incomplete: .NET lint cannot run,
and the bounded run was terminated before full completion. Its output is in
`/tmp/wfs-numberless-finish.log`; no repository-wide pass is claimed.
