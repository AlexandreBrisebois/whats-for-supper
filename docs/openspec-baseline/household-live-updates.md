# Household live updates baseline plan

## Current lifecycle checkpoint — consolidated, 2026-10-16

This capability's main spec now contains **30 requirements / 79 scenarios**.
All baseline source changes were archived after the user's explicit approval;
there is no active baseline extraction/promotion queue. Historical checkpoint,
next-session and "changes active" text below records earlier sessions only.
Evidence limitations and unresolved findings remain in the [live backlog](backlog/README.md).
See [consolidation completion](backlog/consolidation-completion.md) for accepted
scope, preserved corrections, archive warnings and verification. Archival does not
establish application correctness, runtime qualification or resolution of defects.

## Current checkpoint and scope

Promoted baseline: **30/79 requirements/scenarios**, including the three remaining
shared-scope deltas promoted on 2026-10-16: schedule events, grocery/lifecycle
dispatch and discovery events (**15/41** added). Supported inventory entries retain
their promoted, owner-held or excluded dispositions. A34 and U95–U101 remain in
force; runtime qualification is not-run/deferred. Promotion does not establish
capability-wide runtime acceptance. No application changes or archival were made.
Earlier slice/lifecycle labels below are historical.

Read [AGENT.md](../../AGENT.md) and [shared workflow](workflow.md), then this file.
No other capability plan or full project history is required up front. Follow only
immediate owner/spec dependencies needed for the selected work.

Accepted baseline: [main household-live-updates specification](../../openspec/specs/household-live-updates/spec.md).

**Phase-12 reconciliation R12 (2026-10-16):** Recorded promoted documentation remains 30 requirements / 79 scenarios; no additional supported extraction gap was found within this plan's explicit boundary.
[Cross-capability review](reconciliation.md) records current inventory, shared-owner
reconciliation, evidence drift and exclusions. Current main SHA-256: `1c1c906831ca1770e2afd8174bdd31f5447b67d48b0325fc52e353c12ce28de6`.
This session grants no new acceptance or promotion. Earlier session-specific
“current user” and next-action statements retain their historical scope. A34 and
all local unresolved/excluded behavior remain in force; runtime checks are not-run.


## Capability map and starting points

| Capability / purpose | Candidate scope and rules to recheck | Source starting point | Existing test starting point | Dependencies / initial confidence |
| --- | --- | --- | --- | --- |
| Household live updates: reconcile shared household activity | Connection requirements, current-week initial snapshot, event payloads, week filtering, reconnect/optimistic guards, echo suppression, readiness/failure notices | [stream controller](../../api/src/RecipeApi/Controllers/StreamController.cs), [connection manager](../../api/src/RecipeApi/Infrastructure/SseConnectionManager.cs), [browser hook](../../pwa/src/hooks/useScheduleStream.ts) | [stream integration](../../api/src/RecipeApi.Tests/Integration/StreamControllerIntegrationTests.cs), [hook tests](../../pwa/src/hooks/useScheduleStream.test.ts) | Identity and domain publishers / high local mechanics; multi-replica guarantees absent |

Shared owners and evidence policy live in [workflow.md](workflow.md). Recheck
these source/test starting points before using them as current evidence.

## Recorded decisions for this capability

Shared A01–A05/A07/A09–A12/A34 decisions are in workflow.md. The records below
retain their original scope; completed stages do not authorize successors.

| ID | Decision | State / authority |
| --- | --- | --- |
| A80 | Promote reviewed shared workflow lifecycle and automatic retry baseline | User “promote”, 2026-10-15, after validated A79 draft. Create main background-processing with exact Purpose and 14 requirements/42 scenarios; preserve all 216 source identities, five existing mains, selected artifacts, prior work and qualifications. Plan/task follow-up only; no archive, application/runtime/DB/model qualification or successor extraction. |
| A81 | Discover and draft shared household stream connection and reconciliation only | User attached instruction, 2026-10-15. Authorizes CLI-scaffolded `baseline-household-live-updates-connection-reconciliation`, new-capability delta after live absence check, proposal/design/extraction tasks and durable-plan evidence/mapping update. Preserve all existing work/promoted owners/qualifications; no application/test/contract/configuration/runtime qualification, promotion, archive or successor slice. Stop at validated human-review draft. |
| A82 | Promote reviewed household live-update connection/reconciliation baseline | User “promote”, 2026-10-15, following validated A81 draft. Create main household-live-updates with exact reviewed Purpose and 15 requirements/38 scenarios; preserve full delta/proposal/design/metadata, all six prior main specs, 239 source identities, prior work/index/history and qualifications. Plan/task follow-up only; no archive, application/runtime qualification or successor work. |

## Discrepancies and qualifications

These are implementation-supported/static findings, not runtime guarantees.
Cross-capability entries are included where the selected evidence depends on them.

| ID | Finding / risk | Evidence and required extraction treatment | Status / withheld claim |
| --- | --- | --- | --- |
| U95 | Stream contract omissions and context differ from general member binding | BSL-household-live-updates-001/002/004: ConnectedEvent omits connectionId; operation omits 401; publisher incremental objects lack base discriminator type; stream requires cookie GUID without header fallback/existence lookup. | Record observed extension and gate; no claim of complete schema parity, existing-member validation or contract repair; shared access stays household-identity |
| U96 | Controller writes bypass broadcast locks and registration precedes snapshot | BSL-household-live-updates-002: initial/heartbeat writes unlocked; broadcast sequential; wait outside catch, concurrent disposal and slow streams unqualified; no durable event/backplane/cursor path. | No connected-before-all-push, total serialization, global ordering, fairness, cross-replica, exactly-once or lossless recovery guarantee |
| U97 | Native reconnect and received data lack application recovery guarantees | BSL-household-live-updates-001/003/004: constructor catch returns; error logs; no retry/fallback/online listener; JSON.parse/store errors uncaught; identity retained on error/cleanup. | Delegate eligible attempts to native source only; no guaranteed reconnect/deadline/acknowledgement or malformed-frame recovery |
| U98 | Successful receipt or synchronization timestamp can coexist with stale displayed days | BSL-household-live-updates-003: week-zero mismatch ignored; move/drag defers latest days while status/time update; pending metadata and all-recipeless snapshots retain old content; no revision check/forced release. | Draft conditional reconciliation only; no immediate freshness, monotonic state, confirmed move or complete convergence claim |
| U99 | Today uses local date and independently suppresses optimistic updates | BSL-household-live-updates-004: absent local-date entry untouched; server uses UTC week; differing IDs under two seconds dropped without timed replay. | No automatic later application or guaranteed local-date coverage; existing journey/REST behavior remains separate |
| U100 | Raw connected grocery dictionary misses AdditionalDataHolder path | BSL-household-live-updates-002/003: server plain dictionary → hook JSON.parse → applySnapshot reads only additionalData; wrapper-built unit assertion cannot prove wire reconciliation. | Record check-map retention alongside groceryItems replacement; withhold complete grocery reconciliation and atomic multi-store visibility; no code/contract fix |
| U101 | Substituted assertions and emission counters do not establish receipt/application | BSL-household-live-updates-001–004: default integration factory disables auth/uses InMemory; MemoryStream publisher tests; hook mocks omit identity setter; finite intercepted browser frames omit ID; cookedReconnects increments before response fulfillment. | Inspected assertions only; attempted/registered/emitted/received/applied remain separate. Runtime/API/browser/DB/network/model not-run A34 |

## Slice evidence and lifecycle records

## Draft slice — household live updates / connection, initial snapshot and reconnection

**Authorization A81 (2026-10-15):** User explicitly selected documentation-only discovery/drafting of `baseline-household-live-updates-connection-reconciliation`, capability `household-live-updates`, using installed openspec-propose. Root and inventory verified by CLI before writes; selected change scaffolded with `openspec new change`. No setup/configuration writes. All six promoted owners retained; a new capability exists only as a delta. No runtime/services/browser/network/database/model qualification, application/test/API/client/SQL/dependency/configuration edits, promotion, archive, successor slice or restored background-task-navigation specification.

**Source identity and preservation:** branch `moving-to-openspec`, HEAD `db6fede90ec0a7dfff26e6050036310bc8211837`. Initial Git status contained staged prior baseline plan/background-processing/recipe-quality/capture artifacts. Private before-image includes every existing tracked/untracked file digest, the complete plan and staged binary diff. All 216 unique prior manifest hashes matched before drafting. The plan update adds this slice/history and changes only the current Next action table cell; the earlier A80 stage and checkpoint remain verbatim as history. File/index and plan comparisons are separate from runtime evidence.

### BSL-household-live-updates-001 — Mount, browser transport and stream access

**Domain/purpose/confidence:** Shared household connection so existing consumers can receive live schedule state. Implementation-supported; selected assertions inspected, not executed. `pwa/src/app/(app)/layout.tsx` invokes `useScheduleStream` outside child pages. Empty-dependency effect constructs native EventSource using a nonempty public base concatenated verbatim with `/api/stream`, otherwise the relative path, with credentials enabled. No URL normalization, member-selection dependency, manual reconnect timer, online/visibility listener or polling fallback exists in the hook. `onopen` only logs; construction catch logs and returns; `onerror` only logs; cleanup closes. Browser cookie/CORS eligibility is a dependency, not established by construction. Member/access cookie ownership remains household-identity (`auth.ts`, identity/cookie.ts); no personal account is created by the stream.

Program's global authenticated-user filter plus Hearth middleware gate the action. Existing raw secret, signed Bearer or signed `h_access` credential can satisfy household auth; native hook adds no custom headers. Action directly requires a parseable GUID member cookie; no header fallback, Guid.Empty prohibition, member-existence lookup or per-member subscription filter. General `FamilyMemberIdModelBinder` is not used by the action. Missing access is rejected before the action; authorized missing/malformed cookie returns plain 400 guidance. Program registers singleton manager/scoped publisher and configured credentialed CORS. No infrastructure or cross-origin cookie qualification is inferred.

