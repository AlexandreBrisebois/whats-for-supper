# Design

## Context and Existing Ownership

The [proposal](proposal.md) defines the three requested outcomes. Canonical specs include all four archived predecessors. This document proposes implementation; no product edit or behavior test has been performed in this planning pass.

**Observed local DV facts:** authenticated GETs to `http://127.0.0.1:3310` with the existing DV host at **2026-11-06T12:24:06Z** returned deployment zone UTC, today November 6, Friday servings/override five, `editable=false`, schedule status 2 (Cooked), and `preparation=null`. Saturday/Sunday were ordinary empty dates, editable with usual four. The user-reported screenshot fits these reads. The date cutoff is not the cause. No actual preparation date is inferred from Cooked status. Private selected evidence: `.task/planner-portions-followup/dv-observation.json`; credentials were kept in memory. The first socket access was denied by sandbox permissions before Docker inspection; the approved read-only run succeeded. No household write or production test occurred.

**Existing seams and relevant gaps:**

- `SupperServingsService.ReadSnapshotAsync` includes today with `date >= context.Today` but excludes every Cooked, explicitly prepared and non-cooking date. `SaveAsync` rechecks the snapshot inside the existing transaction, then updates dated serving state and enlists grocery work. `Effective` prioritizes overrides for legacy Cooked and explicit `PreparedServings` for preparation receipts.
- `useSupperServingsEditor` disables controls from server `editable`; it has no independent today cutoff. Its no-draft display and equality comparison use current usual before the saved inherited value. Simply making Cooked editable would therefore misdisplay a frozen inherited count and lose a correction equal to current usual. A null reset can also be incorrectly discarded as unchanged when the saved override is already null.
- The opaque serving version includes Cooked status/preparation state but not its occurrence/recipe identity. A same-status replacement needs to invalidate a Cooked correction baseline. Reuse this version, not a new token or endpoint.
- `SupperProjectionInputs`, `IngredientProjectionService`, `SupperProjectionInvalidation` and `GroceryRecomputeService` already consume dated effective counts and implement durable freshness plus increased-needs check reset. Cooked status does not exclude a recipe's grocery contribution.
- `GroceryList` constructs Review amounts inside its quantity hint and repeats it in a separate full-width warning panel. That panel also repeats the known subtotal and independently renders the prior-check warning.
- `RecipeDetailSheet` renders a content-width secondary Cook below the dated action row for ordinary Recipes entry. Saved Planner entry instead uses Cook in the contextual row. Existing responsive/footer height ownership and original-viewer/cooking owners should be reused.

Source/test investigation was read-only. Two focused native reviewers audited the affected full canonical specs and source seams. The existing browser mock's serving read omits the explicit-preparation guard; align it with the API in the affected slice. Existing tests cover past/Cooked disabled states, subtotal/prior-check distinctions and Plan/Change-day targets, but not the new correction or full-width Cook geometry.

## Decisions and Tradeoffs

1. **Propose a same-day legacy Cooked correction, not reopening cooking.** Change the authoritative eligibility to ordinary unprepared current/future dates plus `date == deploymentToday && status == Cooked && PreparedAtUtc == null`. Preserve non-cooking, past, future Cooked and explicit preparation protection. This solves the actual Friday case. It deliberately supersedes the prior blanket Cooked lock. Correcting explicit preparation receipts is excluded: changing a date override alone would not affect `PreparedServings`, while changing the receipt would affect frozen quantities and the original acknowledgement/retry contract. A wider correction workflow would need separate design approval.
2. **Keep corrected quantities consistent through existing consumers.** A saved correction changes dated effective count, assigned ingredients and weekly grocery totals. A reliable increase may uncheck an already checked ingredient under the existing policy; decreases retain checks and never mark an unchecked item bought. Freezing groceries while changing portions would create divergent displayed requirements and needs another policy. No new toast, row delta or confirmation is proposed.
3. **Preserve history and normal default freezing.** Save no recipe amount, usual setting, status, actual date/time, recipe cooking-history value or preparation receipt. An explicit correction creates/updates only dated serving state. A reset removes the override and captures current usual into that Cooked date's inherited snapshot, including when the previous override is already null but the frozen count differs. Later usual/member changes and startup reconciliation continue skipping Cooked; enabling manual correction must not make those automatic paths backfill it.
4. **Remove the requested grocery label without substituting decoration.** Show a numeric partial subtotal once in the ordinary amount position; retain the existing prior-check row/list feedback separately. Unknown current amounts show no number, new icon or replacement copy. This intentionally reduces visible uncertainty for wholly unknown amounts and narrowly relaxes the canonical visible-warning obligations. Source-book access can still expose original recipe evidence where contributors exist; a contributor-free unknown row gains no fictitious link. Missing a numeric amount does not prove a complete quantity or pantry ownership.
5. **Make Cook full width inside the existing footer.** Reflow its existing control into one row spanning the footer's inner width, preserving secondary styling, icon, localized name, contextual callback and guards. Keep dated Plan and icon-only Change day adjacent above it. Preserve the quieter Plan another day and grocery Plan transition. Do not add Cook to capture/edit/error surfaces that do not offer it today.

