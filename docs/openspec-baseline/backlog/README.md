# Human-guided baseline resolution queue

Audit snapshot: 2026-10-16 at `04a1c4570f9bbb01b47436790d4248635ac3179a`, plus existing staged baseline/harness work. Application code, contracts, SQL, tests and configuration were not changed by this audit. The user subsequently approved baseline promotion and archival; no commit or deployment.

**Outcome:** entry-driven audit of all 17 approved capability owners found supported extraction omissions in Planner drag activation and search/operator producers. The two final documentation changes were accepted, promoted and archived; runtime qualification remains separate. Feature Flags were independently found covered. Do not infer whole-application completeness from17 main files or passing validation.

## Baseline completion before new implementation

**Completed:** main-spec consolidation and a clean active changes directory (zero active changes). [The complete98-change readiness manifest](consolidation-readiness.md) identifies the two promotions,96 already-represented changes, superseded wording and ten optional-design warnings. The approved lifecycle operation is recorded in [completion](consolidation-completion.md). Implementation waves below are optional new work; each still requires selection of its bounded scope.

## Evidence and navigation

- [Coverage matrix](coverage-matrix.md), [actual entry inventory](entrypoints.md), [232-ID discrepancy provenance register](discrepancy-register.md).
- [Accepted user decisions and remaining gates](decisions.md), [verification/content identity](verification.md), [false positives and closed components](false-positives.md).
- Lane reports: [Tonight/planning](tonight-audit.md), [library/search/discovery](library-audit.md), [capture/quality/sharing/identity/install](capture-identity-audit.md), [workflows/Dreaming/live/recovery/demo](workflows-audit.md), [Feature Flags](feature-flags-audit.md), [time policy](time-policy-audit.md).

## Prioritized queue

Completed items are removed from this queue. Completion evidence remains in archived OpenSpec changes; unfinished remainders receive their own bounded backlog item.

Priority ranks harm, reach and recovery burden. Source-confirmed conditions and high-impact investigations remain visible without claiming production reproduction. No P0 is established. Within a priority, prerequisite order can differ from urgency.

| Item | Priority | Title | Origins |
| --- | --- | --- | --- |
| [WFS-BL-003](WFS-BL-003.md) | P1 | Supply required URL to contextual repair launch | U01; BSL-recipe-quality-002/003 |
| [WFS-BL-035](WFS-BL-035.md) | P1 | Inject remaining application clocks | Remaining clock-injection policy from WFS-BL-005 |
| [WFS-BL-006](WFS-BL-006.md) | P1 | Recover typed and Similar Search after invalidation | SR-U08 |
| [WFS-BL-007](WFS-BL-007.md) | P1 | Protect recovery exports from stale and partial content | DBR-U02–07, U12 |
| [WFS-BL-008](WFS-BL-008.md) | P1 | Protect demo assets and reset semantics | DH-U01–04, DH-U06/09 |
| [WFS-BL-009](WFS-BL-009.md) | P1 | Preserve cooked and skipped state during planner relock | U04, MP-U08/10, DISC-U06 |
| [WFS-BL-031](WFS-BL-031.md) | P1 | Protect historical meal records during permanent recipe purge | U52 |
| [WFS-BL-011](WFS-BL-011.md) | P2 | Reject obsolete stack wrap responses | U31 |
| [WFS-BL-012](WFS-BL-012.md) | P2 | Recompute groceries and publish every week touched by push | MP-U05, HLU-U02 |
| [WFS-BL-013](WFS-BL-013.md) | P2 | Read grocery check maps consistently from SSE snapshots | U100, HLU-U03 |
| [WFS-BL-014](WFS-BL-014.md) | P2 | Show unavailable cooking instructions honestly | U-cooking-01/02/07 |
| [WFS-BL-015](WFS-BL-015.md) | P2 | Retain member create and rename input on failure | U20, U24; BSL-009/011/018 |
| [WFS-BL-016](WFS-BL-016.md) | P2 | Align household report observation and failure recovery | U68, U76–79, U82–88 |
| [WFS-BL-017](WFS-BL-017.md) | P2 | Make capture acceptance and retry recoverable after dispatch failures | U61–64, U66–73, U12 |
| [WFS-BL-018](WFS-BL-018.md) | P2 | Reconcile bundle validation cancellation and metadata preservation | U53–57, RS-U01–09 |
| [WFS-BL-019](WFS-BL-019.md) | P2 | Preserve selected week through every Search continuation | SR-U07; BSL020 |
| [WFS-BL-020](WFS-BL-020.md) | P2 | Provide visible recovery for failed reads votes and deletes | U30/33/48/51, SR-U05, DISC-U03 |
| [WFS-BL-021](WFS-BL-021.md) | P2 | Set explicit clearing and deletion retention contracts | U35–37, U44, U49, U52 |
| [WFS-BL-022](WFS-BL-022.md) | P2 | Define Order In Drop and grocery identity semantics | TM-U09, U06, G-U01/02/04/05 |
| [WFS-BL-023](WFS-BL-023.md) | P2 | Reconcile identity transport and preference save failures | U08/13–18/21/23/25–28, U-MP01–06/09–13 |
| [WFS-BL-032](WFS-BL-032.md) | P2 | Resolve accepted Search filters that are not applied | SR-U03 |
| [WFS-BL-033](WFS-BL-033.md) | P2 | Revalidate Quick continuation against current eligibility | SR-U04 |
| [WFS-BL-034](WFS-BL-034.md) | P2 | Align Discovery position badges with visible cards | DISC-U04 |
| [WFS-BL-024](WFS-BL-024.md) | P3 | Qualify installation PDF delivery and feature-flag deployment | U11/74, AI-U01–05, U-MP07/08; DH-U05 |
| [WFS-BL-025](WFS-BL-025.md) | P3 | Define recovery for interrupted workflow maintenance and recurrence | U89–94, BP-U01–05, DBR-U08 |
| [WFS-BL-030](WFS-BL-030.md) | P3 | Close remaining runtime and product qualification gaps by bounded fixtures | U10/11/12 and register entries not independently closed |
| [WFS-BL-026](WFS-BL-026.md) | P4 | Reconcile contracts placeholders and stale explanatory claims | U02/03/09/19/22/29/36/45/47/50/65/80/81/85/95; SR-U01–04/06/09; DISC-U01/02/04/05/07/08; DH-U07 |

