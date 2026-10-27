# Implementation evidence

Current candidate: Today label and faint decorative divider only, with neutral fixed date markers. Contour and pale-fill trials below are historical; the final neutral-date section supersedes their acceptance/review claims.

## Readability baseline — task 1.1

Clean initial worktree. Production files unchanged during red runs. `task test:unit -- 'src/app/(app)/planner/page.test.tsx' src/components/planner/PlannerDragHandle.test.tsx`: **expected red**, French action receives English text; 59 tests pass, 1 fails. Real EN/FR locale tables are used by the page tests.

`task test:e2e -- e2e/planner.spec.ts --grep readability`: final baseline run **expected red**, 8/8 cases fail for contrast, uppercase context and/or French action name. Planning-sheet entry, fixed 40px date width and viewport containment pass. Matrix: EN/FR, 390×844 phone, 768×1024 and 1024×768 iPad, 320×900 with doubled text sizes. Screenshots wait for the real entrance animation to complete. Captures and raw measurements: `/tmp/wfs-planner-readability/baseline/final/test-results`, `/tmp/wfs-planner-readability/baseline/contrasts.json`; log `/tmp/wfs-readability-baseline-final.log`.

Method: Chromium 1× raster, computed foreground converted through browser canvas to RGBA. Temporarily remove only that foreground, disabling its color transition; screenshot the actual composite (glass, background blobs, hover/pressed/grabbed fills retained). Sample every second interior pixel, alpha-composite foreground, calculate WCAG luminance ratio and retain the unrounded minimum. Raw records contain foreground/background/state/locale/viewport. Text threshold 4.5, meaningful Plus/grip threshold 3. The dashed action edge is decorative: text plus Plus identify the action independently. No global accessibility claim.

| Element/state | Minimum ratio | Baseline result |
|---|---:|---|
| Week context | 1.856355561126319 | Fail |
| Fixed weekday | 2.3240947256624334 | Fail |
| Fixed month | 2.3304884821285414 | Fail |
| Plan text default/focus | 2.6675674398236358 | Fail |
| Plan text hover | 2.5120619879664177 | Fail |
| Plan text pressed | 2.3152669425258745 | Fail |
| Plus default/focus | 1.8921583973231206 | Fail |
| Plus hover | 3.4077655035474175 | Pass |
| Plus pressed | 3.073095682618538 | Pass |
| Grip default | 5.479721035184486 | Pass |
| Grip hover/focus | 6.991240671587401 | Pass |
| Grip grabbed | 5.82427628546149 | Pass |

Sampling calibration: early runs included a fading foreground in the background raster and captured entrance animation; those ratios/captures are superseded. A separate server-lifetime race produced connection-refused errors; that run establishes no red. The final baseline above has only intended failures.

## Readability implementation — task 1.2

Green: same focused unit command **60/60 passed**; same focused browser command **8/8 passed**. Sentence-case 14px/20px semibold Outfit week context uses charcoal-600; fixed weekday/month use charcoal-600; localized action/Plus use terracotta-600 with terracotta-700 hover. Grip uses opaque charcoal-600, sage-700 hover/grabbed and explicit charcoal focus outline. Existing hit areas/date-column width/meal layout and gesture logic retained.

Measured minima across the matrix: context 7.326678327863883; weekday/month 6.906879662895932 or greater; action text/Plus default/focus 5.586312406552003 or greater; hover text 8.272688499611956 or greater; pressed text 7.282348449957811 or greater; pressed Plus 6.60 or greater; default grip 7.32 or greater; hover/focus grip 6.99 or greater; grabbed grip 5.82 or greater. Raw unrounded comparisons are in `/tmp/wfs-planner-readability/controls-contrasts.json`; captures `/tmp/wfs-planner-readability/controls/test-results`; logs `/tmp/wfs-readability-green.log` and `/tmp/wfs-readability-unit-green.log`. No local stable-surface fallback was needed for these controls.

## Readability preservation — task 1.3

