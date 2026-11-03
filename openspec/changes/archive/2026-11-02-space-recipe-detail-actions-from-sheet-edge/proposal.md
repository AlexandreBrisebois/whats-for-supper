# Proposal

## Why

Alex wants a little more bottom space below the buttons in recipe detail. The detail sheet already has 24 CSS px of trailing inner scroll padding at normal text size. A local rendered phone/tablet reproduction showed the last Ask the Family button fully visible but fairly close to the rounded lower sheet edge. This is a small visual refinement, not a clipping or dock-overlap fix.

## Outcome and scope

Increase the existing trailing padding of the recipe detail sheet's scroll content from the 24 px spacing step to the 32 px step at normal root text size. Keep the action group, button sizes, labels, focus order, sheet position and interactions unchanged. Apply the same end spacing when the final content is the edit action group. The last control must remain reachable by scrolling on a short phone and with enlarged/French text.

The inner scroller owns this spacing. The outer sheet wrapper already contributes a separate 16 px bottom gap on a phone; do not add a second safe-area or dock clearance term. This change does not alter Ask the Family's own sizing or behavior and does not include the withdrawn adaptive stack control.

## Capability

- `recipe-library`: recipe-detail action-area trailing spacing and scroll reachability.

## Evidence and limits

In a local mocked render scrolled to the end, the last button-to-visible-panel-edge gap measured 24.84 px at 390×844 and 24.63 px at 820×1180. The panel-to-viewport gap was 16 px on phone and 67 px on the vertically centered tablet. Both browser measurements passed; no overlap was reproduced. See `.task/detail-footer-investigation.md` and local screenshots `/tmp/wfs-detail-footer-390.png` and `/tmp/wfs-detail-footer-820.png`. The user-supplied JPEG's pixels could not be materialized through Library, so this proposal assumes the intended target is the final detail action group, as requested in the conversation.
