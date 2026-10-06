# PDF upload path — data flow

The dedicated `POST /api/recipes/capture-pdf` seam accepts multipart `file`, optional `rating` (0–3, default 0), and optional trimmed `notes` (blank becomes null). It requires existing household authentication, an established member and the effective preview flag. No document parsing occurs at acceptance.

```mermaid
sequenceDiagram
    participant Origin as Android app / iOS picker
    participant Worker as Share worker + one IndexedDB slot
    participant Capture as Capture confirmation
    participant API as PDF capture API
    participant Store as Database + recipe store
    participant Workflow as Existing recipe-import
    participant Index as Independent search indexing
    participant Native as Isolated PDFtoImage child
    participant Settings as Existing Settings recovery
    Origin->>Worker: Android multipart POST /share-target
    Worker->>Worker: Validate count/type/bytes; replace pending slot
    Worker-->>Capture: 303 /capture?share=opaque-token
    Origin->>Capture: iOS / ordinary picker selection
    Capture->>Capture: Member/flag gate; rating + notes; explicit Save
    Capture->>API: multipart file/rating/notes; member header
    API->>Store: Unchanged original/source.pdf + recipe.info + pending recipe/search sidecar
    API->>Workflow: Trigger recipe-import with recipeId
    API-->>Capture: 202 data.id; return Home
    Workflow->>Native: ConvertPdf; all 1–10 pages; sequential PNG
    Native-->>Store: Publish complete ordered 0.png…N.png; update count
    Workflow->>Workflow: ExtractRecipe → GenerateHero → SyncRecipe → categorization
    alt Ready
        Workflow->>Store: Normal readiness publication
        Workflow->>Workflow: Complete import report
        Workflow->>Index: Queue index-recipe-search using completed content fingerprint
    else Conversion/extraction failure after normal retries
        Workflow->>Settings: Existing paused recipe-import + failed task
        Settings->>Workflow: Retry failed task using retained source
        Settings->>Store: Delete queues existing aggregate cleanup
    end
```

Photos run the same workflow and skip ConvertPdf when no retained PDF exists. Upload acceptance starts only recipe-import; search indexing is queued after readiness and import-report completion. The indexing child runs independently and its failures do not emit an import-failure notification. Accepted-ID persistence follows the existing photo boundary: enqueue errors are logged after persistence, so 202 does not verify launch or readiness. No new durable queue or pre-workflow failure model is introduced.

Transport rejects missing/extra file or invalid metadata with 400, a disabled preview with 409, a file over 20,971,520 bytes with 413 and wrong extension/MIME with 415. Rejection creates no pending recipe/workflow. Errors use unwrapped `{status,message}`; acceptance is `{data:{id}}`. Corrupt/encrypted documents and 11-page documents fail conversion as retained jobs. Do not truncate, promote partial pages, or automatically delete failed sources.

The original source path is fixed, independent of the supplied filename, and excluded from image enumeration, reimport image decoding, bundle export and image endpoints. Pages use numbered PNGs and the existing original-image viewer. Complete page publication is retryable; metadata count is updated after publication. Renderer attempt cleanup affects only temporary files. Existing soft delete retains the aggregate; permanent purge and failed-residue maintenance remove source/pages/metadata. Filesystem backup must retain the whole recipe tree. Restore preserves a pending PDF as pending and does not manufacture a ready recipe or reconstruct a lost workflow queue.

The worker intercepts only exact same-origin POST `/share-target`, preserves text-only POST link review and legacy GET capture, and never uploads to the API. One atomic IndexedDB slot holds at most one validated 20 MiB PDF. Its multipart transport envelope is bounded to file limit plus 64 KiB; staging temporarily holds both old/new bytes while replacing. Tokens contain no content/member identity. Expiration is ten minutes, with cleanup on worker activation, foreground lifecycle and token access; this is not draft recovery. Old claim/discard calls cannot delete a newer slot. Failed staging tells the user to choose/share again.

The single `/manifest.json` route uses the same deployment mode as the API: off/invalid retains GET link sharing; opt-in/on advertises multipart PDF sharing. Member opt-in is a foreground/API gate. Responses are uncached and the worker bypasses manifest caching; installed metadata can remain stale. Runtime checks still reject acquisition. Ready recipes and existing retry jobs remain independent of acquisition flags.

See [PDF user flow](../user-flows/pdf-recipe-import.md), [photo flow](photo-upload-path.md), [OpenAPI](../../../specs/openapi.yaml), and [qualification harness](../../../scripts/pdf/README.md). Actual NAS resource, extraction/readability and OS device qualification are release gates.
