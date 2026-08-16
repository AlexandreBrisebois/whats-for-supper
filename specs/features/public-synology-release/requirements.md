# Public Synology Release Requirements

Status: Draft for owner adjustment  
Target: `0.1.0-beta.1`  
Primary platform: Synology DSM 7.2+ Container Manager Projects  
Last reconciled: 2026-08-16

## 1. Objective

Publish What's for Supper as a versioned, recoverable, and understandable self-hosted product for people who do not know the repository. A NAS owner must be able to install, operate, update, roll back, and troubleshoot the application without cloning the source repository or inheriting assumptions from the maintainer's private deployment.

The first supported path is Synology Container Manager's **Project** workflow. Generic Docker Compose, Unraid, Kubernetes, DSM reverse proxy, local certificates, and external databases are outside the beta support boundary.

## 2. Release posture

- The first public release is `0.1.0-beta.1`.
- A stable `0.1.0` is blocked until .NET 11 is generally available and all release gates in this specification pass on the GA runtime.
- Exact immutable SemVer image tags are canonical. `latest` and other mutable tags are never used in installation or upgrade instructions.
- PostgreSQL 18 is the beta database baseline. PostgreSQL 19 is a future, explicit migration and must never arrive through a floating image tag.
- The repository remains the contributor surface. A versioned GitHub Release bundle is the installer surface.

## 3. Supported user and platform

The supported operator:

- is a Synology administrator but is not assumed to know this project;
- can install Container Manager, use File Station, edit a text file, and create/redeploy a Project;
- has a 64-bit `amd64` or `arm64` Synology NAS running DSM 7.2 or newer;
- has a Google account, a Google Cloud project, and a Gemini Developer API key created through Google AI Studio;
- may optionally have a Cloudflare-managed domain and remotely managed Tunnel.

Explicitly unsupported for the beta:

- DSM 6, unofficial Docker packages, and 32-bit ARM (`arm/v7`);
- an external PostgreSQL server;
- unattended updates, Watchtower, or mutable deployment tags;
- Vertex AI, service accounts, `gcloud`, or alternate AI providers;
- Cloudflare Access as an authentication requirement;
- direct LAN exposure of API, PWA, PostgreSQL, or Traefik administration ports.

## 4. Success criteria

A new operator can:

1. Download one version-matched bundle from GitHub Releases.
2. Configure one `.env` file from a documented template.
3. create a Container Manager Project and reach the application at `http://NAS-IP:<WFS_HTTP_PORT>`;
4. create the first household member in an empty installation;
5. verify Gemini access with a clear success or actionable failure;
6. optionally enable a Cloudflare Tunnel without changing the Compose file;
7. make a manual logical database backup and prove it can be restored;
8. update by changing one version value and redeploying the Project;
9. determine from health, migration, and container status whether an update succeeded;
10. follow an explicit rollback procedure if it did not.

## 5. Functional requirements

### R1 — Versioned installer bundle

Each GitHub Release must contain an archive and checksum file. The archive must contain:

```text
whats-for-supper-<version>/
├── compose.yaml
├── .env.example
├── README.md
├── SETUP-SYNOLOGY.md
├── CLOUDFLARE.md
├── BACKUP-RESTORE.md
├── UPDATE-ROLLBACK.md
├── TROUBLESHOOTING.md
└── checksums.txt
```

The guide must tell the user to copy `.env.example` to `.env`. It must not require a Git clone, `git pull`, Taskfile, source tree, private registry, or maintainer-specific path.

### R2 — Public images

The release must publish separate, public, multi-platform images:

- `brisebois/whats-for-supper-api:<version>`
- `brisebois/whats-for-supper-pwa:<version>`
- `brisebois/whats-for-supper-db-migration:<version>`

Every image must contain both `linux/amd64` and `linux/arm64` manifests. Version tags are immutable. The Compose bundle must use the exact release version for all three application images.

### R3 — One Project and one public port

The canonical Project must contain Traefik, PWA, API, migration, PostgreSQL/pgvector, and optional Cloudflare Tunnel services.

- Browser traffic enters through Traefik only.
- The only NAS-published port is `${WFS_HTTP_PORT:-9100}`.
- PWA, API, PostgreSQL, migration, and Traefik dashboard ports remain internal.
- The API remains reachable to other Project services at `http://api:9001`.
- Routing is host-agnostic: `/api` routes to the API and all other application paths route to the PWA.
- LAN use must not require `DOMAIN_NAME`.
- The Traefik administrative dashboard must not be exposed insecurely.

### R4 — Canonical project storage