`task test:e2e -- e2e/planner.spec.ts`: **73/73 passed**, log `/tmp/wfs-planner-controls-full.log`. Includes real pivot entry, previous/next/directional return navigation, pointer hold/slop/native-scroll cancellation, keyboard movement/focus/boundaries, fixed date source/destination/overlay/cancellation, reconciliation and existing EN/FR layout cases. Focused readability matrix adds 320px doubled text, complete French action names and viewport containment. This is Chromium with HTTP doubles, not physical touch-device qualification.

## Temporal red — task 2.1

Before temporal production edits: `task test:unit -- 'src/app/(app)/planner/page.test.tsx'`: **15 intended failures, 45 passes**. Real reactive todayStore, calendar helpers and controlled monotonic elapsed time cover all five Today content states, neutral unavailable/invalid/expired context, failed expiry refresh, successful Sunday-to-Monday refresh, replacement/unmounted timers, no per-row refresh, retained old dates, different device time and date-bound recipe swaps. Logs `/tmp/wfs-day-unit-red.log`.

`task test:e2e -- e2e/planner.spec.ts --grep 'day emphasis'`: **30 intended failures, 2 passes** (other weeks remain without Today). Matrix contains Monday/Wednesday/Sunday, EN/FR phone/iPad portrait/landscape and 320px doubled text, all Today content states and movement/focus feedback. Captures `/tmp/wfs-planner-readability/before-temporal/test-results`, log `/tmp/wfs-day-browser-red.log`. This comparison baseline already includes the separately verified control-readability slice; the earlier baseline records original control appearance.

Additional demonstrated quiet-row failures: Chosen 3.2926853303426036, change icon 1.8987650290353122, non-cooking label 3.9753272779886912. These require local foreground corrections on past rows, in addition to flattening decoration; recipe text and grip already pass. Production date emphasis and calendar effect were absent during these red runs. No tooling failure counted as red.

## Contour trial green and combined preservation — tasks 2.2–2.3 (superseded)

Final focused units: `task test:unit -- 'src/app/(app)/planner/page.test.tsx' src/lib/deployment-calendar.test.ts src/store/todayStore.test.ts src/components/planner/PlannerDragHandle.test.tsx`: **124/124 passed**, `/tmp/wfs-planner-final-unit.log`. Shared reactive calendar/anchor/version, civil-date validation and one ceiling-rounded monotonic expiry timer are used. Expiry neutralizes cues even if refresh fails; context replacement/unmount cancels the timer; missing context requests once per page, with shared-store deduplication retained. No meal/classification mutation, guessed date, per-row fetch or new retry/error flow.

`task test:e2e -- e2e/planner.spec.ts e2e/planner-non-cooking-days.spec.ts e2e/planner-voting-identity.spec.ts`: **130/130 passed** with the final 1px contour and decorative separator, `/tmp/wfs-planner-final-browser-thin.log`. This includes the 8 readability cases, 34 day-emphasis cases and existing Planner/non-cooking/voting preservation. Actual browser HTTP fixture envelopes use existing schedule/smart-defaults/session operations, with matching voting identities for pending suggestions. Unit calendar/context cases complement browser page/store/network/localization integration; they are not live deployment-timezone qualification.

Raw final composites: `/tmp/wfs-planner-readability/final-control-contrasts.json` and `/tmp/wfs-planner-readability/final-temporal-contrasts.json`. The helper now centers measured content above fixed navigation, incorporates ancestor opacity, moves the drag overlay off the grip, and samples the straight exterior edge of the temporarily hidden marker ring. Decorative rule carries no independent state or contrast threshold. Measured minima (unrounded comparisons in raw records):

| Affected temporal element | Minimum ratio | Result |
|---|---:|---|
| Today text | 5.4530848468898565 | Pass ≥4.5 |
| Today outline | 5.586312406552003 | Pass ≥3 |
| Past recipe text | 14.23101734183702 | Pass ≥4.5 |
| Past Chosen status | 6.298899913715459 | Pass ≥4.5 |
| Past change icon | 4.437335786280775 | Pass ≥3 |
| Past grip | 7.326678327863883 | Pass ≥3 |
| Past empty action | 5.634631156798954 | Pass ≥4.5 |
| Past non-cooking label | 7.326678327863883 | Pass ≥4.5 |
| Past non-cooking hover | 6.663941428181701 | Pass ≥4.5 |
| Today outline with drag destination | 5.634631156798954 | Pass ≥3 |

