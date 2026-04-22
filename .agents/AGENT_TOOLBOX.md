# Agent Toolbox

A registry of custom scripts and tools designed to optimize agent efficiency and reduce token usage.

## Tool Registry

| Tool | Purpose | Usage |
| :--- | :--- | :--- |
| `map_api.py` | Maps C# Controller endpoints to a markdown table. | `python3 scripts/agent/map_api.py` |

---

## Tool Details

### map_api.py
- **Source**: [scripts/agent/map_api.py](file:///Users/alex/Code/whats-for-supper/scripts/agent/map_api.py)
- **Problem Solved**: Reading multiple large C# files to find API routes is token-expensive.
- **Output**: A Markdown table listing Controller, Method (GET/POST), Route, and internal Function Name.