**Assertions:** hook URL undefined/empty/absolute and withCredentials assertions use MockEventSource; cleanup asserts close once. Connected guard-clear assertion omits connectionId; no constructor-failure/error/reconnect success assertion. App layout test substitutes the hook entirely. Stream integration missing-cookie test asserts 400/body, but uses default auth-disabled factory; it does not establish production auth. U95/U97/U101 bound the claims.

### BSL-household-live-updates-002 — Registration, schedule read, framing and process-local output

`StreamController` sets SSE/no-cache/keep-alive/no-buffer headers, calls AddConnection (new GUID string), then reads `ScheduleService.GetScheduleAsync(0)`. Manager entry records response and semaphore, not member/household context. Registration is not emission. Schedule read separately queries calendar events and weekly plan, builds seven UTC-week Monday–Sunday entries with recipe/non-cooking metadata, status/lock and optional deserialized persisted grocery items/check-state. It is not transactional with registration or broadcasts. Successful serialization emits raw camel-case `{type:"connected",schedule,connectionId}` in `event: connected`/`data:`/blank-line form and flushes. No generated client or success envelope maps it.

After initial success the controller attempts flushed `: ping\n\n` at 15-second timer ticks. Cancellation is caught; finally removes registration on cancellation/read/output failure. Other exceptions propagate; no replacement successful response is inferred after stream failure. Every accepted later request allocates a new ID and rereads week zero; no event `id:`/`retry:`, replay storage, Last-Event-ID handling or durable subscriber cursor appears. Initial snapshot covers schedule, not missed ready/failed notifications or every household store.

Publisher delegates named serialized frames to manager's current in-process dictionary; exclude ID skips exact matching entry. Per-entry semaphore protects broadcast writes from other broadcast writes, but controller snapshot/heartbeat writes bypass it. Comment claiming heartbeat protection is unsupported; connected-first ordering under concurrency is not established. Broadcast is sequential across dictionary enumeration; a slow stream can delay others. Write/flush catch removes dead entry; WaitAsync lies outside that catch, and removal/disposal races remain. No broadcast cancellation/deadline, durable queue, cross-replica backplane, acknowledgement, global ordering or exactly-once guarantee.

**Assertions:** StreamControllerIntegrationTests asserts 200/content type and first two event lines, type connected and existence of weekOffset/days, not exact zero/seven days/identity, heartbeat, failure ordering, auth or reconnect. Disconnect assertion checks count increase after reading the three initial lines and return to baseline after cancellation/disposal and 200ms delay. Manager tests use MemoryStreams for identical frame bytes on two connections and ThrowingStream removal plus healthy output; neither asserts concurrency/exclusion. Publisher tests inspect frame names/selected payload fields including week/echoSeq using in-memory manager; comments claiming schema parity exceed assertions (incremental payloads lack discriminator type). No tests executed. U95/U96/U101.

### BSL-household-live-updates-003 — Receipt and conditional displayed-week application

Hook connected handler JSON.parse has no validation/catch. It stores truthy connectionId first, calls applySnapshot(schedule) without echoSeq, then attempts Today. A malformed payload or thrown store step can prevent later steps; no acknowledgement, retry or rollback. `onopen` is not receipt; reading/emitting is not store application.

Week snapshot defaults absent weekOffset to zero; mismatched loaded offset returns without state/timestamp changes. For matching offset, pending localMoveSeq > confirmedMoveSeq or active drag retains days, replaces deferredWeekSnapshot, applies incoming status and lastSyncedAt. Reconnect never resets counters, drag or Today guard. Later echo confirmation flushes only with equal counters/no drag; planner drag-end can flush under equal counters. Echo branch confirms/skips its own payload, separate from ID exclusion. Missing confirmation can leave state deferred; no timeout forces convergence.

Recipe normalization accepts a nonempty string ID directly or in data/additionalData, otherwise null (`pwa/src/lib/api/planner.ts`). Eligible merges preserve stable index UI identities and same-date pending suggestion metadata absent a persisted recipe/non-cooking entry. All normalized incoming days without recipes preserve previous ordinary recipes/status and existing week status if prior days exist. Non-cooking entries override preservation. Snapshots have no revision/freshness comparison; stale input can overwrite or preserve state. lastSyncedAt updates even when days defer, so it does not certify complete application. Grocery items become supplied list or []; check-state reads only groceryState.additionalData. Real raw SSE dictionary lacks that wrapper, so check map can remain stale despite receipt. This discrepancy is recorded without contract/code repair or a full grocery policy baseline.

**Assertions:** weekStore tests assert offset ignore, eligible schedule/timestamp, pending metadata preservation/replacement, pending move/drag protection with status update, echo confirmation and eligible deferred flush. Wrapper-based grocery assertion observes both subscriptions in order (week before planner) in one synchronous tick, not an atomic transaction; absent map test asserts no call. No plain-wire connected → real-store test proves grocery check-state reconciliation, no direct empty-snapshot preservation assertion located in the inspected applySnapshot group. U98/U100/U101.

### BSL-household-live-updates-004 — Today, identity exclusion and missed-update consequences

After week handler returns, hook selects browser-local date using getTodayString. A matching entry supplies recipe/null, status/zero and nonCooking/null; no matching entry leaves Today untouched, even if stale. It is independent of loaded week and can update Today while another week ignores the snapshot. Local date can differ from server UTC week at boundaries. Today applies except during a <2000ms optimistic window with differing optional recipe ID; matching IDs absorb detail even within window. Accepted updates clear timestamp, retain nonCooking only at status three and set skipCookedCelebration for status two. Suppressed updates are discarded, not timer-replayed. Existing initializer/REST paths can later reconcile but are not a lossless SSE guarantee.

Stored connectionId is refreshed only by truthy connected identity, not cleared on error/unmount. Shared Kiota auth provider attaches nonempty stored X-SSE-Connection-ID; ScheduleController reads it and relevant service/publisher passes it as excludeConnectionId. Manager excludes exact registered ID. Missing/obsolete identity excludes none; identity is neither authorization nor durable consumer identity. Direct fetch wrappers can omit it. Move echoSeq is a separate confirmation mechanism; no complete mutation/event catalogue extracted.

Disconnected capture readiness/failure has no snapshot replay; corresponding journey owns its session notification behavior. Contextual detail polling remains recipe-quality's explicitly bounded recovery path, not a shared SSE fallback. Workflow acceptance/retry rules remain background-processing. Failed construction, blocked native retry, malformed payload, absent date, mismatched week, optimistic deferral/suppression, empty-snapshot preservation or raw grocery shape can all leave visible state stale. No guaranteed later repair is inferred.

**Assertions:** Today store tests inspect suppression for different recipe at 500ms, expiry at 3000ms, absent guard, accepted matching-ID detail, cleared timestamp and cooked flag. Hook tests assert connected dispatch and no blanket guard clear, including nonCooking forwarding for connected/week_updated, but stores are mocks. The planner mock has no setSseConnectionId and connected fixtures omit identity: real identity capture is source-supported only. Home browser test routes finite connected responses from mock persisted state, increments cookedReconnects while preparing a response and asserts counter>0 plus cooked UI before/after reload; counter is server-mock emission-attempt evidence, not proof of receipt/application of that frame. Fixtures freeze browser date, seed access cookies and block unhandled API calls. mock-api default connected omits identity and fulfills a finite empty week; some helpers dispatch MessageEvent directly. No live backend/auth/persistent heartbeat/identity/transport qualification. U97–U101; A34 remains deferred.

### BSL-household-live-updates-005 — Complete mapping, artifact status and validation boundary

**Artifacts/status:** CLI metadata, proposal, design, ADDED household-live-updates delta (15 requirements/38 scenarios), documentation-extraction tasks and this plan. Planning-complete reports artifact existence only. Draft for human review, not accepted/promoted/archived/implemented. All six main specs unchanged; twenty active changes. All entries below are implementation-supported; asserted means source assertions inspected, never tests run this session. Missing guarantees are withheld; no consequential product question is outstanding for this bounded draft.

| Delta requirement | Complete scenario headers | Evidence / assertion strength |
| --- | --- | --- |
| 1. Attempt the stream from the mounted app shell | No public API base; Public API base supplied; Navigation retains the app shell | BSL-household-live-updates-001: mock URL/credentials assertions; retained-layout source only |
| 2. Apply shared access and stream-specific member checks | Household access is missing; Member cookie is absent or malformed; Parseable member context reaches registration | BSL-household-live-updates-001: missing-cookie assertion with auth disabled; real gate/header/malformed/existence source only; U95/U101 |
| 3. Return a fresh connection identity with a successful snapshot | Initial snapshot succeeds; Snapshot retrieval fails after registration | BSL-household-live-updates-002: connected/type/schedule presence asserted; identity/read-failure cleanup source only; U95 |
| 4. Read week zero on every accepted connection | Read the current schedule; Reconnect while another week is displayed | BSL-household-live-updates-002: weekOffset/days fields asserted; exact zero/seven/UTC/reconnect scope source only |
| 5. Frame and maintain the open response | Emit a data frame; Heartbeat tick succeeds; Request ends | BSL-household-live-updates-002: framing/content type/disconnect asserted; other headers/heartbeat/failure cleanup source only; U96 |
| 6. Keep browser connection failures bounded to the mounted effect | Construction throws; Connection reports an error; Shell unmounts | BSL-household-live-updates-001: cleanup close asserted; construction/error/native responsibility source only; U97 |
| 7. Dispatch received connected snapshots without resetting optimistic guards | Receive a connected identity; Connected identity is omitted; Reconnect with pending optimistic work | BSL-household-live-updates-003/004: dispatch/no-clear and metadata assertions; identity path source only; U101 |
| 8. Reconcile only the displayed snapshot week | Displayed week matches; Another week is displayed | BSL-household-live-updates-003: offset ignore/eligible merge assertions; independent Today source and substituted dispatch |
| 9. Defer day replacement during local moves | Local move is unconfirmed; Drag remains active; Deferred snapshot becomes eligible | BSL-household-live-updates-003: pending move/drag/echo flush assertions; latest replacement/drag-end source only; U98 |
| 10. Preserve existing day content under snapshot merge guards | Pending content remains unassigned; Server occupies the date; Incoming week has no recipes | BSL-household-live-updates-003: pending retain/persisted recipe replacement asserted; empty-week fallback source only; U98 |
| 11. Apply available snapshot adjuncts conditionally | Additional-data check map is present; Raw or missing check map | BSL-household-live-updates-003: wrapped/absent grocery map assertions; plain wire mismatch source only; U100 |
| 12. Select Today independently from the received snapshot | Today is present; Today is absent | BSL-household-live-updates-004: connected non-cooking dispatch assertion; absence/date-boundary source only; U99 |
| 13. Preserve Today's recent optimistic recipe guard | Different recipe arrives inside the guard; Matching recipe arrives inside the guard; Guard is absent or expired | BSL-household-live-updates-004: actual store different-ID/matching-ID/expired/null guard assertions; no timed replay source only |
| 14. Use connection identity only for immediate echo exclusion | Matching registered identity is excluded; Identity is missing or obsolete | BSL-household-live-updates-004/002: actual header/controller/manager source; no exclusion assertion in inspected manager suite; U95/U101 |
| 15. Bound delivery to current process registrations | Healthy registered responses; Registered response fails during output | BSL-household-live-updates-002: two MemoryStream bytes/dead stream removal asserted; local registration/locks/concurrency limits source only; U96 |