Observed refinements: (1) Initial 200% uppercase date labels touched the inset marker edge. Compact marker, normal-case labels, normal tracking and bounded wrapping preserve the 40px column and complete labels; the 320px cases assert no date-label overflow. (2) The marker and sage destination outlines originally touched: measured 1.2414857120777514. Offset the sage destination outline on Today, retaining its fill/arrow and fixed geometry; measured green above. (3) Existing non-cooking hover opacity reduced past text to 4.436964802767162. Past controls now use a light background feedback instead of fading their readable foreground; green above. Logs `/tmp/wfs-planner-refinement.log` and `/tmp/wfs-quiet-hover-red.log` retain those red observations.

User refinement: Alex selected a faint line after Today / Aujourd’hui, then asked whether the date contour was too heavy. Agent judgment reduced the contour from 2px to 1px with unchanged readable colour, under the authorized visual-refinement task. Separator red: 5 intended missing-element failures and 55 passes (`/tmp/wfs-today-separator-red.log`). Thickness red: expected 1px shadow versus existing 2px (`/tmp/wfs-today-outline-red.log`). Both are covered by the final browser/unit green runs. No claim of human task-based usability success follows from this design conversation.

## Contour trial review — task 3.1 (superseded)

Review artifact: `/tmp/wfs-planner-readability/comparison.html`. It pairs the matched before-temporal and final combined candidate for Monday/Wednesday/Sunday, EN/FR, phone/iPad portrait/landscape and 320px doubled text; original pre-edit control captures are a separate clearly labeled section. Final raw/centered viewport captures are under `/tmp/wfs-planner-readability/final/test-results`. This is a staged before/proposed comparison, not a fabricated original baseline for dates captured only after the readability slice.

**Agent designer judgment: retain the refined local candidate for human review.** The explicit label and faint rule identify the day boundary; 1px compact marker is secondary, with no full-row Today border. The past uncooked meal stays named, uncooked and actionable; only its surface/shadow and necessary readability foregrounds change. Today gains one 20px line plus 4px margin in normal text; the decorative rule shares that line. Other rows have no reserved label band. The date column remains 40px, gap and meal flex space remain unchanged, and there are no added status badges/legends or removed actions. Keyboard focus, sage destination fill/arrow/offset outline, source/overlay and success rings remain separate.

The first enlarged-text candidate was revised before retention: uppercase labels collided with the ring; the outline stretched with meal height; and the 2px contour competed with the new divider. Compact content-bound marker, normal-case date labels, bounded wrapping and the 1px contour address those observed issues. At 320px with doubled text, some date abbreviations wrap and existing long recipe names clamp; controls remain reachable and affected labels complete. This constrained enlarged-text tradeoff remains visible in the comparison rather than being described as equivalent to the normal-size layout. Fixed navigation overlays a portion of full-page captures; centered Today viewport captures support reviewing the actual cue unobscured.

**Human usability evidence: pending.** Alex selected the decorative rule and raised contour weight in conversation; no participant was observed locating today, identifying supper/next action or using a past uncooked meal. No claim of faster scanning, reduced cognitive load, physical-device usability or whole-app accessibility conformance. A human review should check those tasks and whether the one Today line or enlarged-date wrapping competes with content. No wider visual-language adoption is authorized.

## Final integration scope — task 3.2

Reviewed task-owned paths: Planner page and page tests, drag-handle presentation, Planner browser tests, EN/FR common locale keys, this change's design/delta/tasks/evidence. Initial worktree was clean; no staged or unrelated changes were present. The large page diff is mostly indentation from the fixed-date/meal wrapper; gesture/keyboard/reconciliation code is preserved. Review restored the original opacity transition on future non-cooking controls while retaining non-fading past feedback.

Outcome review: readable localized controls and reliable neutral/fresh temporal states are implemented, with named red/green and integration evidence above. Engineering review: existing calendar ownership/validation/deduplication is reused; one cleanup-bound timer and two per-row presentation booleans introduce no server policy, endpoint, persistence or new clock/store. Required final repository checks are pending their invocation record. Preparation is scoped to the complete reviewed changed-path set; final results will be reconciled with the returned `record_path`.