Completed 2026-10-17: [durable recipe notes](../../../openspec/changes/archive/2026-10-17-durable-recipe-notes/tasks.md) and [complete stack traversal](../../../openspec/changes/archive/2026-10-17-complete-library-stack/tasks.md). These records distinguish controlled acceptance from production/device qualification. The reported 200-recipe dataset remains unqualified under WFS-BL-030.

## Proposed implementation waves and conflict map

The deployment-calendar prerequisite is complete; see the [archived acceptance record](../../../openspec/changes/archive/2026-10-16-deployment-calendar-supper-dates/tasks.md). WFS-BL-035 covers only remaining application clocks and is not a prerequisite for Tomorrow calendar work.

**First parallel implementation wave, after individual approval:**

| Assignment | Spec/task to prepare | Owned files | Dependencies / acceptance / stopping point |
| --- | --- | --- | --- |
| WFS-BL-003 contextual URL repair | New corrective quality task using existing report rules | RecipeImportReportService and focused real-orchestrator/API test ownership | No shared ScheduleService; real packaged url-import required. Stop after launch/failure/retry evidence and reviewed diff. |

WFS-BL-015 member feedback is an alternative independent first-wave lane. Keep FamilyStore ownership reserved from concurrent preference work.

**Wave 1:** WFS-BL-012 retains the ordinary-push grocery/publication remainder after the completed [Tomorrow preservation](../../../openspec/changes/archive/2026-10-16-tomorrow-preserve-meals/tasks.md) and [Tonight replacement recovery](../../../openspec/changes/archive/2026-10-16-tonight-replacement-recovery/tasks.md) work. WFS-BL-011 retains presentation/unmount qualification after completed stack paging; do not reimplement its generation guard. WFS-BL-016 quality observation and cooking014 may share RecipeDetailSheet/report handoff ownership. Search006 and019 have distinct UI/backend cores but shared response context decisions.

**Wave 2:** recovery/export/demo007/008 require disposable DB/assets and explicit destructive-test authorization if operations extend beyond safe isolated fixtures. Workflow025, installation024 and wire013 follow selected boundary evidence. Completed documentation-extraction evidence remains in the archived baseline changes; runtime limitations remain in the relevant implementation items.

Contracts/generated clients/mocks/SQL are shared single-writer resources. A future worker receives exactly one approved item, its selected spec/task, owned files, dependencies, required checks and stopping point. No one implements from this queue alone.

## Resumable qualification checkpoint

All lane reports record grouped source reassessment and retained IDs. Not all paths have real runtime evidence; exact fixtures appear in each item. User dataset/device for reported wrong-last-recipe, real PostgreSQL/auth/seeded workflows, two-client SSE, native OS sharing and external providers remain not-run. No unavailable environment was asserted without an attempted check. Remaining product gates are in decisions.md. Continue with a selected item rather than re-running the baseline inventory.
