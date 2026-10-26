# Demo experience refinement — isolated visual evidence

These 12 captures were generated and actually inspected in this cloud task, using Chromium and a local optimized PWA build on `127.0.0.1:3019`. They are browser emulation, not physical-device Safari/Chrome or screen-reader certification. No production or deployed-demo URL, real household data or provider was used.

## Captures

| Language | Viewport | Welcome | Explanation | Home after explicit dismissal |
| --- | --- | --- | --- | --- |
| EN | 390×844 phone | [login](en-phone-login.png) | [dialog](en-phone-dialog.png) | [home](en-phone-home.png) |
| EN | 820×1180 iPad | [login](en-ipad-login.png) | [dialog](en-ipad-dialog.png) | [home](en-ipad-home.png) |
| FR | 390×844 phone | [login](fr-phone-login.png) | [dialog](fr-phone-dialog.png) | [home](fr-phone-home.png) |
| FR | 820×1180 iPad | [login](fr-ipad-login.png) | [dialog](fr-ipad-dialog.png) | [home](fr-ipad-home.png) |

Built from main baseline `e680fb7966978da3fbde25453a241c7e69e2b2a1` plus this PR's implementation; isolated build ID `79B2g68Sa5FQcieayRRMZ`. The build used Demo disabled and a synthetic nonpublic build credential; the same build ran with Demo enabled and the public constant. Subsequent runs used a synthetic custom secret and disabled Demo without rebuilding. Source control's baked release artifact remains stable; no deployment credentials were touched.

The command was `CI=true task test:e2e:ci -- --config=e2e/welcome-demo.playwright.config.ts`, with the repository Node/npm pins, synthetic `WFS_WELCOME_DEMO` / `WFS_WELCOME_SECRET`, loopback-only backend and `PLAYWRIGHT_BROWSERS_PATH=/tmp/wfs-browsers`. The dedicated server refuses process reuse; browser traffic permits only its explicit loopback origin. Home server fetches fail against the deliberately unavailable loopback backend, then existing schema-compliant browser fixtures provide a synthetic empty household. This is UI/lifecycle evidence, not live-backend showcase qualification. No screenshot-specific visual redesign was made.

The public Demo run passed 14 tests; its disclosure-negative case is deliberately covered by the custom-secret run instead. The suite also exercised EN/FR Pixel (412×915), iPad landscape (1180×820), and short 320px phone layouts, keyboard dialog controls, 200% root text, reduced motion and measured band contrast/target bounds. The captures selected above show normal text at phone/iPad portrait sizes.

Observed: one compact sage band, cream login form, public prefill with the new helper, retained ochre Enter, readable shared phone sheet/compact iPad dialog, and ordinary Home after explicit dismissal. No clipping or overlapping login controls was visible in these captures. Existing Home strings and content were retained; these images do not claim a whole-app translation/accessibility audit.

The first focused tests reproduced empty public-demo Welcome despite server Demo identity, missing helper/accessible description, missing manual login band and focus restoration during departure. After implementation the focused set passed 67 tests. Source changes keep one shared explanation body and acknowledgement owner, and leave Home's automatic-entry observers in the app shell.

Private/custom-secret checks used raw HTML, an asserted `text/x-component` RSC response, serialized rendering data and loaded client assets with a synthetic canary. Explicit login used the real server authentication/token/cookie actions; edited and cleared values remained authoritative. No automatic authentication or second credential role was added.

## Evidence limits and verification records

Physical iPhone/iPad Safari + VoiceOver, physical Pixel Chrome + TalkBack and an actual OS keyboard were unavailable and remain unrun. Short viewport and large-text browser checks do not substitute for those devices. No merge, deployment, release image publication, spec sync or archive was performed.

Final aggregate Task/CI evidence and immutable source refs are recorded in the PR description after the final reviewed files are frozen; earlier check results do not claim final aggregate acceptance. One earlier database-verifier attempt rejected its own content identity because source was still being edited; that attempt is failed evidence, not a passing database qualification. The final gate must rerun it on frozen inputs.

The lint follow-up moved the existing primary dismissal button into DemoDialog itself, preserving its rendered markup and explicit-dismissal focus behavior. The optimized public Demo suite was rebuilt and passed again afterward; the captures above were refreshed from that build.


## Durable CI coverage

The household CI job now runs the existing dedicated public Welcome config after the ordinary private capability suite, using the shared optimized artifact. Only that step receives `WFS_WELCOME_DEMO=true` and the deliberately public `WFS_WELCOME_SECRET=Swipe-Match-Cook`. Its nested output directory preserves the ordinary suite's results/blob; both sets of files are retained by the existing household artifact upload. A public regression fails that household job and therefore the existing E2E gate. No additional CI build, backend/service or dependency was added.

The public invocation was qualified locally with CI's baked `http://127.0.0.1:5001` API URL, household selection and existing feature flags: **14 passed, one intentional private-canary negative-control skip**, and the ordinary output-preservation marker plus existing blob checksum remained unchanged. The existing private suite still covers disclosure/manual entry. The pipeline test observed the missing-step red and then passed with the scoped integration. These are historical CI-integration checks from head `3638d1f`; the title-correction captures below supersede the original image build identity.

## Approved title correction

On 26 October 2026 at 21:00 UTC, Alex confirmed the exact branding literal `Whats for Supper?`, including the question mark, for landing and Welcome in both languages. The French translated headings existed on main before this PR. Only `landing.title`, `auth.welcomeTitle` and their component fallbacks changed; localized surrounding copy, shared explanation prose and ordinary meal questions were retained.

The same isolated optimized-build command was run again with CI's baked loopback API URL and synthetic settings: **14 passed, one intentional private-canary skip**. The existing matrix now asserts the exact rendered landing and Welcome headings in EN/FR at all five viewport sizes before exercising explicit entry. The 12 phone/iPad login, explanation and Home captures above were regenerated and actually viewed after the correction; login headings have the requested spelling and question mark without visible clipping. Explanation and Home retain their existing copy. The separate private installation-identity suite also passed **4/4**. This remains synthetic Chromium UI evidence with the physical-device limits above.

The correction's final local Task run retained stable content and passed strict OpenSpec, lint/format/types, 1,070 unit tests, 1,249 API tests, static contracts, isolated endpoint parity and all 178 PostgreSQL tests. Its broad development browser child reached the existing 900-second limit around case 305/390, so the aggregate is explicitly blocked, not green. One earlier cook-mode 375px timeout passed unchanged on the isolated optimized build with retries disabled; no cook-mode or harness source changed. Full final-head optimized CI results and precise verifier records are in the PR description. The focused public/title and private suites above passed independently; neither their screenshots nor their success relabels the stopped broad child.
