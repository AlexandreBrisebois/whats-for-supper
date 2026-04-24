# SKILL: Contract-First API Workflow

**Description:** This skill defines the mandatory workflow for modifying, discovering, or extending the What's For Supper API. It enforces a "Contract-First" approach to guarantee 100% parity between the frontend, mock backend, and C# backend, while dramatically reducing token consumption by relying on machine-readable specs and automated tooling instead of manual code inspection.

## ⚠️ Core Directive
**NEVER** modify API controllers (`api/src/.../Controllers/*.cs`), frontend API clients (`pwa/src/lib/api/*.ts`) to add or change an endpoint **without first updating the OpenAPI specification.**

## The Source of Truth
The definitive source of truth for all API interactions is:
👉 `specs/openapi.yaml`

This file is a "Hard Spec". If an endpoint is not in this file, it does not exist for the PWA.

## Workflow: Modifying the API

When asked to add a new endpoint, change a payload, or update a route, follow this exact sequence:
## The "Contract-First" Workflow (MANDATORY)

Whenever you add, modify, or remove an API endpoint, you MUST follow this exact sequence:

1. **Update the Contract (`specs/openapi.yaml`)**
   - This is the source of truth. Make your changes here first.
   - Ensure you define the request body, response body, and status codes.

2. **Sync Types (Automated)**
   - Run `cd pwa && npm run api:generate` to regenerate the Kiota TypeScript SDK.
   - Do NOT manually edit types or the Kiota generated client.
   - The PWA components now use the strictly-typed Kiota `apiClient`.

3. **Implement Mock (Automated)**
   - The mock API is automatically driven by Prism.
   - Run `cd pwa && npm run mock-api` to start the Prism server on port 5001.
   - You do NOT need to write any mock logic. Prism handles it via the OpenAPI contract.

4. **Implement Backend (`api/src/RecipeApi/...`)**
   - Update the C# Controllers and Services to match the contract.

5. **Reconcile (Safety Verification)**
   - Run `python scripts/agent/reconcile_api.py`.
   - This script verifies that the **C# Backend** perfectly matches the **OpenAPI Contract**.
   - Do not consider your API task complete until this script reports `Perfect Parity for core endpoints!`.

## Why this saves tokens
Instead of opening `mock-api.js` (400+ lines) and multiple C# controllers (1000+ lines) to "figure out" what the API looks like or verify your work, you use `task agent:reconcile`. The script acts as your "eyes" on the disk, returning a compact, high-signal table of deltas. You only spend tokens reading the differences, not the entire source tree.
