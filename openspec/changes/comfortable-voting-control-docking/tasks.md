# Tasks

This is a specification-only draft. All checkboxes below describe **future work**, not work performed by this PR or permission to implement. Exact side alignment is consequential and unresolved; geometry-dependent work is blocked until the mockup decision is recorded. No unchecked item is implied complete by passing OpenSpec validation.

## 1. Resolve review inputs and portrait evidence

**Outcome and scenarios:** Accepted side-alignment contract; reproducible evidence for “Bottom on iPad portrait”.
**Owners and boundaries:** Discovery controls and existing Layout/Navigation only.
**Dependencies and prerequisites:** User screenshot/device details and mockup acceptance.
**Acceptance boundary:** Separate user report, desktop observation, emulation and physical-device evidence.

- [ ] 1.1 Compare centered-side and lower-side grouped-control mockups using existing design tokens; record the user's accepted alignment and responsive fit behavior in design/specs before generating geometry-dependent implementation detail. Neither alternative is implicitly selected here.
- [ ] 1.2 Reproduce the portrait report using the supplied screenshot and device/browser/display-mode details. Record bounds of both controls, navigation including raised action and safe area; identify the smallest failing layout and preservation boundary. If not reproduced, record that limit rather than invent a cause or correction.

## 2. Bottom clearance independently of preview

**Outcome and scenarios:** “Keep voting controls clear of content and navigation”: Bottom portrait and resize scenarios, with flag off and on.
**Owners and boundaries:** Discovery page, Layout, Navigation; no API or persistence change.
**Dependencies and prerequisites:** Task 1.2 reproducible case; supported local/browser test environment authorized separately.
**Acceptance boundary:** Rendered UI geometry and ordinary voting/navigation; physical Safari and installed PWA qualification remain separate.

- [ ] 2.1 Add the smallest reproducing layout regression to `pwa/e2e/discovery.spec.ts`; run `task test:e2e -- discovery.spec.ts` and record an intended overlap/clipping failure before changing production layout.
- [ ] 2.2 Correct only the evidenced layout constraint using existing sizing/spacing/safe-area owners. Rerun the same E2E command green and `task test:unit -- 'src/app/(app)/discovery/page.test.tsx'`; preserve empty-state refresh, front-card votes, convergence and navigation. Document the verified cause and clearance behavior in this change.
- [ ] 2.3 Verify portrait Safari and standalone PWA, rotation/resize, narrow/short viewports, landscape and enlarged text with flag off/on; record screenshots and geometric non-overlap/overflow assertions. Record measured viewports rather than treating desktop or emulated results as physical touch proof.

## 3. Enabled non-drag position with member persistence

**Outcome and scenarios:** “Choose with keyboard or assistive technology”, save/read/default, failed save/retry, unavailable context, selected-member isolation and flag fallback.
**Owners and boundaries:** Discovery choice → generated Kiota family client → FamilyController/FamilyService → EF/PostgreSQL → family reads. Existing flag registry/service/provider/Settings owns enablement.
**Dependencies and prerequisites:** Accepted alignment from 1.1, safe layout from 2, explicit implementation authorization, disposable database/test services.
**Acceptance boundary:** Real API/database persistence and later read, plus stateful mocked browser acceptance; neither replaces the other.

