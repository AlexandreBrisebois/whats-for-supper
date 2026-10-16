# Household live updates baseline plan

## Current checkpoint and scope

Promoted baseline: **15/38 requirements/scenarios** at A84 (2026-10-16).
This covers recorded slices, not the entire capability.
Runtime qualification remains not-run/deferred under A34. Next action: await a
separately selected bounded slice or lifecycle action; no successor is authorized
by this reorganization. Slice headings and next-step recommendations retained
below are historical; later promotion records supersede earlier draft labels.

Read [AGENT.md](../../AGENT.md) and [shared workflow](workflow.md), then this file.
No other capability plan or full project history is required up front. Follow only
immediate owner/spec dependencies needed for the selected work.

Accepted baseline: [main household-live-updates specification](../../openspec/specs/household-live-updates/spec.md).

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
