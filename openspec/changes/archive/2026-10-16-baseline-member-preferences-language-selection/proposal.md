# Proposal

## Why

Existing English/French controls and member/browser resolution need a reviewable brownfield baseline. This documents traced behavior without asserting full application localization or runtime qualification.

## What Changes

- Draft profile language choice, local initialization, member precedence and browser-language proposal behavior.
- Record the accepted language-only implementation behavior, its contract disagreement and the translation-resolution split in the capability plan.
- Stop at human-review drafts under A10/A34; no acceptance, promotion, archival or application edits.

## Capabilities

### New Capabilities

- `member-preferences`: Member language selection and browser/member locale resolution; a shared capability to be extended by separately bounded preference slices.

### Modified Capabilities

None. Household identity and recipe capture keep their accepted ownership.

## Impact

Documentation only. Read-only boundaries: Profile → LanguageSelection → LocaleProvider/familyStore → family client → FamilyController/FamilyService → family_members; protected-layout LanguageSwitchProposal → browser storage. Evidence: BSL-member-preferences-001–004 in [capability plan](../../../../docs/openspec-baseline/member-preferences.md). No API, generated client, test, SQL or configuration changes. The user explicitly accepted current language-only API success on 2026-10-16; its OpenAPI disagreement remains recorded. Contract-valid combined updates are covered in the API slice.
