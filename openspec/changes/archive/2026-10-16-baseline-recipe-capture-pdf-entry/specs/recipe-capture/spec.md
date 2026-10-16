# Spec Delta

## ADDED Requirements

### Requirement: Gate PDF acquisition by effective member eligibility

PDF acquisition SHALL require household authentication, an established member and effective PDF preview enablement. Off, absent or invalid mode SHALL disable acquisition; opt-in SHALL require that member's enabled preference; on SHALL enable it. The ordinary capture picker SHALL offer PDF only after the selected member's flags resolve enabled without error, and SHALL exclude PDF in Family GOTO.

#### Scenario: Enabled member selects the PDF entry
- **WHEN** the current established member has effective PDF preview enablement outside Family GOTO
- **THEN** Import recipe file includes PDF among its selectable formats

#### Scenario: Disabled or unresolved picker eligibility
- **WHEN** flags are loading, errored, belong to another member or resolve disabled
- **THEN** the picker does not advertise PDF
- **AND** Family GOTO does not advertise PDF regardless of flag enablement

#### Scenario: API rechecks acquisition eligibility
- **WHEN** PDF intake is requested without household authentication, without an established member, or with that member's PDF preview disabled
- **THEN** the API rejects it with 401, 400 or 409 respectively
- **AND** disabled-preview rejection creates no pending recipe or import workflow

### Requirement: Validate PDF file selection before confirmation

The ordinary picker SHALL accept a nonempty file of at most 20 MiB (20,971,520 bytes) only when its filename ends in .pdf and its MIME type is application/pdf, without regard to case. Selection validation SHALL check transport properties without parsing the document.

#### Scenario: Valid transport properties
- **WHEN** an eligible person selects a nonempty .pdf file with application/pdf type within the byte limit
- **THEN** the client opens PDF confirmation even if the document content has not yet been validated

#### Scenario: Invalid file selection
- **WHEN** a PDF candidate has incompatible extension or MIME type, is empty, or exceeds 20,971,520 bytes
- **THEN** the picker displays a file or size error and does not stage it for PDF confirmation

### Requirement: Review PDF identity and optional metadata before saving

PDF confirmation SHALL show the filename and guidance to choose one recipe in up to ten pages and 20 MiB. It SHALL offer the existing appreciation options and optional notes, initially unrated, and require explicit Save Recipe. It SHALL omit finished-dish photo selection and a Cancel action.

#### Scenario: Review selected PDF
- **WHEN** a PDF selection reaches enabled confirmation
- **THEN** the person sees the filename, guidance, appreciation choices and optional notes before any intake submission
- **AND** no finished-dish photo selector or Cancel button is presented

#### Scenario: Save metadata
- **WHEN** a person saves with an appreciation selection and notes
- **THEN** the client submits that rating and trimmed nonblank notes with the file
- **AND** an untouched rating is submitted as zero and blank notes are omitted

### Requirement: Resolve PDF draft eligibility and discard interrupted drafts

A staged PDF SHALL wait for the selected member's flag snapshot before permitting confirmation. Disabled or errored eligibility SHALL show that the file has not been added and offer Choose another way, with Preview features when mode is opt-in. The unsaved PDF draft SHALL be discarded on page departure, hidden visibility, member change, changed capture query or transition to Family GOTO.

#### Scenario: Picker focus refresh is pending
- **WHEN** a file is selected while the same member's flag refresh is loading
- **THEN** the panel shows Loading preview features before resolving to confirmation or unavailable feedback

#### Scenario: Staged selection is disabled
- **WHEN** a staged file's resolved eligibility is disabled or errored
- **THEN** the panel withholds Save and explains that the file has not been added
- **AND** Choose another way clears the selection and returns to capture controls

#### Scenario: Draft interrupted or ownership changes
- **WHEN** the page leaves, becomes hidden, changes member or capture query, or enters Family GOTO
- **THEN** the owned unsaved selection and confirmation metadata are discarded
- **AND** returning does not restore that draft

#### Scenario: Shared entry cannot be claimed
- **WHEN** capture with a selected member outside Family GOTO receives a staged-share token that is expired, unavailable or already consumed
- **THEN** capture asks the person to choose or share the PDF again without creating an import

### Requirement: Submit a single PDF with bounded multipart metadata

Save SHALL submit one PDF to POST /api/recipes/capture-pdf with the submitting member and optional rating and notes. The API SHALL accept exactly one file field named file, integer rating 0–3 (default zero), and notes; blank notes SHALL become absent. Empty files, invalid multipart or metadata SHALL return 400, oversized files 413, and wrong extension, MIME or transport type 415 before creating an import.

#### Scenario: Accepted PDF intake
- **WHEN** an eligible request supplies one valid PDF transport file and allowed metadata
- **THEN** the API responds 202 with data.id identifying the pending recipe

#### Scenario: Invalid multipart or metadata
- **WHEN** intake has missing, extra or wrongly named files, repeated or unknown metadata fields, or a noninteger or out-of-range rating
- **THEN** the API rejects it with 400 and does not create a pending recipe or workflow

#### Scenario: File size and type rejected by API
- **WHEN** intake exceeds the byte limit or supplies an incompatible file extension, MIME or transport type
- **THEN** the API returns 413 for the byte limit or 415 for the type mismatch without creating an import

### Requirement: Lock PDF upload and retain foreground retry feedback

While Save is awaiting PDF intake, the client SHALL prevent repeated submission, disable metadata controls and show Preparing your PDF with interruption guidance. A rejection, network failure or unusable response identity SHALL display an error and release the lock, retaining the foreground selection and metadata unless its lifecycle has discarded them. Unrecognized HTTP failures or a missing or invalid response identity SHALL warn that resubmission can create a duplicate.

