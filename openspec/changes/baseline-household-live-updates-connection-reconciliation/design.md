# Design

## Context

See proposal.md for motivation. This is documentation extraction across existing API/browser/store boundaries, not a design for changing them. The first observable slice is app-shell mount → credentialed native EventSource → API authorization and cookie check → registration → successful week-zero read/write → connected handler → guarded week and Today state. Each arrow has a separate success boundary.

CLI resolves `/Users/alex/Code/whats-for-supper` as the nearest OpenSpec root; `spec-driven` is configured. Six main capabilities exist; `household-live-updates` is absent. Existing owner counts are recorded in the durable plan and remain unchanged. A81 authorizes only this delta and supporting documentation.

## Goals / Non-Goals

**Goals:** Extract supported observable behavior, identify representation changes and record inspected assertions separately from execution. Make partial and unsuccessful reconciliation explicit.

**Non-Goals:** Domain event catalogues or mutation policies; new recovery behavior, runtime/browser/network/database/model qualification, contract/client repair, deployment changes, promotion or archival. Shared access, capture notifications, contextual polling/recovery and worker retries remain with promoted owners.

## Decisions

### Preserve the executable path and distinguish success stages

Use existing sources rather than intended comments as baseline authority. `AppRouteLayout` calls `useScheduleStream` once per mounted shell; its empty-dependency effect does not watch member or URL changes. The hook concatenates the public base without normalization, constructs `EventSource(url, {withCredentials:true})`, logs open/error, and closes only during cleanup. Construction failure returns without a retry timer. An error callback does not replace or reset the source. Native reconnect eligibility, timing, credentials and browser suspension are not application guarantees. The alternative of specifying guaranteed automatic recovery is unsupported (U97).

Cookie creation and page/API access rules remain household-identity dependencies. Program registers a global authenticated-user filter, Hearth authentication and authorization before controllers. `h_access` is an accepted API credential; tools can instead use the existing raw-secret/Bearer paths. A stream action explicitly parses the member cookie, does not invoke the general header-first member binder and never queries member existence. Cookie SameSite/domain/Secure policy and configured credentialed CORS constrain transport; `withCredentials` does not prove a browser sent either cookie. No network qualification was performed.

### Treat registration and snapshot as separate boundaries

`SseConnectionManager` is singleton and `IScheduleEventPublisher` is scoped. The manager stores response/lock pairs under fresh GUID strings, with no member association or household partition within a process. Stream registration occurs before `GetScheduleAsync(0)` and before any bytes are written. The read queries calendar events, weekly plan and stored grocery JSON separately; it is not an atomic snapshot with registration or broadcasts. Server week bounds use `_clock.UtcNow` and seven Monday-through-Sunday dates. DTOs serialize directly as camel-case JSON, not through Kiota or a data envelope.

The controller directly writes/flushes connected and 15-second ping frames, then unregisters in `finally`; cancellation is swallowed, other exceptions propagate through middleware. No success status/body is promised after output has failed. No `id:` or `retry:` frame, replay store, Last-Event-ID handler or reconciliation cursor exists in this path. Every later accepted request obtains another connection ID and repeats the current week-zero read. A missed capture notification is not reconstructed by this snapshot. The alternative of broad lossless recovery is withheld.

### Specify receipt as conditional application

The connected handler parses raw JSON without validation/catch, stores a truthy identity, calls `weekStore.applySnapshot`, then finds browser-local Today and calls `todayStore.applyServerUpdate`. A parse or store exception can interrupt subsequent steps; no handler-level rollback, acknowledgement or retry exists. `onopen` logs transport opening without changing state. Cleanup/error never clear the stored identity; a missing identity retains the previous value (U95/U97).

Week reconciliation checks offset, defers days while local moves/drag are pending, and updates status/time even during deferral. It retains only the latest deferred snapshot. Echo confirmation can flush when sequence counters match and drag is inactive; planner drag-end also flushes. Reconnect does not clear counters or force this release. A missing confirmation can leave deferral unresolved. A deferred snapshot is rechecked for the currently loaded offset before application. No snapshot version or freshness comparison exists.

Eligible merging preserves pending same-date suggestions and existing index UI IDs. A normalized all-recipeless snapshot preserves old ordinary recipes/statuses and old week status; explicit non-cooking entries take precedence. Thus even a current successful snapshot may retain content absent from the server. Week `lastSyncedAt` is not a receipt cursor or proof of complete convergence (U98).

