# Spec Delta

## ADDED Requirements

### Requirement: Select share advertisement from PWA configuration

The manifest SHALL advertise GET link sharing to `/capture` with title, text and url parameters unless the PWA server's `WFS_FEATURE_PREVIEW_PDF_RECIPE_IMPORT`, trimmed and lowercased, is `on` or `opt-in`. Those modes SHALL advertise multipart POST sharing to `/share-target` with the same text fields and a files field accepting application/pdf and .pdf. Advertisement SHALL NOT establish member eligibility.

#### Scenario: Default link advertisement
- **WHEN** the PWA mode is absent, blank, off or unrecognized
- **THEN** the manifest advertises GET `/capture` with title, text and url parameters

#### Scenario: PDF transport advertisement
- **WHEN** the PWA mode normalizes to on or opt-in
- **THEN** the manifest advertises POST `/share-target` with multipart/form-data and the PDF files descriptor
- **AND** manifest identity, launch destination and shortcuts remain unchanged

#### Scenario: Member has not enabled opt-in
- **WHEN** the manifest advertises PDF transport in opt-in mode for a member who has not enabled acquisition
- **THEN** advertisement does not bypass recipe-capture requirement `Gate PDF acquisition by effective member eligibility`

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
