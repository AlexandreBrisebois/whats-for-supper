# Validation evidence

## Baseline and scope

GitHub connector verified main at `2a5ff0b62484993c14d551aac6e035cf72caec29`, tree `905c366493676f3790ab58d7dba16031df4201ea`. The local checkout was advanced to that exact commit/tree using connector-fetched content and local Git objects. All remote GitHub operations use the connector.

PR 281's patch confirms that it replaced the localized subtitle with state-dependent paragraphs while adding aria-pressed. This patch retains aria-pressed and the existing handlers. Source inspection confirms docs/user-guide.md already describes Human OFF persistence, human re-enable and eventual Dreaming cooldown accurately; it remains unchanged.

Search's 16:9 image and mb-6 change appears in commit `c7bec241c32db74e33e70402843bf25c91ad22a5`, dated 2026-05-13. It combines with a 12px flex gap in current main. The Search cleanup changes only regular-card markup; the Top Pick subtree and all state/request logic remain unchanged. Browse production markup remains the reference, unchanged.

## Observed red and green

- `task test:unit -- src/components/recipes/DiscoveryToggleCard.test.tsx`: red, four English/French subtitle failures and one pending-control pass before implementation.
- `task test:e2e -- recipes.spec.ts --grep "discovery geometry" --workers=1`: first blocked by missing Chromium; after installation, red on narrow track geometry and desktop subtitle before implementation.
- `task test:e2e -- browse-all-stack.spec.ts --grep "shared discovery geometry" --workers=1`: red, all three ON track cases before implementation.
- `task test:unit -- src/components/recipes/DiscoveryToggleCard.test.tsx src/components/recipes/StackActionBar.test.tsx`: green, 21 passed.
- `task test:e2e -- recipes.spec.ts browse-all-stack.spec.ts --grep "discovery geometry" --workers=1`: green, six passed after installing the lockfile-matched browser. The first attempt after npm ci could not launch because the browser revision changed; no application failure was inferred from that attempt.
- `task test:e2e -- recipes.spec.ts --grep "compact search" --workers=1`: red, six intended geometry failures against unchanged Search; green, six passed after the compact markup change. Screenshot review found entrance opacity had not settled despite valid geometry; captures now explicitly wait for visible ancestors.

### Toggle geometry (CSS pixels)

| Surface / initial state | Width | Before track width | Before thumb contained | After track | After thumb |
| --- | ---: | ---: | --- | --- | --- |
| Recipe detail / OFF | 320 | 21.08 | No | 56 × 32 | 24 × 24, contained |
| Recipe detail / OFF | 390 | 29.66 | Yes | 56 × 32 | 24 × 24, contained |
| Recipe detail / OFF | 1280 | 56 | Yes | 56 × 32 | 24 × 24, contained |
| Stack / ON | 320 | 24.14 | No | 56 × 32 | 24 × 24, contained |
| Stack / ON | 390 | 33.14 | No | 56 × 32 | 24 × 24, contained |
| Stack / ON | 1280 | 46.75 | No | 56 × 32 | 24 × 24, contained |

After assertions cover both states and settled thumb offsets of 4px OFF / 28px ON, track containment and horizontal overflow. Detail also exercises a longer French subtitle in the real layout; component tests use the actual English/French translations. Browser API mocks test request and UI behavior, not database persistence.

### Search geometry at 360px (also checked at 390/430px)

| Property | Before Search | After Search / Browse reference |
| --- | ---: | ---: |
| Image ratio | 1.78 (16:9) | 1.33 (4:3) |
| Image inset from card edge | 13px | 1px border only |
| Image bottom to title top | 67px | 12px |
| Card radius | 32px | 8px |
| Title lines shown for long fixture | 1 | 2 |
| Time font size | 9px | 12px |
| Mobile column gap | 16px | 12px |

Both issue badges remain contained. Tests compare actual Browse geometry, cover Top Pick present/absent and preserve mounted results on detail return. Synthetic screenshots and JSON measurements are attached to Playwright reports; no household screenshots are included.

## Environment and independent checks

The initial workspace had Node 24 and older installed PWA packages. Initial toggle red evidence used those preinstalled packages with Node 26 after setup. Final checks use Node 26.12.0, npm 11.21.1, lockfile-installed PWA dependencies, their Chromium revision, OpenSpec 1.14.3 and .NET SDK 11.0.100-rc.2.26504.105. Kiota uses its compatible .NET 10 runtime.

.NET setup initially failed because its per-user shared-memory directory was read-only; the authorized elevated restore succeeded. Tooling was installed outside tracked source. No dependency manifests were changed.

- Broader browser acceptance: `task test:e2e -- recipes.spec.ts browse-all-stack.spec.ts search-hardening.spec.ts search-invalidation-recovery.spec.ts --workers=2`: 68 passed, zero retries/skips. Includes full 126/180 recipe cycles. Final toggle regressions additionally assert exact false/true/false PATCH values and unchanged stack identity/ordinal.
- Relevant component acceptance: 89 passed across Search page, detail, toggle, StackActionBar and issue badge tests.
- API preflight: 987 passed, 93 conditional/manual tests skipped, zero failed. These skips do not establish relational acceptance; no API/schema/persistence change is made here.
- `task gen:client:check`: passed; generated client is unchanged.

## Final verification

The strengthened final toggle run passed all six cases, including exact false → true → false PATCH bodies, pressed states, same stack recipe ID and ordinal, and final OFF on detail reload. Scoped task prepare formatted only the six selected application/test files; no generation or unrelated writes occurred. The first final-harness invocation, `.task/agent-finish/runs/65e05e7218e94bc19018fa1d0551b449.json`, passed documentation/spec/lint/format/types and all 838 unit tests, then correctly rejected runtime mutation: the first full Vitest run populated additional files under node_modules/.vitest-cache. Browser/API/static-contract checks were not run in that invocation. A diagnostic full unit rerun passed all 838 tests with zero cache-content changes, establishing the cause was cache warm-up. No harness exclusions or application code were changed. The retry passed with that stable runtime.


Full implementation verification passed in `.task/agent-finish/runs/ee46476629a344949e59f600d3c283f0.json`, content identity `6dd0bc088bd86fa346242c5641531fd8aaf5bdcd4af69ee1127efba6f24336af`: documentation, 34 spec checks, lint, format, typecheck, 838 unit tests, 280 browser tests (14 existing prerequisite/explicit skips, no retries), 987 API tests (93 conditional/manual skips), and five static contract checks. Database behavior, endpoint drift and agent-harness tests were not applicable to this presentation-only patch. Acceptance scenarios were separately reconciled against the geometry, request and screenshot evidence above.

The subsequent edits only complete/archive these records, sync the compact-card requirement into the canonical Search spec and update HANDOVER. Fresh applicable documentation/spec verification and exact published-head CI are reported in the PR; the implementation results above identify their original content precisely.
