# SKILL: Contract-First API Workflow

**Description:** This skill defines the mandatory workflow for modifying, discovering, or extending the What's For Supper API. It enforces a "Contract-First" approach to guarantee 100% parity between the frontend, mock backend, and C# backend, while dramatically reducing token consumption by relying on machine-readable specs and automated tooling instead of manual code inspection.

## ⚠️ Core Directive
**NEVER** modify API controllers (`api/src/.../Controllers/*.cs`), frontend API clients (`pwa/src/lib/api/*.ts`), or the mock API (`pwa/mock-api.js`) to add or change an endpoint **without first updating the OpenAPI specification.**

## The Source of Truth
The definitive source of truth for all API interactions is:
👉 `specs/openapi.yaml`

This file is a "Hard Spec". If an endpoint is not in this file, it does not exist for the PWA.

## Workflow: Modifying the API

When asked to add a new endpoint, change a payload, or update a route, follow this exact sequence:

### Step 1: Update the Contract (OpenAPI)
1. Open `specs/openapi.yaml`.
2. Define the new path, HTTP method, request payload, and response payload.
3. Ensure all schema properties are explicitly typed and marked as `required` where appropriate to ensure strict TypeScript generation.

### Step 2: Sync Frontend Types
Run the following command to automatically generate the TypeScript interfaces:
```bash
task types:sync
```
*Token-Saving Note: You do NOT need to write TypeScript interfaces manually. `openapi-typescript` handles this instantly.*

### Step 3: Implement the Mock
Update `pwa/mock-api.js` to implement the new route so the frontend can be developed and E2E tested immediately.

### Step 4: Implement the Backend
Update the C# Controllers and DTOs in `api/src/RecipeApi` to match the exact paths and schemas defined in the YAML.

### Step 5: Verify Parity (The Reconciliation Engine)
Run the reconciliation script to mechanically verify that the Spec, Mock, and Real API are in perfect alignment.
```bash
task agent:reconcile
```
**CRITICAL**: Do not consider the task complete until this script reports "Perfect Parity".

## Why this saves tokens
Instead of opening `mock-api.js` (400+ lines) and multiple C# controllers (1000+ lines) to "figure out" what the API looks like or verify your work, you use `task agent:reconcile`. The script acts as your "eyes" on the disk, returning a compact, high-signal table of deltas. You only spend tokens reading the differences, not the entire source tree.