**Verification boundary:** Selected strict validation passed before this evidence update. Final all-item strict validation, complete documentation diff/mapping/preservation checks and explicit six-path `task verify` outcomes/content identity belong to the final response/current `.task/agent-finish/last-run.json`. This plan does not attach earlier success to a later content digest. Runtime/unit/API/browser/network/database/model qualification is **not-run** by authorization (A34). Behavior TDD, new tests, contract/client generation, migrations/deployment are **not-applicable**. Report failed and blocked checks separately if encountered.

Explicit final selection:

```sh
task verify -- docs/openspec-baseline-plan.md openspec/changes/baseline-household-live-updates-connection-reconciliation/.openspec.yaml openspec/changes/baseline-household-live-updates-connection-reconciliation/proposal.md openspec/changes/baseline-household-live-updates-connection-reconciliation/design.md openspec/changes/baseline-household-live-updates-connection-reconciliation/specs/household-live-updates/spec.md openspec/changes/baseline-household-live-updates-connection-reconciliation/tasks.md
```

### Household connection source identities — SHA-256

All 216 prior unique evidence hashes rechecked unchanged. This manifest records 36 inspected inputs, 23 newly represented paths, 239 unique evidence paths overall. Digests identify inspected source, not passing runtime evidence. Main specs and existing artifacts are separately preserved against the before-image.

| Source | SHA-256 |
| --- | --- |
| `api/src/RecipeApi/Controllers/StreamController.cs` | `5390ca4e51b20da5579fa7dd4ac70e62cf46c151a542d77fd8a6459ff41fb73e` |
| `api/src/RecipeApi/Infrastructure/SseConnectionManager.cs` | `6e757f5e3a63a96ab98287e2cfa761d0010969e1db1664f87db28e6f0c8460d9` |
| `api/src/RecipeApi/Infrastructure/IScheduleEventPublisher.cs` | `ae8b2dc385c0a83b0bb6fd2b9ed53b627c91d1f3fa5cbe84440b6e26e09f5722` |
| `api/src/RecipeApi/Infrastructure/SseEventPublisher.cs` | `8378000101a36943903b8c7f7dcb560c3202464258410ac127d6d34b512c1696` |
| `api/src/RecipeApi/Infrastructure/HearthAuthenticationHandler.cs` | `51ecd8a5be459e1ffaae7e3a33646de57aa13bf0fec088a7e388083da08ee817` |
| `api/src/RecipeApi/Infrastructure/FamilyMemberIdModelBinder.cs` | `4d5dcc9f7d9993abb4c59802f770da139c4875c55544df8410553332a04a2f64` |
| `api/src/RecipeApi/Infrastructure/SuccessWrappingFilter.cs` | `6fa3cd08587220fc4e18803f6ba020e494b81211cf99c53ec10de23ddd46f11d` |
| `api/src/RecipeApi/Middleware/ErrorHandlingMiddleware.cs` | `b5849eb709ca2bc85efa3051d3a953ca955ef8704848327ad88d0297299d949b` |
| `api/src/RecipeApi/Program.cs` | `a4a2510b9cf0bbeb0e05072ab2bf2b299f4029e449bff17e7386b62f5321c523` |
| `api/src/RecipeApi/Controllers/ScheduleController.cs` | `d6d956d5465148995d55859253963542a8e9fb2d0e247b6333f6b5a57a779f91` |
| `api/src/RecipeApi/Services/ScheduleService.cs` | `8c1e8403f759425b8882eecb26f2bc8f4c9692f81bcf6e9bc3777c78013c40ec` |
| `api/src/RecipeApi/Dto/ScheduleDays.cs` | `52d4bf981307df51a4b38fc12a2fe3271eb2be6445089d5521a83fb399f691e7` |
| `api/src/RecipeApi.Tests/Integration/StreamControllerIntegrationTests.cs` | `48735bc5cdaf41f71a6f4c79ab7813d3ecc9a2c4a9c056061d14edecef452fbd` |
| `api/src/RecipeApi.Tests/Infrastructure/SseConnectionManagerTests.cs` | `98259dd119230ad4cabdf4cb5bfec51442af1749ad516cdebe522fcde205b6d8` |
| `api/src/RecipeApi.Tests/Infrastructure/SseEventPublisherTests.cs` | `0ff6a076069fa8dfa9cf038c28371c467e464c72bdbd808a809859beb02612d5` |
| `api/src/RecipeApi.Tests/Infrastructure/TestWebApplicationFactory.cs` | `0ee567443fc0b5c11fffe631c94ea0407681b371224d8083a0e32b94b280804c` |
| `specs/openapi.yaml` | `0fbd27813611e16474ec17a48ede372d5a41af02db3fa9ded82295a6357046ff` |
| `pwa/src/hooks/useScheduleStream.ts` | `0e1f1b91e459b77fd90ca6a071ff5cb8fc0cbcc64e8cab54a00b8232c9ab2107` |
| `pwa/src/hooks/useScheduleStream.test.ts` | `cb10d4613fb4430cfc8b9e33c494f8ae9051a079048dc34da376f40e0575acef` |
| `pwa/src/app/(app)/layout.tsx` | `4daa1c42696fc0ed77b1e458199844dac241ee87116e2e14f218057dc59bb5e9` |
| `pwa/src/app/(app)/layout.test.tsx` | `01b164ecf61a4999e96c1cfc3c7171fe43db19bc891b573f71ec001adc460cbd` |
| `pwa/src/app/(app)/planner/page.tsx` | `f113f605a33f78cdde5ed6b6ab37c2742d952c7be4319063ff91eeb81dae7f6d` |
| `pwa/src/store/weekStore.ts` | `e58ca9aaf2755fc5b95aacd0518d443456937febec82c0ab3955c8eb14cae3b8` |
| `pwa/src/store/weekStore.test.ts` | `2763118a45acc45c381ecb2bd8dff557c85a02df891d9fd3b5e3fc3987e666a1` |
| `pwa/src/store/todayStore.ts` | `42e172475415ee013bd2dd352a338bcda4ba293d09eea35c3308c744bf68fd63` |
| `pwa/src/store/todayStore.test.ts` | `a049df21755c4270f588d9b40989669bbdcaf2bb48a7dff3c40b2d63379555ae` |
| `pwa/src/store/plannerStore.ts` | `0058c7adf697f243c08ef18b89492ecdd3622fde24688930c1ebca0dce178f31` |
| `pwa/src/lib/api/api-client.ts` | `c5cd4cfebddd8d5c1f2827c522a236fe12c504130ea0991c07bc8fc46376aa95` |
| `pwa/src/lib/api/schedule.ts` | `1d1d3d5bf5463b5b82a13d9020562639f215bdb7d8edbc402321626cf14bb1cd` |
| `pwa/src/lib/auth.ts` | `d9b122b42cccfdc8a589c05a3e05deaa4a4864dee9cf17c4a403ec5f6db09f2a` |
| `pwa/src/lib/identity/cookie.ts` | `f899606ac6d2cc7b800b0e03a5b16dbe908e7967e8d7f9802baff52c4f5e640b` |
| `pwa/src/lib/imageUtils.ts` | `a51d124d0fae2a99257186e607597825299737ca77717813aac3ce72821d46be` |
| `pwa/e2e/fixtures.ts` | `402b5a1b872f625dc1425f46afdede2c9378dcc473088159774a8455b5d188e2` |
| `pwa/e2e/mock-api.ts` | `063ed6d6629ccde163487a92543ae36918183a81b7301dd01a5389248cbcbd07` |
| `pwa/e2e/home-recipe.spec.ts` | `a98b3a7ec5da9987f700987e10f5c6f7ecac36dbf92bb268a53419b9c97e12ac` |
| `pwa/src/lib/api/planner.ts` | `7d9c5b0b609e9bce53100192fe395df32b90773d2e5b1a55664bb8a84cc2f26a` |


### BSL-household-live-updates-006 — Connection/reconciliation main-spec promotion

**Authorization A82 (2026-10-15):** User “promote” immediately after the validated A81 draft authorizes syncing only its reviewed household-live-updates delta into main, with plan/task follow-up. No archive, application/test/contract/configuration edits, runtime qualification or successor slice.

