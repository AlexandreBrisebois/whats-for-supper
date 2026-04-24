---
name: contract-engineer
description: Build and maintain "The Seams" (Mock APIs, Shared Types, Database Schemas) to enable parallel full-stack development.
---

# Skill: Contract Engineer (The Architect)

Procedural guidance for defining the boundaries between workstreams to ensure they can be built independently and integrated seamlessly.

## 1. Objective
Ensure that the Frontend "Team" and Backend "Team" have a stable, agreed-upon interface BEFORE they start coding.

## 2. The OpenAPI Contract (The Primary Seam)
In this repository, `specs/openapi.yaml` is the source of truth.
- **Rule**: Every new API endpoint or field MUST be defined in the OpenAPI spec first.
- **Specialist**: For end-to-end API lifecycle (generation, mocking, wiring), use [SKILL_OPENAPI_SPECIALIST.md](SKILL_OPENAPI_SPECIALIST.md).

## 3. Shared Types (The Secondary Seam)
We use the OpenAPI spec to drive TypeScript types.
- **Automation**: Types are generated via Kiota. Use the types found in `pwa/src/lib/api/generated/models/`.
- **Consistency**: Ensure property names in the spec follow the expected JSON casing (typically `camelCase` for this project).

## 4. Database DDL (The Foundation Seam)
Define the schema changes before the Backend implementation starts.
- **Action**: Create a draft SQL migration or a C# Entity Framework configuration snippet.
- **Audit**: Verify `pgvector` usage if the feature involves AI/Search.

## 5. Contract Verification
When reintegrating workstreams, use these tools to check for "Seam Drift":
- **`task agent:reconcile`**: The primary tool for checking parity between Spec, Mock (Prism), and Real (C#) API.
- **`task agent:api`**: Map all real API endpoints to verify implementation coverage.

## 6. Token Efficiency
When building contracts:
- **Don't** read every file. 
- **Do** read existing Controller patterns in `api/src/RecipeApi/Controllers` to ensure the new contract follows established conventions.