The guide must use a single self-contained project layout while treating `/volume1` as an example, not a fixed path:

```text
/volumeN/docker/whats-for-supper/
├── compose.yaml
├── .env
├── data/
│   ├── postgres/
│   └── app/
└── backups/
```

Compose must use bind mounts relative to the Project directory. Upgrade instructions must preserve `.env`, `data/`, and `backups/`, and must warn against extracting a release over those paths.

### R5 — Public `.env` contract

The public `.env` must contain only operator-owned settings or controls that genuinely work at container runtime. The template must distinguish required, optional, and advanced values; contain no usable default credentials; and fail clearly when required placeholders or invalid values remain.

Canonical variables:

| Variable | Requirement |
|---|---|
| `WFS_VERSION` | Required exact application version; default in the release bundle is its own version. |
| `WFS_HTTP_PORT` | Configurable NAS entry port; default `9100`. |
| `COMPOSE_PROFILES` | Empty for LAN-only; `cloudflare` to enable the optional tunnel. |
| `CLOUDFLARE_TUNNEL_TOKEN` | Required only when the Cloudflare profile is enabled. |
| `GEMINI_API_KEY` | Required for a supported installation; secret. |
| `GEMINI_MODEL_ID` | Runtime model setting with a release-tested default. |
| `GEMINI_MODEL_ID_HERO` | Runtime image model setting with a release-tested default. |
| `EMBEDDING_MODEL_ID` | Runtime embedding model setting with a release-tested default. |
| `IMPORT_TARGET_LANGUAGE` | Runtime import-language behavior with a documented default. |
| `POSTGRES_USER` | Database owner with a safe documented default. |
| `POSTGRES_DB` | Database name with a safe documented default. |
| `POSTGRES_PASSWORD` | Required unique secret; one source of truth for Compose and the connection string. |
| `WFS_DEFAULT_LOCALE` | Runtime PWA setting validated against supported locales. |
| `WFS_AISLE_ORDER` | Runtime ordered list with escaping and validation documented. |
| `WFS_ENABLE_AGENT_SEARCH` | Runtime Boolean. |
| `WFS_ENABLE_PHOTO_SEARCH` | Runtime Boolean. |
| `DREAMING_CRON_UTC` | Runtime UTC cron with documented syntax and default. |
| `HEARTH_SECRET` | Required unique authentication secret. |
| `ELEVATED_ACTIONS_PIN` | Required PIN for destructive elevated actions. |
| `DEMO_MODE` | Optional Boolean, default `false`; normal fresh installations remain empty. |
| `DEMO_RESTORE_CRON_UTC` | Used only when demo mode is explicitly enabled. |

The Compose file must derive internal hostnames, internal ports, same-origin URLs, data paths, CORS behavior, and the PostgreSQL connection string. These are not public operator choices.

### R6 — Migration from the maintainer `.env`

The deployment guide must explain that the maintainer's historical NAS file mixed public choices, internal wiring, build-time PWA values, and redundant secrets. It must include this migration map without reproducing any secret value:

| Existing setting | Public contract |
|---|---|
| `TAG` | Rename to `WFS_VERSION`. |
| `WFS_REGISTRY` | Remove; public repository names are fixed in Compose. |
| `DOMAIN_NAME` | Remove from LAN setup; Cloudflare hostname is managed in Cloudflare. |
| `API_PORT_EXTERNAL`, `PWA_PORT_EXTERNAL`, `POSTGRES_PORT_EXTERNAL`, `TRAEFIK_ADMIN_PORT` | Remove; those services are not published. |
| `TRAEFIK_HTTP_PORT` | Rename to `WFS_HTTP_PORT`. |
| `API_HOST`, `API_PORT`, `PWA_HOST`, `PWA_PORT`, `POSTGRES_PORT` | Remove; fixed internal Compose wiring. |
| `NEXT_PUBLIC_API_BASE_URL` | Remove; same-origin browser routing is derived. `/` must not be concatenated into `//api/...`. |
| `API_INTERNAL_URL` | Remove from the user contract; Compose supplies `http://api:9001`. |
| `POSTGRES_CONNECTION_STRING` | Remove; Compose constructs it from the single database password. |
| `ASPNETCORE_ENVIRONMENT`, `NEXT_PUBLIC_ENVIRONMENT` | Remove; fixed by the production bundle. |
| `CORS_ALLOWED_ORIGINS` | Remove; same-origin and trusted-proxy behavior are derived. |
| `DATA_ROOT`, `RECIPES_ROOT`, `WORKFLOWS_ROOT` | Remove; internal paths and relative mounts are fixed by the bundle. |
| `NEXT_PUBLIC_COOKIE_DOMAIN` | Remove; use host-only cookies. |
| `NEXT_PUBLIC_DEFAULT_LOCALE` | Rename to `WFS_DEFAULT_LOCALE`. |
| `NEXT_PUBLIC_AISLE_ORDER` | Rename to `WFS_AISLE_ORDER`. |
| `NEXT_PUBLIC_ENABLE_AGENT_SEARCH` | Rename to `WFS_ENABLE_AGENT_SEARCH`. |
| `NEXT_PUBLIC_ENABLE_PHOTO_SEARCH` | Rename to `WFS_ENABLE_PHOTO_SEARCH`. |

