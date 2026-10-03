# PDF renderer qualification

Start at **200 DPI PNG**, one recipe/document, 20 MiB upload and at most ten pages. Production values are required environment settings and must come from measurements; this harness profile is an evaluation profile, not a qualified NAS default.

On an isolated Linux host with Docker, Python Pillow, DejaVu fonts and qpdf:

```sh
python3 -B scripts/pdf/qualify.py prepare --directory /tmp/wfs-pdf-fixtures
docker build --target production -t wfs-pdf-qualification:local api
python3 -B scripts/pdf/qualify.py run --directory /tmp/wfs-pdf-fixtures --image wfs-pdf-qualification:local
WFS_NATIVE_PDF_FIXTURES=/tmp/wfs-pdf-fixtures dotnet test api/src/RecipeApi.Tests/RecipeApi.Tests.csproj --filter FullyQualifiedName~PdfNativeRendererTests
```

The branch-only `pdf-preview-validation.yml` workflow performs these checks without deployment/secrets. It uploads fixture PDFs, ordered PNGs, timings/output/dimensions, sampled cgroup peak memory and the candidate profile. Native subprocess tests check timeout kill/reap, attempt cleanup and subsequent work. The harness imposes a 512 MiB container memory ceiling and a one-CPU evaluation constraint; the API's native-child RSS guard is sampled, with a separate parent timeout. Do not confuse these two limits or host/docker-client RSS with native/container memory.

Fixture cases: text, scanned, bilingual French/English, cover plus recipe, ten pages, eleven pages, pathological dimensions, corrupt bytes, encrypted PDF with an empty user password, and multiple recipes (unsupported: no detector or splitting). Originals are hashed before/after. PNG count/order/dimensions are automated. Inspect quantity fractions, accents, units, temperatures, step order and the cover case on a phone. Record actual extraction accuracy using the normal recipe workflow separately; synthetic pixel assertions cannot establish it.

Record command, commit, container digest, resolved dependency versions/notices, CPU architecture/limits, input/output bytes, dimensions/pixels, peak memory/disk/time and cleanup outcomes. Repeat on the intended Synology architecture under household load before choosing the six positive `WFS_PDF_*` values in the Synology template. Do not claim ARM64 from x64 CI, Synology from an Ubuntu runner, or readability/AI accuracy from PNG generation. Record unavailable NAS/Android/iOS checks as blocked, and do not enable/deploy the preview until qualified.

No household documents, live secrets, model API calls, publishing or deployment are used by this harness. Generated fixture artifacts are public synthetic data; runtime attempt cleanup never deletes accepted recipe sources.