**Result:** New `openspec/specs/household-live-updates/spec.md` contains the exact reviewed Purpose body and all 15 requirements/38 scenarios verbatim under one Requirements heading. Its non-normative evidence section references BSL-household-live-updates-001–006, U95–U101 and A34, retaining separation of attempted/registered/emitted/received/applied state. All 15 mapping rows/38 scenario headers remain applicable. No delta operation header or TBD Purpose in main. Six existing main specs remain unchanged at identity 36/92, library 55/122, sharing 9/34, capture 37/92, quality 37/92 and background 14/42. Twenty changes remain active; selected delta, proposal, design and metadata are unchanged.

**Preservation and checks:** All 239 source identities match. A private before-image captured the entire existing plan, file digests and staged binary diff before promotion. Compare all existing files/index and prior plan lines, allowing only the current Next action cell and selected task follow-up. Require exact Purpose/requirement equality, strict main/specs/all validation, complete three-path documentation review and explicit `task verify` for main household-live-updates, this plan and selected tasks. Final observed outcomes/content identity belong to final response/current `.task/agent-finish/last-run.json`; do not attach earlier checks to later content. Runtime/unit/API/browser/network/database/model qualification **not-run** under A34; implementation TDD, client generation, migrations/deployment **not-applicable**. No archive/application/successor work.


## Execution prompt

Paste this prompt and replace the session instruction with the desired bounded
scope. The default authorizes review only. Select the model in your host.

```text
Work on the household-live-updates OpenSpec brownfield baseline in
/Users/alex/Code/whats-for-supper.
Session instruction: Review this capability's checkpoint and recommend the next
bounded slice. Do not generate specs or change application behavior.

Read AGENT.md and its active-host loading rules, then
 docs/openspec-baseline/workflow.md and
 docs/openspec-baseline/household-live-updates.md.
Use these as the execution context; do not read the full history or other
capability plans unless an immediate dependency requires a specific section.
Resolve installed OpenSpec workflow/root before artifact writes. Preserve staged,
unstaged and untracked work. Recheck source identity and affected evidence.

Current user messages define scope. Reuse recorded decisions without asking for
approval again within already authorized work. Do not infer new drafting,
promotion, archive, implementation or runtime qualification authority from history.
Trace one selected observable journey through source, contracts and actual test
assertions/substitutions. Keep disputed claims non-normative. No application,
test, contract, client, SQL, configuration or dependency edits.

Update this capability plan's evidence/mappings, decisions, uncertainty, artifact
status, session log and next action. Update the small index only if its routing or
summary changes. Validate selected artifacts and run task verify with every changed
path. Distinguish passed, failed, blocked, not-run and not-applicable; source
support is not runtime verification. Stop at the authorized session boundary.
```

## Next-session record

Use this section for new capability sessions after the split. The earlier evidence
and lifecycle records above retain their original chronology.

```text
Session/date:
Branch, commit, relevant dirty inputs:
Current user authorization and selected capability/slice:
Completed discovery/evidence IDs:
Artifact paths and status (draft/validated/accepted/promoted separately):
Human decisions and unresolved questions:
Checks: passed / failed / blocked / not-run / not-applicable, with reasons:
Limitations and excluded assertions:
Exact next bounded action:
```


## Remaining shared coverage generation — HLU-A01, 2026-10-16

### Authorization, checkpoint and preservation

The attached user request explicitly authorizes documentation-only discovery and
successive bounded generation of **all remaining supported household-live-updates
scope**. It supersedes the former wait-for-successor instruction only within this
capability. No promotion, application/test/contract/client/configuration edits,
runtime qualification, staging, commit, publication, deployment or archive.
Recorded decisions A81/A82 and U95–U101 remain intact. Local HLU identifiers avoid
colliding with other capabilities' concurrent decisions/uncertainties.

Branch `moving-to-openspec`, HEAD `04a1c4570f9bbb01b47436790d4248635ac3179a`.
`openspec list --json` and `context --json` resolve nearest repo root
`/Users/alex/Code/whats-for-supper`, no store/members, configured `spec-driven`.
Initial inventory: 38 active changes, eight accepted main capabilities. At final
reconciliation, 42 changes are present: these three and one concurrent identity
member-context-lifecycle change; all eight main capabilities remain unchanged. Only the
connection-reconciliation change targets this capability; it is promoted and
retained active, not an outstanding draft to duplicate. CLI “complete” is task/file
state, not acceptance. Current main header counts rechecked: identity 36/92,
library 92/201, sharing 9/34, capture 37/92, quality 37/92, background 14/42,
meal-planning 49/114, live-updates 15/38.

A private before-image captured 1,615 unique tracked/untracked file identities,
initial status, complete staged/unstaged binary diffs and this plan before edits.
All 36 historical source-manifest rows in this plan still match their SHA-256
values. The old statements about 216/239 identities and 20 active changes remain
historical and are not reused as current counts. Navigation specification
`openspec/specs/background-task-navigation/spec.md` is absent at entry; Git lists
no pending deletion. Preserve that absence, rather than restoring it or inventing
a currently dirty deletion. Initial Git inputs are recorded verbatim below.

<details>
<summary>Initial staged, unstaged and untracked inputs (XY status)</summary>

```text
M  .github/workflows/validate.yml
M  Taskfile.yml
M  docs/openspec-baseline-plan.md
M  docs/openspec-baseline/meal-planning.md
M  docs/openspec-baseline/recipe-library.md
A  openspec/changes/baseline-background-processing-remaining-shared-behavior/.openspec.yaml
A  openspec/changes/baseline-background-processing-remaining-shared-behavior/proposal.md
AM openspec/changes/baseline-background-processing-remaining-shared-behavior/specs/background-processing/spec.md
M  openspec/changes/baseline-household-identity-member-removal/design.md
M  openspec/changes/baseline-household-identity-member-removal/specs/household-identity/spec.md
M  openspec/changes/baseline-household-identity-member-renaming/design.md
M  openspec/changes/baseline-household-identity-member-renaming/specs/household-identity/spec.md
M  openspec/changes/baseline-household-identity-profile-switching/design.md
M  openspec/changes/baseline-household-identity-profile-switching/specs/household-identity/spec.md
A  openspec/changes/baseline-meal-planning-non-cooking-day-plans/.openspec.yaml
A  openspec/changes/baseline-meal-planning-non-cooking-day-plans/design.md
A  openspec/changes/baseline-meal-planning-non-cooking-day-plans/proposal.md
A  openspec/changes/baseline-meal-planning-non-cooking-day-plans/specs/meal-planning/spec.md
A  openspec/changes/baseline-meal-planning-non-cooking-day-plans/tasks.md
A  openspec/changes/baseline-recipe-library-claim-corrections/.openspec.yaml
A  openspec/changes/baseline-recipe-library-claim-corrections/design.md
A  openspec/changes/baseline-recipe-library-claim-corrections/proposal.md
A  openspec/changes/baseline-recipe-library-claim-corrections/specs/recipe-library/spec.md
A  openspec/changes/baseline-recipe-library-claim-corrections/tasks.md
M  openspec/changes/baseline-recipe-library-deletion-restore-purge/design.md
M  openspec/changes/baseline-recipe-library-deletion-restore-purge/specs/recipe-library/spec.md
M  openspec/changes/baseline-recipe-library-detail-discoverability/design.md
M  openspec/changes/baseline-recipe-library-detail-discoverability/specs/recipe-library/spec.md
M  openspec/changes/baseline-recipe-library-detail-editing/design.md
M  openspec/changes/baseline-recipe-library-detail-editing/specs/recipe-library/spec.md
M  openspec/changes/baseline-recipe-library-detail-reading/design.md
M  openspec/changes/baseline-recipe-library-detail-reading/specs/recipe-library/spec.md
A  openspec/changes/baseline-recipe-library-hero-regeneration-acceptance/.openspec.yaml
A  openspec/changes/baseline-recipe-library-hero-regeneration-acceptance/design.md
A  openspec/changes/baseline-recipe-library-hero-regeneration-acceptance/proposal.md
A  openspec/changes/baseline-recipe-library-hero-regeneration-acceptance/specs/recipe-library/spec.md
A  openspec/changes/baseline-recipe-library-hero-regeneration-acceptance/tasks.md
A  openspec/changes/baseline-recipe-library-hero-retrieval/.openspec.yaml
A  openspec/changes/baseline-recipe-library-hero-retrieval/design.md
A  openspec/changes/baseline-recipe-library-hero-retrieval/proposal.md
A  openspec/changes/baseline-recipe-library-hero-retrieval/specs/recipe-library/spec.md
A  openspec/changes/baseline-recipe-library-hero-retrieval/tasks.md
A  openspec/changes/baseline-recipe-library-instruction-provider/.openspec.yaml
A  openspec/changes/baseline-recipe-library-instruction-provider/design.md
A  openspec/changes/baseline-recipe-library-instruction-provider/proposal.md
A  openspec/changes/baseline-recipe-library-instruction-provider/specs/recipe-library/spec.md
A  openspec/changes/baseline-recipe-library-instruction-provider/tasks.md
M  openspec/changes/baseline-recipe-library-list-visibility/design.md
M  openspec/changes/baseline-recipe-library-list-visibility/specs/recipe-library/spec.md
A  openspec/changes/baseline-recipe-library-lookup-reading/.openspec.yaml
A  openspec/changes/baseline-recipe-library-lookup-reading/design.md
A  openspec/changes/baseline-recipe-library-lookup-reading/proposal.md
A  openspec/changes/baseline-recipe-library-lookup-reading/specs/recipe-library/spec.md
A  openspec/changes/baseline-recipe-library-lookup-reading/tasks.md
A  openspec/changes/baseline-recipe-library-original-photo-append/.openspec.yaml
A  openspec/changes/baseline-recipe-library-original-photo-append/design.md
A  openspec/changes/baseline-recipe-library-original-photo-append/proposal.md
A  openspec/changes/baseline-recipe-library-original-photo-append/specs/recipe-library/spec.md
A  openspec/changes/baseline-recipe-library-original-photo-append/tasks.md
A  openspec/changes/baseline-recipe-library-persisted-facts/.openspec.yaml
A  openspec/changes/baseline-recipe-library-persisted-facts/design.md
A  openspec/changes/baseline-recipe-library-persisted-facts/proposal.md
A  openspec/changes/baseline-recipe-library-persisted-facts/specs/recipe-library/spec.md
A  openspec/changes/baseline-recipe-library-persisted-facts/tasks.md
M  openspec/changes/baseline-recipe-library-ratings-notes/design.md
M  openspec/changes/baseline-recipe-library-ratings-notes/specs/recipe-library/spec.md
A  openspec/changes/baseline-recipe-library-stack-browsing/.openspec.yaml
A  openspec/changes/baseline-recipe-library-stack-browsing/design.md
A  openspec/changes/baseline-recipe-library-stack-browsing/proposal.md
A  openspec/changes/baseline-recipe-library-stack-browsing/specs/recipe-library/spec.md
A  openspec/changes/baseline-recipe-library-stack-browsing/tasks.md
A  openspec/changes/baseline-recipe-library-status-provider/.openspec.yaml
A  openspec/changes/baseline-recipe-library-status-provider/design.md
A  openspec/changes/baseline-recipe-library-status-provider/proposal.md
A  openspec/changes/baseline-recipe-library-status-provider/specs/recipe-library/spec.md
A  openspec/changes/baseline-recipe-library-status-provider/tasks.md
A  openspec/changes/baseline-recipe-library-summary-reading/.openspec.yaml
A  openspec/changes/baseline-recipe-library-summary-reading/design.md
A  openspec/changes/baseline-recipe-library-summary-reading/proposal.md
A  openspec/changes/baseline-recipe-library-summary-reading/specs/recipe-library/spec.md
A  openspec/changes/baseline-recipe-library-summary-reading/tasks.md
A  openspec/changes/baseline-recipe-library-trash-pending-controls/.openspec.yaml
A  openspec/changes/baseline-recipe-library-trash-pending-controls/design.md
A  openspec/changes/baseline-recipe-library-trash-pending-controls/proposal.md
A  openspec/changes/baseline-recipe-library-trash-pending-controls/specs/recipe-library/spec.md
A  openspec/changes/baseline-recipe-library-trash-pending-controls/tasks.md
A  openspec/changes/baseline-recipe-library-update-persistence-boundaries/.openspec.yaml
A  openspec/changes/baseline-recipe-library-update-persistence-boundaries/design.md
A  openspec/changes/baseline-recipe-library-update-persistence-boundaries/proposal.md
A  openspec/changes/baseline-recipe-library-update-persistence-boundaries/specs/recipe-library/spec.md
A  openspec/changes/baseline-recipe-library-update-persistence-boundaries/tasks.md
M  openspec/changes/baseline-recipe-library-view-original/design.md
M  openspec/changes/baseline-recipe-library-view-original/specs/recipe-library/spec.md
M  openspec/changes/baseline-recipe-quality-issue-reporting/design.md
M  openspec/changes/baseline-recipe-quality-issue-reporting/specs/recipe-quality/spec.md
M  openspec/changes/baseline-recipe-sharing-bundle-export-import/design.md
M  openspec/changes/baseline-recipe-sharing-bundle-export-import/specs/recipe-sharing/spec.md
M  openspec/specs/meal-planning/spec.md
M  openspec/specs/recipe-library/spec.md
?? openspec/changes/baseline-background-processing-remaining-shared-behavior/design.md
?? openspec/changes/baseline-household-identity-capture-attribution/
?? openspec/changes/baseline-household-identity-member-context-transport/
```

