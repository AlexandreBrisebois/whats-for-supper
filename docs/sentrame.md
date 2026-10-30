# Anonymous PWA telemetry

Telemetry is disabled unless the deployment administrator explicitly sets
`WFS_TELEMETRY_ENABLED=true` in the container environment. All three Sentrame
settings below must also be present and valid; otherwise collection stays off.
The opt-in applies to this deployment, not a per-member preference.

```dotenv
WFS_TELEMETRY_ENABLED=false
SENTRAME_OTLP_BASE=
SENTRAME_BROWSER_TOKEN=
SENTRAME_SERVER_TOKEN=
```

Set the base to your reachable Sentrame origin (HTTPS outside local development),
and copy the two distinct producer tokens from the selected app's generated
connection settings in Sentrame's owner UI.
Never use a viewer passphrase. Keep these values in the private env file, never
in Git or `NEXT_PUBLIC_*` variables. The endpoint must have no path, query,
credentials or fragment. Producer tokens must be distinct, nonempty visible ASCII
values after trimming; embedded whitespace, control characters and Unicode fail
closed. Container localhost means the PWA container itself.

For repository Compose deployments, edit `docker/.env.local`. For the Synology
release template, edit its `.env`. Recreate the PWA container using the same env
file and Compose file selection used to start the deployment. For example, in
the Synology deployment directory: `docker compose --env-file .env up -d --force-recreate pwa`.
Deploy an image containing this integration first; subsequent setting changes
require container recreation, not an image rebuild. Reload open tabs after changes.
No existing deployment was enabled by F1-1, F1-2 or F1-3.

## Application version

Both existing synthetic producers and browser openings include the standard OTel
resource attribute `service.version`, alongside their distinct `service.name`.
This follows "Send your app version" in the local Sentrame developer guide. WFS
reads the existing server-owned `WFS_VERSION` deployment metadata; blank/missing
values produce literal `unknown`. It is resource metadata, not a log attribute
or a value accepted by the browser action.

Set `WFS_VERSION` to the actual immutable app release (for example `1.4.2`) or
build commit SHA and keep it unchanged for that deployment. Repository Compose
forwards this variable; its production override defaults to the required release
`TAG`. The Synology release bundle already forwards the `WFS_VERSION` that also
selects its images. For local source builds set `WFS_VERSION` explicitly if you
need build attribution; an unset value deliberately reports `unknown` rather
than guessing from package/SDK/receiver versions or a mutable image tag.

No `SERVICE_VERSION` or `OTEL_RESOURCE_ATTRIBUTES` setting is needed for WFS's
manual serializer: those variable names configure the guide's other examples.
Changing release metadata uses the same container recreation/document reload
procedure as other server runtime settings. This does not enable collection.
Only the opening's existing `stage.name` remains on the individual log record.
Capture tests verify emitted version metadata; actual Sentrame's version-field
projection remains part of the separately unrun durable receiver qualification.

## Collection contract

When opted in, the shared root/identity gate observer attempts one
`pwa.app.opened` for the first eligible visible route shell of a fresh document.
Search (`/recipes`) is classified as `search`. A full reload permits another
opening; internal navigation and component remounts retain the same in-memory
claim. This observes a committed shell, not loaded data, paint acknowledgement
or human attention. No per-page calls or navigation-handler instrumentation are
required. There is no automatic click, error, trace, modal or business-event stream.

The classification describes the presented destination after access/member gates:
Search or Capture redirected for access yields `welcome`; a required member
selection yields `onboarding`. Member and voting invitations, including rejected
invitations, use `invite` while their joining/rejection shell is presented. Later
redirects in that document add no opening. Capture query variants all use
`capture`; shared text, titles, URLs and handoff tokens never become attributes.
Desktop destination checks do not qualify actual operating-system share delivery.

A hidden document waits until visible and uses the current eligible route, not a
saved hidden candidate. Readiness is invalidated when the pathname or checked
identity inputs change; `/` during redirect is never an entry. Cancelled/unmounted
candidates produce no record. Effect replay, remounts, same-document history
restoration and visibility/resume do not reset the claim. Initial disabled state
cannot be rearmed by navigation; no inactivity timer or storage is used.

Shared rendered error and not-found composition declares only `error` and
`not.found`, taking precedence if it is the first eligible screen. A later error
does not replace an already claimed opening. If startup fails before the shared
observer can run, no event is promised. New unregistered application pages use
`other` automatically, with no dynamic path content exported. Home remains `home`
beneath a context dialog. Approved dotted labels include `capture.confirm`,
`profile.settings` and `browse.stack`.

