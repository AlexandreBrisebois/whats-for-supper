# App installation Specification

## Purpose

Expose install-facing identity and household entry points, and describe conditional share handoff into existing capture journeys without certifying device installation or delivery.

Shared rule owners: [household identity](../household-identity/spec.md) and
[recipe capture](../recipe-capture/spec.md). Named requirements below refer to those owners.

## Relocated requirement references (non-normative)

References in preserved requirements to a combined capability now resolve to these exact requirement owners. This navigation does not change their policy.

- [Apply member context after household access](../member-context/spec.md#requirement-apply-member-context-after-household-access)
- [Route hydrated landing context to the next household page](../member-context/spec.md#requirement-route-hydrated-landing-context-to-the-next-household-page)

## Requirements

### Requirement: Publish ordinary household install identity

For the ordinary stable non-demo application, GET `/manifest.json` SHALL return a public manifest with ID `/`, name and short name `What's for Supper?`, start URL `/`, standalone display and portrait orientation. The response SHALL use `application/manifest+json` and `Cache-Control: no-store, max-age=0`.

#### Scenario: Read metadata before household entry
- **WHEN** a visitor without household access requests `/manifest.json` for the ordinary stable non-demo application
- **THEN** the application returns that install identity without requiring household or member selection

#### Scenario: Request launch presentation metadata
- **WHEN** the ordinary application manifest is read
- **THEN** it requests standalone portrait presentation, cream background `#FDFCF0` and theme color `#CD5D45`
- **AND** this metadata does not establish that a browser installed or honored that presentation

### Requirement: Publish consistent app-controlled description

The manifest and initial document description SHALL be exactly `Swipe, Match, Cook.` across stable/beta and production/demo variants, independently of PDF sharing configuration. This description change SHALL preserve names, IDs, origin, manifest URL, start URL, icons and launch behavior. These declarations SHALL NOT certify Android installed-app details or existing-install refresh.

#### Scenario: Read public description metadata
- **WHEN** a visitor reads the public manifest and initial Welcome HTML for any identity variant
- **THEN** both descriptions are exactly `Swipe, Match, Cook.`
- **AND** existing installation identity and presentation fields remain unchanged

#### Scenario: Existing installation retains browser-owned metadata
- **WHEN** app-controlled description metadata changes while an installation already exists
- **THEN** the application does not replace installation identity to force a refresh
- **AND** a successful manifest or HTML response alone does not establish that Android displays the new description

### Requirement: Advertise ordinary install icons

The ordinary stable non-demo manifest SHALL advertise PNG icons at 32, 180, 192 and 512 pixels, including separate maskable 192 and 512 pixel icons. The document metadata SHALL identify the 32 pixel favicon and 180 pixel Apple touch icon from the same ordinary icon set.

#### Scenario: Manifest icon descriptors
- **WHEN** the ordinary manifest is requested
- **THEN** its icons identify `/favicon-32x32.png`, `/apple-touch-icon.png`, `/android-chrome-192x192.png`, `/android-chrome-512x512.png`, `/maskable-icon-192x192.png` and `/maskable-icon-512x512.png`
- **AND** Android icons declare any purpose and maskable icons declare maskable purpose

#### Scenario: Document icon discovery
- **WHEN** initial ordinary document metadata is generated
- **THEN** its favicon is `/favicon-32x32.png` and Apple touch icon is `/apple-touch-icon.png`

### Requirement: Supply document install presentation hints

The application SHALL supply its name as document title and Apple web-app title, link `/manifest.json`, request Apple web-app capability with black-translucent status bar style, and provide device-specific portrait startup-image links. These declarations SHALL NOT certify browser or OS support.

#### Scenario: Discover metadata in initial document
- **WHEN** the ordinary Welcome document is requested
- **THEN** its initial head contains the application title, manifest link and Apple web-app metadata without requiring backend API success

#### Scenario: Declare startup images
- **WHEN** the root document is rendered
- **THEN** it includes portrait Apple startup-image links selected by device dimensions and pixel ratio
- **AND** their presence does not certify an OS splash-screen result

### Requirement: Advertise direct household shortcuts

The manifest SHALL advertise Quick Find at `/discovery` and Capture Meal at `/capture`, each with a 192 pixel icon. Opening these destinations SHALL remain subject to household-identity requirements `Gate protected page entry with household access` and `Apply member context after household access`.

#### Scenario: Read shortcut destinations
- **WHEN** the ordinary manifest is requested
- **THEN** it advertises Quick Find with short name Find and Capture Meal with short name Capture at those destinations

#### Scenario: Shortcut destination requires household entry
- **WHEN** a shortcut destination is requested without accepted household access
- **THEN** existing household-identity page-gate recovery applies rather than the shortcut bypassing household entry

### Requirement: Launch through the household root entry

The manifest start URL SHALL enter `/`. Root entry SHALL use household-identity requirements `Gate protected page entry with household access`, `Apply member context after household access` and `Route hydrated landing context to the next household page`. Launch metadata SHALL NOT imply an independent installed-app identity or guaranteed Home arrival.

#### Scenario: Start without household access
- **WHEN** the manifest start URL is requested without accepted household access
- **THEN** the existing household access gate handles entry and Welcome recovery

#### Scenario: Start with household context
- **WHEN** root entry passes page gates and reaches hydrated identity validation
- **THEN** the existing hydrated landing requirement determines the next requested household page

### Requirement: Account for supplied safe-area insets in app presentation

The root document SHALL request viewport fit cover. The shared app layout SHALL add supplied safe-area insets to its top padding when its header is hidden and to its bottom content clearance; displayed bottom navigation SHALL add the bottom inset to its padding.

#### Scenario: Header hidden in shared layout
- **WHEN** the shared layout hides its header and the browser supplies a top safe-area inset
- **THEN** its content top padding includes that inset

#### Scenario: Shared bottom navigation displayed
- **WHEN** the shared layout displays bottom navigation and the browser supplies a bottom safe-area inset
- **THEN** both navigation padding and content clearance include that inset

### Requirement: Request service-worker registration when supported

After document interaction is enabled, the application SHALL request registration of `/sw.js` when the browser exposes service-worker support. Registration SHALL NOT establish worker control, successful installation or offline availability.

#### Scenario: Browser exposes service workers
- **WHEN** the registration script runs in a browser exposing service-worker support
- **THEN** it requests registration of `/sw.js`

#### Scenario: Browser lacks service workers
- **WHEN** the registration script runs without service-worker support
- **THEN** it makes no service-worker registration request

### Requirement: Advertise PDF and text share transport

The manifest SHALL advertise multipart POST sharing to `/share-target` with title, text and url parameters plus a files field accepting application/pdf and .pdf. Advertisement SHALL NOT bypass member validation or establish successful native delivery.

#### Scenario: Normal share advertisement
- **WHEN** the manifest is requested with or without legacy PDF feature configuration
- **THEN** the manifest advertises POST `/share-target` with multipart/form-data and the PDF files descriptor
- **AND** manifest identity, launch destination and shortcuts remain unchanged

#### Scenario: Text or link is shared
- **WHEN** POST share transport contains no PDF and supplies text or a link
- **THEN** the existing text-only handoff remains available

### Requirement: Handle share transport only on its worker request boundary

A controlling application service worker SHALL handle same-origin POST requests whose exact path is `/share-target`. This share handler SHALL NOT match GET requests, another origin or other paths.

#### Scenario: Controlled share POST
- **WHEN** a same-origin POST to `/share-target` reaches the controlling worker
- **THEN** the worker routes it through share transport handling

#### Scenario: Other request is not a share POST
- **WHEN** the request is GET, has another origin or has a path other than `/share-target`
- **THEN** the share handler does not select it

### Requirement: Preserve worker network access for API and manifest requests

The worker SHALL leave GET `/manifest.json` and GET requests whose URL contains `/api/` outside its cache response handling. It SHALL leave non-GET requests other than its matching share POST outside response handling, preserving ordinary network handling of API requests and streams.

#### Scenario: Manifest refresh bypasses worker cache
- **WHEN** the worker receives GET `/manifest.json`
- **THEN** it does not supply a cached response for the manifest

#### Scenario: API or stream GET bypasses worker cache
- **WHEN** a GET request URL contains `/api/`, including `/api/stream`
- **THEN** the worker does not intercept it with a cache response

#### Scenario: API mutation bypasses worker handling
- **WHEN** a non-GET API request reaches the worker
- **THEN** the worker does not supply its response or queue it for later delivery

### Requirement: Hand text-only share POST to existing link review

For a successfully parsed bounded share POST containing no files, transport SHALL return 303 to `/capture` with supplied string title, text and url fields encoded as query parameters. Link review, explicit save and failure recovery SHALL follow recipe-capture requirement `Enter and review a recipe link at capture entry` and its submission requirements.

#### Scenario: Text contains a recipe URL
- **WHEN** a controlled text-only share POST contains text with an HTTP or HTTPS URL
- **THEN** transport redirects to capture carrying that text for existing link review
- **AND** transport itself does not submit a recipe

#### Scenario: URL and title supplied
- **WHEN** a parsed text-only share POST supplies string url and title fields
- **THEN** the redirect preserves those field values as encoded query parameters
- **AND** carrying title does not establish that capture uses it as a recipe name

### Requirement: Stage a compatible shared PDF before capture handoff

For a bounded share POST carrying one nonempty file under files, with a .pdf filename and application/pdf MIME type (case-insensitive) and at most 20,971,520 bytes, transport SHALL commit browser staging before returning 303 to `/capture?share=<token>`. It SHALL NOT render the document or call recipe intake during this handoff.

#### Scenario: Compatible transport file committed
- **WHEN** a controlled share POST contains one compatible PDF and staging succeeds
- **THEN** its redirect carries the staged token rather than the file contents
- **AND** no import is created by transport alone

#### Scenario: Document content is unvalidated
- **WHEN** a file meets transport properties but contains corrupt PDF content
- **THEN** transport staging does not certify document readability or successful recipe extraction

### Requirement: Reject unusable share envelopes with restart handoff

Share transport SHALL bound the body to 21,037,056 bytes and return 303 to `/capture?pdfShareError=restart` on parsing, bound, supported-file validation or staging failure. Capture SHALL present choose-or-share-again feedback when the error reaches its PDF panel without a selection.

#### Scenario: Multiple or incompatible files
- **WHEN** a share POST contains multiple files, or its single PDF candidate is empty, over the file limit, or has incompatible extension or MIME type
- **THEN** transport redirects with the restart error rather than returning a new staged token

#### Scenario: Envelope cannot be read within its bound
- **WHEN** declared or read body length exceeds the envelope bound, or multipart parsing fails
- **THEN** transport redirects with the restart error

#### Scenario: Browser staging fails
- **WHEN** committing a compatible PDF to browser staging throws
- **THEN** transport redirects with the restart error for a fresh choose-or-share attempt

### Requirement: Keep one token-owned browser PDF handoff

Successful browser staging SHALL retain one pending PDF handoff and return a new opaque token. A later staged PDF SHALL replace the previous pending handoff. Claim and discard SHALL affect only the matching token; a matching successful claim SHALL consume the slot so that the same delivery cannot be claimed again.

#### Scenario: Replace a pending handoff
- **WHEN** a PDF is successfully staged while another pending PDF occupies the browser slot
- **THEN** the newer PDF and token replace the older pending handoff

#### Scenario: Stale token cannot take the replacement
- **WHEN** claim or discard is requested with an older token after replacement
- **THEN** it leaves the newer handoff intact and an older-token claim returns no file

#### Scenario: Claim once
- **WHEN** a valid unexpired matching handoff is successfully claimed
- **THEN** the claim returns its file and consumes the slot
- **AND** another claim with that token returns no file

### Requirement: Bound browser handoff age without draft resumption

A matching claim SHALL return a file only if it still meets PDF transport constraints and is no more than ten minutes old; otherwise it SHALL consume the matching slot without returning a file. Cleanup SHALL attempt removal of pending handoffs older than ten minutes on worker activation, page lifecycle initialization, pageshow and a one-minute page timer. This SHALL NOT promise exact-time deletion or draft resumption.

#### Scenario: Matching handoff has expired
- **WHEN** a matching claim reads a pending handoff older than ten minutes
- **THEN** it removes that handoff without returning its file

#### Scenario: Claim at the age boundary
- **WHEN** a matching claim reads a transport-valid handoff exactly ten minutes old
- **THEN** age alone does not prevent that claim returning and consuming the file

#### Scenario: Cleanup runs with an expired handoff
- **WHEN** cleanup successfully reads a pending handoff older than ten minutes
- **THEN** it removes the expired handoff
- **AND** cleanup triggers do not guarantee storage access or deletion at a precise wall-clock deadline

### Requirement: Discard token delivery away from capture

When a page carrying a share token reaches the application's share lifecycle outside `/capture`, the application SHALL request discard of that token and remove only the share query parameter from the visible URL. It SHALL NOT restore that delivery after household unlock or member selection.

#### Scenario: Household unlock receives a token
- **WHEN** access recovery reaches Welcome with a share query token
- **THEN** share lifecycle requests discard and removes that query token from the visible URL
- **AND** unlocking does not restore the discarded delivery

#### Scenario: Member selection receives a token
- **WHEN** member-context recovery reaches onboarding carrying a share query token
- **THEN** share lifecycle requests discard and removes that query token
- **AND** completing selection requires a fresh delivery for that discarded share

#### Scenario: Another route carries the token
- **WHEN** a page outside capture carries a share query token with other query parameters
- **THEN** share lifecycle removes share while retaining the other query parameters and requests token-matched discard

### Requirement: Hand a claimed PDF to the current foreground capture

Capture SHALL attempt a share token once per mounted panel. Without a selected member or in Family GOTO it SHALL discard instead of claiming. A returned file SHALL reach foreground selection only while the panel, token, delivery attempt and member remain current and the document is visible. Eligibility, explicit Save, interrupted drafts and unavailable-share recovery SHALL follow the existing recipe-capture requirements.

#### Scenario: Current foreground delivery reaches capture
- **WHEN** a selected member outside Family GOTO receives a matching staged PDF while the capture panel and delivery remain current and visible
- **THEN** the file becomes that member's foreground PDF selection
- **AND** recipe-capture requirements `Resolve PDF draft eligibility and discard interrupted drafts` and `Review PDF identity and optional metadata before saving` govern confirmation and Save

#### Scenario: Delivery returns after interruption
- **WHEN** a share claim returns after the panel has departed, the document became hidden, the token changed, or member context changed even if it changed back
- **THEN** that stale result does not restore a PDF selection
- **AND** existing capture interruption rules continue to govern the owned draft

#### Scenario: No eligible recipient or usable claim
- **WHEN** a token reaches capture without selected member context or in Family GOTO, or an attempted claim is unavailable, expired or already consumed
- **THEN** missing context or Family GOTO requests token discard without claim
- **AND** an unusable attempted claim uses recipe-capture requirement `Resolve PDF draft eligibility and discard interrupted drafts` for choose-or-share-again feedback

### Requirement: Offer reopenable Beta release context
The Beta-only Welcome screen and ordinary app shell SHALL provide the same compact pale sage band with charcoal text and shared responsive explanation surface as Demo, with Beta-specific pre-release copy in EN/FR. Dismissal SHALL leave the band available. Opening and closing SHALL preserve route, drafts, household/member state, login input and existing feature availability.

#### Scenario: Open and reopen Beta context
- **WHEN** a visitor activates the Beta context band on Beta-only Welcome or an ordinary Beta-only app route
- **THEN** one named explanation opens with Start exploring and explicit Close actions
- **AND** both the band label and modal title use Beta · Better with your ideas in English and Bêta · Meilleure grâce à vos idées in French, on Welcome and in the app shell
- **AND** either action closes it without navigation or household mutation, and the band can reopen it

#### Scenario: Truthful pre-release copy
- **WHEN** the Beta-only explanation is displayed
- **THEN** it uses the reviewed EN/FR pre-release copy in the design, without claiming a sample/shared visitor household, scheduled resets, disabled AI, reliability, privacy or data-loss guarantees
- **AND** Beta presentation does not grant access or change feature availability
- **AND** the approved build-in-public closing is followed by the GitHub feedback link without an additional public/privacy-warning paragraph in the disclaimer; the account-required helper remains, and the feedback form retains its privacy reminder

### Requirement: Invite voluntary Beta feedback through GitHub
The Beta explanation SHALL link to verified repository GitHub feedback, not Demo's installation link, with an account-required notice. Use the approved template when available, otherwise the Issues index. Only explicit activation SHALL open it, without automatic submission, prefilled data or tracking parameters; a static template selector is allowed. The link SHALL NOT acknowledge context or change app route, input or household state. Demo SHALL retain its installation link.

#### Scenario: Voluntary feedback destination
- **WHEN** a visitor activates the Beta feedback link from Welcome or the app shell
- **THEN** the destination opens the approved feedback template in the AlexandreBrisebois/whats-for-supper GitHub repository in a new browsing context using the existing external-link safety convention
- **AND** the form must be merged into the repository's default branch (`main`) and the exact destination verified before selecting the direct-template link for release; a feature-branch or PR file alone is insufficient
- **AND** until that prerequisite is established, the link uses https://github.com/AlexandreBrisebois/whats-for-supper/issues without claiming a template is available or adding a runtime availability probe
- **AND** no issue is created or submitted by the app and no passphrase, household, member, recipe or other app data is attached to the destination

#### Scenario: Feedback remains optional and accessible
- **WHEN** the explanation renders or the external destination cannot open
- **THEN** no automatic external navigation or acknowledgement occurs, and the existing dismiss/reopen flow remains usable
- **AND** the link has a descriptive localized GitHub name, an account-required notice, visible keyboard focus and at least a 44px touch target within the modal tab order

#### Scenario: Low-friction feedback template
- **WHEN** a visitor opens the approved GitHub feedback template
- **THEN** plain-language prompts help describe the task, experience or suggestion without requiring technical reproduction steps, diagnostics or a screenshot
- **AND** optional device/version information is manually supplied, with a visible reminder that issues are public and must not contain passphrases, personal information or sensitive screenshots
- **AND** only the visitor's explicit GitHub submission creates an issue; the app does not submit or populate personal data

### Requirement: Offer manual Beta context on Welcome
Welcome SHALL select manual release context from server-resolved installation identity: Beta with non-demo identity offers Beta, installation Demo retains Demo, and stable non-demo offers neither. It SHALL NOT automatically open an explanation or use runtime health to select Welcome context. Beta SHALL replace its tiny Welcome note, not duplicate it, without granting access.

#### Scenario: Beta Welcome without interaction
- **WHEN** Welcome renders with server-resolved Beta channel and non-demo installation identity
- **THEN** one Beta band appears above the login form without an open explanation or duplicate tiny Beta note
- **AND** activating it opens the same Beta copy and dismissal controls as the app shell without submitting the form

#### Scenario: Welcome identity remains separate from runtime policy
- **WHEN** Welcome resolves installation Demo, stable non-demo or Beta non-demo identity, irrespective of a later app-shell runtime status
- **THEN** its manual presentation follows that installation identity without claiming API mode or feature availability
- **AND** Demo-on-Beta retains one Demo explanation with the accessible Beta-channel description and no Beta introduction

#### Scenario: Beta preserves ordinary login
- **WHEN** a Beta-only visitor opens, closes or reopens the Welcome explanation
- **THEN** the editable passphrase, ordinary family-passphrase helper, existing validation/retry feedback and explicit Enter behavior are preserved; Beta does not prefill a Demo passphrase or show Demo-prefill wording
- **AND** Start exploring only dismisses the explanation, while the branding heading remains exactly Whats for Supper? in English and French

### Requirement: Keep app-shell mode context truthful and singular
App-shell Beta context SHALL be offered only for a Beta installation with non-demo installation identity and confirmed non-demo runtime status. Stable-only SHALL have no Beta context. Demo SHALL retain its existing explanation and accessible Beta-channel identity description on a Beta channel, without a second Beta band or automatic overlay.

#### Scenario: Identity combinations
- **WHEN** the shell resolves stable-only, Beta-only, Demo-only or Demo-on-Beta identity with matching known runtime status
- **THEN** stable-only has no mode explanation, Beta-only has Beta context, and both Demo cases retain Demo context without a second Beta introduction
- **AND** Demo-on-Beta retains the existing assistive Beta-channel description

#### Scenario: Runtime Demo overrides the Beta-only hint proposal
- **WHEN** the app shell's release channel is Beta, installation demo identity is false, and runtime demo status resolves true
- **THEN** one Demo context band and explanation are available, with Demo content and an informational note visibly and accessibly named Demo or Démo, described by Beta release channel or Canal bêta
- **AND** no plain Beta identity note, Beta context band or Beta introduction remains; explicit dismissal affects only the Demo acknowledgement, without changing either underlying identity input or runtime policy

#### Scenario: Runtime mode is unknown or installation Demo lacks runtime Demo
- **WHEN** app-shell runtime demo status is pending or fails to resolve, or installation demo identity is true while runtime demo status is false
- **THEN** no Beta explanation opens or records acknowledgement; existing identity hints and Demo behavior remain governed by their existing owners
- **AND** ordinary work is not blocked by the absence of a Beta explanation

### Requirement: Introduce Beta context only on a safe first Home visit
An unacknowledged Beta-only explanation SHALL open automatically at most once per app-shell visit, only when initial shell entry is query-free Home, member context is ready, no active work or competing modal exists, and shell interaction has not begun. An ineligible shell entry or interruption SHALL suppress automatic introduction for that visit rather than queue it for later. Welcome/onboarding activity SHALL NOT consume shell eligibility.

#### Scenario: First ready ordinary Home
- **WHEN** initial entry is `/home` with no query, member context and mode are ready, acknowledgement has been read, and no prior interaction, active work or other dialog exists
- **THEN** the unacknowledged explanation opens once and can be immediately dismissed
- **AND** the visitor keeps the intended Home destination and member context

#### Scenario: Deep link or task entry
- **WHEN** initial entry is a recipe, capture/share/import, voting, cooking, planning or other route, or Home carries query intent
- **THEN** the explanation does not open automatically, including after later navigation to Home during that visit
- **AND** intended destinations and drafts survive; the band remains manually available

#### Scenario: Late readiness and active work
- **WHEN** readiness arrives after pointer, keyboard or wheel interaction, or while capture/PDF work, loading or another dialog is active
- **THEN** automatic introduction is suppressed for that visit, including after that work finishes
- **AND** no timer or queued popup steals focus from an editor or task

#### Scenario: Welcome does not consume Home eligibility
- **WHEN** an unacknowledged visitor types, clears, submits or navigates through Welcome/onboarding, or manually opens the Welcome explanation then leaves without explicitly dismissing it
- **THEN** those pre-shell actions do not count as app-shell interaction, presentation or an ineligible shell entry
- **AND** the first query-free ready Home entry can introduce once under the existing readiness, work, modal and interaction guards

### Requirement: Remember explicit Beta dismissal locally and independently
Start exploring, explicit Close and Escape SHALL acknowledge Beta context using a simple browser-local preference without user, household or tracking identifiers or server synchronization. Demo and Beta acknowledgements SHALL be independent. Household resets, member/locale switches and cosmetic copy edits SHALL NOT clear acknowledgement.

#### Scenario: Dismiss then return
- **WHEN** a visitor explicitly dismisses Beta context and navigates, reloads, changes member/locale or the household resets
- **THEN** successful persistent acknowledgement prevents automatic Beta reintroduction, while manual reopening remains available

#### Scenario: Welcome dismissal suppresses later Home introduction
- **WHEN** a visitor explicitly dismisses Beta on Welcome through Start exploring, Close or Escape and then reaches Home
- **THEN** the same Beta acknowledgement suppresses automatic Home introduction while the band remains manually available
- **AND** failed storage writes still share in-memory acknowledgement across the transition, and no Demo acknowledgement is written

#### Scenario: Mode transition preserves separate acknowledgements
- **WHEN** a visitor dismisses Demo then enters Beta-only, or dismisses Beta then enters Demo
- **THEN** dismissal affects only the explanation actually dismissed; the other mode is eligible only on a fresh safe visit without its own acknowledgement
- **AND** changing modes in an already active visit does not trigger an automatic overlay

#### Scenario: Copy edits and new local context
- **WHEN** wording, locale or styling changes after acknowledgement
- **THEN** automatic introduction does not repeat
- **AND** another browser/device or cleared storage has independent first-visit state

### Requirement: Contain Beta storage and lifecycle failures
Missing or failing browser storage SHALL leave the app usable with a visit-memory presentation and dismissal guard. Automatic presentation, navigation away, unmount and mode changes SHALL NOT manufacture persisted acknowledgement. A remount SHALL NOT repeat an automatic explanation in the same app visit.

#### Scenario: Storage read or write fails
- **WHEN** storage access is absent, blocked or throws during read or dismissal write
- **THEN** explanation controls and navigation remain usable, and automatic opening does not repeat during the running app visit
- **AND** no persistence across a full reload or another browser is promised when storage cannot retain it

#### Scenario: Explanation leaves without dismissal
- **WHEN** routing, shell unmount or a mode change removes an open app-shell explanation before explicit dismissal
- **THEN** no local dismissal is persisted and the current app-shell visit does not automatically reopen it
- **AND** destination/editor focus is retained without restoring focus to the band, even when that band remains connected

#### Scenario: Welcome explanation leaves without dismissal
- **WHEN** routing, unmount or a mode change removes an open Welcome explanation before explicit dismissal
- **THEN** its route-local open state is cleared without acknowledgement or consuming Home presentation
- **AND** destination focus is retained without restoring focus to a background band; a later eligible Home introduction remains possible

### Requirement: Make Beta context accessible on primary devices
The band and explanation SHALL be readable in EN/FR on iPhone, Pixel Phone and iPad in both orientations, respecting safe areas and large text. The band SHALL have a 32 CSS pixel minimum touch height matching Demo; modal controls and the feedback link SHALL retain at least 44px targets. Interactive focus SHALL remain visible and text contrast SHALL be at least 4.5:1 in each actual interaction state. Login, app navigation and notification actions SHALL remain reachable.

#### Scenario: Match the compact Demo band and action
- **WHEN** Beta context renders on Welcome or in the app shell at ordinary text size
- **THEN** the full-width band uses pale sage normal/hover/pressed surfaces, charcoal text, a 32px minimum height, 13px/18px medium label and 16px help icon, without decorative cream padding above or below the strip
- **AND** necessary safe-area inset remains; the band grows and wraps at 320px or enlarged text without clipping, horizontal overflow or overlapping targets
- **AND** Start exploring uses the same dark sage normal/hover/pressed surfaces and white text as Demo, without reducing modal targets

#### Scenario: Phone sheet and iPad dialog
- **WHEN** the explanation renders on a primary phone or iPad with expanded text
- **THEN** the phone sheet or compact tablet dialog keeps all copy and dismissal actions reachable without clipping or horizontal scrolling
- **AND** notification/header layers, safe areas and the Welcome virtual keyboard do not obscure its actions, the login controls or the reopenable band

#### Scenario: Keyboard and assistive technology
- **WHEN** a visitor opens or dismisses the explanation using keyboard or assistive technology
- **THEN** it has a meaningful name and description, initially focuses its heading, contains modal focus, supports Escape and explicit Close, and returns focus to the connected band on explicit dismissal
- **AND** the focused static title has no visible outline, while interactive controls retain visible focus; reduced-motion preferences and VoiceOver/TalkBack reading order remain usable