#### Scenario: Repeated Save during upload
- **WHEN** Save is activated repeatedly before its intake attempt finishes
- **THEN** only one request is sent and metadata controls remain disabled during that attempt

#### Scenario: Intake rejection permits another attempt
- **WHEN** intake fails while the same foreground draft remains active
- **THEN** the error is displayed and the selected file, rating and notes remain available for another Save

#### Scenario: Response identity cannot be trusted
- **WHEN** a successful HTTP response lacks a usable recipe UUID
- **THEN** the client displays uncertain-upload feedback including the duplicate warning and does not navigate as a confirmed intake

### Requirement: Persist a pending PDF before acknowledging intake

Successful PDF intake SHALL retain the unchanged source bytes and store a pending recipe with the submitting member, rating and trimmed notes, no original pages, and readiness and discoverability false. Background import SHALL be requested after initial persistence. A 202 identity SHALL establish persistence, not successful dispatch, conversion, extraction or readiness.

#### Scenario: Initial PDF is pending
- **WHEN** PDF intake returns 202
- **THEN** unchanged source bytes and the pending recipe are stored with zero original pages and no finished-dish photo designation
- **AND** its member, rating and notes are retained

#### Scenario: Import dispatch throws after persistence
- **WHEN** initial persistence succeeds but the background import request throws
- **THEN** intake still returns the stored identity and the recipe remains pending

### Requirement: Prepare all supported PDF pages for existing recipe extraction

Background PDF preparation SHALL reject corrupt or encrypted documents and documents outside one to ten pages, without truncating them. Successful preparation SHALL expose every page in order to existing multimodal extraction and semantic validation, retain the source PDF, and preserve rating and notes. Preparation alone SHALL leave the recipe pending; a retry SHALL reuse complete already-published pages.

#### Scenario: Prepare a supported document
- **WHEN** preparation successfully renders a valid unencrypted PDF of one to ten pages within supported render limits
- **THEN** all pages become ordered recipe originals for the existing extraction journey
- **AND** source bytes, rating and notes remain retained while readiness is still pending

#### Scenario: Unsupported or unrenderable document
- **WHEN** conversion encounters corrupt, encrypted, over-ten-page or otherwise unrenderable content
- **THEN** that preparation attempt fails without advancing extraction with a truncated document
- **AND** the source remains retained for existing failure recovery

#### Scenario: Retry after complete page preparation
- **WHEN** preparation is retried with all previously published pages still present
- **THEN** it reuses those pages without appending another set or rerendering the document

### Requirement: Return Home after PDF acceptance and reuse completion feedback

After receiving a usable PDF intake identity, the client SHALL add it to session pending tracking. If the submitting draft and member still own the active screen, it SHALL clear the draft and navigate directly to Home. Subsequent matching ready or failed notifications SHALL use existing capture completion and persistent failure feedback. Successful finalization SHALL also record readiness for the retained PDF.

#### Scenario: Intake accepted on the active draft
- **WHEN** intake returns a usable identity while the submitting draft and member remain current
- **THEN** the client tracks that recipe and navigates directly to Home without waiting for conversion

#### Scenario: Response arrives after draft replacement
- **WHEN** an accepted intake response arrives after its draft was replaced or member changed
- **THEN** it does not clear the newer draft or navigate it to Home

#### Scenario: Successful background finalization
- **WHEN** the existing ready step successfully finalizes the imported PDF recipe
- **THEN** the recipe becomes ready and discoverable and its retained-PDF metadata records readiness
- **AND** a matching session ready event uses existing completion feedback

### Requirement: Access PDF originals through rendered pages

A completed PDF recipe SHALL expose its ordered rendered pages through the existing recipe-library View Original controls and original-image endpoint. The retained source PDF SHALL remain separate from those image responses. Disabling new PDF acquisition SHALL NOT remove completed recipe access or gate its original-page viewing.

#### Scenario: View completed PDF originals
- **WHEN** a person opens View Original for a completed PDF recipe with rendered pages
- **THEN** the existing photo viewer displays and navigates its ordered page images
- **AND** those image requests do not download the retained PDF file

#### Scenario: Acquisition subsequently disabled
- **WHEN** PDF preview acquisition is disabled after a PDF recipe completes
- **THEN** ordinary library and rendered-original access remain available

### Requirement: Recover eligible failed PDF imports using retained work

A paused PDF import with a failed task SHALL appear in existing Settings failed captures with Retry and Clear actions. Retry SHALL queue the failed task without rechecking new-acquisition eligibility and SHALL NOT certify successful recovery. Clearing an eligible unfinished conversion failure SHALL remove its failure entry and queue residue cleanup; source removal SHALL occur when cleanup executes while the residue remains eligible.

#### Scenario: Retry failed preparation with preview off
- **WHEN** a PDF import has a paused failed conversion and a person retries it after PDF acquisition is disabled
- **THEN** the failed task is queued against its retained source without another upload or flag gate
- **AND** an invalid source can fail again

#### Scenario: Clear a failed conversion import
- **WHEN** a person confirms Clear for a paused failed PDF conversion with no usable named recipe content
- **THEN** the failure entry is removed and aggregate cleanup is queued
- **AND** executing that cleanup removes the retained PDF and any page residue

#### Scenario: Settings recovery request fails
- **WHEN** Retry or Clear fails in the Settings failure list
- **THEN** the row remains and displays retry error feedback
