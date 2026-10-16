# Design

## Context

See proposal.md for motivation. The first observable slice is Profile English/French choice. Its boundaries are LanguageSelection → LocaleProvider and familyStore → family client/generated PUT → FamilyController → FamilyService → family_members; the protected-layout language proposal changes browser storage only. Root layout mounts LocaleProvider. IdentityHint explicitly passes its resolved locale into translation lookup, while most callers do not.

## Goals / Non-Goals

**Goals:** Extract supported member/browser resolution and distinguish local choice, optimistic member state, successful persistence and reload.

**Non-Goals:** Full application localization, translation quality, storage-denied recovery, concurrent-save correctness, recipe content translation, contract repair, or runtime qualification.

## Decisions

- Use implementation-supported requirements under A10; keep actual test substitutions and mappings in BSL-member-preferences-001–004 in the [plan](../../../../docs/openspec-baseline/member-preferences.md).
- The user explicitly accepted current language-only API behavior on 2026-10-16. Include it with the OpenAPI disagreement visible; the alternative of withholding it was declined. No contract or client edits follow from this documentation decision.
- Describe provider resolution separately from translation lookup. Treating provider locale as a universal translation guarantee would contradict locales/index.ts and the call sites.
- Reference household-identity “Resolve the current member through the API” and “Recover identity when the protected client has no selection” for identity establishment, rather than restating cookie/access policy.
- Preserve recipe-capture “Request the configured processing language without certifying output language” as the processing-language owner. Member selection does not redefine capture policy.

## Risks / Trade-offs

- Browser-local locale survives a failed member update while familyStore restores the old member → record U-MP01; do not promise globally consistent language or success feedback.
- Most translation calls omit provider locale and read browser storage → record U-MP02; only claim the traced lookup behavior.
- LanguageSelection tests substitute provider, translations and store; proposal tests substitute provider and browser language with fake timers → assertions support wiring, not persistence or device qualification.
- Language-only acceptance conflicts with OpenAPI required browseViewMode → retain U-MP03 for human reconciliation outside this generation scope.
