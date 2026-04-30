# Agent Toolbox

A registry of custom scripts and tools designed to optimize agent efficiency.

## Tool Registry

| Tool | Purpose | Usage |
| :--- | :--- | :--- |
| `api_tools.py` | Multi-purpose tool for API Discovery and Parity Reconciliation. | `task agent:api` or `task agent:reconcile` |
| `slice.py` | Vertical Slice Viewer for full-stack route context. | `task agent:slice -- /api/route` |
| `drift.py` | Schema Drift Fuzzer (Contract vs. Backend DTOs). | `task agent:drift` |
| `test_ops.py` | Brittle Selector Guard & Impact-Aware Runner. | `task agent:audit` or `task agent:test:impact` |
| `run-e2e-ci.sh` | Runs full E2E suite in a stable environment. | `task test:pwa:ci` |

---

## Tool Details

### api_tools.py
- **Source**: [scripts/agent/api_tools.py](file:///Users/alex/Code/whats-for-supper/scripts/agent/api_tools.py)
- **Problem Solved**: Reading large C# controllers to find routes is token-expensive and error-prone.
- **Modes**:
    - `--discovery`: Maps C# Controller endpoints to a markdown table (use via `task agent:api`).
    - `(default)`: Checks parity between Spec, Mock, and Real API (use via `task agent:reconcile`).

### slice.py
- **Source**: [scripts/agent/slice.py](file:///Users/alex/Code/whats-for-supper/scripts/agent/slice.py)
- **Problem Solved**: Context hopping between OpenAPI, C#, and TypeScript.
- **Output**: Unified view of a route across all three layers.

**Sample output** (`task agent:slice -- /api/recipes`):
```
# Vertical Slice: /api/recipes

## 1. OpenAPI Specification
✅ Found in spec: `/api/recipes`
Methods: get, post

## 2. Backend Implementation (C#)
### POST in api/src/RecipeApi/Controllers/RecipeController.cs
C# Method: `Create`
[HttpPost]
public async Task<IActionResult> Create(
    [FromHeader(Name = "X-Family-Member-Id")] Guid? familyMemberId,
    [FromForm] CreateRecipeDto dto,
    [FromForm] IFormFileCollection files) { ... }

### GET in api/src/RecipeApi/Controllers/RecipeController.cs
C# Method: `List`
[HttpGet]
public async Task<IActionResult> List(
    [FromQuery] int page = 1,
    [FromQuery] int limit = 20) { ... }

## 3. Frontend Client (TS)
Generated Kiota files:
- pwa/src/lib/api/generated/api/recipes/index.ts
- pwa/src/lib/api/generated/api/recipes/item/index.ts
- pwa/src/lib/api/generated/api/recipes/recommendations/index.ts
- ... (one file per sub-route)
```

Use the output to understand the full contract ↔ backend ↔ client chain before making any changes. If a layer is missing from the output, that is a signal of drift or a missing implementation.

### drift.py
- **Source**: [scripts/agent/drift.py](file:///Users/alex/Code/whats-for-supper/scripts/agent/drift.py)
- **Problem Solved**: Silent runtime failures due to nullability or field naming mismatches between C# DTOs and the OpenAPI spec.

### test_ops.py
- **Source**: [scripts/agent/test_ops.py](file:///Users/alex/Code/whats-for-supper/scripts/agent/test_ops.py)
- **Problem Solved**: High maintenance cost of brittle CSS selectors and slow E2E feedback loops.
- **Modes**:
    - `--audit`: Flags locators not using `data-testid`.
    - `--impact`: Runs only tests affected by recent `git` changes.

### run-e2e-ci.sh
- **Source**: [scripts/run-e2e-ci.sh](file:///Users/alex/Code/whats-for-supper/scripts/run-e2e-ci.sh)
- **Problem Solved**: Environment drift during E2E runs.
