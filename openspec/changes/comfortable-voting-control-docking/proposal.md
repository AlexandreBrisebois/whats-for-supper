# Proposal

## Why

Members should be able to put Discovery's voting buttons where one-handed voting feels comfortable. The user also reports that the buttons fall below the bottom dock on an iPad in portrait; that report needs its own layout correction and verification, independent of preview eligibility.

## Outcome and Scope

Specification-only proposal for #315. With **Comfortable one handed voting** enabled, a deliberate hold and drag moves both voting actions together to Left, Right or Bottom. Bottom remains the default. Every position respects content, fixed navigation (including its raised Discover action), and safe areas.

The portrait report is user-reported, not reproduced: cloud Chrome at 1188 × 761 CSS pixels, DPR 1, showed buttons at y=521–601, navigation starting at 646.5 and the raised action around 633, without overlap. This desktop result neither proves nor disproves the iPad report. The user will provide a screenshot later. No cause or pixel correction is asserted.

Exact vertical alignment of Left/Right (centered side versus lower side) remains a review decision. Neither is silently accepted. This draft defines fit and interaction constraints; dependent side geometry must wait for an accepted mockup. Hold duration and movement tolerance are measured tuning parameters, not newly accepted numeric requirements.

Excluded: freeform coordinates, split actions on opposite edges, vote/queue/convergence changes, navigation redesign, a new gesture framework, broad member-state cleanup, deployment, implementation and merge.

## What Changes

- Gate repositioning and its controls through the existing preview framework; when disabled/unavailable, render safe Bottom without deleting the stored position.
- Hold the grouped control surface, reveal three named drop targets, preview the destination, and commit only a valid drop. Cancel or invalid release changes no preference and casts no vote.
- Provide a labelled non-drag Left / Bottom / Right choice with keyboard, screen-reader and English/French support.
- Remember a confirmed choice per selected member, with pending/failure/retry feedback and stale-result protection.
- Keep Bottom controls above the fixed dock and safe area even with the flag off; preserve usable content and navigation at every position and after viewport changes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `recipe-discovery`: gated docking interaction, accessible alternative, gesture isolation and dock-safe layout.
- `member-preferences`: durable discrete position, selected-member isolation and honest save/recovery.

## Impact

Future work touches Discovery's page/control layout, shared Layout/Navigation clearance, member preference contract/model/mappings/store, existing feature-flag registry and Settings/locales, and focused tests/stateful mocks. See [design](design.md) for current owners and [tasks](tasks.md) for bounded future slices. This PR changes only this OpenSpec change; API, schema, generated client and application changes are future work. Related issue: https://github.com/AlexandreBrisebois/whats-for-supper/issues/315.
