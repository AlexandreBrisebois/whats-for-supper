# Interface Localization — Requirements

**Kind:** Current-capability feature specification

**Derivation:** Behavior-first, accelerated cadence

**Source:** `PREF-01` in [`docs/feature-inventory.md`](../../../docs/feature-inventory.md), verified against current non-archived source, contract, and tests

**Status:** Baseline proposal for future change control; this specification does not authorize implementation

## Outcome

Each family member can use the WFS interface in English or French, with a stable preference and a non-disruptive proposal when browser and saved language differ.

## Scope

### In scope

- English and French interface copy
- member-scoped language preference and local fallback
- locale integrity and browser-language proposal

### Non-goals

- translating stored recipe content at display time
- adding a third locale without a separately approved content and test plan

## Verified current baseline

- `pwa/src/components/common/LocaleProvider.tsx` derives locale from the selected member and falls back to locally persisted state.
- `pwa/src/components/profile/LanguageSelection.tsx` writes the locale and member preference; `LanguageSwitchProposal.tsx` handles mismatch guidance.
- `pwa/src/locales/en/`, `pwa/src/locales/fr/`, and `locale-integrity.test.ts` own dictionaries and parity evidence.

The baseline records current ownership; it is evidence to review, not a requirement
that every implementation detail remain unchanged.

## Requirements

### PREF-01-R1 — Selection

A member can select English or French; after confirmation, navigation and reload shall render that member’s interface in the selected locale.

### PREF-01-R2 — Identity isolation

Changing the active member shall resolve that member’s preference without leaking the prior member’s selection.

### PREF-01-R3 — Fallback

When no valid member preference exists, the client shall use the locally persisted supported locale and otherwise the documented default.

### PREF-01-R4 — Proposal

A browser/saved-language mismatch may produce a dismissible proposal; it shall not block the active meal workflow.

### PREF-01-R5 — Parity

Every required interface key shall have English and French values, with parameter interpolation and fallback behavior covered by automated integrity checks.

### PREF-01-R6 — Boundary

Interface language shall not imply translation of stored recipes or change the administrator-owned import target language.

## Preserved behavior

- Existing household meal workflows remain usable when this capability is degraded,
  except where the capability is the explicit security or persistence prerequisite.
- Changes preserve household/member boundaries and do not broaden collection of
  recipe, identity, or secret data.
- OpenAPI remains authoritative for any affected API operation.

## Acceptance scenarios

1. The primary success path satisfies every `PREF-01-R*` requirement with the
   selected household/member context.
2. Missing, stale, invalid, or unavailable dependencies produce the specified safe
   fallback or explicit failure rather than false success.
3. A second device, late response, retry, or identity change cannot silently replace
   newer authoritative state.
4. The affected behavior is operable with its required non-pointer alternative and
   exposes meaningful state to assistive technology where a UI exists.
5. Contract, persistence, and workflow changes are proven at their actual seams,
   not inferred from a static or mocked check alone.

## Decisions retained by this baseline

- Current public behavior is the starting compatibility boundary, not immutable
  architecture.
- Household data remains self-hosted and the least-privilege/least-data behavior is
  preferred.
- Background work must report accepted, completed, and failed states distinctly.

## Open questions before a future change

1. Which requirement is being changed, and what current behavior must remain
   backward compatible during rollout?
2. Does the change alter OpenAPI, persistence, deployment configuration, event
   delivery, or another feature spec? If so, approve those handshakes first.
3. What production or real-device evidence is required beyond repository automation
   for the selected change?
