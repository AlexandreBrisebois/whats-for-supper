---
name: api-discovery
description: Procedural guidance for maintaining the API endpoint map and service discovery using the map_api.py tool.
---

# Skill: API Discovery & Mapping

Procedural guidance for maintaining the API endpoint map and service discovery.

## 1. Tooling: map_api.py
This script parses C# controllers to generate a markdown table of endpoints.

### Execute Discovery
```bash
# Via Taskfile
task agent:api

# Directly via Python
python3 scripts/agent/map_api.py
```

## 2. API Summary Management
- Always check `api.wfs.localhost` for service availability.
- When adding new controllers or endpoints, re-run the discovery tool and update the technical context in `HANDOVER.md`.

## 3. Communication Rules
- Backend/Frontend consensus: Ensure that changes to the API schema are reflected in the `mock-api.js` for PWA testing.
