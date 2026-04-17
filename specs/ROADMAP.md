# What's For Supper — Implementation Roadmap

Each phase ships a working, useful product. Later phases build on earlier ones without breaking them.

## Phase 0 — MVP: Recipe Capture End-to-End [COMPLETE]

**Goal**: A family can add recipes and view them. No AI, no Redis.

- **Status**: Backend ready. PWA Phase 0 implementation in progress.

---

## Phase 1 — Import & Branding Alignment [ACTIVE]

**Goal**: Evolve the brand identity and establish the AI processing pipeline.

### Additions
- **Designer Agent Identity**: Established (Mère-Designer persona).
- **Solar Earth Branding**: Implementation of warm, family-centric UI tokens and layout.
- **The Smart Pivot (Planning)**: Design of the express discovery hub on the Home screen.
- **Redis & Import Worker**: Processing pipeline (Ollama/Gemma integration).

---

## Phase 2 — Family: The Family Pulse

**Goal**: Every action is attributed to a family member. Family engagement becomes a "team sport."

### Additions
- **The Family Pulse**: Collaborative activity feed on the Home screen.
- **Recipe Approvals**: Ability to quickly approve/veto new captures from other members.
- **PWA Settings**: Add/remove family members.
- `X-Family-Member-Id` enforcement.

### Definition of Done
- New captures by "Dad" appear in "Mom's" Pulse feed.
- "Mom" can approve a capture for the weekly plan with 1 tap.

---

### Phase 3 — Discovery: The Smart Pivot

**Goal**: Family discovers and votes on recipes via the "Express" high-utility hub.

### Additions
- **The Smart Pivot**: Card-swiping discovery module integrated directly into the Home/Command Center for 30-second "Express" planning.
- **Swipe Discovery (Full)**: Full-screen card-based collaborative voting.
- **SearchRecipesAgent**: Natural language search via Ollama + pgvector.

### Implementation Checklist
- [ ] **Smart Pivot Card**: Compact `ExpressCard.tsx` (~300px) with Framer Motion flick gestures.
- [ ] **Home Integration**: Conditional display on `home/page.tsx` when `isPlannedForTonight` is false.
- [ ] **Swipe Logic**: Right-swipe triggers immediate planning (`TODAY`) and UI swap (<300ms).

### Definition of Done
- Home screen shows a horizontal carousel of "Express Suggestions."
- Swiping right on a suggesion adds it to tonight's (or a future) slot instantly.

---

## Phase 4 — Planner: The Kitchen & Cook's Mode

**Goal**: Family has a shared meal plan synced with real calendars, and a high-utility cooking experience.

### Additions
- **Cook's Mode**: High-visibility, hands-free UI for step-by-step cooking at the stove. Large typography, "no-sleep" mode.
- **PWA Planner screen**: Weekly list with Google/Outlook calendar sync.
- **Calendar Sync Worker**: 5-minute polling.

### Definition of Done
- "Start Cooking" button on a planned meal opens Cook's Mode.
- Cook's Mode is easily readable from 3 feet away.
- Mobile calendar events sync to the PWA planner.

---

## Phase 5 — Agents: Intelligent Meal Planning & Efficient Groceries

**Goal**: AI suggests meals and generates shopping lists optimized for the store shelf.

### Additions
- **The Efficient Grocer**: Automated shopping list generation from the weekly plan, **categorized by store sections** (Produce, Meat, Dairy, etc.) to minimize shop time.
- **SuggestMealsAgent**: Weekly suggestions based on preferences.
- **CoordinateFamilyAgent**: Core logic for list aggregation.
- **Shared Identity Personalization (Low Priority)**: Subtle UI color shifts per active member.

---

## Phase 6 — Polish & Resilience

**Goal**: Offline-first visuals and final aesthetics.

### Additions
- **Offline-First Visuals**: Premium "No-Connection" states.
- Performance optimizations and final polish.

---

## Spec Coverage

| Spec | Phase |
|---|---|
| [recipe-api.spec.md](recipe-api.spec.md) | 0 |
| [recipe-data.spec.md](recipe-data.spec.md) | 0+ |
| [frontend-pwa.spec.md](frontend-pwa.spec.md) | 0+ |
| [branding-alignment.spec.md](branding-alignment.spec.md) | 1 |
| [recipe-import.spec.md](recipe-import.spec.md) | 1 |
| [sharing-collaboration.spec.md](sharing-collaboration.spec.md) | 2 |
| [discovery-search.spec.md](discovery-search.spec.md) | 3 |
| [meal-planning.spec.md](meal-planning.spec.md) | 4 |
| [cooks-mode.spec.md](cooks-mode.spec.md) | 4 |
| [ai-agents.spec.md](ai-agents.spec.md) | 5 |