The credential previously embedded in the maintainer connection string is considered exposed and must be rotated anywhere it was reused. It must never be copied into an example, specification, log, test fixture, or release artifact.

### R7 — Runtime PWA configuration

`WFS_DEFAULT_LOCALE`, `WFS_AISLE_ORDER`, `WFS_ENABLE_AGENT_SEARCH`, and `WFS_ENABLE_PHOTO_SEARCH` must take effect after a Project restart without rebuilding the PWA image.

- The server must validate and read them at runtime, then provide only these non-secret values to client components.
- Server rendering and hydration must use the same values.
- Invalid values must produce a specific startup/configuration error or a deliberately documented fallback; silent build-time capture is forbidden.
- Feature flags control discoverability, not authorization. Protected API operations remain protected independently.

### R8 — LAN HTTP and authentication

- The full browser application must work at `http://NAS-IP:<port>` on a trusted LAN.
- Cookie security must be based on the effective request protocol through trusted proxy headers, not merely `NODE_ENV=production`.
- Host-only cookies are canonical.
- LAN HTTP is not described as encrypted or safe for untrusted networks.
- Installable/offline PWA behavior and encrypted remote access require HTTPS; Cloudflare is the recommended HTTPS path.

Before public hosting, Hearth must have documented passphrase requirements, login rate limiting/brute-force protection, invite expiry and revocation, secret-safe URLs/logs, and minimal anonymous health output.

### R9 — Empty first run

A fresh production installation starts with an empty application database and the existing first-household-member onboarding path. Sample recipes or demo data are never loaded unless demo mode is explicitly selected. Optional sample import is roadmap work.

### R10 — Gemini readiness

The beta supports the Gemini Developer API only.

- Setup documents Google Cloud project and Google AI Studio key prerequisites, billing/quota implications, API-key restrictions, and the exact tested models.
- Setup includes an explicit Gemini connection test with actionable key, billing, permission, quota, endpoint, and model-access errors.
- A missing or invalid required key makes installation readiness fail clearly.
- A later Gemini outage does not take down the recipe application or database; AI-dependent actions report unavailability.
- Preview model defaults must be revalidated for each release and must not be described as permanent availability guarantees.

### R11 — Optional Cloudflare profile

Cloudflare is recommended for fast, encrypted access outside the home but is not required for LAN operation.

- LAN-only: `COMPOSE_PROFILES=` and an empty tunnel token.
- Remote access: `COMPOSE_PROFILES=cloudflare` and a tunnel token.
- The supported beta path is a remotely managed tunnel created in the Cloudflare dashboard.
- The user creates a public hostname whose service is `http://traefik:80`.
- No Cloudflare API token, CLI login, origin certificate, or Access policy is required.
- Enabling the profile without a token must fail with a clear configuration message, not a restart loop.

### R12 — Database lifecycle and recovery

- PostgreSQL 18 with pgvector is bundled and is the only supported database.
- The database image is pinned to an exact tested version or multi-platform manifest digest.
- PostgreSQL health and successful one-shot schema migration must precede API readiness.
- The beta must document exact manual logical backup and restore commands and prove a clean restore on both supported Synology architectures.
- The documentation must distinguish a PostgreSQL logical backup, application-level export, Synology Hyper Backup, upgrade rollback, and disaster recovery.
- Every upgrade starts with a logical backup. Hyper Backup is recommended as secondary protection but is not proof of database recoverability.
- Automated helper scripts, scheduled backups, and administration-screen backup/restore are roadmap items, not beta blockers.

### R13 — Manual update and rollback

Unattended updates are unsupported. The supported update path is:

1. Read release notes and compatibility warnings.
2. Create and verify a logical backup.
3. Replace only the versioned bundle files that are designated replaceable.
4. Change `WFS_VERSION` to the exact target version.
5. Redeploy the Container Manager Project.
6. Confirm migration completion, health, version, login, and a minimal application smoke test.

