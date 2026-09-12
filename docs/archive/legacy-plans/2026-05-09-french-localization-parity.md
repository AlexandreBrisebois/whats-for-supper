# French Localization Parity Plan

## Objective

Bring the French UI experience up to parity with the current English-first PWA surface without changing API contracts or product behavior.

This is a frontend localization maintenance slice. The goal is to remove silent English fallback in French mode, normalize translation key usage, and add guardrails so future English copy does not drift past French again.

## Current Findings

- Locale files exist at `pwa/src/locales/{en,fr}/`.
- The runtime loader in `pwa/src/locales/index.ts` currently merges `common` and `hints`, but not `journeys`.
- English and French locale catalogs are nearly structurally aligned, but French has `profile.selectLanguage` where English has `profile.english`.
- Many UI calls use keys that are not present in the loaded catalog, causing fallback English in French mode.
- Some namespace drift exists, especially `navigation.*` in code versus `nav.*` in the catalog, and `common.*` in code versus `buttons.*` / `messages.*` in the catalog.
- Several visible UI strings remain hardcoded in English in app/components files.

## Already Started

- Added and validated a regression test at `pwa/src/locales/locale-integrity.test.ts`.
- Updated the runtime locale loader to deep-merge `common`, `hints`, and `journeys`.
- Repaired the active catalog drift caught by the guardrail.
- Converted the route-level not-found, error, landing, and invite copy to localized keys.

## Progress - 2026-05-09

- Phase 1 complete.
- Phase 2 complete for active `t(...)` / `tWithVars(...)` keys currently found in `pwa/src/app` and `pwa/src/components`.
- Phase 3 started with route-level high-visibility screens:
  - `pwa/src/app/not-found.tsx`
  - `pwa/src/app/error.tsx`
  - `pwa/src/app/page.tsx`
  - `pwa/src/app/(auth)/invite/page.tsx`
- Validation passed:
  - `task test:unit`
  - `task gate`

Remaining work is mostly the broader hardcoded-English sweep and French copy polish.

## Phase 1 - Guardrail And Loader Parity

Status: Complete.

Scope:

- Keep `pwa/src/locales/locale-integrity.test.ts`.
- Ensure the test verifies:
  - English and French catalogs expose the same flattened keys.
  - Every UI `t(...)` / `tWithVars(...)` key in `pwa/src/app` and `pwa/src/components` exists in both catalogs.
- Update `pwa/src/locales/index.ts` to include `journeys` in the runtime translation table if those keys are intended to be live.

Files:

- `pwa/src/locales/locale-integrity.test.ts`
- `pwa/src/locales/index.ts`

Validation:

- `task test:unit -- pwa/src/locales/locale-integrity.test.ts` if supported by the harness, otherwise `task test:unit`.

Exit criteria:

- The integrity test is meaningful and fails only for real drift.

## Phase 2 - Catalog Key Drift Repair

Status: Complete for active translation keys covered by the integrity test.

Scope:

- Normalize missing UI keys by adding aliases or renaming keys conservatively.
- Prefer adding aliases for existing shipped keys rather than sweeping component rewrites.
- Fix the known `profile.english` / `profile.selectLanguage` mismatch.
- Add missing French translations for current active UI keys.

Likely namespaces:

- `common.*`
- `navigation.*`
- `capture.*`
- `home.*`
- `planner.*`
- `recipes.*`
- `discovery.*`
- `profile.*`
- `family.*`
- `settings.*`
- `cook.*`

Files:

- `pwa/src/locales/en/common.json`
- `pwa/src/locales/fr/common.json`
- Potentially `pwa/src/locales/en/hints.json`
- Potentially `pwa/src/locales/fr/hints.json`

Validation:

- `task test:unit`.

Exit criteria:

- Locale integrity test passes.
- No active UI translation key falls back to English because of a missing French catalog entry.

## Phase 3 - High-Visibility Hardcoded English Sweep

Status: In progress.

Scope:

- Convert visible hardcoded English strings to `t(...)` in high-traffic surfaces first:
  - App shell / route titles.
  - Home tonight card and GOTO paths.
  - Planner pivot sheet and nudge dialog.
  - Capture success / link states.
  - Profile GOTO settings.
  - Error, not-found, invite, and browse stack loading states.
- Leave non-user-facing test IDs, logs, comments, route names, and mock data alone.
- Avoid broad UI refactors.

Candidate files:

- `pwa/src/app/not-found.tsx`
- `pwa/src/app/error.tsx`
- `pwa/src/app/page.tsx`
- `pwa/src/app/(auth)/invite/page.tsx`
- `pwa/src/app/(app)/layout.tsx`
- `pwa/src/app/(app)/planner/page.tsx`
- `pwa/src/app/(app)/browse-all-stack/page.tsx`
- `pwa/src/components/profile/FamilyGOTOSettings.tsx`
- `pwa/src/components/planner/PlanningPivotSheet.tsx`
- `pwa/src/components/planner/QuickFindModal.tsx`
- `pwa/src/components/home/TonightPivotCard.tsx`
- `pwa/src/components/home/HomeCommandCenter.tsx`
- `pwa/src/components/common/InviteLinkDialog.tsx`
- `pwa/src/components/capture/MinimalCapture.tsx`
- `pwa/src/components/capture/RatingSelector.tsx`
- `pwa/src/components/capture/SubmitConfirmation.tsx`

Validation:

- `task test:unit`.
- Run targeted component tests touched by the sweep if the harness reports failures.

Exit criteria:

- French mode no longer shows obvious English copy across the primary app flows.
- Existing tests either continue to pass or are updated only where copy-sensitive assertions intentionally changed.

## Phase 4 - French Copy Polish

Scope:

- Review French copy for tone, consistency, and Canadian household usage.
- Prefer concise, natural French over literal translation.
- Keep product names and intentional branded terms stable unless a clear French label exists.
- Check length-sensitive labels on compact controls.

Focus areas:

- Planner actions.
- Home recovery flow.
- Capture and GOTO flows.
- Empty/loading/error states.

Validation:

- Manual smoke in French mode.
- Optional Playwright screenshot pass for the main mobile routes.

Exit criteria:

- French copy reads intentionally authored, not machine-patched.
- Compact buttons and labels still fit.

## Phase 5 - Final Verification

Scope:

- Run the repo-approved validation loop appropriate for frontend-only copy/i18n changes.

Commands:

- `task test:unit`
- `task gate`
- `task agent:drift` only if any generated contract/client surface unexpectedly changed.
- `task review` before merge if time allows.

Exit criteria:

- Tests pass.
- No contract/API drift introduced.
- Final summary lists changed files and remaining risks.

## Open Decisions

- Whether to preserve both `nav.*` and `navigation.*` as aliases, or migrate code to one namespace. Recommended: preserve aliases now for surgical safety, consolidate later only if desired.
- Whether `journeys.json` is active product copy or stale Phase 0 copy. Recommended: include it in the loader for parity now, then audit stale keys separately.
- How exhaustive Phase 3 should be in one pass. Recommended: prioritize visible app flows and leave lower-risk cleanup for a follow-up if the change set grows too large.
