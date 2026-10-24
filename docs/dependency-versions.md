# Dependency compatibility

The October 24, 2026 uplift aligns EF Core, Relational, Design and InMemory at
**11.0.0-rc.2.26504.105**, with Npgsql EF provider **11.0.0-rc.2**. Its published
NuGet dependencies require exactly that EF Core/Relational version. SDK
**11.0.100-rc.2.26504.105**, ASP.NET/runtime RC2 and dotnet-ef RC2 were already
pinned and remain unchanged. These components remain prerelease.

The earlier RC2 restore failure came from a mixed cohort: the then-current
Npgsql provider required RC1 exactly. A matching provider now exists; that
metadata does not prove runtime correctness. Keep the parameterized PostgreSQL
updates in `RecipeImportReportService`: the separate array-membership translation
failure has an application workaround and is not claimed fixed upstream.

Both API/test NuGet lockfiles are committed. After intentional updates, refresh
both locks and verify `dotnet restore api/src/RecipeApi.Tests/RecipeApi.Tests.csproj
--locked-mode`. The uplift also selects Microsoft.Agents.AI **1.26.0** and
FsCheck.Xunit **3.6.0**. Google.GenAI, Microsoft.OpenApi and the OpenTelemetry
cohort remain with their existing dependency PRs (#320, #294, #307/#308).

Use Node **26.12.1** from `.nvmrc` and npm **12.2.1**, then `npm ci --include=dev`
in `pwa/`. Local setup, CI, package metadata and the PWA image share these pins.
Unlike the earlier npm 12.2.0 attempt, npm 12.2.1 completed a clean disposable
installation of the selected graph with its default fetch policy. Native package
install-script protections remain enabled; their warnings are not suppressed.

PWA updates are Next/eslint-config-next **16.4.3**, Motion **14.6.0**,
lucide-react **1.61.0**, Zustand **5.0.16**, Vite **8.3.5**, and the six Kiota
TypeScript runtime packages at **1.0.0-preview.111**. These advance beyond the
already merged Motion/lucide updates. Vitest/coverage **5.0.5** and React
**19.3.1** remain unchanged. The follow-redirects lock entry stays **1.16.0**
under existing PR #309.

ESLint stays **9.39.5** because eslint-plugin-import's peer range excludes 10.
TypeScript stays **6.0.3** because typescript-eslint requires `<6.1.0`.
OpenSpec **1.15.0** passed strict validation before its setup/CI pin changed.
Kiota CLI **1.36.1**, PyYAML **6.0.3**, the current GitHub Action major lines,
PDFtoImage **5.4.0** and Lambda adapter **1.1.0** remain unchanged. Task's current
published release is **3.54.0**; the available local Task **3.41.0** executes the
repository targets and is identified separately in validation evidence.

Infrastructure references align at Traefik **3.7.16**, cloudflared
**2026.10.3** and sqldef **3.11.27** across development/production templates and
the migration command/image. PostgreSQL **18.6-trixie**, pgvector
**0.8.7-pg18-trixie**, Ubuntu **resolute** and Alpine **3.23** remain on their
existing supported lines. The installation template now pins the same pgvector
version as development/CI. No schema or PostgreSQL-major migration is included.

Version evidence comes from [NuGet package metadata](https://api.nuget.org/v3-flatcontainer/npgsql.entityframeworkcore.postgresql/index.json),
[Microsoft SDK metadata](https://builds.dotnet.microsoft.com/dotnet/release-metadata/11.0/releases.json),
[npm metadata](https://registry.npmjs.org/), and publisher Docker Hub tags.
[Change evidence](../openspec/changes/coordinated-dependency-uplift-2026-10-24/evidence.md)
records actual verification. Published metadata and restore success establish
resolution compatibility; API/PostgreSQL, browser, generated-client and container
checks establish their own tested behavior. No merge, deployment or release is
part of this uplift.