The dedicated `reportBrowserAppOpened({ screen })` Server Action accepts only
one approved static screen classification. It validates the exact input shape
and fixes the destination, browser credential, event name, body and timestamp
on the server. Next.js same-origin protections remain in place. Public entry
observations require no household identity and confer no business authority.
Only a configuration-enabled boolean reaches the observer; the endpoint and
both tokens remain server-side. Browser claims remain untrusted browser evidence
when forwarded through Node.

The new event is an INFO (severity 9) named OTLP log:

| Field | Fixed value / meaning |
| --- | --- |
| Resource `service.name` | `wfs-pwa-browser` |
| Resource `service.version` | Trimmed deployment `WFS_VERSION`, or `unknown` when unset |
| Scope | `wfs.anonymous` |
| `eventName` | `pwa.app.opened` |
| Body | `WFS opening observed` |
| Only record attribute | `stage.name=search` for Search; other values come from the closed registry in `pwa/src/lib/telemetry/opening.ts` |
| `timeUnixNano` | Decimal nanoseconds derived from Node's export-time clock, not exact browser launch time |

WFS requires `stage.name` on this event to distinguish screens. It is an
optional **Sentrame application convention**, not standard OTel semantics or a
Sentrame reception requirement. It belongs on the log, not the service resource.
It supplies no Kind, goal, authority, duration or automatic journey mapping.

The closed vocabulary also retains `pwa.telemetry.check`, the fixed synthetic
INFO log. Server-only `sendServerCheck()` and `sendBrowserCheck()` use their
respective credentials. The unwired `reportBrowserTelemetryCheck()` Server
Action takes no client payload. No diagnostic trigger route or startup check
is installed. Opening records consume the browser budget, leaving independent
server-check capacity.

Both events use the existing standard OTLP/HTTP JSON transport: `POST /v1/logs`,
`Content-Type: application/json`, **no compression**, and a server-held producer
Bearer header. There is no new SDK/provider, proprietary envelope or generic
browser OTLP relay. Sentrame receipt time is a separate clock.

No trace, span, session, tab, event, person, device, recipe or household ID is
created for an opening. There are no telemetry cookies, persistent storage or
cross-document handoffs. No raw route/query, referrer, title, shared content,
file metadata, user text, messages, stacks or hashes of user content enter the payload.
The local document claim suppresses duplicates; it cannot prevent forged or
replayed browser submissions at the receiver.

Configuration is checked on each export. Each producer retains independent
limits of 120 records/minute and four concurrent requests per Node process.
Exports time out after two seconds and reject redirects. Failure consumes the
opening attempt; there is no retry, durable queue, unload flush or delivery
acknowledgement to the UI. The Server Actions schedule export with Next.js `after()`, so their complete
responses finish before receiver I/O. Rendering, navigation and subsequent client
Server Actions do not wait for the receiver. The two-second timeout bounds only
the deferred export.
Rejected shapes and disabled/invalid configuration produce no export. Receiver
rejection (including 429/503), redirects, timeout and exhausted budgets drop the
attempt permanently for that document, even after navigation or resume. A failed
request releases its concurrency slot; admitted attempts consume rate capacity
even on receiver failure until the minute window resets. Browser checks and openings share the browser budget;
server checks keep independent capacity. There is no replay after settings recover.
To opt out or correct settings, edit the private env file, recreate only the PWA
container with its existing Compose/env selection, and reload open documents.
Initially disabled documents never queue an opening for later navigation.
These per-process limits multiply across processes and are not a global cap.

Received records answer which entry screens were reported. They do not count
unique people, exact sessions, shortcut use, authentication success, task
completion or abandonment. Missing records do not prove that no opening occurred.
An uncorrelated point log provides no journey graph, dwell time or duration.

## Qualification

