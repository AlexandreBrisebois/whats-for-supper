# Agent Toolbox

A registry of custom scripts and tools designed to optimize agent efficiency and reduce token usage.

## Tool Registry

| Tool | Purpose | Usage |
| :--- | :--- | :--- |
| `map_api.py` | Maps C# Controller endpoints to a markdown table. | `python3 scripts/agent/map_api.py` |
| `reconcile_api.py` | Checks parity between Spec, Mock, and Real API. | `task agent:reconcile` |
| `run-e2e-ci.sh` | Runs full E2E suite in a stable, CI-like environment. | `scripts/run-e2e-ci.sh` |

---

## Tool Details

### map_api.py
- **Source**: [scripts/agent/map_api.py](file:///Users/alex/Code/whats-for-supper/scripts/agent/map_api.py)
- **Problem Solved**: Reading multiple large C# files to find API routes is token-expensive.
- **Output**: A Markdown table listing Controller, Method (GET/POST), Route, and internal Function Name.

### reconcile_api.py
- **Source**: [scripts/agent/reconcile_api.py](file:///Users/alex/Code/whats-for-supper/scripts/agent/reconcile_api.py)
- **Problem Solved**: Detects drift between the OpenAPI spec and the actual implementation.
- **Output**: Parity matrix (Spec vs Mock vs Real).

### run-e2e-ci.sh
- **Source**: [scripts/run-e2e-ci.sh](file:///Users/alex/Code/whats-for-supper/scripts/run-e2e-ci.sh)
- **Problem Solved**: Eliminates race conditions and hydration issues common in E2E tests.
- **Output**: Playwright test results with strict environment management.