- [ ] 3.1 Update `specs/openapi.yaml` first for optional `discoveryControlsPosition` write/read enum and position-specific disabled rejection (409), retaining omitted-field semantics. Add failing FamilyController/FamilyService and PostgreSQL persistence tests for position-only save, invalid/empty input, unavailable member, off/opt-in/on, legacy defaults and unrelated-field preservation; run `task test:api -- --filter FullyQualifiedName~Family` and `task test:database -- --filter FullyQualifiedName~Family`, recording intended behavioral failures.
- [ ] 3.2 Implement this one observable slice through DTO/model/EF/schema compatibility, controller/service mapping, `pwa/src/lib/api/family.ts`, domain/store and accessible Discovery choice. Register the proposed flag through existing infrastructure and wire supported deployment pass-through/examples without enabling a deployment. Regenerate using `task gen:client`; synchronize `pwa/e2e/mock-api.ts` method-sensitive PUT preferences, GET family/current-member and GET/PATCH feature-flags handlers, builders and persisted mock state in this slice. Verify the API/database tests green and `task gen:client:check`; update flag docs and English/French copy.
- [ ] 3.3 Add tests first for saving/saved/error/retry, missing or mismatched response identity, absent loaded member, duplicate pending choices, A → B → A late success/failure and overlapping unrelated preference writes in both completion orders, with success and failure on either write. Assert that an unrelated response/rollback cannot overwrite newer confirmed placement, and placement cannot overwrite newer confirmed unrelated fields. Reuse existing generation/field safeguards with only necessary placement-specific extensions. Run `task test:unit -- src/store/familyStore.test.ts`, `task test:unit -- src/store/featureFlagStore.test.ts` and Discovery page tests red then green; prove server-reconciled state as well as immediate UI.
- [ ] 3.4 Extend `pwa/e2e/discovery.spec.ts` and `pwa/e2e/settings.spec.ts` for non-drag choice, selected state, focus, EN/FR announcements, save/failure/retry, fresh reload, two-member isolation and disabled retained preference. Run `task test:e2e -- discovery.spec.ts settings.spec.ts`; verify stateful mock PUT/GET behavior, no vote requests from placement and unchanged queue/front card. Separately exercise the real client/API/database round trip; record actual endpoints/runtime identity and results, not mock-only integration claims.

## 4. Deliberate hold and discrete drop

**Outcome and scenarios:** “Move voting actions as one discrete group” and “Isolate positioning from voting and card swipes”.
**Owners and boundaries:** Discovery grouped-control owner and existing gesture/motion patterns; no new gesture framework or vote semantics.
**Dependencies and prerequisites:** Accepted geometry and completed persistence slice.
**Acceptance boundary:** Pointer unit tests plus rendered browser and actual touch/assistive-technology qualification.

- [ ] 4.1 Add failing Discovery control/page tests for tap versus hold, active preview, valid/current/invalid drop, Escape, pointercancel, second pointer, blur, unmount, member/flag change, convergence and resize. Run Discovery page/unit tests before logic; assert zero votes from every move/cancel and exactly one vote from an ordinary tap.
- [ ] 4.2 Reuse established deliberate-activation and cancellation patterns for the grouped control surface; connect valid drop to the same position action as the non-drag choice. Do not set a new accepted hold duration, movement tolerance or pixel offset without measurement. Rerun unit tests green and `task test:e2e -- discovery.spec.ts`, including ordinary card swipe preservation and unavailable-target fit fallback.
- [ ] 4.3 Qualify hold-versus-scroll, drop preview/cancel, click suppression, keyboard/screen reader, focus and reach on the accepted layouts in iPad Safari and installed PWA portrait plus representative phone/desktop layouts. Record actual tuning values and evidence, including flag off/on and rotation; update this design with accepted parameters and any still-blocked device evidence.

## 5. Final integration and verification

- [ ] 5.1 Reconcile every scenario with actual evidence, perform applicable `task prepare -- <complete-reviewed-changed-paths>`, review scope, then `task verify -- <complete-reviewed-changed-paths>` and `task spec:check`. Record actual statuses and the harness record_path; do not claim completion while required API/database/device or scenario acceptance is missing. No merge/deploy/archive is authorized by this task list.

## Specification-only verification boundary

For this PR, runtime red/green and application tests are not applicable because no application behavior changes. GitHub Connector was used for source/schema/template inspection. Publication was initially blocked pending explicit repository-sharing approval; the user subsequently approved publishing this specification as a separate draft PR. No local OpenSpec CLI, local Git or local harness execution is claimed. CI must run `openspec validate --all --strict --no-interactive` through the existing workflow. Report its exact head/run result and separately review changed paths, links, whitespace and requirement consistency.
