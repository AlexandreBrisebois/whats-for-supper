# Ubuntu x64 PDF qualification observations — 2026-10-03

Tested source: `f8eb0af136e07934bc82d7f503478202c78de6a8` / `2f0dd1f5868a6d7776e3636199be610eb1f35ded` (subprocess helper registration correction, unchanged worker/render settings). Actions [37081241720](https://github.com/AlexandreBrisebois/whats-for-supper/actions/runs/37081241720) and [37081572433](https://github.com/AlexandreBrisebois/whats-for-supper/actions/runs/37081572433). The first fixture artifact was downloaded and inspected; this is not a claim that either entire workflow passed.

Production image from the first fixture run: `sha256:84f74e4b15b258f6acb55a49d56dcf29062b49c29d27ca57ccced0a84d39495e`, amd64, actual chiseled production target. Resolved PDFtoImage 5.4.0; PDFium Linux 152.0.7961; SkiaSharp/NoDependencies 4.150.1. One CPU, 512 MiB container ceiling, no network; ten-page processor ceiling. Profile: 200 DPI PNG, maximum dimension 4096, 16,777,216 pixels/page, 64 MiB total output, 512 MiB child RSS guard and 60-second parent timeout. These are **evaluation settings**, not final NAS defaults or worst-case capacity guarantees.

| Fixture | Result | Pages | PNG output bytes | End-to-end seconds | Sampled cgroup peak bytes |
| --- | --- | --- | --- | --- | --- |
| Text | passed | 1 | 66,353 | 1.181 | 27,086,848 |
| Scanned | passed | 1 | 116,340 | 0.552 | 50,991,104 |
| Bilingual | passed | 2 | 121,477 | 0.607 | 27,373,568 |
| Cover and recipe | passed | 4 | 183,558 | 1.000 | 28,303,360 |
| Ten pages | passed | 10 | 733,592 | 1.980 | 45,191,168 |
| Eleven pages | expected failure passed | 0 | 0 | 0.224 | 10,055,680 |
| Pathological dimensions | expected failure passed | 0 | 0 | 0.291 | 10,063,872 |
| Corrupt | expected failure passed | 0 | 0 | 0.222 | 11,059,200 |
| Encrypted, empty user password | expected failure passed | 0 | 0 | 0.292 | 10,444,800 |
| Multiple recipes, unsupported | rendered without detection/splitting | 2 | 95,837 | 0.653 | 27,955,200 |

All rendered letter pages were 1699×2200. Original source hashes stayed unchanged, page count/index order matched, and invalid prevalidation cases produced no pages. Times include Docker startup/monitoring, not isolated PDFium call duration. Peak samples are not an unsampled absolute maximum. Synthetic scanned PNG inspection showed readable English/French accents, quantities and step ordering on the available image viewer; it does not establish phone usability or AI extraction accuracy.

The later native test job passed **3/3**: actual ordered native PNGs, invalid source retention with subsequent work, and parent timeout kill/reap with gate reuse and temp cleanup. Later resource/cancellation tests require their own final run evidence. Compose interpolation passed off/opt-in/on using synthetic values. Changes to notice packaging and final source require a new image identity; retain these earlier observations under their actual identity.

The first image inventory exposed that PDFium's NuGet package omitted native notices. Packaging now retains the matching chromium/7961 distribution notice trees with upstream release SHA-256 checksums, plus pinned Skia/SkiaSharp and DejaVu notices. Verify the new image inventory in the final workflow. Including ARM64 notices does not qualify ARM64 execution.

Final NAS settings, worst-case scans near the transport/output ceilings, concurrent household load, phone readability, live extraction accuracy, installed Android shares and iOS picker are blocked/not-run until their actual targets are available. Do not enable or deploy based on this report.

## Final application identity and notice inventory

Actions [37083918393](https://github.com/AlexandreBrisebois/whats-for-supper/actions/runs/37083918393), renderer job 111090210862, source `b1b491a83fe9db5f0abef4355dfb3a6c111e12db`: **10/10 fixture cases and 4/4 actual native parent tests passed**. Artifact 11260490763 was downloaded and inspected. Production amd64 image: `sha256:83b674cc87d7ac0e130f5e9d24a1d521c7a7648c44ed23adbd62cca5d5e8812e`. Resolved dependencies and evaluation profile are unchanged from the explicit profile above.

| Fixture | PNG bytes | End-to-end seconds | Sampled cgroup peak bytes |
| --- | --- | --- | --- |
| Text | 66,353 | 0.556 | 27,209,728 |
| Scanned | 116,340 | 0.564 | 50,659,328 |
| Bilingual | 121,477 | 0.625 | 27,709,440 |
| Cover | 183,558 | 1.011 | 27,930,624 |
| Ten pages | 733,592 | 2.104 | 45,142,016 |
| Unsupported multiple recipes | 95,837 | 0.673 | 27,484,160 |

Eleven-page, pathological-dimension, corrupt and encrypted fixtures failed before producing pages, with source bytes unchanged. The four parent tests cover ordered native pages, retained failed source and subsequent work, timeout kill/reap/cleanup/gate reuse, and output/RSS budget breaches plus cancellation/cleanup. Compose off/opt-in/on passed.

Downloaded production inventory includes PDFtoImage MIT, SkiaSharp MIT, pinned Skia BSD and in-tree third-party notices, DejaVu copyright and matching PDFium chromium/7961 x64/arm64 notice trees (13 upstream component notice files per architecture). This qualifies notice packaging; ARM64 notices are not ARM64 execution evidence.

NAS architecture/profile, near-limit high-entropy scans, household load, phone readability, live extraction accuracy and actual Android/iOS behavior remain blocked/not-run. No production defaults or rollout guarantee is inferred from these measurements.
