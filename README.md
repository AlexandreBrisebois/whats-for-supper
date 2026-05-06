<p align="center">
  <img src="docs/banner.png" alt="What's For Supper?" width="600" />
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-CD5D45?style=flat-square" alt="MIT License" /></a>
  <img src="https://img.shields.io/badge/.NET-10-512BD4?style=flat-square&logo=dotnet" alt=".NET 10" />
  <img src="https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/PostgreSQL-17-336791?style=flat-square&logo=postgresql" alt="PostgreSQL 17" />
  <img src="https://img.shields.io/badge/AI-Gemini_Flash-4285F4?style=flat-square&logo=google" alt="Gemini Flash" />
</p>

---

## Why this exists

*"What's for supper?"* gets asked every single evening. Without a system, the answer is always improvised, often repeated, and occasionally pizza again.

This project started as a real solution for a real household. The goal was not to build another recipe app — it was to turn that daily question from a source of stress into something the whole family participates in. Swipe through recipes like a team. Match on the ones everyone actually wants. Cook with confidence. The app handles the planning, the negotiation, the grocery logistics, and the step-by-step cooking guidance so the humans can focus on the meal.

The technical ambition grew alongside the product one. WFS became a testbed for **contract-first, agent-assisted development** — a codebase built from the start to be navigated and extended by human-AI pairs, using rigorous OpenAPI contracts, deterministic test gates, and agentic workflow orchestration. It runs in production today on a home NAS, and the code that runs on that NAS is the same code in this repository.

---

## What it does

**What's For Supper** is a self-hosted, family-scale meal planning PWA. Install it once on a home server and every member of the household gets a shared, real-time view of the week's meals — on any device, with no accounts, no cloud subscriptions, and no friction.

### The five pillars

**1. Command Center (Home)**
The home screen answers the question in two seconds. Tonight's recipe is front and centre with a one-tap path into Cook's Mode — a hands-free, step-by-step guide designed to be read from across the kitchen.

**2. Weekly Planner**
Plan the full week, drag to reorder, and mark nights as cooked. The grocery list builds itself from the week's recipes and groups items by store aisle. Two people can shop the same list at the same time and see each other's checkmarks update in real time.

**3. Balance Indicator**
Every recipe in the library is classified once against Canada's 2019 Food Guide using an AI call that happens in the background and is cached permanently. The planner shows a live balance indicator — no AI required at planning time, just deterministic scoring. When protein coverage is met, the Discovery stack silently shifts to surface more vegetable-forward recipes.

**4. Matchmaking Discovery**
A swipe-based card stack for family voting. When enough household members vote for the same recipe, it surfaces as a suggestion in the planner. No group chats, no debates — the app builds consensus in the background.

**5. Zero-Friction Capture**
Add recipes from a photo, a URL, or a description. Everything queues into an AI workflow pipeline (Gemini Flash) that extracts ingredients, synthesises a recipe, generates a hero image, categorises ingredients into grocery sections, and classifies the dietary profile — all without blocking the UI.

---

## Architecture

WFS runs as a unified stack behind a **Traefik** reverse proxy. In production, a single domain serves both the PWA and the API — the browser connects to one origin and Traefik routes `/api/*` directly to the .NET container.

```mermaid
graph TD
    User([Browser / Mobile]) --> Traefik[Traefik :80/443]

    subgraph "Application Layer"
        Traefik --> PWA[PWA — Next.js 16]
        Traefik --> API[API — .NET 10]
    end

    subgraph "Data Layer"
        API --> DB[(PostgreSQL 17)]
        API --> Storage[Local Storage / NAS mount]
    end

    subgraph "AI & Workflows"
        API --> Gemini[Gemini Flash]
        API --> Workflow[Workflow Orchestrator]
    end

    PWA -- SSE + cookies --> API
```

| Service | Technology | Role |
|---------|------------|------|
| **PWA** | Next.js 16 (App Router), TypeScript | Mobile-first frontend with real-time SSE sync |
| **API** | ASP.NET Core 10, C# 13, EF Core | Backend with agentic workflow orchestration |
| **DB** | PostgreSQL 17 | Structured data, JSONB recipe profiles |
| **Proxy** | Traefik | Unified routing, SSE header management |
| **AI** | Gemini Flash | Recipe extraction, synthesis, dietary classification |

### Real-time sync