</details>

Concurrent edits were observed in identity/background capability plans, the
identity member-context transport design/delta and the shared index. They are
not task-owned. Preserve them; edit only the live-update summary row in the
current index. The staged binary diff remains unchanged. The task's existing-file
changes are this capability plan's checkpoint/append and that single index row;
new paths are only the three CLI-scaffolded changes listed below.

### Compact coverage inventory and dispositions

| Inventory entry | Current evidence / semantic comparison | Disposition |
| --- | --- | --- |
| Shell/access, cookie connection, connected ID, week-zero snapshot, framing/heartbeat/cleanup, native retry bounds | Main 15/38; BSL-001–006; all historical source rows match | Already promoted; no duplicate delta |
| Ordinary snapshot week gate, deferral, preservation, adjuncts and Today optimistic guard | Main “Reconcile only the displayed snapshot week” through “Preserve Today's recent optimistic recipe guard”; BSL-008 | Already promoted; reused by week events |
| `slot_updated` and `week_updated`, supported trigger boundaries, receipt/date routing and echo handling | BSL-007/008/011; schedule-events delta | Newly drafted shared consequences |
| `vote_updated`, `smart_defaults_updated`, `fill_the_gap_invalidated` | BSL-009/011; discovery-events delta | Newly drafted fan-out, week gates, pending reconciliation and invalidation |
| `grocery_updated` | BSL-010/011; grocery-lifecycle-dispatch delta | Newly drafted check-map publication/loaded-week replacement |
| `recipe_ready`, `recipe_failed` shared handoff | BSL-010/011; grocery-lifecycle-dispatch delta | Newly drafted ready set and available context forwarding only |
| Capture completion/failure UI, readiness finalization and recovery actions | recipe-capture “Inline transition to ready status upon completion”, “Finalize photo recipe readiness and broadcast completion”, “Persistent failure banner on workflow failure”; recipe-quality “Address capture retry to the loaded workflow failure” | Owner-held; no new UI/retry policy |
| Failure classification, retry schedule, task Failed/instance Paused | background-processing “Classify automatic retry eligibility at the attempt boundary”, “Retain terminal task failure and pause its workflow” | Owner-held; only shared event consequence extracted |
| Schedule dates, assignment/displacement/defer/cooking, non-cooking eligibility | Meal-planning accepted “Project stored recipe and non-cooking read content”, “Publish a saved recipe-free slot before returning success”; other operations retain their domain owner even where not yet extracted | Owner-held; trigger catalogue is evidence, not new domain policy |
| Grocery aggregation/keys/quantity/atomic toggle policy; vote/consensus/ranking; Search promotion eligibility | Actual domain consumers inspected; grocery-shopping, recipe-discovery and recipe-search have no accepted main requirements yet | Owner-held; do not invent accepted requirement IDs |
| `discovery_nudge` | OpenAPI declares it; no publisher/interface call or hook listener; stale store comment only | Unsupported; excluded (HLU-U04) |
| Guaranteed delivery/replay/order/atomic visibility/malformed recovery/cross-replica/ever-fresh state | No supporting path; U95–U101/HLU-U01–05 | Excluded or qualified, not requirements |

Every publisher method and every browser domain listener has a row above. No
additional direct BroadcastAsync caller exists in production outside the publisher;
connected/heartbeat writes are separately owned by the controller. No remaining
supported in-scope entry is deferred to a successor slice.

### BSL-household-live-updates-007 — Schedule trigger and payload catalogue

**Evidence class/confidence:** implementation-supported; high for local save/call
and payload mechanics, medium for complete integration. Assertions inspected, not
executed. Durable anchors: `api/src/RecipeApi/Controllers/ScheduleController.cs`
(GetConnectionId/GetMoveSeq and action methods),
`api/src/RecipeApi/Services/ScheduleService.cs` methods below,
`api/src/RecipeApi/Infrastructure/IScheduleEventPublisher.cs`,
`SseEventPublisher.cs`, `SseConnectionManager.BroadcastAsync`,
`api/src/RecipeApi/Dto/ScheduleDays.cs`, `SmartDefaultsDto.cs`, `NonCookingPlanDto.cs`.

Ordered trace: request/action → validation/domain save → optional grocery
recomputation/reread → publisher anonymous object → manager JSON serialization →
current registrations/exact exclusion → successful named-frame bytes/flush →
browser listener → BSL-008 consumers. Each step can stop before the next.

| Actual trigger | Publication boundary / fields / exclusions |
| --- | --- |
| OpenVotingAsync, LockScheduleAsync | Save then GetScheduleAsync(operation offset), then week_updated; forward request exclusion; lock purges votes without emitting per-recipe vote events |
| AssignRecipeAsync | Save/recompute, week_updated then fill_the_gap_invalidated for supplied week; Sunday displacement additionally recomputes/publishes next-week snapshot; no extra next-week invalidation call |
| RemoveRecipeAsync | Only existing dated event: remove/save/recompute, affected-offset week_updated then fill_the_gap_invalidated; absent date has neither call |
| MoveScheduleEventAsync | Same-week successful path save then source-offset week_updated; numeric echo forwarded. Explicit cross-week branch runs helper/recompute then publishes source snapshot only, even if helper returned without moving; no universal destination snapshot guarantee |
| DeferRecipeAsync | Save/recompute distinct source/destination Mondays, then reread/publish each distinct offset with supplied echo/exclusion |
| FinalizeOverdueMealsAsync | No overdue entries returns; otherwise save then reread/publish each affected week without request exclusion |
| ValidateDayAsync | Save/commit changed existing slot or new skipped entry before slot_updated; unscheduled-cooking early branch saves history then invalidation only; invalid/conflicting/throwing preceding paths establish no successful slot attempt |

Publisher keys: slot `{date: yyyy-MM-dd, recipe, status, nonCooking}`; week
`{schedule}` plus `echoSeq` only when supplied. DTO JsonPropertyName attributes map
nested camel-case days, recipe IDs, voteCount, ingredients, description/totalTime
and non-cooking metadata. No generated SSE mapping is invoked. Optional request
header X-SSE-Connection-ID passes exact registration exclusion; X-Move-Seq parses
as integer for move/defer. Missing/obsolete identity excludes none (accepted main).
No source claim that every mutation publishes every relevant consumer event.

