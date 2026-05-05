# What's For Supper 🍲

### Premium Agentic Meal Planning OS for Families

What's For Supper (WFS) is a high-performance, mobile-first ecosystem designed to solve the "what's for dinner?" problem. It combines **AI-powered recipe synthesis**, **collaborative family voting**, and a **premium Cook's Mode** into a single, reliable experience.

Built with an **Agent-First** philosophy, this repository is designed to be maintained by human-AI pair programmers using a rigorous **Contract-First** doctrine.

---

## 🏗️ Architecture

WFS runs as a unified ecosystem behind a **Traefik** reverse proxy, ensuring seamless routing and same-origin authentication.

```mermaid
graph TD
    User([Browser / Mobile]) --> Traefik[Traefik Proxy :80/443]

    subgraph "Application Layer"
        Traefik --> PWA[PWA - Next.js 16]
        Traefik --> API[API - .NET 10]
    end

    subgraph "Data Layer"
        API --> DB[(PostgreSQL 17)]
        API --> Storage[Local / S3 Storage]
    end

    subgraph "Agentic OS"
        API --> Gemini[Gemini 3]
        API --> Workflow[Workflow Orchestrator]
    end

    PWA -- SSE + cookies --> API
```

| Service | Technology | Role |
|---------|------------|------|
| **PWA** | Next.js 16 (App Router), TypeScript, Tailwind 4 | Mobile-first frontend with real-time SSE sync. |
| **API** | ASP.NET Core 10, C# 13, EF Core | High-performance backend with Agentic Workflows. |
| **DB** | PostgreSQL 17 (Alpine) | Structured data and recipe metadata. |
| **Proxy** | Traefik | Unified routing (`/api` → API, `/*` → PWA). |

---

## 📡 Real-Time Architecture (SSE)

WFS uses **Server-Sent Events** to push schedule changes, votes, and recipe status to all connected family members instantly — no polling.

### `GET /api/stream`

The SSE endpoint is served directly by the .NET API. Traefik routes `/api/stream` with `X-Accel-Buffering: no` and `Cache-Control: no-cache` to prevent proxy buffering.

**Why direct-to-API via Traefik, not proxied through Next.js**: Next.js cannot stream long-lived SSE responses through its server layer without buffering. Traefik routes `/api/` directly to the .NET API, so the `EventSource` connects to the same origin with no intermediary.

### Authentication

`EventSource` cannot send custom headers. Auth uses cookies sent automatically with `{ withCredentials: true }`:

- `x-family-member-id` — identifies the family member (set during onboarding)
- `h_access` — HMAC-signed session cookie (issued by the Hearth auth flow)

The `StreamController` reads `x-family-member-id` from `Request.Cookies`, not `Request.Headers`. Missing cookie → `400`.

### Event Types

| Event | Payload | Trigger |
|-------|---------|---------|
| `connected` | Full 7-day schedule snapshot | On connect / reconnect |
| `slot_updated` | `{ date, recipe, status }` | Recipe assigned, removed, or validated |
| `week_updated` | Full schedule snapshot | Week locked, voting opened, recipe moved |
| `vote_updated` | `{ recipeId, voteCount }` | Family member votes on a recipe |
| `smart_defaults_updated` | `SmartDefaultsDto` | Vote threshold crossed |
| `fill_the_gap_invalidated` | `{ weekOffset }` | A slot was filled by another family member |
| `recipe_ready` | `{ recipeId, name, imageUrl? }` | AI synthesis complete |
| `recipe_failed` | `{ recipeId, errorMessage, failedStep, partialData? }` | Workflow exhausted all retries |
| `grocery_updated` | Grocery list delta | Grocery list changed |

The `EventSource` reconnects automatically on drop. Every reconnect receives a fresh `connected` snapshot, so the client is always consistent.

---

## 🤖 Agentic OS & Development Doctrine

This repository is optimized for **Agentic Development**. We treat **OpenAPI as Law** and enforce zero-drift between contracts and implementation.

### The Agentic Skills
WFS includes a suite of specialized agent skills under [`.agents/skills/`](.agents/skills/):
- **`contract-engineer`**: Maintains the OpenAPI source of truth.
- **`workflow-author`**: Builds YAML-defined AI orchestration logic.
- **`prompt-planner`**: Decomposes complex features into vertical slices.
- **`drift-audit`**: Automatically detects schema divergence.

### 📜 Core Principles
1. **Contract-First**: If it's not in `specs/openapi.yaml`, it doesn't exist.
2. **Test-First**: Logic must be preceded by contract or unit tests.
3. **Zero Drift**: Continuous validation of DTOs, mocks, and clients.

> [!TIP]
> **AI Agents**: Start with [**AGENT.md**](AGENT.md) to understand the constitution of this repository.

---

## 👨‍💻 Human Developer Experience

WFS is built for humans who value high-integrity code and fast feedback loops.

### Quick Start
```bash
git clone https://github.com/AlexandreBrisebois/whats-for-supper.git
cd whats-for-supper
task init  # Initializes environment, dependencies, and starts services
```

### Essential Commands
| Command | Description |
|---------|-------------|
| `task up` | Start the ecosystem (PWA: `:3000`, API: `:3000/api`) |
| `task gate` | ⚡ Fast check: lint, types, unit tests, and impact-aware tests. |
| `task review` | 🔒 Pre-commit gate: full validation (contracts + all tests). |
| `task logs:api` | Stream backend logs. |
| `task dev:db:sync` | Refresh and re-seed the database. |

For a deep dive into the local development loop, see [**LOCAL_DEV_LOOP.md**](LOCAL_DEV_LOOP.md).

### Development Setup Note — `NEXT_PUBLIC_API_BASE_URL`

In **deployed environments** (Docker + Traefik), `NEXT_PUBLIC_API_BASE_URL` is intentionally **empty**. Traefik routes `/api/` directly to the .NET API, so the PWA connects to `/api/stream` as a relative path — this is the normal production case.

In **local dev**, if you want the PWA to connect to a direct API port (e.g. `http://localhost:5000`), set:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
```

The `useScheduleStream` hook uses `${NEXT_PUBLIC_API_BASE_URL}/api/stream` when the var is set, and `/api/stream` when it is absent. **Do not treat an unset env var as an error** — it is the correct production configuration.

---

## 🔐 Hearth Security Model

WFS uses the **Hearth Security Model** — a family-safe, no-password authentication system.

- **The Secret**: Families share a single `HEARTH_SECRET` passphrase.
- **Access**: Users join via **Magic Links**. Validating the secret issues a signed, secure `h_access` cookie.
- **Context**: The **Member Context Gate** ensures every request is tied to a specific family profile.

---

## 🚀 Status & Roadmap

| Feature | Status |
|---------|--------|
| **Core Architecture** | ✅ Complete (Next.js 16 + .NET 10 + Traefik) |
| **Contract Integration** | ✅ Complete (Kiota + OpenAPI 3.1) |
| **Hearth Auth** | ✅ Complete (Server Actions + HMAC) |
| **Weekly Planner** | ✅ Complete (Drag-and-Drop + Voting) |
| **Real-Time SSE Sync** | ✅ Complete (family-wide push, no polling) |
| **Agentic Workflows** | 🔄 Active (Diet Agent & AI Inference) |
| **NAS Deployment** | 🔄 Active (Synology/Unraid optimized) |

---

## 📜 License
MIT — see [**LICENSE**](LICENSE). Built with ❤️ for families everywhere.
