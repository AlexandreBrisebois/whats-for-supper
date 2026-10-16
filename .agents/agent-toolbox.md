# Agent Toolbox

A registry of custom scripts and tools designed to optimize agent efficiency.

## Tool Registry

| Tool | Purpose | Usage |
| :--- | :--- | :--- |
| `api_tools.py` | Multi-purpose tool for API Discovery and Parity Reconciliation. | `task agent:api` or `task agent:reconcile` |
| `slice.py` | Vertical Slice Viewer for full-stack route context. | `task agent:slice -- /api/route` |
| `drift.py` | Live endpoint comparison and static DTO property/requiredness checks. | `task agent:drift` |
| `test_ops.py` | Explainable, cache-aware impact runner with untracked-file coverage. | `task agent:test:impact` |
| `kiota_client.py` | Runtime-safe Kiota generation and drift checking with a one-shot timeout. | `task gen:client` or `task gen:client:check` |

---

## Tool Details

### api_tools.py
- **Source**: [scripts/agent/api_tools.py](file:///Users/alex/Code/whats-for-supper/scripts/agent/api_tools.py)
- **Problem Solved**: Reading large C# controllers to find routes is token-expensive and error-prone.
- **Modes**:
    - `--discovery`: Maps C# Controller endpoints to a markdown table (use via `task agent:api`).
    - `(default)`: Checks static route coverage between spec, mock handlers and controller source (use via `task agent:reconcile`).

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

Use this optional viewer for route discovery. Confirm missing matches against current source; its output does not establish drift or behavioral parity.

### drift.py
- **Source**: [scripts/agent/drift.py](file:///Users/alex/Code/whats-for-supper/scripts/agent/drift.py)
- **Problem Solved**: Silent runtime failures due to nullability or field naming mismatches between C# DTOs and the OpenAPI spec.

### test_ops.py
- **Source**: [scripts/agent/test_ops.py](file:///Users/alex/Code/whats-for-supper/scripts/agent/test_ops.py)
- **Problem Solved**: High maintenance cost of brittle CSS selectors and slow E2E feedback loops.
- **Modes**:
    - `--impact`: Explains and runs tests affected by tracked and untracked changes.
    - `--all`: Runs every E2E test explicitly.
- **Cache**: Successful local impact runs require identical source/configuration/runtime inputs before and after testing; mutation discards success. Unmapped impact runs all E2E. Set `WFS_DISABLE_TEST_CACHE=1` to force a run. CI never reuses this cache.

### kiota_client.py
- **Problem Solved**: Hidden overwrite prompts and incompatible runtime roll-forward made Kiota appear to hang.
- **Behavior**: Resolves the manifest-pinned Kiota DLL, removes global runtime roll-forward, always uses `--clean-output`, preserves progress output, and stops once after `WFS_KIOTA_TIMEOUT_SECONDS` (default 20 seconds).

### Preparation, verification and advisory audit

`task prepare` prepares applicable generation/formatting; `task verify`
selects change-class checks and records immutable evidence. OpenSpec owns task
progression; these commands provide repository utilities within that workflow. See
[execution harness](core/execution-harness.md) for effects and blocked checks.

`task agent:audit AREA=<keyword>` retains `scripts/agent/test_audit.py` through
`test:audit`. It discovers PWA unit/E2E and API tests by filename/content and reports
logic-heavy, mock-heavy and selector heuristics. Findings are advisory; preserve
semantic accessibility assertions and do not expand the selected task into cleanup.
Static navigation/parity does not prove live services or database behavior.