These are concrete recommendations for review, not approved implementation decisions. No extra blocking question is needed to present this bounded design. Review may choose a broader prepared-receipt correction or a different grocery cue; either would require reconciling the dependent artifacts before apply. Alex explicitly declined a replacement row-level warning. The no-replacement choice is settled; its loss of a wholly-unknown visible cue is recorded rather than treated as an unresolved question.

## First Observable Slice

Use a test-owned current-day Cooked supper without preparation, count five. Open Planner Portions through the real generated client/API/PostgreSQL boundary, enter six, save once, and independently read count six and unchanged recipe/occurrence/status/history. Verify assigned ingredient quantities and the grocery freshness/workflow outcome. Establish behavioral red before changing eligibility. Extend only after this slice works to frozen inherited/no-override/reset, rejection boundaries, grocery presentation and footer layout.

## State, Concurrency and Recovery

- Keep server editability authoritative. Use saved `day.servings` for a clean date row; use an explicit local number or reset intent only while it is a draft. Compare against the saved date state, not current usual, and preserve mode changes even when the visible number matches.
- Include Cooked occurrence ID/recipe identity in the existing opaque version so replacement cannot accept a stale correction. Status/preparation/count changes remain covered. Validate the entire batch and deployment-local date again at save. Rollover rejects the captured past date rather than retargeting today. Do not use browser locale/timezone to decide eligibility.
- Keep ordinary pending, duplicate suppression, Recipes save-and-return and the existing Save and continue / Keep editing / Discard changes for other navigation. A save failure or 409 retains drafts. A committed reply lost in transit uses authoritative reconciliation; grocery retry never repeats cooking or the count mutation.
- Preserve late-read, week/session and source-title guards. Removing grocery text neither acknowledges shopping checks nor clears underlying quantity markers.

## Persistence and Side Effects

Use the existing serving transaction, locking order, invalidation and durable refresh workflow. Validate permission/version before changing rows; no partial batch on rejection. Publish/read existing freshness states after committed counts. No independent worker, schema table, migration, audit/history subsystem or alternate grocery calculator is needed. Cooking history is not recomputed because no completion or calendar status changes.

## Compatibility, Rollout and Reversal

Update `specs/openapi.yaml` before logic: describe `SupperServingDay.editable`, projection editability and PUT serving behavior with the exact same-day exception and unchanged read-only rejection. Shape and routes remain unchanged. Generate/qualify Kiota through the existing workflow and update wrappers/builders/handlers only for required closure. Mocks must preserve writes, subsequent reads, versions, explicit-preparation guards and grocery consequences.

No historical migration/backfill is proposed. Reverting the eligibility can lock subsequent corrections again but must not erase a saved dated correction. Existing recovery/export already retains override/inherited snapshots; test round-trip without rewriting receipts or history. No deployment is authorized by this planning request.

## User Experience

- Current eligible Cooked rows retain their saved number and gain working date-specific minus/plus/direct entry and compact reset under ordinary draft rules. They remain marked Cooked; do not imply cooking again or invent a preparation date. Existing read-only rows retain disabled semantics and meaningful saved counts.
- Grocery known subtotal appears once; no Review amounts string, dangling dot, empty warning panel or reserved margin remains. The prior-check warning still has room when present. Keep checks, aisle tags, book disclosure and focus order independent.
- Cook keeps at least a 48 CSS px target and full available inner width on phone and bounded tablet; full width does not mean viewport edge-to-edge. Preserve the 48 px localized icon-only Change day target. Taller footers account for rendered height once, retain scroll clearance and never hide Notes, original evidence, Retry or Close.
- Acceptance covers EN/FR, 320/390 CSS px phones, bounded tablet, short landscape, 200% text, keyboard focus and an approximated reduced viewport for note editing. Native phone/keyboard/screen-reader review is distinct and requires a separately authorized DV deployment. Inspect actual renders; source/GET checks are not visual qualification.

## Review Risks

The intentional grocery trade-off is lower visual warning for unknown current quantities. The intentional portions boundary excludes explicit preparation receipts even on today. Grocery increases can reset checks after a correction. These are review-visible product choices, not hidden implementation assumptions. Test isolation and unchanged history/default/prepared state are essential; no production or household-write acceptance is permitted.
