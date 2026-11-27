# Documentation & Specification Layout

The repository separates specifications, contracts, and documentation by role:

- [`openspec/specs/`](../openspec/specs) — authoritative behavioral specifications (and [`openspec/changes/`](../openspec/changes) for active/archived changes).
- [`specs/openapi.yaml`](../specs/openapi.yaml) — authoritative OpenAPI HTTP contract.
- `docs/` — human and agent guides, visual design system, technical flows, and historical design archives:
  - [`user-guide.md`](user-guide.md) — family user guide.
  - [`install/`](install/quick-start.md) — home-server installation, Cloudflare Tunnel, Gemini API key, timezones, updates, and troubleshooting.
  - [`operations/`](operations/exact-recovery.md) — operator runbooks (exact recovery, recovery exports, search rollout, demo preparation, Docker Hub publication).
  - [`architecture.md`](architecture.md), [`feature-flags.md`](feature-flags.md), [`dependency-versions.md`](dependency-versions.md) — system architecture, feature-flag lifecycle, and dependency compatibility.
  - [`flows/`](flows/client-domain-model.md) — `data-flows/` and `user-flows/` diagrams and state machines.
  - [`design/`](design/visual-language-reference.md) — North Star creative direction, designer identity, visual language reference, SVG boards, and design suites.
  - [`archive/`](archive/visual-language-session-history.md) — historical visual-language session history, archived SVG boards, and early inspiration mockups (`archive/mockups/`).