Rollback instructions must state whether the database change is backward-compatible. A container-tag rollback must never be presented as sufficient after an incompatible schema migration. Each release note must name the last supported rollback point and the required restore procedure.

### R14 — Release pipeline

- Pull requests build and test without pushing images.
- An annotated version tag triggers a GitHub Actions release workflow.
- GitHub-hosted or otherwise reproducible public release runners must replace private-registry and maintainer-only runner assumptions.
- The workflow builds both architectures, runs release checks, pushes exact version tags, creates SBOMs and provenance, generates checksums, assembles the matching bundle, and opens a draft GitHub Release.
- A protected GitHub environment approval occurs only after the physical two-NAS validation record is attached.
- The workflow must not overwrite an existing version tag or artifact.
- Docker Hub descriptions must link to the matching release/setup guide and explain the role of each image.

### R15 — Release validation matrix

The following are publication gates:

| Scenario | amd64 Synology | arm64 Synology |
|---|---:|---:|
| Fresh LAN install and first-user onboarding | Required | Required |
| Runtime `.env` configuration | Required | Required |
| Gemini connection and AI smoke test | Required | Required |
| Cloudflare Tunnel access | Required | Required |
| Logical backup and clean restore | Required | Required |
| Failed-update rollback | Required | Required |
| Multi-platform manifest, health, and migration checks | Required | Required |
| Upgrade from the previous public version | Required once one exists | Required once one exists |

For the first beta, the upgrade scenario starts from a documented release-candidate/current-NAS baseline. Results must record hardware architecture, DSM/Container Manager version, source and target versions, and pass/fail evidence.

## 6. Documentation requirements

The canonical setup guide must put the shortest supported path first:

1. prerequisites;
2. download and extract;
3. create `.env`;
4. create the Project;
5. wait for migration and health;
6. open the LAN URL;
7. create the first household member;
8. test Gemini;
9. optionally enable Cloudflare.

Screenshots are optional and do not block the beta. Exact DSM UI labels and numbered steps do block it. Troubleshooting, Cloudflare, backup/restore, and update/rollback details belong in separate documents linked at the decision point.

Before beta publication, complete an update pass over:

- all public entry/operator documents (`README.md`, `DEPLOY.md`, `LOCAL_DEV_LOOP.md`, Docker examples, Docker Hub descriptions, and release templates);
- every document claiming current or authoritative status;
- ADRs whose accepted/proposed state conflicts with the implementation;
- broken links, personal filesystem paths, private IPs/registries, obsolete `/backend` paths, Ollama/local-worker claims, and stale framework/database versions;
- user guides whose navigation or feature availability no longer matches the application.

Broader archive consolidation, obsolete prompt normalization, and archive-directory cleanup are post-beta unless a file is publicly linked or claims current authority. No deletion occurs without a Death Proposal that identifies salvage content and updated references.

Automated drift checks must cover Markdown links and critical assertions for runtime versions, public image names, Compose variables, and `.env` examples.

## 7. Non-functional requirements

- Secrets must not appear in URLs, logs, images, documentation, tests, checksums, or release artifacts.
- Application and infrastructure images must be pinned, scanned, and reproducible enough to associate them with a source commit.
- Containers should run as non-root where the service permits it; exceptions require rationale.
- Health and readiness must distinguish database, schema/migration, API, PWA, and optional dependency state without exposing sensitive details anonymously.
- Restart behavior must be idempotent. The migration container must finish successfully and not repeatedly mutate an already-current schema.
- A release must not claim success based only on valid YAML or successful image construction; runtime and physical-NAS evidence are required.

## 8. Roadmap (not beta blockers)

- Administration-screen backup and restore.
- Automated/scheduled backup helpers.
- Optional sample-data import.
- Generic Docker Compose and Unraid guides.
- DSM reverse proxy, local DNS, and locally managed HTTPS guidance.
- External PostgreSQL.
- Vertex AI/service-account authentication and alternate model providers.
- Cloudflare Access integration.
- PostgreSQL 19 migration.
- Stable `0.1.0` after .NET 11 GA and requalification.

## 9. Definition of publish-ready

The beta is publish-ready only when every beta task is complete, the public docs contain no private deployment assumptions, exact Docker Hub manifests exist for both architectures, the version-matched bundle is reproducible, the two-NAS matrix passes, recovery is proven, and the protected release approval is recorded. Creating a tag or building images before these conditions does not make the release publish-ready.
