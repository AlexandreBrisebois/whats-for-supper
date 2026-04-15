# Testing Specification

This document defines the testing strategy for "What's For Supper" across all services.

## 1. Philosophy

- Test behavior, not implementation.
- Prefer integration tests over unit tests for data-layer code.
- UI tests cover the golden path; edge cases are covered by API-level tests.
- No mocking of the database (learned from past incidents where mocked tests passed but production migrations failed).

## 2. Test Layers

### 2.1 Recipe API (.NET 10)

| Type | Tool | Scope |
|---|---|---|
| Unit | xUnit | Validation logic, ID generation, rating mapping |
| Integration | xUnit + Testcontainers | Full API request → filesystem write → Redis publish |
| Contract | Manual / OpenAPI diff | Ensure API responses match spec |

Key test cases:
- `POST /api/recipes` with valid multipart → 200, `recipeId` returned, files on disk, Redis message published.
- `POST /api/recipes` with no images → 400.
- `POST /api/recipes` with invalid rating → 400.
- `GET /recipe/{recipeId}/original/0` → 200, correct Content-Type.
- `GET /recipe/{id}/original/99` (missing) → 404.
- `POST /api/family` with duplicate name → 400.
- Redis unavailable → `POST /api/recipes` fails with 503.

### 2.2 Import Worker (.NET 10)

| Type | Tool | Scope |
|---|---|---|
| Unit | xUnit | Base64 encoding, hero selection fallback, retry logic |
| Integration | xUnit + Testcontainers | Redis consume → Ollama mock → Gemini mock → file output |

Key test cases:
- Message consumed, Pass 1 called, `recipe.json` written.
- Pass 1 fails 3 times → message moved to dead-letter stream.
- No images in `originals/` → job moved to dead-letter stream.
- No hero flag from Gemma → defaults to first image for Pass 2.
- Pass 2 called with base64 image → `hero.jpg` written.

### 2.3 PWA (Next.js)

| Type | Tool | Scope |
|---|---|---|
| Unit | Vitest | Utility functions (identity cookie, API wrappers, store logic) |
| Component | React Testing Library | Individual component rendering and interaction |
| E2E | Playwright | Golden path flows across all phases |

Key E2E flows:
- First launch: "Who are you?" overlay shown, profile selected, cookie set.
- Recipe capture: Camera opened, photo taken, rating selected, recipe submitted.
- Planner: Meal added to slot, appears in weekly list.
- Discovery: Card stack loads, swipe right adds to inspiration pool.

### 2.4 Database Migrations

- Migrations are tested against a real PostgreSQL instance (Testcontainers).
- Each migration is tested forward (apply) and verified that the schema matches expectations.
- No rollback testing required in Phase 0–2 (forward-only migrations).

## 3. Test Environments

| Environment | Purpose | Database |
|---|---|---|
| Local | Developer testing | Docker Compose (`docker-compose.override.yml`) |
| CI | Automated on PR | Testcontainers (ephemeral) |
| NAS (Production) | Live environment | Persistent Docker volume |

## 4. CI Pipeline (GitHub Actions)

```
on: [push, pull_request]
jobs:
  api-tests:     dotnet test (xUnit + Testcontainers)
  worker-tests:  dotnet test (xUnit + Testcontainers)
  pwa-tests:     vitest + playwright
```

## 5. What We Do Not Test

- Ollama/Gemma model output quality (not deterministic).
- Gemini image enhancement quality (visual, not automated).
- Calendar sync correctness against live Google/Outlook APIs (mocked in CI).
