# Design

## Context and Existing Ownership

Source inspection at `3d1bd68ea0965bb6df2c3689dd8f4aed1c6e598e`:
- `pwa/src/app/(app)/discovery/page.tsx` owns the bottom button row and front-card callbacks; `DiscoveryCard` owns card dragging. Preserve queue and convergence ownership.
- `pwa/src/components/common/Layout.tsx` reserves bottom padding with safe-area inset; `Navigation.tsx` owns the fixed dock and raised Discover link. Their interaction with Discovery's available height is an investigation boundary, not a confirmed iPad cause.
- `pwa/src/components/planner/PlannerDragHandle.tsx` already distinguishes deliberate hold from scroll, cancels on pointer interruption/blur, and supports a keyboard alternative. Reuse its established interaction principles and existing motion primitives where appropriate; do not couple Discovery to planner-specific day movement or introduce a gesture framework.
- `pwa/src/store/familyStore.ts` has per-member save generations and field-specific rollback. Its successful response merges known preference fields; these safeguards do not prove selection-generation or overlapping-field safety for the new choice.
- `pwa/src/lib/api/family.ts`, `FamilyController.UpdatePreferences`, `FamilyService.UpdateFamilyMemberPreferences`, member DTO/model and EF/schema are the existing preference seam. No position field exists.
- `FeatureFlagRegistry` currently has no entries. Its existing service, provider/store and PreviewFeaturesSection already own off/opt-in/on behavior and member choice. See `docs/feature-flags.md`.

Canonical capability deltas accompany this design. Existing historical single-save wording must be reconciled specifically for placement, not used to reintroduce whole-profile rollback.

## Decisions and Tradeoffs

Use a discrete nullable member preference, proposed name `discoveryControlsPosition`, values `left | right | bottom`; absent means Bottom. No coordinates, local-only durable store or new synchronization service. Reuse the preference endpoint with omitted-field preservation.

Proposed stable preview key: `comfortable-one-handed-voting`; environment `WFS_FEATURE_COMFORTABLE_ONE_HANDED_VOTING`; owner recipe-discovery; display name “Comfortable one handed voting”. Default off. Use effective API enablement, not a public build-time switch or the stored opt-in boolean. Wire configuration only in future implementation. For this proposed feature contract, gate position writes server-side using the same effective decision. Return 409 for an update supplying position while disabled; do not reject unrelated preference-only requests on that basis. This follows the existing preview API's conflict-response pattern, but is new behavior for the family endpoint and must be recorded in OpenAPI before implementation. It is proposed specification behavior, not a claim about the current API.

Keep the move affordance attached to the group, not a screen-wide gesture. Quick taps retain voting; activated holds suppress click-through. Reuse Solar Earth spacing, sizing, focus and motion tokens; tune hold/slop and target geometry with rendered evidence rather than accept new magic numbers here.

**Unresolved review decision:** Left/Right vertical alignment. The user's earlier centered-side question and the issue's historical lower-corner suggestion are not equivalent. Supply a centered-side and lower-side mockup with the same fit constraints for acceptance before producing geometry-dependent implementation details. No lower-corner default is authorized by this draft. The tasks do not prescribe that geometry; implementation is not ready to apply until this decision is recorded.

## First Observable Slice

First establish Bottom dock clearance, independent of the flag, through Discovery → Layout → Navigation in rendered portrait acceptance. This is a bounded UI regression slice, with no API change and no inferred fix until the reported layout is captured.

The first persistence tracer is the enabled non-drag choice → generated client → existing family preference API/service → real database → fresh family read → Discovery restoration. It proves member ownership before the hold/drop interaction is added. It must use the accepted side geometry.

## State, Concurrency and Recovery

Keep only transient idle/holding/dragging/preview state in the control owner. Cancel on invalid release, Escape, pointercancel, additional pointer, blur, member/flag change, unmount, convergence and viewport geometry change. Release capture/listeners and suppress the gesture's trailing click. No placement event touches voting state.

Capture member identity and selection generation at initiation, and guard UI completion against both plus the current placement request. Reuse/extend existing narrowly scoped safeguards. Serialize placement saves per member and prevent duplicate placement changes while pending; retain enough ownership across A → B → A to avoid an older request overwriting a newer choice. A request already sent may commit after switching away: do not claim cancellation undoes the server. Refresh/reconcile the originating member before representing its confirmed position again. Preserve field ownership in both directions: placement reconciliation cannot roll back unrelated preference fields, and an unrelated preference response or rollback cannot overwrite independently managed placement. Scope this adjustment to the new field's isolation, not a general store rewrite. Do not let stale success/failure own the current feedback.

Optimistic placement is labelled Saving. Failure restores the confirmed position and retains the failed intended choice only for an explicit Retry in the same member context. Retry never votes and is unavailable when eligibility/context is lost. A failed response or missing/mismatched identity is not success.

## Persistence and Side Effects

Future contract work adds the optional position to update and read shapes, DTO/model/EF/schema and adapter mappings, preserving older clients and omitted fields. An explicit Bottom is the supported reset; omission is no update. Unsupported supplied values are rejected without mutation. Add migration/default coverage for existing members and real database reload checks. Preference writes never modify votes, queue or preview opt-in rows.

## Compatibility, Rollout and Reversal

Flag off/unavailable means safe Bottom and no move controls; retain the durable position and opt-in choice independently. Disable mid-gesture without save; a pre-existing request can settle without overriding the disabled rendering. Returning to enabled restores a confirmed supported preference if it fits. Unknown saved values fall back safely; invalid writes are rejected.

Rollout stays off until the accepted mockup, gesture isolation, member persistence/recovery, accessibility and iPad portrait Safari/PWA checks pass. Observe the preview against this matrix before deciding graduation or abandonment; no calendar deadline or automatic graduation is proposed. Graduation/abandonment and deployment changes require separate authorization. The portrait clearance requirement survives either outcome.

## User Experience

Left/Right are reachable **grouped** docks, never one vote on each edge. Reserve space; if a side cannot fit, temporarily use Bottom without saving a replacement. Keep existing meanings, ordering, target sizing and card facts. Targets appear on deliberate activation, not over normal navigation. The labelled non-drag choice is available whenever placement is enabled, including for users who cannot hold/drag. Pending placement saves block duplicate placement submissions, not ordinary navigation or unrelated actions.

The iPad screenshot is pending from the user. Cloud desktop observation described in the proposal is limited evidence, not device qualification. Capture exact device/browser/display mode, viewport, orientation, text scale, safe-area and flag state for portrait acceptance. Browser emulation is useful regression evidence but is not physical touch or installed-PWA proof.
