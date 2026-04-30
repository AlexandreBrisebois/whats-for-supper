# Feature Specs — `.kiro/specs/`

## 1. Overview

Each file under `.kiro/specs/` describes a single, bounded feature or change. A spec is a scoped plan for executing work — not a design document and not a substitute for the OpenAPI contract.

Specs guide Kiro, Claude, Gemini, and human contributors toward consistent, safe execution. They do not override core doctrine or contracts. When a spec conflicts with `specs/openapi.yaml` or the files listed in [`.kiro/steering.md`](../steering.md), the contract and doctrine win. Flag conflicts; do not resolve them silently.

---

## 2. File naming and location

- One spec per feature or change.
- Place specs directly under `.kiro/specs/` by default.
- Use shallow subfolders only when grouping is genuinely useful (e.g., `backend/`, `frontend/`). Avoid nesting deeper than one level.
- Name files in kebab-case, descriptive of the feature:
  - `meal-planning-flow.md`
  - `shopping-list-sharing.md`
  - `auth-refresh-tokens.md`
  - `recipe-tag-filtering.md`

---

## 3. Spec structure

Every spec must follow this structure:

```markdown
# Feature: <name>

## Intent
One or two sentences. What problem does this solve and what outcome is expected?

## Contracts & Routes
Links or references to the relevant OpenAPI routes, DTOs, or schemas in `specs/openapi.yaml`.
Example: `POST /api/meal-plans`, `GET /api/recipes/{id}` — see `specs/openapi.yaml#/paths/...`

## Tasks
Numbered list of small, sequential, executable tasks.
Each task should be completable in one Kiro session or a short sequence of agent turns.

1. [ ] Update `specs/openapi.yaml` to add the `sharingToken` field to `MealPlanDto`.
2. [ ] Write or update contract and integration tests for `POST /api/meal-plans/{id}/share`.
3. [ ] Implement the sharing endpoint in the API.
4. [ ] Update the PWA model and wire up the share flow in the UI.

## Risks & Questions
Known unknowns, unresolved decisions, or things to clarify before or during execution.

## Notes / Decisions
Running log of decisions made as work progresses. Date entries if helpful.
```

**Section guidance:**

- **Intent** — state the goal, not the implementation. One read should tell any agent what success looks like.
- **Contracts & Routes** — list every OpenAPI path and DTO this feature touches. This is the bridge between the spec and the contract.
- **Tasks** — keep each task small enough that it has a clear definition of done on its own. Tasks map to the authority order: contract → tests → implementation.
- **Risks & Questions** — capture ambiguity early. Remove items as they are resolved.
- **Notes / Decisions** — record decisions here, not in commit messages alone. Future agents and humans rely on this to understand why, not just what.

---

## 4. Working with a spec

### Kiro (and other agents)

1. Load the spec and its active task. Do not load the entire spec list.
2. Follow the authority order: `specs/openapi.yaml` → spec → tests → implementation.
3. Work one task at a time. Do not attempt to implement an entire feature in a single pass.
4. Use `task` commands for all build, test, lint, and validation operations — see [`.agents/core/execution-harness.md`](../../.agents/core/execution-harness.md).
5. Before marking a task done, complete the full completion workflow:
   - `task agent:drift` — zero drift confirmed.
   - `task agent:test:impact` — targeted tests pass for the affected changes.
   - `task review` — formatting, linting, type-check, and tests pass.
   - If impact is uncertain or changes are broad, escalate to `task test` before considering the task complete.

### Humans

- Update the spec when requirements change — do not let it diverge silently from reality.
- Check off tasks as they complete (`[x]`).
- Add notes and decisions to **Notes / Decisions** as the feature evolves.
- If scope grows significantly, split the spec rather than expanding it indefinitely.

---

## 5. Keeping specs in sync

| When… | Do this |
| :--- | :--- |
| A contract or route changes | Update **Contracts & Routes** to reference the new paths or DTOs |
| A task is completed | Mark it `[x]`; note any significant decisions in **Notes / Decisions** |
| A task is reshaped or dropped | Update or remove it from **Tasks** with a brief note explaining why |
| A decision is made | Record it in **Notes / Decisions** immediately, not after the fact |
| A spec covers more than one distinct feature | Split it into two or more specs |
| A spec has no remaining open tasks | Archive or delete it — do not leave stale specs in place |

Specs are working documents. A spec that has drifted from the implementation is worse than no spec.