**Inspected assertions/substitutions:** ScheduleIntegrationTests
`AssignRecipe_PublishesWeekUpdatedAndFillTheGapEvents`,
`RemoveRecipe_PublishesWeekUpdatedAndFillTheGapEvents`,
`LockSchedule_PublishesWeekUpdatedEvent`, `ValidateDay_PublishesSlotUpdatedEvent`
verify selected mock publisher calls using EF InMemory, not real transport.
ScheduleServiceTests `DeferRecipe_MovesLockedSourceToFirstFreeDateAndPublishesBothWeeks`
checks two calls with connection/12; `Should_Publish_EchoSeq_When_Move_Is_Confirmed`
checks echo 9 call; `RemoveRecipe_UsesInjectedClockToPublishTheAffectedWeek`
checks affected offset. SseEventPublisherTests uses real manager/MemoryStream,
asserts named slot/date/recipe/status, null recipe, custom nonCooking fields,
week offset and echo field; it does not schema-validate or observe browser state.

### BSL-household-live-updates-008 — Incremental schedule receipt and application

**Evidence class/confidence:** implementation-supported, high local mechanics with
selected store assertions, medium complete wire/browser integration. Durable
anchors: `pwa/src/hooks/useScheduleStream.ts` slot_updated/week_updated handlers;
`pwa/src/store/weekStore.ts` applySlotUpdate/applySnapshot;
`pwa/src/store/plannerStore.ts` confirmMoveSeq/setDeferredWeekSnapshot;
`pwa/src/store/todayStore.ts` applyServerUpdate;
`pwa/src/lib/api/api-client.ts` HearthAuthProvider;
`pwa/src/lib/api/planner.ts` moveRecipe; `pwa/src/lib/imageUtils.ts` getTodayString.

Slot raw JSON.parse → Today offer only if browser-local date matches → week slot
offer → Search invalidation. Week store ignores empty schedule/unmatched dates;
matching dates receive recipe (null becomes undefined), status, nonCooking only
for status three, pending false. Other fields spread from old day; no full pending
metadata cleanup, move/drag gate, new day insertion, grocery or timestamp update.
Today uses already accepted two-second different-ID suppression; no timed replay.

Week raw JSON.parse → applySnapshot(schedule, echoSeq) → Search invalidation →
Today offer if local date exists. Ordinary no-echo snapshots retain all accepted
week/drag/merge/adjunct guards. Independent Today can apply when displayed-week
filter rejects; missing Today entry leaves its state unchanged. Echo handling
happens before offset filter: confirmMoveSeq Math.max, optional deferred release
only at equal local/confirmed sequence with no drag, then return without using the
echo snapshot. Hook still reaches Search/Today if that call returns. An echo can
therefore confirm a number without replacing displayed days. No validation binds
echo number to this registration; request exclusion can keep the origin from
receiving it. No guaranteed confirmation or eventual release is inferred.

**Inspected assertions:** useScheduleStream.test.ts uses MockEventSource.emit and
mock store methods/frozen local date, asserting Today-date routing, non-today week
dispatch, nonCooking forwarding, schedule/echo forwarding and week Today updates;
slot Search invalidation is asserted. It does not exercise real manager → browser
→ store integration. weekStore.test.ts applySlotUpdate group asserts matching,
empty/unmatched and null-clearing; applySnapshot group asserts mismatched week,
active-drag/pending move protection, “skips update and confirms seq when echoSeq
matches own move”, and deferred flush after echo. Older echo, echo before different
offset and slot during drag are source-supported only, not located assertions.
Today tests and browser substitutions remain qualified in BSL-004/U101.

### BSL-household-live-updates-009 — Discovery signals and downstream freshness

**Evidence class/confidence:** implementation-supported; high local mechanics,
medium integration. Durable anchors: `DiscoveryService.SubmitVoteAsync` and private
GetSmartDefaultsAsync, ScheduleService trigger table, SseEventPublisher methods,
hook vote/smart_defaults/fill handlers, weekStore.applyVoteUpdate/
applySmartDefaultsUpdate, discoveryStore.applyVoteUpdate/invalidateFillTheGap,
searchPromotionStore.invalidate, `components/planner/QuickFindModal.tsx`
fetchSuggestions/effects, `app/(app)/discovery/page.tsx` refetchCurrentCategory/effect,
`app/(app)/recipes/page.tsx` promotion version guards. Paths are under `pwa/src`
unless previously identified API files.

Saved vote → count Like rows → attempted vote_updated `{recipeId,voteCount}`;
then family count and boundary check equals ceil((familySize+1)/2) or one less →
GetSmartDefaultsAsync(0) → attempted smart_defaults_updated
`{weekOffset:0,defaults}`. This tests resulting count, not actual threshold crossing;
it is not a vote-purge or every-week broadcaster. Neither call passes request
exclusion. Vote/threshold mathematics and server recommendation policy stay domain
owned. Hook fans vote to week then Discovery. Week changes nested recipe.voteCount
on matching recipes only, not pending _voteCount. Discovery updates matching
interest/count, keeps front and sorts full tail by vote count/queueOrder. Stale
comments limiting reordering to positions 1–3 are not normative evidence.

Smart-default handler tests **nested** defaults.weekOffset strict equality;
outer weekOffset is ignored. Missing nested offset fails this gate even though
store direct entry defaults absent offset to zero. Store protects status-three and
persisted recipe slots, maps preselected recipes by day index to empty/pending
slots with name/image/vote metadata, clears withdrawn pending recipe/marker and
_voteCount/_unanimousVote. No independent voting-open gate exists in this path.

Fill-the-gap publisher emits `{weekOffset}` at BSL-007 branches; hook advances
global and per-week Discovery generations, then Search version. Quick Find
subscribes per week; new version after initial fetch attempts refresh; latestFetchId
rejects obsolete completions. Discovery page uses global generation after loaded
nonempty stack and attempts category fetch; it can remove missing recipes/advance
category, but those UI/domain consequences stay recipe discovery's scope. Search
version marks promotion data stale; page checks version for presentation/Feel Lucky
and subsequent fetch processing. An invalidation is not fetched candidates or a
successful update; no browser copy of server eligibility is added here.

**Inspected assertions:** ScheduleIntegrationTests Vote_PublishesVoteUpdatedEvent
and VoteThresholdCrossed_PublishesSmartDefaultsUpdatedEvent use mocked publisher
and InMemory; the latter actually verifies both resulting boundary values.
Publisher MemoryStream assertions inspect vote identity/count, smart outer offset
and nested familySize, invalidation offset. Hook tests assert calls/current vs other
nested week and fill offset forwarding with mocked stores. weekStore tests assert
matching/unknown vote, pending merge, occupied protection, withdrawal and week gate;
“keeps a skipped day occupied when stale smart defaults and snapshots arrive”
asserts status-three retention. discoveryStore tests assert global/per-week counters,
interest/front/tail examples. QuickFindModal.test.ts asserts repeat fetch calls on
versions, no second version-zero fetch, later response wins and other-week isolation
with mocked APIs/store versions. No source-to-browser qualification was executed.

### BSL-household-live-updates-010 — Grocery checks and lifecycle handoffs

**Evidence class/confidence:** implementation-supported, high local mechanics,
medium end-to-end integration. Durable anchors: ScheduleService.UpdateGroceryStateAsync/
ToggleGroceryItemAsync; GroceryRecomputeService.RecomputeForWeekAsync;
RecipeReadyProcessor.ExecuteAsync/RecordPdfReadinessAsync;
WorkflowWorker.ProcessTaskAsync/PublishRecipeFailedEventAsync; publisher/manager;
hook grocery/ready/failed handlers; plannerStore.setGroceryState;
captureStore.getPending/removePending; libraryStore.pushNotification;
gotoStore.markReady; LibraryToast, RecipeFailureBanner and HomeCommandCenter.

Grocery full-map or single-item read/modify save → attempted grocery_updated
`{weekOffset,groceryState}` with full resulting dictionary and request exclusion.
Recompute save → publish only changedState and nonnull publisher, no request
exclusion; a line-item recomputation alone is not a grocery event. Hook strict loaded
week equality → raw dictionary passed directly to setGroceryState replacement;
no revision, optimistic guard, merge, item replacement or week navigation. Unlike
snapshots, this path does not read additionalData. A late full map can overwrite
newer checks; “atomic” toggle comments do not establish DB concurrency semantics.

Ready normal path saves ready/discoverable → optional PDF metadata write → ready
publication `{recipeId,name,imageUrl}` (hero when ImageCount>0 else null). Missing
recipe or already-ready/discoverable returns without broadcast; file/output failure
can follow a committed DB save. Worker terminal failure attempts follow task failure,
parent pause and import-report handling; helper skips indexing, requires recipe ID,
constructs optional partial name/image, publishes `{recipeId,workflowInstanceId,
errorMessage,failedStep,partialData}` from a scope, catches/logs exceptions. Transient
rescheduling is not this terminal notification. These readiness/workflow rules stay
with accepted owners; the shared delta specifies handoff only.

Ready receipt → pending lookup → if matched remove identity and append ready context
(event name ?? pending name ?? ID, event image) → markReady regardless of match,
if preceding steps return. Failed receipt → if pending matched remove and append
failure context (partial name ?? pending name ?? ID, partial image, workflow ID,
diagnostics and partial data), with no GOTO readiness update. Queue appends; ready
set uses Set membership. Empty names survive nullish fallback; no durable dedupe or
replay is established. Stores are session memory. LibraryToast consumes ready rows;
RecipeFailureBanner consumes failed rows with friendly UI and workflow-targeted
retry; HomeCommandCenter subscribes active GOTO identity to ready set. Those journey
screens/retry rules remain owner-held. Connected schedule does not reconstruct the
notification queue or ready set.

