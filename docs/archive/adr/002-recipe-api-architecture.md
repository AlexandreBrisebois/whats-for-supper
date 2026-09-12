# ADR 002: Recipe API Architecture and Integration Pattern

## Status
Accepted

## Context
The "What's For Supper" ecosystem needs a robust ingestion point for new recipes. This service must handle multi-image uploads, manage storage on resource-constrained NAS hardware, and coordinate with downstream processing workers (like the Recipe Import Worker) without introducing tight coupling or blocking the user experience.

## Decisions

### 1. File System-First Artifact Storage
We will store recipe images and metadata directly on the host filesystem (via the `RECIPES_ROOT` volume mount). 
- **Rationale**: Keeps binary artifacts out of the relational database, simplifies backups, and ensures that the "originals" are always accessible as raw files on the NAS, even if the application stack is offline.
- **Structure**: A nested directory structure `{RECIPES_ROOT}/{recipeId}/original/` will be used to ensure organized and predictable access.

### 2. Sidecar Metadata (recipe.info)
Metadata associated with the ingestion (rating, image count, hero image selection) will be stored in a `recipe.info` sidecar file within the recipe's directory.
- **Rationale**: Bundles the "instructions" for the import worker directly with the source files, making the directory a self-contained unit of work.

### 3. Redis-Driven Event Orchestration
The API will perform "fire-and-forget" notifications to a Redis Stream (`recipe:import:queue`) upon successful file write.
- **Rationale**: Decouples the API from the heavy lifting performed by the Import Worker. This allows the API to remain responsive while the worker handles OCR, image optimization, or AI analysis asynchronously.

### 4. Standard Binary Delivery
The API will serve original recipe images as raw binary streams (`image/jpeg`, `image/png`) with appropriate MIME-type headers.
- **Rationale**: This is the most efficient way to deliver large media files. It allows the browser to handle rendering, supports native hardware acceleration, and enables standard HTTP caching, significantly improving the responsiveness of the PWA.

### 5. GUID-based Identity Generation
Every upload will be assigned a system-generated GUID (`recipeId`).
- **Rationale**: Guarantees uniqueness across all household members' uploads and avoids predictable ID sequence attacks or collisions in the shared storage directory.

### 6. Discrete Qualitative Rating Scale
The system will use a 4-point scale (0-3) mapped to `Unknown`, `Dislike`, `Like`, and `Love`.
- **Rationale**: Provides a simple, gamified way for family members to express preference without the complexity of a 5-star or decimal-based system.

### 7. Just-In-Time (JIT) Encoding for Cloud AI
The API will NOT perform Base64 encoding. Instead, the downstream worker will perform Base64 encoding only when necessary for external API calls (e.g., Google GenAI).
- **Rationale**: Keeps the core ingestion pipeline lean and avoids the 33% overhead of Base64 everywhere. It delegates the format conversion to the "edge" of the system where the specific requirement exists.

## Consequences
- **Positive**: High ingestion performance; minimal network overhead; PWA performance gains through binary streaming and caching.
- **Neutral**: Requires Redis as a mandatory infrastructure dependency.
- **Negative**: Downstream workers must handle their own Base64 conversion if calling external cloud APIs that require it.

## Participants
- **Architect Alex** (Infrastructure Lead)
- **David** (Product/UX Engineer)