Every planning action — assigning a recipe, checking off a grocery item, casting a vote — is pushed instantly to all connected devices over **Server-Sent Events**. No polling. No refresh. The family sees the same state.

For full event documentation, see [`docs/flows/data-flows/week-lifecycle.md`](docs/flows/data-flows/week-lifecycle.md).

### Security model (Hearth)

No accounts. Families share a single `HEARTH_SECRET` passphrase. Joining the app issues a signed `h_access` cookie. Every request is tied to a specific family member via `x-family-member-id`.

---

## Deployment

WFS runs in Docker. The production configuration targets a home NAS (Synology, Unraid, or any Docker-capable host) with optional Cloudflare Tunnel for remote access.

See **[DEPLOY.md](DEPLOY.md)** for the full deployment guide: Docker Compose setup, environment variables, Traefik configuration, and Cloudflare Tunnel integration.

**Minimum requirements:**
- Docker with Compose V2
- 2 GB RAM (API + DB + PWA)
- Local storage for recipe images (mapped via `DATA_ROOT`)
- A Google Gemini API key (free tier covers typical household usage)

---

## Development

WFS is built for humans who value high-integrity code and fast feedback loops. The repository is also optimised for **human-AI pair programming** using the agent doctrine in [`AGENT.md`](AGENT.md).

```bash
git clone https://github.com/AlexandreBrisebois/whats-for-supper.git
cd whats-for-supper
task init
```

### Essential commands

| Command | What it does |
|---------|--------------|
| `task up` | Start the full stack (PWA `:3000`, API `:9001`) |
| `task gate` | Fast check: lint, types, unit tests |
| `task review` | Full pre-commit gate: contracts + all tests |
| `task agent:drift` | Detect schema drift between OpenAPI spec and DTOs |
| `task logs:api` | Stream backend logs |
| `task dev:db:sync` | Refresh and re-seed the database |

For a full local dev walkthrough, see [`LOCAL_DEV_LOOP.md`](LOCAL_DEV_LOOP.md).

### Engineering doctrine

- **Contract-First** — `specs/openapi.yaml` is the source of truth. Nothing ships without a contract.
- **Test-First** — logic is preceded by tests, always.
- **Zero Drift** — continuous validation between OpenAPI spec, generated Kiota client, and backend DTOs.
- **Agent-First** — the repository includes a full suite of specialised agent skills under [`.agents/skills/`](.agents/skills/) for contract engineering, workflow authoring, drift detection, and more.

---

## Status

| Capability | Status |
|------------|--------|
| Core architecture (Next.js 16 + .NET 10 + Traefik) | ✅ Complete |
| Hearth auth (HMAC, no accounts) | ✅ Complete |
| Weekly planner with drag-and-drop | ✅ Complete |
| Real-time SSE sync (family-wide, no polling) | ✅ Complete |
| Cook's Mode (step-by-step, hands-free) | ✅ Complete |
| Recipe capture (photo, URL, description) | ✅ Complete |
| AI workflow orchestration (Gemini Flash) | ✅ Complete |
| Dietary classification (Canada's Food Guide) | ✅ Complete |
| Weekly balance indicator | ✅ Complete |
| Discovery nudge via SSE | ✅ Complete |
| Backup / restore (NAS-safe, LLM-skip on restore) | ✅ Complete |
| NAS deployment (Synology / Unraid) | ✅ Running in production |
| **Search** | ⚠️ TODO |
| **Recipes management** (edit, delete, set discoverable for voting and quick find) | ⚠️ TODO |
| **Dietician Agent** | ⚠️ TODO |

---

## Documentation

| Document | What it covers |
|----------|----------------|
| [`DEPLOY.md`](DEPLOY.md) | Docker, environment setup, Cloudflare Tunnel, NAS deployment |
| [`LOCAL_DEV_LOOP.md`](LOCAL_DEV_LOOP.md) | Full local development guide |
| [`AGENT.md`](AGENT.md) | Agent constitution — start here for AI-assisted contributions |
| [`docs/user-guide.md`](docs/user-guide.md) | User-facing feature guide |
| [`docs/flows/`](docs/flows/) | Data flows, user flows, and architecture diagrams |
| [`api/docs/DIETARY_CATEGORIZATION.md`](api/docs/DIETARY_CATEGORIZATION.md) | AI usage, CFG classification, FOP flags |

---

## License

MIT — see [LICENSE](LICENSE).