**Inspected assertions:** ScheduleIntegrationTests UpdateGroceryState_PublishesGroceryUpdatedEvent,
RecipeReady_PublishesRecipeReadyEvent/PublishesEnrichedPayload assert mocked call
fields, not delivery. GroceryRecomputeServiceTests
NewlyMergedLines_RequireEveryPredecessorChecked_ReplaceObsoleteState_AndPublishResult
uses seeded predecessor maps and mock publication verifying resulting full map.
WorkflowWorkerTests terminal-failure theory uses InMemory/CapturingEventPublisher,
asserts one matching recipe/error/step/partial event (or indexing exclusion);
WorkflowTransientFailure_DoesNotPublishRecipeFailedEvent asserts no captured events
and Pending retry state. This capturing publisher does not exercise frame bytes.
SseEventPublisherTests ready cases inspect identity/name/image and null image;
current file has no grocery/recipe_failed frame tests. Hook tests substitute stores
and EventSource; assert pending/nonpending ready/failed handling, name fallbacks,
workflow/diagnostic context and matching/other-week grocery dispatch. Real map
replacement is source-supported. RecipeFailureBanner.test.ts uses journey doubles;
no live worker → stream → browser → notification integration was run.

### BSL-household-live-updates-011 — Contracts, delivery stages and qualifications

`specs/openapi.yaml` ScheduleStreamEvent requires `type`, maps connected plus eight
supported incremental types and discovery_nudge. Incremental anonymous payloads
omit `type`; ConnectedEvent omits connectionId and stream operation omits 401.
Field mappings otherwise inspected against DTO JsonPropertyName attributes and
publisher keys, not runtime schema validation. Generated
`pwa/src/lib/api/generated/models/index.ts` provides ScheduleDays and nested
additional-data holder; incremental event models are absent. Generated
`api/stream/index.ts` returns ArrayBuffer/text-event-stream rather than EventSource
callbacks; the hook bypasses it with JSON.parse. No generated mapping converts raw
SSE dictionaries to additionalData. No contract/client repair is authorized.

Transport is the accepted current-process manager path: serialization → named event
and JSON data frame → each current registration except exact exclusion → locked
broadcast write/flush. Registration is not emission, MemoryStream bytes are not
browser receipt, and hook dispatch is not confirmed application. Controller snapshot/
heartbeat bypasses broadcast lock. There is no durable event log, replay/cursor,
subscriber acknowledgement or cross-process backplane. Parsing and sequential store
calls have no catch/rollback; an earlier thrown step prevents later calls. Preserve
all accepted U95–U101, including raw grocery mismatch and substituted browser counts.

Documentation `docs/architecture.md` and `docs/user-guide.md` describes immediate,
shared live behavior broadly; comments claim all schedule mutations/atomic toggles/
limited-tail ranking. Source and inspected assertions support the narrower conditions
above, not those guarantees. No documentation outside this plan/index is rewritten.

| Local uncertainty | Finding / non-normative treatment |
| --- | --- |
| HLU-U01 | U95 extends to every incremental event: missing required discriminator, no incremental generated models; event field inspection is not complete OpenAPI parity. Exclude schema-compliance assertion. |
| HLU-U02 | Echo confirmation is numeric before offset filtering, not connection-bound; ID exclusion may skip origin, beyond-local echo leaves equality false, missing confirm can defer indefinitely. Cross-week move publishes source only. No eventual convergence or destination refresh guarantee. |
| HLU-U03 | Slot path lacks snapshot move guard and full metadata/adjunct refresh; grocery events replace raw map with no revision guard; smart defaults use nested week and no voting-open gate. Do not invent atomicity, stale-event rejection, lost-update protection or optimistic conflict resolution. |
| HLU-U04 | Declared discovery_nudge and comments about vote purge/positions 1–3 lack current production path support. Exclude nudge and complete publisher catalogue guarantees; domain tail sort stays owner-held. |
| HLU-U05 | Save precedes lifecycle publication; missing/already-ready and indexing/identity gates, PDF file errors and caught publication failures can leave no event. Session matching/queues/Set do not provide replay, exactly-once or eventual notification. Existing capture/quality recovery remains owner-specific. |

No consequential unresolved product choice blocks this supported conditional draft.
Unsupported/incomplete behavior is excluded or recorded as a qualification, rather
than converted into a desired defect-preservation requirement.

### Complete draft requirement/scenario mapping

All rows are implementation-supported, with assertion-inspection strength described
in their evidence entries. “Source only” cases remain explicitly unverified.
Numbers are local to each delta; requirement names below match their artifacts.

#### baseline-household-live-updates-schedule-events

| Requirement | All scenario headers | Evidence |
| --- | --- | --- |
| 1. Attempt incremental schedule publication after supported saves | Week mutation reaches publication; Defer reaches both publication boundaries; Overdue finalization reaches publication; Slot validation reaches publication | BSL-household-live-updates-007/011 |
| 2. Dispatch received slot updates by date | Slot date is today; Slot date is another day | BSL-household-live-updates-008/011 |
| 3. Apply slot changes only to loaded dates | Matching loaded date; Matching date clears a recipe; No loaded match | BSL-household-live-updates-008 |
| 4. Dispatch week updates through existing snapshot guards | Ordinary matching week update; Another week includes today; Week omits today | BSL-household-live-updates-008/011 |
| 5. Consume move echoes as confirmation before offset filtering | Echo supplies another offset; Older echo arrives; Deferred snapshot becomes eligible after echo; Drag or sequence mismatch remains | BSL-household-live-updates-008/011 |

#### baseline-household-live-updates-discovery-events

| Requirement | All scenario headers | Evidence |
| --- | --- | --- |
| 1. Forward received vote totals to existing consumers | Loaded recipe receives a total; Planner has no matching recipe | BSL-household-live-updates-009/011 |
| 2. Filter received smart defaults by their nested week | Nested week matches; Outer and nested offsets differ; Nested offset is absent | BSL-household-live-updates-009/011 |
| 3. Reconcile received suggestions without replacing occupied slots | Suggestion replaces an eligible slot; Persisted or non-cooking slot is occupied; Suggestion is withdrawn | BSL-household-live-updates-009/011 |
| 4. Attempt invalidation at supported schedule publication boundaries | Assignment or removal reaches invalidation; Cooking history changes without matching scheduled recipe | BSL-household-live-updates-009/011 |
| 5. Signal candidate freshness separately from fetching results | Invalidate one week's candidates; Matching Quick Find is ready; Other week's Quick Find observes unchanged generation | BSL-household-live-updates-009/011 |
| 6. Attempt publication of saved vote consequences | Saved vote reaches publication; Discovery recalculation reaches publication | BSL-household-live-updates-009/011 |

#### baseline-household-live-updates-grocery-lifecycle-dispatch

| Requirement | All scenario headers | Evidence |
| --- | --- | --- |
| 1. Attempt grocery check-map publication at supported saves | Grocery mutation reaches publication; Recompute changes check state; Recompute has no check-state transition | BSL-household-live-updates-010/011 |
| 2. Replace received grocery checks only for the loaded week | Matching week replaces checks; Another or missing week | BSL-household-live-updates-010/011 |
| 3. Forward ready hints beyond pending capture tracking | No capture is pending; Ready identity repeats | BSL-household-live-updates-010/011 |
| 4. Preserve available lifecycle context at the capture handoff | Ready context reaches the journey; Failure context reaches the journey; Failure has no pending match | BSL-household-live-updates-010/011 |

### Source identities rechecked for this generation

SHA-256 values below identify inspected source/test/contract/document boundaries,
not runtime environments. Prior 36 manifest entries remain unchanged. Main specs
and old connection change are preserved byte-for-byte from the entry snapshot.