API/schema/client/database/model runtime qualification: **not applicable** to unchanged contracts. Repository-required static contract and API regression checks remain applicable through `task verify`. Live backend, deployment timezone and physical-device checks: **not run**. Human usability feedback: **pending**, explicitly permitted by task 3.1. No sync, archival, publication, deployment, commit or push performed.

## Pale tint trial — rejected in visual review (tasks 2.2–3.1)

Alex selected “Use the pale date background” after suggesting the divider's accent tint as the date background. The final marker uses the exact same terracotta/15 background as the rule, dark date text, and **no contour**. Its fill remains compact/content-bound; the existing 40px column and meal width are preserved. The localized Today label and `aria-current="date"` communicate today explicitly. Tint and divider are decorative, with no independent ≥3:1 edge claim; essential date text is measured on the actual tint, including the mixed sage drag-destination composite. No separate badge was added.

New red before production edit: `task test:e2e -- e2e/planner.spec.ts --grep 'en day 2 390px combined'` failed on the existing contour where no shadow/background matching was expected (`/tmp/wfs-today-tint-red.log`). Updated browser cases require a nontransparent background equal to the divider's computed background, no marker box-shadow/outline, and readable weekday/number/month on actual composites. Removed the obsolete ring-specific sampling branch; retained real-background sampling, alpha and ancestor-opacity handling.

Green with final tint: **124/124** focused unit tests (`/tmp/wfs-planner-tint-unit.log`) and **130/130** named Planner/non-cooking/voting browser tests (`/tmp/wfs-planner-tint-browser.log`). The 24 combined capture identities and existing movement/planning/navigation/status tests remain covered. Raw final tint records: `/tmp/wfs-planner-readability/tint-control-contrasts.json`, `/tmp/wfs-planner-readability/tint-temporal-contrasts.json`. Minima: Today text **5.4530848468898565**, date text on tint **5.9069291015108085**, date text on tint while targeted in sage **5.040848812170953** — all pass ≥4.5. Past text/icon results remain the passing values above. The decorative tint is not presented as a control-identifying border.

Updated comparison: `/tmp/wfs-planner-readability/comparison.html`, preview `/tmp/wfs-planner-readability/planner-fr-phone.png`, final captures `/tmp/wfs-planner-readability/tint/test-results`. The old contour comparison is retained separately as `/tmp/wfs-planner-readability/contour-comparison.html` and is not the selected candidate. Source-backed size confirmation: the date marker is intentionally shorter/content-bound and vertically centered relative to the meal card; Alex's observation of that difference was acknowledged. No unrequested equal-height date column was introduced.

**Agent recommendation: retain the pale-fill candidate for human review.** It lowers the contour's visual weight while keeping a single explicit date boundary. No extra row band, widened date column, lost meal width, legend, full-row Today border or count badge. No observed state confusion in browser movement/focus/success checks; that establishes tested behavior, not human recognition. **Human task-based usability feedback remains pending.** The user's design selections are attributed feedback, not proof that people find supper or act faster.

## Repository verification checkpoint before tint

The first complete changed-path `task verify` invocation returned `.task/agent-finish/runs/a807485e940b4e15981e95ec849c6bcd.json`. Documentation, lint, format, typecheck, units (**1,204**), browser impact (**460 passed / 47 skipped**), API regression (**1,249 passed / 154 skipped**), static contracts and content identity passed. Strict OpenSpec validation failed only because adding separator prose made one requirement exceed its length limit. Moved decorative detail into a scenario, preserving the requirement, and `task spec:check -- explore-planner-control-readability --type change` passed. This checkpoint tested the contour candidate, not the later tint; its full application evidence is therefore historical. A fresh full changed-path verification will qualify the selected tint. Skipped browser/database/provider cases do not establish live/physical/model qualification.

## Final neutral-date treatment — supersedes contour and tint trials

