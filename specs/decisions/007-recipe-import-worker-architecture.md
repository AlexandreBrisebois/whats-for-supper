# ADR 007: Recipe Import Worker Architecture & Stream Processing

## Status: Proposed

## Context
The Recipe Import Worker is the "engine" of the "What's For Supper" ecosystem, responsible for the two-pass AI pipeline that transforms raw uploads into structured recipes. Given the deployment environment (Home NAS), the worker must be extremely resource-efficient, reliable, and capable of handling long-running AI operations.

## Decision

### 1. Technology Stack: .NET 10 & Native AOT
To align with **ADR 006 (High-Efficiency Containerization)**, the Recipe Import Worker will be implemented as a .NET 10 Worker Service using **Native AOT (Ahead-of-Time)** compilation.
- **Rationale**: Minimizes RAM and storage footprint on the NAS. Native binaries start instantly and avoid JIT overhead, leaving more resources for the AI models (Gemma) and the database.
- **Base Image**: `mcr.microsoft.com/dotnet/nightly/runtime-deps:10.0-noble-chiseled`.

### 2. Stream Processing: Redis Streams with Consumer Groups
We will use **Redis Streams** as the messaging backbone for recipe imports.
- **Implementation**: The worker will use `StackExchange.Redis` to consume from the `recipe:import:queue` stream.
- **Consumer Groups**: Operations will be performed within a consumer group (e.g., `import-worker-group`).
- **Reliability**: 
    - Use `XREADGROUP` to receive messages.
    - Explicitly `XACK` (acknowledge) messages only after successful completion of both Pass 1 and Pass 2.
    - Implement a retry mechanism for failed messages (Pending entries).
    - Unresolved failures will be moved to a Dead Letter Stream (`recipe:import:error`).

### 3. Two-Pass AI Execution
- **Pass 1 (Local Gemma)**: Communicates with the local Ollama/Gemma service via a standard HTTP client. Extracts OCR and Schema.org JSON.
- **Pass 2 (Cloud Gemini)**: Utilizes the Google AI SDK to communicate with the Gemini Image Pro 3.1 model for hero image generation.
- **Binary Handling**: The worker will read images directly from the mounted NAS volume and perform Base64 encoding JIT (Just-In-Time) for the Gemini payload to conserve memory.

### 4. Persistence and Metadata Updates
- **Filesystem**: Saves `recipe.json` and `hero.jpg` to the mounted volume (`/recipes/{recipeId}`).
- **Database**: Uses `Npgsql` to update the PostgreSQL `recipes` table, specifically updating the `raw_metadata` (JSONB) and `ingredients` (JSONB) columns.

## Rationale
- **Efficiency**: .NET 10 Native AOT provides the lowest possible overhead for a compiled language on Linux.
- **Reliability**: Redis Consumer Groups ensure that messages are not lost if the container crashes during an AI operation.
- **Consistency**: Aligns with the Recipe API's architecture, allowing for shared logic/models if needed.

## Consequences
- **Build Complexity**: Requires a multi-stage Docker build targeting the Synology DS723+ architecture (**linux-x64**).
- **Tooling**: Requires the `dotnet-sdk:10.0` for building and `clang` / `zlib1g-dev` for Native AOT compilation.
- **Flexibility**: While Python is more common in AI, .NET 10's modern AI libraries and Native AOT performance make it a superior choice for resource-constrained home servers.

## Participants
- **Architect Alex** (Infrastructure Lead)
- **Gopher Greg** (The Resource Optimizer)
- **Antigravity** (AI Coding Assistant)