Today uses its own two-second optimistic timestamp/recipe-ID check, independent of displayed offset. Different IDs inside the guard are dropped, not delayed. Same IDs can absorb details. Accepted status two sets skipCookedCelebration; status three retains non-cooking metadata; other statuses clear it. No current-date entry means no Today update. Browser-local date can fall outside the server UTC week at a boundary (U99). Existing initializer/REST sync behavior is not replaced by this baseline.

`groceryState` exposes a specific seam discrepancy: the server emits a plain Dictionary; raw JSON parse bypasses Kiota's AdditionalDataHolder deserialization, while `applySnapshot` reads only `.additionalData`. Eligible snapshots still assign groceryItems (or []) but ordinarily cannot replace check-state from the plain wire map. The unit test constructs the additionalData wrapper explicitly and observes week update before planner update in the same synchronous call; this is not transactional multi-store visibility or real SSE proof. Record U100; do not fix or claim full grocery reconciliation.

### Bound identity to immediate publication exclusion

`HearthAuthProvider` attaches stored `X-SSE-Connection-ID` to shared Kiota requests. `ScheduleController` reads it and passes it through service/publisher exclusion parameters; the manager skips exact matching IDs. This is neither authentication nor durable consumer identity. Direct fetch wrappers need not use that provider; excluded events also need not confirm local sequences. `echoSeq` is separate from connection identity. Keep only the shared snapshot guard boundary here; journey-specific request success/failure and move semantics remain with their owners.

### Retain actual framing and concurrency limits

Broadcasts serialize payloads once, enumerate current process registrations sequentially, and lock each broadcast write/flush. Connected and heartbeat writes bypass those locks despite the manager comment claiming protection across them. Registration can therefore receive broadcasts before connected output, and writes can overlap. No global ordering or initial-snapshot-before-all-push guarantee is drafted (U96).

Caught write/flush errors remove the entry immediately; semaphore wait occurs outside the catch, concurrent removal can dispose locks, and slow writes have no explicit broadcast cancellation/deadline or queue. Do not turn the two MemoryStream/dead-stream tests into concurrency, isolation or delivery guarantees. No external backplane or persisted event log is present.

### Keep evidence and owners separate

Use BSL-household-live-updates-001–005 and U95–U101 in the durable plan, with full scenario mappings and SHA-256 source identities. Existing household-identity owns access/member provisioning; recipe-capture owns ready/failed notifications; recipe-quality owns contextual polling and recovery; background-processing owns acceptance/retries. Repeating those policies or adding planning/grocery/search/capture event catalogues would expand scope.

Inspected evidence: stream integration assertions inspect 200/content type, first connected/type/schedule fields and disconnect count; default factory disables authentication, uses EF InMemory and substitutes orchestration. Manager/publisher tests inspect in-memory bytes and a throwing stream. Hook tests substitute native EventSource and store methods; their connected fixtures omit connectionId and planner mock omits setSseConnectionId, so they do not prove the real identity branch. Store tests exercise actual Zustand stores with fabricated schedules; browser fixtures intercept API requests with finite fulfilled responses and often omit connection identity. Home cookedReconnects counts a mock route response being constructed, followed by DOM assertions; it does not prove that particular frame was received/applied. None were executed this session (U101/A34).

## Risks / Trade-offs

- Unsupported contract precision → U95 records undocumented connectionId, missing stream 401 response and incremental discriminator drift; preserve OpenAPI and withhold schema-completeness claims.
- Initial/broadcast races and slow/disposed responses → U96 retains concurrency/failure limits without an ordering or fairness promise.
- Browser-native retries or malformed data fail → U97 records no application retry/acknowledgement; no successful reconnection guarantee.
- Offset, pending moves and preservation guards leave stale days → U98 records exact conditional application and no freshness/version guarantee.
- Local Today/date guard rejects useful data → U99 records no timed replay and possible date-boundary omission.
- Grocery wire dictionary misses wrapped-data path → U100 records partial adjunct reconciliation; no repair in documentation extraction.
- Mocks/counts are mistaken for live evidence → U101/A34 label inspected assertions and not-run qualification separately.

## Migration Plan

No application deployment, data migration or rollback is applicable. Produce the CLI-scaffolded draft, reconcile its complete mapping, validate selected/all OpenSpec items strictly, review the full documentation diff and verify the explicit six changed paths. Stop for human review. Acceptance, promotion, archival and any corrective implementation require separately selected work.

## Open Questions

Deferred qualification concerns native-browser reconnect eligibility, actual cookie/origin transport, concurrent response output and real API/store integration. These are not blocking product decisions for this source-supported draft; disputed guarantees remain excluded. No infrastructure qualification or services will be started.
