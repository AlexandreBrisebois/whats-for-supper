# Infrastructure, Ops & Quality

**Status**: AUTHORITATIVE  
**Lane**: 04_OPS_TESTING  
**Source of Truth for**: Security, Performance, Docker, and Production Readiness.

---

## 1. Network Architecture (Secure Access)

The system is designed for secure, self-hosted deployment on a home NAS using **Traefik** and **Cloudflare Tunnel**.

### 1.1 Cloudflare Tunnel (Zero Open Ports)
- **Mechanism**: `cloudflared` container establishes a secure outbound connection to Cloudflare.
- **Benefit**: No open ports on the router; DDoS protection at the edge.
- **Config**: `TUNNEL_TOKEN` environment variable.

### 1.2 Service Orchestration (Traefik)
Traefik handles internal routing and SSL termination (if not using Cloudflare).
- **Network**: All services on internal `proxy` or `recipe-network`.
- **Labels**: `traefik.http.routers.api.rule=Host(...)`.

---

## 2. Security Posture

### 2.1 Identity & Access
- **Identity**: Persistent `familyMemberId` cookie on each device.
- **Auth**: `X-Family-Member-Id` header for attribution (trusted within LAN).
- **Zero Trust**: (Optional) Cloudflare Access for external authentication.

### 2.2 Container Hardening
- **User**: All containers run as **non-root**.
- **Images**: Chiseled (.NET) or distroless images (no shell/package manager).
- **Filesystem**: Read-only where possible (except `/recipes` volume).

### 2.3 Data Privacy
- **Local First**: Recipe images and DB data remain on the NAS.
- **Privacy**: Only hero image generation is sent to Google Gemini; originals stay local.

---

## 3. Performance Targets (NAS Optimized)

| Feature | Target | Notes |
|---|---|---|
| Initial Load | < 3s | On LAN Wi-Fi |
| Image Retrieval | < 200ms | From NAS filesystem |
| Search (NL) | < 3s | pgvector approximate search |
| Memory (Baseline) | < 1GB | All containers (excluding Ollama) |

### 3.1 Optimization Strategies
- **.NET 10 Native AOT**: Minimal RAM footprint and JIT overhead.
- **pgvector Indexing**: `IVFFlat` index for fast semantic search.
- **PWA Caching**: Offline-first via Service Worker; Zustand for lightweight state.

---

## 4. Operational Monitoring
- **Logs**: JSON-structured to stdout.
- **Health**: `GET /health` endpoint for Docker orchestration.
- **Resource Budget**: CPU restricted to 2 threads for app services (leaving 2 for Ollama).
