---
name: contract-engineer
description: Build and maintain "The Seams" (Mock APIs, Shared Types, Database Schemas) to enable parallel full-stack development.
---

# Skill: Contract Engineer (The Architect)

Procedural guidance for defining the boundaries between workstreams to ensure they can be built independently and integrated seamlessly.

## 1. Objective
Ensure that the Frontend "Team" and Backend "Team" have a stable, agreed-upon interface BEFORE they start coding.

## 2. The Mock API (The Primary Seam)
In this repository, `pwa/mock-api.js` is the source of truth for the Frontend until the Backend is ready.
- **Rule**: Every new API endpoint or field MUST be added to the Mock API first.
- **Detail**: Ensure the Mock data includes edge cases (empty states, errors, large lists).

## 3. Shared Types (The Secondary Seam)
Define the TypeScript interfaces in the PWA that will eventually be mirrored by C# models.
- **Location**: Define types in `pwa/src/types/` (or relevant feature folder).
- **Consistency**: Ensure property names follow the `camelCase` convention used in the PWA, even if the C# models are `PascalCase` (the API wrapper handles the conversion).

## 4. Database DDL (The Foundation Seam)
Define the schema changes before the Backend implementation starts.
- **Action**: Create a draft SQL migration or a C# Entity Framework configuration snippet.
- **Audit**: Verify `pgvector` usage if the feature involves AI/Search.

## 5. Contract Verification
When reintegrating workstreams, use these tools to check for "Seam Drift":
- **`task map_api`**: Check if the real API routes match the expected contract.
- **Network Audit**: Compare a real API response with the Mock API response for schema mismatches.

## 6. Token Efficiency
When building contracts:
- **Don't** read every file. 
- **Do** read existing Controller patterns in `specs/02_BACKEND/backend-api.spec.md` to ensure the new contract follows established conventions.
