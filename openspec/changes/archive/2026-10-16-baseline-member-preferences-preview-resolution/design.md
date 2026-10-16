# Design

## Context

See proposal.md for motivation. The first observable configuration slice is the API snapshot for one established member. Program registers FeatureFlagRegistry as singleton and FeatureFlagService as scoped. Registry configuration is read on construction; changing environment is not a promised live reload. Overrides use the (member_id, flag_key) key with a cascading member foreign key. Consumers are CooksMode, PlannerDragHandle, MinimalCapture/PdfCapturePanel and PdfCaptureController.

## Goals / Non-Goals

**Goals:** Extract the traced observable slice with explicit ownership and evidence limits.

**Non-Goals:** Application changes, runtime/database/device qualification, acceptance, main-spec promotion, or repair of the recorded limitations.

## Decisions

- Resolve mode on the server; never recreate deployment precedence in consuming UI. The alternative of treating memberEnabled as effective enablement contradicts fixed on/off modes.
- Reference actual accepted cooking “Read all instructions under the effective single-page flag” and “Navigate one focused instruction at a time”; recipe-capture “Gate PDF acquisition by effective member eligibility”, “Resolve PDF draft eligibility and discard interrupted drafts” and “Request the configured processing language without certifying output language” retain their ownership.
- Describe only the planner mode-selection consequence here. Calendar mutation policy remains meal-planning; its exact touch thresholds and gesture cancellation are consumer details recorded as evidence/exclusion.
- Bound API status claims to aligned contract paths. Snapshot nonexistent-member 404 is implementation-supported but omitted from GET OpenAPI; do not make that disputed response normative.

Evidence and requirement/scenario mappings: BSL-member-preferences-013–016 in the [capability plan](../../../../docs/openspec-baseline/member-preferences.md). A10 implementation support is distinct from A34 runtime evidence.

## Risks / Trade-offs

- Local apps Compose forwards cooking/planner flags but not PDF; Synology template forwards all three to API → U-MP07, no general deployment parity claim.
- Public default locale is a PWA public environment input; a runtime-only container value does not establish built bundle behavior → U-MP08.
- Snapshot missing-member 404 is absent from OpenAPI GET responses → U-MP09.
- Fixed-mode DTO optional fields are null under Program serialization but OpenAPI declares optional non-null scalar fields → U-MP10; withhold exact optional-field wire shape.
- EF InMemory tests do not prove PostgreSQL keys/cascade or migrations. Consumer tests inject resolved flags and synthetic browser events; no physical-device or cross-process evidence.
