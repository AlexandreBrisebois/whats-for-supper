# Agent Toolbox

A registry of custom scripts and tools designed to optimize agent efficiency.

## Tool Registry

| Tool | Purpose | Usage |
| :--- | :--- | :--- |
| `api_tools.py` | Multi-purpose tool for API Discovery and Parity Reconciliation. | `task agent:api` or `task agent:reconcile` |
| `run-e2e-ci.sh` | Runs full E2E suite in a stable, CI-like environment. | `scripts/run-e2e-ci.sh` |

---

## Tool Details

### api_tools.py
- **Source**: [scripts/agent/api_tools.py](file:///Users/alex/Code/whats-for-supper/scripts/agent/api_tools.py)
- **Problem Solved**: Reading large C# controllers to find routes is token-expensive and error-prone.
- **Modes**:
    - `--discovery`: Maps C# Controller endpoints to a markdown table (use via `task agent:api`).
    - `(default)`: Checks parity between Spec, Mock, and Real API (use via `task agent:reconcile`).

### run-e2e-ci.sh
- **Source**: [scripts/run-e2e-ci.sh](file:///Users/alex/Code/whats-for-supper/scripts/run-e2e-ci.sh)
- **Problem Solved**: Eliminates race conditions, hydration issues, and environment drift common in standard `npm run test:e2e` calls.
- **Output**: Playwright test results with strict environment management.
