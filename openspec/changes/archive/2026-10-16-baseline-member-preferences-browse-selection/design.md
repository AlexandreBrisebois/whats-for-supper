# Design

## Context

See proposal.md for motivation. The first observable slice is initial library presentation and its toggle. BrowseAllStackPage derives saved mode from familyStore, gives a member-scoped page override precedence and calls the existing preference PUT. FamilyService saves it on family_members.

## Goals / Non-Goals

**Goals:** Extract the traced observable slice with explicit ownership and evidence limits.

**Non-Goals:** Application changes, runtime/database/device qualification, acceptance, main-spec promotion, or repair of the recorded limitations.

## Decisions

- Keep preference choice here; reference recipe-library “Open the household library and offer list presentation” and “Request list pages for the selected library filter” for local consumer behavior. Do not duplicate recipe eligibility or pagination.
- Include confirmed save/reload and member-scoped override only. The alternative of promising failed-save visual rollback is unsupported by the store/page return-value seam.

Evidence and requirement/scenario mappings: BSL-member-preferences-005–006 in the [capability plan](../../../../docs/openspec-baseline/member-preferences.md). A10 implementation support is distinct from A34 runtime evidence.

## Risks / Trade-offs

- familyStore catches rejection, restores the profile and returns null; the page only catches thrown rejection and retains its override → U-MP04, withhold visual rollback and visible save-error guarantees.
- Page tests use the real family store with substituted generated API methods, routing and motion; service tests use EF InMemory → no live persistence or device evidence.
