# Dependency compatibility

The coordinated October 2026 cohort uses .NET SDK **11.0.100-rc.2.26504.105** and
ASP.NET/runtime **11.0.0-rc.2.26504.105**. EF Core, Relational, Design, InMemory
and dotnet-ef intentionally use **11.0.0-rc.1.26425.128** with Npgsql EF provider
**11.0.0-rc.1.1**. The provider requires that EF version exactly; upgrading only
EF to RC2 breaks compatibility. Update this group together after a matching
provider is published. These remain prerelease .NET components.

The API and test projects commit NuGet lockfiles. CI and API container builds
use locked restore; after an intentional package update, refresh both locks
locally and verify `dotnet restore api/src/RecipeApi.Tests/RecipeApi.Tests.csproj
--locked-mode`. No database schema or PostgreSQL major-version migration is part
of this dependency update.

Use Node **26.12.0** from `.nvmrc` and npm **11.21.1**, then `npm ci --include=dev`
in `pwa/`. CI, setup tasks and PWA images use the same versions. npm 12.2.0 was
not selected: its default URL-fetch policy rejected the existing Tailwind WASM
tarball during clean resolution. No policy override was added. Its replacement
can be reconsidered when that dependency path installs normally.

ESLint stays at **9.39.5** because Next's imported lint plugins exclude ESLint 10
in their peer ranges. TypeScript stays at **6.0.3** because typescript-eslint
requires `<6.1.0`. These constraints take precedence over the newest registry
version. Vitest and its coverage package move together to **5.0.5**. OpenSpec CLI **1.14.3** is pinned in local setup and CI; Task **3.54.0** and PyYAML **6.0.3** remain current. Kiota CLI
**1.36.1** remains current; its TypeScript runtime packages align at preview.110.

Container updates retain PostgreSQL **18** and Ubuntu **resolute**. The migration
image uses PostgreSQL **18.6-trixie** and sqldef **3.11.26**; the database uses
pgvector **0.8.7-pg18-trixie**. Traefik **3.7.15**, cloudflared **2026.10.1** and
Alpine **3.23** replace floating or older patch references. The PDF renderer and
its matching notices stay unchanged because PDFtoImage 5.4.0 is the latest stable
release. The Lambda adapter remains at 1.1.0; deployment/release behavior is not
changed.

These versions were checked against official NuGet/npm metadata, Microsoft's
.NET release metadata/MCR tags and publisher Docker Hub tags. A successful
restore alone does not establish runtime compatibility: API/PostgreSQL tests,
browser tests, generated-client parity and the container smoke gate remain
required before publication to main.

The provider-compatible RC1 cohort also needs a bounded application adjustment:
recipe-import attempt-start and success use parameterized PostgreSQL updates
because the provider cannot translate their array-membership expressions. The
updates remain atomic and retain recipe and workflow-attempt guards. Existing
report behavior, status mapping and schema are preserved.
