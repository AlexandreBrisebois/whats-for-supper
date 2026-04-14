# ADR 004: Recipe Import Strategy and AI Pipeline

## Status
Accepted

## Context
The "What's For Supper" system requires an automated way to transform raw images uploaded by users into structured, high-quality recipe records. This process must balance the need for data privacy (keeping recipe text local) with the requirement for high-end visual aesthetics (professional-grade hero thumbnails). The solution must also be resilient and scale within a Docker-based NAS environment.

## Decisions

### 1. Two-Pass AI Pipeline
We will implement a hybrid processing pipeline that separates text extraction from visual optimization.
- **Pass 1 (Local)**: Text extraction and structural analysis.
- **Pass 2 (Cloud)**: Visual refinement and hero generation.
- **Rationale**: This division allows us to keep sensitive OCR data on-premises while leveraging powerful cloud models for complex image processing that would be too heavy for NAS hardware.

### 2. Local Text Extraction with Gemma 4:e4b
We will use Gemma 4:e4b running locally (via Ollama) for OCR and structural data extraction.
- **Rationale**: Ensures that recipe content remains private and avoids the cost/latency of sending full page text to external APIs. Gemma 4:e4b provides a good balance of performance and footprint for NAS environments.

### 3. Cloud-Enhanced Visuals with Gemini Image Pro 3.1
The final hero thumbnail generation will be handled by Gemini Image Pro 3.1.
- **Rationale**: Achieving the "What's For Supper" aesthetic requires sophisticated image understanding and transformation that modern local models cannot yet match. Specifically, identifying the "ready to serve" image and enhancing it requires the high-fidelity perception of Gemini.

### 4. Schema.org/Recipe Standardization
All extracted recipe data will be persisted as `recipe.json` using the [Schema.org/Recipe](https://schema.org/Recipe) JSON-LD format.
- **Rationale**: Using a global standard ensures interoperability with other recipe tools, facilitates SEO if ever exposed, and provides a well-defined structure for the PWA frontend.

### 5. Automated Hero Identification
The pipeline will automatically identify the most appropriate "hero" image from a collection of raw photos.
- **Logic**: Pass 1 identifies the "cooked" state; Pass 2 refines it. If no clear hero is found, the system defaults to the first image.
- **Rationale**: Minimizes user effort by eliminating the need to manually flag a thumbnail during the quick upload process.

### 6. Redis-Based Event Consumption
The worker will operate as a consumer of Redis Streams (`recipe:import:queue`).
- **Rationale**: Provides a reliable, persistent queue that supports retries and dead-lettering, ensuring that recipe imports are processed even if the worker or NAS restarts.

### 7. Just-In-Time (JIT) Base64 Encoding
The worker will perform Base64 encoding of image binaries only when required for the Gemini API payload.
- **Rationale**: Avoids bloating the system's internal data structures with Base64 overhead, keeping the memory footprint low during local processing.

## Consequences

- **Positive**: High data privacy for recipe text; superior visual quality for the PWA UI; follows industry standards for data modeling.
- **Neutral**: Requires an active internet connection and API keys for the Gemini (Pass 2) step.
- **Negative**: Increased architectural complexity by managing two distinct AI integrations (Ollama and Google GenAI).

## Participants
- **Architect Alex** (Infrastructure Lead)
- **David** (Product/UX Engineer)
