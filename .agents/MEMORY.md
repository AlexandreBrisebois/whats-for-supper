# Repository Memory

This file captures critical architectural decisions and repository-wide constraints to ensure consistency across sessions and agents.

## 2026-05-08: Production Deployment & Network Doctrine

### 🌐 Same-Origin Doctrine (The "/" Rule)
- **Decision**: In production environments, `NEXT_PUBLIC_API_BASE_URL` and `API_INTERNAL_URL` **MUST** be set to `/`.
- **Rationale**: Enforces a unified origin behind Traefik. This is non-negotiable for:
    - **Cookie Flow**: Seamlessly forwarding `h_access` and identity cookies.
    - **SSE Stability**: Reliable Server-Sent Events without CORS interference.
- **Reference**: Memorialized in [.agents/core/network-topology.md](.agents/core/network-topology.md).

### 🏗️ Infrastructure & Persistence
- **API Persistence**: The API container must have a bind mount for `/data` (mapped to `DATA_ROOT`) in production overrides to prevent data loss during updates.
- **Traefik Ports**: Standardized on port `9100` (HTTP) and `9180` (Admin) for NAS-based production deployments.