Alex reported that the added date colour still felt too strong and asked whether the line does the job. The resulting calmness revision keeps **Today / Aujourd’hui plus the faint decorative divider as the only visual Today emphasis**. Fixed dates stay neutral: no added background, box-shadow or contour. `aria-current="date"`, fixed date placement, reliable calendar classification and quieter past rows remain. The ordinary sage drag-destination outline/fill/arrow is preserved without the extra offset needed by the discarded contour. Proposal, delta, design and tasks now describe this final treatment.

Red before removing the fill: `task test:e2e -- e2e/planner.spec.ts --grep 'en day 2 390px combined'` failed because the marker still had the tinted background where a transparent one was required (`/tmp/wfs-today-neutral-red.log`). Green: **124/124** focused unit tests (`/tmp/wfs-planner-neutral-unit.log`) and **130/130** named Planner/non-cooking/voting browser tests (`/tmp/wfs-planner-neutral-browser.log`). Cases explicitly assert no marker background/shadow/outline, retain all Today content/locale/calendar cases, and verify focus, source/destination/cancellation, recipe movement and success feedback.

Final rendered minima: Today label **5.4530848468898565**, neutral fixed date text **7.073180423888699**, fixed date text while drag-targeted in sage **5.948137063010444**; all pass ≥4.5. Weekday/number/month are measured individually. Other affected control/past-row contrast checks retain their passing thresholds. The faint divider is decorative and hidden from assistive technology; no independent state or edge contrast claim is made for it.

Current comparison `/tmp/wfs-planner-readability/comparison.html`, preview `/tmp/wfs-planner-readability/planner-fr-phone.png`, captures `/tmp/wfs-planner-readability/neutral/test-results`, raw measurements `/tmp/wfs-planner-readability/neutral-control-contrasts.json` and `/tmp/wfs-planner-readability/neutral-temporal-contrasts.json`. All comparison image/link targets were checked. The original-control and before-temporal baselines remain clearly labeled; old contour/tint comparisons are separate historical files.

**Review recommendation: retain this neutral-date candidate.** The label and line give the row a clear date boundary with less decoration. No additional badge, label band, full-row border, lost meal width or wider date column. Direct visual feedback was received and the reported excess colour removed. **Task-based human usability feedback remains pending**: no observed participant finding today/supper, acting on an uncooked past meal or comparing scan time. The 320px doubled-text wrapping remains visible in the artifact; this is not a physical-device or whole-app accessibility qualification.

The fresh complete changed-path verification below qualifies this neutral-date candidate; earlier full repository results apply only to their recorded contour inputs.

## Final repository qualification — task 3.2

Complete reviewed **11-path** preparation passed (`/tmp/wfs-planner-prepare-final-neutral.log`); subsequent scope review found only authorized page/handle presentation, locale, tests and change-artifact edits. Final complete changed-path `task verify` **passed**, with `automated_checks_passed: true`:

`record_path: .task/agent-finish/runs/fd51f55d48f2438fb72a9da92a4f8858.json`

| Check | Result |
|---|---|
| Changed documentation | Passed |
| Strict OpenSpec | Passed: 35/35 items |
| Lint / formatting / types | Passed |
| Repository PWA units | Passed: 1,204/1,204 |
| Browser impact | Passed: 460; skipped: 47; failed: 0 |
| API regression | Passed: 1,249; skipped: 154; failed: 0 |
| Static contract/client checks | Passed |
| Input/content identity | Passed |
| Harness tests, live endpoints, database behavior | Not applicable to selected application/documentation scope |
| Live backend, deployment/device timezone, physical devices, model/provider qualification | Not run / not applicable as described above |
| Human task-based usability | Pending; direct visual feedback and resulting refinements are recorded above |

Skipped cases are not passed live/database/device qualification. The targeted **130 browser / 124 unit** acceptance and final repository checks support the selected neutral-date treatment. No unresolved automated failure or blocked required check remains. The earlier long-requirement failure is resolved by the later passing strict validation. This evidence/task update is later documentation content, not an attempt to attach the application run to a new digest; a scoped documentation verification follows it. Application-file SHA-256 values are retained in `/tmp/wfs-planner-readability/final-application-sha256.json` to confirm no application input changed during this documentation reconciliation. Changes remain uncommitted; no spec sync, archive, publication or deployment.
