# Tagged Docker Hub and Synology Template Workstream Map

> **Historical reference — archived 2026-09-27 at owner direction.** This package records the original Docker Hub and Synology template tracer-bullet scope. The canonical release-template topology is now [`release-template/synology/compose.yaml`](../../../../release-template/synology/compose.yaml), with operator guidance in its adjacent README and `.env.example`. This record is not active work and does not certify a supported public release; physical NAS, security, recovery, update, and rollback qualification require separately scoped current work.

## Spec manifest

- [Requirements](requirements.md)
- [Design](design.md)
- [Tasks](tasks.md)

## Dependency and ownership

```mermaid
flowchart TD
    P1[Phase 1: tagged publication] --> P2[Phase 2: Synology template]
```

| Phase | Single outcome | Primary ownership | Stop boundary |
|---|---|---|---|
| 1 | Exact stable/beta multi-arch Docker Hub images from an annotated Git tag | New independent Docker Hub workflow and its focused tests | Do not alter the existing private publication route or create a real tag while implementing. |
| 2 | LAN-only Synology Project template with one editable `.env` | New template directory and focused Compose tests | Do not modify contributor deployment, application code, or a live NAS. |

## Launch rule

Execute Phase 1 first. Select Phase 2 only after its image-name and version-mapping outputs are recorded. A later public-release specification owns all deferred hardening and qualification work.
