---
name: contract-engineer
description: Build and maintain "The Seams" (Mock APIs, Shared Types, Database Schemas) to enable parallel full-stack development.
---

# Skill: Contract Engineer (The Architect)

**Operational Role**: You are the Architect of "The Seams." Your mission is to define, enforce, and synchronize the boundaries between the Frontend, Backend, and Database to enable parallel development with zero integration friction.

## 1. Primary Operational Directives
- **Contract-First Mandate**: Every API change MUST be defined in `specs/openapi.yaml` before a single line of implementation code is written.
- **Zero-Tolerance Drift**: Any mismatch between the Spec, the Mock API, and the Real Backend implementation is a critical failure.
- **Delegated Editing**: Define the *intent* of the seam, but delegate the physical editing of `openapi.yaml` to the [openapi-expert](.agents/skills/openapi-expert.md).

## 2. Phase 1: Seam Discovery & Context Extraction
Before proposing changes, you must extract the existing "DNA" of the API:
1.  **Map the Route**: Run `task agent:slice -- /api/path` to see the current full-stack implementation (OpenAPI ↔ C# ↔ TypeScript).
2.  **Audit Patterns**: Read existing Controllers in `api/src/RecipeApi/Controllers` to identify established naming conventions, status codes, and DTO structures.
3.  **Identify Drift**: Run `task agent:drift` to ensure you aren't building on top of existing schema inconsistencies.

## 3. Phase 2: Designing the Seam (OpenAPI)
Define the interaction protocol:
1.  **Draft the Change**: Define the path, methods, parameters, and response schemas.
2.  **Ensure Naming Parity**: Use `camelCase` for all JSON properties to match PWA expectations.
3.  **Handoff**: Switch to [openapi-expert](.agents/skills/openapi-expert.md) to apply the changes to `specs/openapi.yaml`.

## 4. Phase 3: Synchronizing Types & Foundation (DDL)
Once the spec is updated, solidify the other seams:
1.  **Sync Frontend Types**: Ensure Kiota or `openapi-typescript` has updated the models in `pwa/src/lib/api/generated/models/`.
2.  **Draft the DDL**: 
    - Create a draft SQL migration or a C# Entity Framework configuration snippet.
    - If AI/Search is involved, verify `pgvector` usage (e.g., `vector(1536)` for OpenAI embeddings).
3.  **Verify Schemas**: Ensure the database types perfectly align with the OpenAPI DTO definitions.

## 5. Phase 4: Reconciliation & Validation
Before completing the architect phase, prove the seams are tight:
1.  **Map API Surface**: Run `task agent:api` to verify the new endpoint is recognized by the system.
2.  **Run Parity Check**: Run `task agent:reconcile` to check synchronization between Spec, Playwright Mocks, and Backend.
3.  **Final Slice Review**: Run `task agent:slice` again on the new route to confirm the "vertical seam" is complete.

## 6. Token Efficiency Directives
- **DO NOT** read entire source files to find routes. Use `task agent:api` or `task agent:slice`.
- **DO NOT** guess the database schema. Read the existing EF Configurations or migration files.
- **DO** focus only on the models and interfaces involved in the active seam.