| Path | SHA-256 |
| --- | --- |
| `api/src/RecipeApi/Controllers/ScheduleController.cs` | `d6d956d5465148995d55859253963542a8e9fb2d0e247b6333f6b5a57a779f91` |
| `api/src/RecipeApi/Controllers/StreamController.cs` | `5390ca4e51b20da5579fa7dd4ac70e62cf46c151a542d77fd8a6459ff41fb73e` |
| `api/src/RecipeApi/Services/ScheduleService.cs` | `8c1e8403f759425b8882eecb26f2bc8f4c9692f81bcf6e9bc3777c78013c40ec` |
| `api/src/RecipeApi/Services/DiscoveryService.cs` | `d441c27013fa3c5f329b336c400ee523307ec8f6bf18e3e5b5bcadf653629adb` |
| `api/src/RecipeApi/Services/GroceryRecomputeService.cs` | `ae35bbb1ed3d88d8a3c895b3d372dc33cce58b7270b69980138be10598d882dd` |
| `api/src/RecipeApi/Services/Processors/RecipeReadyProcessor.cs` | `4206f98256cadae88d7be13a44e9d9d18b6c46679ba7b9f0aee0dcef8a848a74` |
| `api/src/RecipeApi/Services/WorkflowWorker.cs` | `69f9023b0003ff2f0a5dda6d85bcb42e13ebf064b5c8529bc6b0866e5b3871df` |
| `api/src/RecipeApi/Infrastructure/IScheduleEventPublisher.cs` | `ae8b2dc385c0a83b0bb6fd2b9ed53b627c91d1f3fa5cbe84440b6e26e09f5722` |
| `api/src/RecipeApi/Infrastructure/SseEventPublisher.cs` | `8378000101a36943903b8c7f7dcb560c3202464258410ac127d6d34b512c1696` |
| `api/src/RecipeApi/Infrastructure/SseConnectionManager.cs` | `6e757f5e3a63a96ab98287e2cfa761d0010969e1db1664f87db28e6f0c8460d9` |
| `api/src/RecipeApi/Dto/ScheduleDays.cs` | `52d4bf981307df51a4b38fc12a2fe3271eb2be6445089d5521a83fb399f691e7` |
| `api/src/RecipeApi/Dto/SmartDefaultsDto.cs` | `57afdbf1d8be2d9fc22486b27e7b4475c82e648741da0efd7c43c61e14995f99` |
| `api/src/RecipeApi/Dto/NonCookingPlanDto.cs` | `6b16aed29ce6fb2dd54f30d4bb6241c7dd63d090ad210cada1e3b13b3188e023` |
| `api/src/RecipeApi.Tests/Integration/ScheduleIntegrationTests.cs` | `6894b99c60712e305ad13aee1bb14f5af91ed2ead9d360349e87b7d4ca089df3` |
| `api/src/RecipeApi.Tests/Services/ScheduleServiceTests.cs` | `c13202827a7395147aeb8d70d57c03b615319f52c6953009bc3b88266fae1b43` |
| `api/src/RecipeApi.Tests/Services/GroceryRecomputeServiceTests.cs` | `8583ea7f5b3d5c63029c5a4503dd8d24209c41a867b56ec9fc37cf9fbf273d39` |
| `api/src/RecipeApi.Tests/Services/WorkflowWorkerTests.cs` | `b701d122fa95c23309741e209dbd2f9f8da40404a0f59e221e2809cc11448434` |
| `api/src/RecipeApi.Tests/Infrastructure/SseEventPublisherTests.cs` | `0ff6a076069fa8dfa9cf038c28371c467e464c72bdbd808a809859beb02612d5` |
| `api/src/RecipeApi.Tests/Infrastructure/SseConnectionManagerTests.cs` | `98259dd119230ad4cabdf4cb5bfec51442af1749ad516cdebe522fcde205b6d8` |
| `api/src/RecipeApi.Tests/Integration/StreamControllerIntegrationTests.cs` | `48735bc5cdaf41f71a6f4c79ab7813d3ecc9a2c4a9c056061d14edecef452fbd` |
| `api/src/RecipeApi.Tests/Infrastructure/TestWebApplicationFactory.cs` | `0ee567443fc0b5c11fffe631c94ea0407681b371224d8083a0e32b94b280804c` |
| `specs/openapi.yaml` | `0fbd27813611e16474ec17a48ede372d5a41af02db3fa9ded82295a6357046ff` |
| `pwa/src/hooks/useScheduleStream.ts` | `0e1f1b91e459b77fd90ca6a071ff5cb8fc0cbcc64e8cab54a00b8232c9ab2107` |
| `pwa/src/hooks/useScheduleStream.test.ts` | `cb10d4613fb4430cfc8b9e33c494f8ae9051a079048dc34da376f40e0575acef` |
| `pwa/src/store/weekStore.ts` | `e58ca9aaf2755fc5b95aacd0518d443456937febec82c0ab3955c8eb14cae3b8` |
| `pwa/src/store/weekStore.test.ts` | `2763118a45acc45c381ecb2bd8dff557c85a02df891d9fd3b5e3fc3987e666a1` |
| `pwa/src/store/todayStore.ts` | `42e172475415ee013bd2dd352a338bcda4ba293d09eea35c3308c744bf68fd63` |
| `pwa/src/store/todayStore.test.ts` | `a049df21755c4270f588d9b40989669bbdcaf2bb48a7dff3c40b2d63379555ae` |
| `pwa/src/store/plannerStore.ts` | `0058c7adf697f243c08ef18b89492ecdd3622fde24688930c1ebca0dce178f31` |
| `pwa/src/store/discoveryStore.ts` | `6bc836b62f5af6c79efdf8461699e3becbfec9a465fca1fd9cc6150f053aa012` |
| `pwa/src/store/discoveryStore.test.ts` | `acac903c0965b11c62b093ebfd87986e8312099fa5c6a4f556d46e69dd1af708` |
| `pwa/src/store/searchPromotionStore.ts` | `9b1fd64d9ea5549161233734a976392b1ba8cbd75333492296284784004e2fd8` |
| `pwa/src/store/captureStore.ts` | `8ba993036ef6c8e3bd05c3e737b51c0541a044dcb2d186b2501da230376f50f1` |
| `pwa/src/store/libraryStore.ts` | `21763b997c1ed09faf5b666ed4ea81f3c8f9f9a8ff366150db5fd8a6563df1b0` |
| `pwa/src/store/gotoStore.ts` | `c4661ae935a1eb2a7787dac0c839a7244511d6c102229338523650dc8ebcdb4b` |
| `pwa/src/lib/api/api-client.ts` | `c5cd4cfebddd8d5c1f2827c522a236fe12c504130ea0991c07bc8fc46376aa95` |
| `pwa/src/lib/api/planner.ts` | `7d9c5b0b609e9bce53100192fe395df32b90773d2e5b1a55664bb8a84cc2f26a` |
| `pwa/src/lib/api/generated/models/index.ts` | `03e19537845755d2cd0d30071284bc8a11007237e380433184d3edbe1ddb05e6` |
| `pwa/src/lib/api/generated/api/stream/index.ts` | `635e879987ea5d20f766ef8acc440ad66a000974b3b3f774d5b73ed36613232f` |
| `pwa/src/components/planner/QuickFindModal.tsx` | `8b2685317c477129a2501ae58cfb09c92741f639e6cb5d8d5774c87f35cb9b80` |
| `pwa/src/components/planner/QuickFindModal.test.tsx` | `0e5b936773ba379e3daef5659aba6cc3fe8d71d18de0da90dccb250b4cbb665b` |
| `pwa/src/app/(app)/discovery/page.tsx` | `ca8b34776defba889af567f2f08a986e5e7c8944b322cc49e163b858987e0ed8` |
| `pwa/src/app/(app)/recipes/page.tsx` | `18b9605e8078e8ee46674a0e781836886697ce18e9166c0591aeac6c8fe78bb4` |
| `pwa/src/components/capture/LibraryToast.tsx` | `4bb48892f370aa48f192badb552d4bc63075911ee7595ed53719355dbf800ad5` |
| `pwa/src/components/capture/RecipeFailureBanner.tsx` | `7aa890d43a873448da7f588e276d0a41a9b06cedb7dd7bc6c73314bca3e1dc30` |
| `pwa/src/components/capture/RecipeFailureBanner.test.tsx` | `de6336aa7c3a632f4d5bddc15c5c069c94c388127c54c62a991ce001f11b609b` |
| `pwa/src/components/home/HomeCommandCenter.tsx` | `73a338ce995647406f9b7f01c8a3800ab9a6f8c8fc0e00b3fb3ecb7ad8627217` |
| `pwa/e2e/mock-api.ts` | `063ed6d6629ccde163487a92543ae36918183a81b7301dd01a5389248cbcbd07` |
| `pwa/e2e/fixtures.ts` | `402b5a1b872f625dc1425f46afdede2c9378dcc473088159774a8455b5d188e2` |
| `pwa/e2e/home-recipe.spec.ts` | `a98b3a7ec5da9987f700987e10f5c6f7ecac36dbf92bb268a53419b9c97e12ac` |
| `docs/architecture.md` | `3773e1bc528dc0c60d5ac20ed3d8b1947a22176b6f2ecccc0ac061fb30729705` |
| `docs/user-guide.md` | `0e37a5178897e2e82699c3e5b9585bc774be81c5c74644c77249169e3f95cd2d` |

### Artifact state, session record and exact handoff

| Change | Requirements/scenarios | Artifact state / lifecycle |
| --- | --- | --- |
| baseline-household-live-updates-connection-reconciliation | 15/38 | Existing accepted/promoted main coverage; active historical change preserved |
| baseline-household-live-updates-schedule-events | 5/16 | CLI metadata, proposal, design, ADDED delta and extraction tasks created; draft for human review |
| baseline-household-live-updates-discovery-events | 6/15 | CLI metadata, proposal, design, ADDED delta and extraction tasks created; draft for human review |
| baseline-household-live-updates-grocery-lifecycle-dispatch | 4/10 | CLI metadata, proposal, design, ADDED delta and extraction tasks created; draft for human review |

Session HLU-A01, 2026-10-16: successive bounded source discovery/generation complete;
BSL-007–011 closes the shared inventory. No main spec was edited, no old change was
rewritten, and no capability is labelled baseline-complete. Each new artifact was
created after current CLI instructions in dependency order. Planning-complete
means files exist, not human acceptance, application implementation or promotion.

Checks observed: each selected change passed strict validation; `openspec validate
--all --strict` passed 50/50 at reconciliation. First explicit 17-path `task verify`
passed documentation, spec:check (50/50) and content at identity
`cc39f0ade558af507c729b145b58f5e3f99cd37dcbee1120ad9eb86a10c6c706`.
Final semantic review withheld a prospective defect-preservation assertion about
slot application during a pending move: the lack of a guard stays non-normative
in BSL-008/HLU-U03, without a dedicated normative promise. Final mapping is 15/41.
This documentation/task follow-up changes identity and requires a final repeat;
its exact outcome/identity belongs to the response and current
`.task/agent-finish/last-run.json`, not the earlier digest. No failed or blocked
check was observed. All 88 historical/current source-manifest rows matched;
requirement headers were unique across main and new drafts, all scenarios mapped,
and index preservation was checked separately. Unrelated library archival INFO
messages did not fail strict validation and are outside this authorization. Runtime/unit/API/browser/
network/database/model qualification **not-run** under A34; behavior TDD,
contract/client generation, migrations and deploy checks **not-applicable**.
No known task-specific blocking decision; failures/blocked outcomes must be reported
from the actual checks, not inferred from source inspection.

Exact next action: human review of the three named delta specs against the complete
mapping, U95–U101 and HLU-U01–05; accept or request documentation revisions. After
acceptance, explicitly select documentation promotion/sync of only these ADDED
requirements into main household-live-updates, preserving main 15/38 and other
owners, then strict validation and complete explicit-path verification. Do not
archive or implement application changes as part of that promotion. No further
shared extraction slice is currently required by the supported inventory.

## Promotion record — 2026-10-16

User authorization: “promote all the openspec changes”. Applied the active deltas
through `openspec-sync-specs` after resolving all 42 active changes and their
CLI-reported spec paths and rules. This capability's added requirements/scenarios
are now in its main spec. Existing Purpose and requirement blocks are preserved.
Source evidence, exclusions and uncertainty records above retain their original
qualification; promotion adds no runtime evidence. Change artifacts remain active.
No staging, commit, archival, application edits or runtime qualification performed.
Validation outcomes are reported with this execution rather than inferred from
completed extraction tasks.