The reviewed integration target is the local `/Users/alex/Code/sentrame` tree,
with its `docs/DEVELOPER-GUIDE.md`, `docs/integration/OTEL-CONTRACT.md`,
`docs/integration/AGENT-INTEGRATION.md`, relevant `docs/USER-GUIDE.md` sections
and `docs/verification/standard-otel.md`. At F1-2 review, HEAD remains
`5a2646fc053af7ddf12bd9d13717adf060ea525f` with dirty multi-app receiver/UI changes.
Four guide hashes have drifted from the historical
[opening design snapshot](../openspec/changes/archive/2026-10-29-centralize-pwa-opening-observation/design.md#local-sentrame-compatibility-target);
current hashes and reconciliation are in the
[F1-2 evidence](../openspec/changes/archive/2026-10-29-centralize-pwa-opening-observation/tasks.md#f1-2-evidence-2026-10-29).
The current guides assign apps through generated producer credentials without an
app-ID attribute; JSON `/v1/logs`, browser authority and optional `stage.name`
remain source-supported. This does not qualify the changed receiver at runtime.
HEAD alone does not identify its content. No Sentrame files or storage were changed. The reviewed ledger describes
schema 3, projection `structural-v2`, computation `journey-native-v3`; its SDK
Protobuf samples do not qualify WFS's JSON path. Use this local target until an
equivalent publication is verified, rather than assuming the older GitHub guide
or a published image includes this model.

F1-1/F1-2/F1-3 use a disposable wire-capture receiver, not Sentrame. The owned fixture
copies the actual application source/configuration into a temporary Next root,
builds and starts its own optimized instance with synthetic credentials and ephemeral ports, reuses
business API mocks, and preserves real root/proxy/identity gate/action/exporter
behavior. It does not read private env files or use a household database. Its
`opening-payloads.json` Playwright attachment retains only the minimized JSON
bodies for review, without producer headers or credentials.

| Qualification cell | F1-1/F1-2/F1-3 evidence / boundary |
| --- | --- |
| Focused unit/transport checks | Passed; approved Search wire shape, document claim, and existing synthetic configuration/transport/budget checks |
| Chromium -> real action -> Node capture | Passed; one fresh Search record, none after same-document Search → Home → Search, another after reload |
| Payload/privacy review | Passed; exact fixed envelope plus one `stage.name=search`; no trace/session IDs; endpoint and both synthetic tokens absent from loaded scripts, HTML and action responses |
| Entry, lifecycle and fallback cases | F1-2: focused gate/visibility/replay/cancellation/fallback/unknown-page component checks and real-action redirect/invitation/Capture/not-found destination matrix; physical installed lifecycle remains unqualified |
| Adversarial opening input / runtime-disable / failure matrix | F1-3 results are recorded in the [selected task evidence](../openspec/changes/archive/2026-10-29-centralize-pwa-opening-observation/tasks.md#f1-3-evidence-2026-10-29); capture receipt and complete real action-response inspection remain separate assertions |
| Final repository gate | Version follow-up: 97 focused telemetry tests and 147 combined Chromium checks passed. Updated final gate has 601 Chromium passes / 47 skips / one unrelated Quick Replace mock-SSE/reload failure; all other applicable checks passed, including 1,389 units, live endpoint parity and 183 PostgreSQL tests. Task 3.2 remains unchecked. See [version evidence](../openspec/changes/archive/2026-10-29-centralize-pwa-opening-observation/tasks.md#app-version-follow-up-2026-10-29) |
| Actual WFS JSON -> Sentrame durable protected reads / reopen / UI mapping | Not-run; requires disposable compatible storage and separately selected F1-4 |
| Isolated deployed container / proxy / tunnel | Not-run |
| Physical installed phone / warm resume / unlock / native sharing | Not-run; worker-blocked desktop E2E does not qualify these |
| Business API contract / real persistence | Not-applicable to this opening-only internal action slice |

For actual receiver qualification, use fresh disposable schema-compatible
storage and private test tokens; never reset existing storage. Exercise both
synthetic producers and actual openings through the exact WFS JSON path, then
verify browser/server authority, service, log name and retained `stage.name`
through protected reads and after receiver/storage reopen. HTTP 200, a resolved
action, this capture fixture or another SDK's pass does not prove durability.

Configure meaning prospectively using exact service `wfs-pwa-browser`, browser
source, log carrier, `pwa.app.opened` and a retained `stage.name` condition.
Preview Search inclusion and Welcome exclusion, select literal Stage/step
explicitly, and keep definitions disjoint. A hint does not activate a mapping;
explicit owner labels take precedence. No goal, duration, presence or correlation
is provided by this event. Mapping and UI acceptance remain unrun.

F1-3 completion verification (2026-10-29): no telemetry production or fixture changes.
The grocery regression now waits for its row to be enabled after the first save.
Duplicate extras, keyboard toggles and failed-delete recovery remain asserted.
The owned optimized fixtures passed the full grocery suite and real-action telemetry
matrix (20 Chromium checks), plus 92 focused unit/transport tests. All action-response
bodies remain inspected. The reviewed 18-record capture uses only the fixed envelope
and approved screen attribute. The earlier failed repository gate remains historical;
the new application record `.task/agent-finish/runs/d86e29d211fa409cbe4074b31f538a61.json` also fails, on three planner/Home cases. The grocery and telemetry cases pass; task 3.2 stays unchecked. Documentation reconciliation is verified separately and does not supersede the failed application gate. Receiver durable reads/reopen,
deployed routing, native sharing and physical installed-phone qualification remain
not-run and unclaimed. Local receiver guide identity was refreshed read-only in the
linked completion evidence; this did not change the WFS wire contract.


F1-3 verification-blocker follow-up (2026-10-29): reconciliation used different
predicate objects to register/remove a held schedule interceptor. A controlled
post-reload resume reproduced the trapped extra read; retaining the same predicate
passes both recovery cases with every original assertion intact. Touch and Home
teardown failures have not reproduced in focused/traced full-suite checks and
remain unchanged; no application cause is claimed. The grocery enabled-state wait,
optimized fixtures and complete real action-response privacy inspection are
preserved. Current acceptance and final verification are recorded in the
[blocker repair evidence](../openspec/changes/archive/2026-10-29-centralize-pwa-opening-observation/tasks.md#f1-3-verification-blocker-repair-evidence-2026-10-29).
Task 3.2 is complete after all applicable final checks passed. Receiver/deployment/device
qualification remains separate and unclaimed.


Latest passing application `record_path`: `.task/agent-finish/runs/1058d82e9c204594b9ea64fbaae4efa9.json`;
content identity `c436843f5daa04226e0b542cbf2d69d03deddbcc424fd050dd81f315a63aeaa5`.
Final Chromium: 602 passed / 47 skipped / zero failures; unit: 1,384 passed; API:
1,259 passed / 156 skipped. All other applicable automated checks passed, none
blocked or not-run. These later evidence edits receive documentation verification
separately. The prior failed records above are historical. Touch and teardown
causes remain unestablished despite their passing focused/full runs; only the
reproduced reconciliation fixture defect was repaired this session. Durable
Sentrame receipt, protected reads/reopen/mapping, deployed routing, native sharing
and physical installed-phone qualification remain not-run. Tasks 4.1–4.3 and 5.1
remain unchecked; no deployment was enabled.


Application-version follow-up (2026-10-29): the resource envelope now includes
`service.version` for both producers, with existing app release metadata forwarded
through repository Compose. Prior captures/verification records above describe
their historical pre-version content. Updated acceptance and final verification
are in the [version evidence](../openspec/changes/archive/2026-10-29-centralize-pwa-opening-observation/tasks.md#app-version-follow-up-2026-10-29).


Latest version-follow-up application `record_path`:
`.task/agent-finish/runs/9d77169ae5a245c6ba1e39ee018a9f63.json` (content
`587f2dd80de619668177e465400c7f39f9c740aea178adcce4d14badb194e9e3`).
Version export passed 97 focused tests, 147 combined Chromium checks and the real
action/exporter capture in the final run. The final gate failed on one unrelated
Quick Replace mock-SSE evaluation during reload (601 passed / 47 skipped / one
failed); 1,389 units, API/static contracts, live endpoint parity and 183 PostgreSQL
tests passed. No applicable automated check was blocked or not-run. Task 3.2
therefore remains unchecked; earlier pre-version passing records do not cover
these changed bytes. Documentation reconciliation is checked separately and does
not supersede the failed application gate. Durable Sentrame version projection,
protected reads/reopen/mapping, deployed routing, native sharing and physical
installed-phone qualification remain not-run. No deployment was enabled.


The opening specification was synced and archived on 2026-10-29 at the user's
request. See the [main capability contract](../openspec/specs/anonymous-pwa-telemetry/spec.md)
and [archive disposition](../openspec/changes/archive/2026-10-29-centralize-pwa-opening-observation/tasks.md#archive-disposition-2026-10-29).
Five tasks remain unchecked (3.2, 4.1–4.3 and 5.1); the failed application gate
and unrun qualification cells above are preserved. Sync/archive is documentation
lifecycle work and does not qualify durable receiver receipt or a deployment.
