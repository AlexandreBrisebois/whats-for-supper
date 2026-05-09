---
name: tracer
description: Map vertical "Tracer Bullet" paths across system layers and seams to build high-fidelity understanding. Use when starting a new feature, investigating a bug's root cause, or mapping the flow between UI, API, and Database.
---

# Tracer (Vertical Path Mapping)

## Quick Start
"I need to understand the 'Add Recipe' flow. Run a tracer bullet from the UI button to the DB commit, identifying every Seam."

## Core Rules
- **Follow the Wire**: Start at the entry point and follow the data vertically through all layers (UI → Client → Seam → API → Service → DB).
- **Seams are Law**: Explicitly validate transitions. Compare code against `specs/openapi.yaml`.
- **Stay Locked to the Path**: Do not explore tangential files. Use the trace to justify every file you open.
- **Zero fixing**: This is a discovery skill. Report "As-Is" state only.

## Workflows

### 1. The Vertical Trace
1.  **Entry Point**: Locate the starting component/test.
2.  **The Seam**: Identify the API call and its contract in `specs/openapi.yaml`.
3.  **The Controller**: Locate the backend endpoint.
4.  **The Logic**: Trace into the service layer and data models.

### 2. The Tracer Map (Output)
Produce a report containing:
- **File Path**: Ordered list of files in the execution chain.
- **Contract Integrity**: Status of the Seam (Drift vs. Law).
- **Data Evolution**: How the DTO/Model changes across layers.
- **Failure Point**: (If debugging) Where the logic diverges from intent.

## Advanced Usage
- **Cross-Layer Mapping**: Use to detect "Ghost DTOs" (models that exist in code but not in the contract).
- **Surgical Preparation**: Hand the Tracer Map to the `surgical` persona to ensure high-precision fixes.
