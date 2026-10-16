# Design

## Context

See `proposal.md` for background and baseline motivation. This design artifact establishes the technical architecture, component boundaries, and observable data flows for extracting baseline specifications of ordinary-household recipe capture from external URLs.

The capture pipeline spans:
1. PWA UI (`pwa/src/components/capture/MinimalCapture.tsx`, `CaptureWithPdf.tsx`, route `pwa/src/app/(app)/capture/page.tsx`)
2. API Client & Contracts (`pwa/src/lib/api/recipes.ts`, `specs/openapi.yaml` endpoint `POST /api/recipes/capture-url`)
3. API Controller & Service (`api/src/RecipeApi/Controllers/RecipeController.cs`, `api/src/RecipeApi/Services/RecipeService.cs`)
4. Workflow Orchestration (`api/src/RecipeApi/Services/WorkflowOrchestrator.cs`, `api/src/RecipeApi/Workflows/url-import.yaml`)
5. Workflow Processors & Agents (`WebAcquisitionAgent.cs`, `RecipeAgent.cs`, `RecipeReadyProcessor.cs`)
6. Real-time Notifications & Client State (`RecipeReadyProcessor.cs` -> SSE -> `libraryStore.ts` / `useCaptureStore.ts` -> `MinimalCapture.tsx`)

## Goals / Non-Goals

**Goals:**
- Faithfully document implemented and observable behavior across all tiers of web URL capture.
- Ground all requirements in verified executable code, contract declarations, and automated test assertions.
- Isolate discrepancies between contracts, tests, and runtime reality (e.g. U01, U02, U07, U12) without masking them.
- Support strict OpenSpec baseline extraction without altering project code.

**Non-Goals:**
- Exclude photo capture, OCR, manual authoring, and PDF recipe import.
- Exclude hero image re-generation, AI chat assistants, or dietary customization.
- No code refactoring, schema alterations, or bug fixes during extraction.

## Decisions

### 1. Architectural Boundary of URL Capture
- **Decision**: Define `recipe-capture` as a distinct capability rather than folding it into `recipe-library`.
- **Rationale**: `recipe-library` owns browsing, reading, editing, and managing existing stored recipes. `recipe-capture` owns the intake boundary, input validation, external acquisition, multi-step asynchronous workflow execution, and readiness status transition.
- **Alternatives Considered**: Merging into `recipe-library` would overload library specifications with web scraping, HTTP client concerns, and workflow orchestrator semantics.

### 2. Separation of Initial Entity Creation from Readiness Finalization
- **Decision**: Model the two distinct lifecycle states of a recipe entity:
  1. *Pending creation*: Synchronously committed on `POST /api/recipes/capture-url` with `IsReady = false`, placeholder name `"Captured Recipe"`, and zero images.
  2. *Readiness finalization*: Asynchronously updated by `RecipeReadyProcessor` upon workflow completion with `IsReady = true`, `IsDiscoverable = true`, and real-time SSE broadcast.
- **Rationale**: Reflects exact implementation in `RecipeService.cs` (lines 524–575) and `RecipeReadyProcessor.cs` (lines 50–63).

### 3. Client State and Asynchronous Tracking Architecture
- **Decision**: Capture the dual path for task completion in `MinimalCapture.tsx`:
  1. *Queued state*: If the background workflow is still running, render queued subtext and a 10-second timer auto-redirecting to `/home`.
  2. *Inline ready transition*: If `recipe_ready` SSE event arrives while on screen, cancel countdown and render inline completion UI ("{Name} is ready!").
- **Rationale**: Grounded in `MinimalCapture.tsx` (lines 170–187, 305–320, 678–757, 760–824) and `MinimalCapture.test.tsx`.

## Risks / Trade-offs

- [Risk] U01: Contextual URL repair in `RecipeImportReportService` omits required workflow parameter `url` when triggering `url-import.yaml`.
  → Mitigation: Bounded to initial web capture only; repair re-import paths are excluded from normative claims and documented non-normatively.
- [Risk] U02: Navigation doctrine was removed; capture includes a queued screen/timer.
  → Mitigation: Base specs directly on current `MinimalCapture.tsx` timer and SSE listener implementation, not on historical navigation doctrine.
- [Risk] U07: External site scraping may return 403 Forbidden or encounter network rate limits.
  → Mitigation: Reflect `WebAcquisitionAgent` fallback behavior (title fallback to URL host, logging warning, non-fatal extraction continuation).
- [Risk] U12: Disconnected failure boundaries between DB, filesystem, and workflow enqueue.
  → Mitigation: Withhold transactional consistency guarantees; document observed error logging and partial state handling without inventing rollbacks.
