# Tasks

Implementation plan only. Every checkbox remains unstarted until Alex reviews this design and explicitly authorizes application. The current deliverable contains specifications only; app unit, API, browser, live database and device checks have not been run. The documentation-only proposal has no red/green behavior cycle.

## 1. Active collecting round on Home

**Outcome and scenarios:** Home delta's Offer Home voting and library handoffs: This week open while next week is closed; Next week open for voting; Later week differs from Planner selection; Invitation cannot be dismissed; Closed or unowned round.

**Owners and boundaries:** HomeCommandCenter and VotingNudgeCard in HomeSections consume the real discoveryStore and existing layout stream. Reuse generated `GET /api/discovery/session` (`{ data: VotingSessionSnapshot }`), including `incarnationId`, `revision`, `phase`, `roundId`, `weekStartDate`, coverage and smart defaults. No contract, backend, generated client or voting policy change is planned. Fixtures and method-sensitive HTTP/stream doubles stay in the existing `pwa/e2e/mock-api.ts`/builders infrastructure; use valid `MOCK_IDS` and contract shapes.

**Dependencies and prerequisites:** Approved draft; reconcile current main before implementation, especially Discovery's existing handoff. Installed frontend dependencies and repository test tooling. Preserve unrelated active changes and PR #329.

**Acceptance boundary:** Use actual Home/store/layout and generated-client wrapper seams with HTTP/SSE doubles at the network boundary. API/database suites are not newly required for a frontend-only consumer change; if implementation reveals a contract/backend change, stop and revise this spec before extending scope.

- [ ] 1.1 Add focused regression coverage in `pwa/src/components/home/HomeCommandCenter.test.tsx` and `pwa/e2e/home-voting.spec.ts` for current, next and future collecting rounds independent of selected Planner week, days/counts, unowned state, no dismissal and retained library links. Run `task test:unit -- src/components/home/HomeCommandCenter.test.tsx` and `task test:e2e -- home-voting.spec.ts`; record the intended missing-behavior red result before production edits. Replace the existing null VotingNudgeCard mock where it hides the required interaction.
- [ ] 1.2 Derive Home invitation from accepted shared session state; request coalesced Home-entry refresh; remove the next-week-only nudge read, duplicated local voting state, count claim and dismissal. Reuse existing card and locale conventions. Rerun both 1.1 commands to green and retain Tonight/cooked-card behavior; inspect the diff for unintended layout or other schedule-read changes.

## 2. Converged Home handoff to the anchored plan

**Outcome and scenarios:** Open round converges; Live open and reopen; all Navigate Home matches to the absolute round week without mutation scenarios.

**Owners and boundaries:** Same Home consumer plus existing plannerStore tab setter and Planner route. Follow current main Discovery's existing absolute-reference navigation. Retain existing persisted meals, pending suggestions and explicit close behavior.

**Dependencies and prerequisites:** Slice 1 green; captured round/Monday from a usable accepted session, not browser time. Backend convergence behavior remains unchanged.

**Acceptance boundary:** Browser navigation exercises real Home and Planner state/read seams with contract-correct schedule/session fixtures. Observe requests to prove handoff makes no assignment, lock or voting-close mutation. The test must begin on groceries for another week, then cross a deployment date rollover using the existing calendar fixtures.

- [ ] 2.1 Extend Home unit and `home-voting.spec.ts` coverage for exact "Menu's In" / "See your matches", collecting-to-converged updates, close/reopen with a new round, missing identity/week, close around activation, preselected grocery tab and anchored navigation across date rollover. Assert suggestions are not saved by navigation and existing saved meals remain. Run the slice's unit/E2E commands to observe the intended red before logic changes.
- [ ] 2.2 Implement the phase-aware Home action and Home-specific localized headline/supporting copy; on valid converged activation capture the accepted Monday, select Planner tab and navigate with `weekOffset=0` and `referenceWeekStartDate`. Run the slice's commands to green, then `task test:e2e -- discovery.spec.ts` to preserve existing quick convergence and Discovery handoff. Keep Discovery visuals/copy and Planner saved-versus-suggested presentation outside this change.

## 3. Status recovery and live mobile continuity

**Outcome and scenarios:** All Present trustworthy Home voting status and recovery scenarios; no stale action or old-round completion after updates.

**Owners and boundaries:** Existing sessionStatus/refreshSession/applySession and useScheduleStream. Reuse the existing GET handler and `voting_session_updated` payload (`{ session: VotingSessionSnapshot }`); fixture state must change subsequent reads as well as dispatched frames. Add no poller, SSE subscription or generic state refactor.

**Dependencies and prerequisites:** Slices 1–2 green. Existing revision/incarnation and generation guards remain intact; tests exercise Home as a consumer instead of reimplementing those guards.

**Acceptance boundary:** Unit checks cover initial unknown/loading, retained-card rechecks, unavailable/Retry, missing identity and superseded reads. Browser checks cover missed open/close/convergence recovered on reconnect, visibility/pageshow resume, out-of-order revisions and different-incarnation reconciliation. Simulated events and viewport emulation are distinct from real-device lifecycle evidence.

- [ ] 3.1 Add the specified status/recovery cases to Home tests and extend existing store/hook tests only where a missing consumer seam needs coverage. Run `task test:unit -- src/components/home/HomeCommandCenter.test.tsx` and `task test:e2e -- home-voting.spec.ts` to establish red for missing visible checking/unavailable/Retry behavior and disabled stale CTAs.
- [ ] 3.2 Add the compact checking/unavailable presentation and Retry through existing refreshSession; retain last-known context without an enabled stale action. Run the slice commands to green, then `task test:unit -- src/store/discoveryStore.test.ts` and `task test:unit -- src/hooks/useScheduleStream.test.ts`; verify rejection of stale/superseded state and existing reconnect/resume paths without extra transport ownership.
- [ ] 3.3 Exercise `home-voting.spec.ts` at iPad, iPhone and Pixel Phone representative viewports, in English and French, including resume/reconnect and narrow text wrapping. Check exact English labels, meaning in French, accessible names, visible keyboard focus, touch reachability, reduced motion and no horizontal overflow. Record viewport/browser versions separately from a physical-device Safari/Chrome resume check on those primary devices; if unavailable report that qualification as blocked or not run, never as passed through emulation.

## 4. Final Integration and Verification

- [ ] 4.1 Reconcile all scenario evidence and red/green results, update task status only for passed acceptance, review the complete task-owned diff, run applicable `task prepare -- <reviewed application paths>`, then `task verify -- <complete reviewed changed-path set>` and `task spec:check -- home-active-voting-handoff --type change`. Record actual passed/failed/blocked/not-run results and the verification `record_path`; do not infer implementation or live/device acceptance from strict specification validation.
