# Design

## Context and Existing Ownership

Investigated `codex/working-session` at `471ee9e9dbc15fa4d83315a5c1980f3dccdbef4d`. Production source was not changed. The existing recipe-library requirement already promises front-matched backing bounds; this is a defect in that promise during transitions, not a request for new card styling.

`RecipesExperience.tsx` owns the four-record window, keyed by recipe identity and render version, inside `AnimatePresence mode="popLayout"`. Advancing a six-record collection inserts a new tail on each of the first two advances. `RecipeStackCard.tsx` owns the relative front, absolute backing cards, content-dependent front height, shadows and motion. It supplies its own DOM ref but does not accept/compose the ref injected by the presence wrapper. Its `motion.div` has `layout`, and its depth pose is applied through animation controls in an effect rather than a mount pose. Current depths use scales .95/.90/.85, y offsets 15/30/45px and opacity .7/.4/.1. These values and existing shadows remain the visual reference.

### Reproduction and observations

A temporary Playwright investigation used the real `/recipes` route and card components with six GUID-based fixture recipes, matched summary/pagination counts, selected mock member, loaded synthetic SVG heroes and no production API writes. At 390×844 CSS pixels it sampled every available animation frame, recorded DOM identity, front role, layout height, bounding box, computed transform/opacity and parent height, and captured entry/mid/settled screenshots after four successive left advances. Equal-title and alternating short/long-title cases were separate runs. The initial run's mock summary count was inconsistent with its six loaded records; the confirmation run corrected summary/pagination to six. Navigation ordinal was not used to infer geometry.

| Case | Direct observation |
| --- | --- |
| Equal one-line titles | Settled card height about 358px. On each of the first two advances, a new rear node first sampled with `transform: none`, opacity 1 and layout height about 717px. Both outgoing and promoted nodes carried front state during overlap. |
| Alternating title lengths | Front layout heights about 358px/448px. New rear height about 807px during overlap, approximately the sum of outgoing and incoming fronts. Full titles explain legitimate front-height differences, but not this combined-height pulse. |
| DOM-only flow isolation, equal titles | A diagnostic observer took only the zero-opacity departed front out of normal flow while another front existed. Parent height stayed about 358px and height doubling disappeared. A new rear still first sampled at full scale/opacity. This was a browser-only intervention, not a source fix or implementation proof. |

Temporary evidence: `/tmp/wfs-shadow/repro.spec.ts`, `playwright.config.ts`, `confirmed-repro.log`, `{equal,varied,flow-isolated}-frames.json`, and `{case}-advance-{1..4}-{entry,mid,settled}.png`. Representative before/after diagnostic frames: `equal-advance-1-entry.png`, `equal-advance-1-settled.png`, `flow-isolated-advance-1-entry.png`. Files are temporary session evidence; fixture/procedure and findings are recorded here for future implementation tests. Timing samples are actual browser observations, not a guarantee that every physical display frame was captured.

### Cause and limits of inference

Two mechanisms are supported independently: (1) departed/promoted fronts temporarily contribute combined flow height; the diagnostic removal eliminates that doubling; (2) newly mounted rear cards start at default full scale/opacity, which persists even when combined flow height is prevented. The card source does not pass the presence ref to its DOM root. Installed `framer-motion/dist/es/components/AnimatePresence/PopChild.mjs` clones a ref onto its child, measures that DOM node, and skips absolute positioning when that ref is missing. This explains why the intended pop-out is not established through this custom component boundary.

Layout projection can amplify the visible resize: sampled equal-title frames included a rear y-scale near 1.94 after its untransformed height returned to 358px. Its independent contribution has not been isolated by disabling projection. Do not claim it is the sole cause or remove it preemptively. Photographic-image loading, other browsers, physical devices, reduced-motion settings, Search, previous navigation and page boundaries were not qualified by this reproduction; they belong in acceptance below.

## Decisions and Tradeoffs

1. Restore the existing presence/layout contract: compose the externally supplied presence ref with the component's local card ref at the actual `motion.div` root, using the installed React/Motion APIs. Keep lifecycle cancellation, tap-vs-drag guards, focus, and recipe identity intact. The trade-off is careful ref ownership; replacing the whole animation model would create a much larger regression surface.
2. Establish each mounting card's assigned pose before first paint. A fresh rear should begin at its depth pose; an already mounted backing card should still promote normally. Mount pose must not reset ongoing user drag or replay an entrance on every render. Simply speeding up the 250ms animation would still leave incorrect first frames.
3. Retain full front titles and content-driven height. Fixed-height cards or title truncation would hide this symptom by sacrificing approved behavior. Equal-height advances should not resize backing geometry; genuinely different title heights may reflow, with backing cards bounded to the front rather than two fronts combined.
4. Keep layout projection enabled. After the first two corrections, measurements exposed a separate backing-origin transition: a 358px rear entered with a 45px bottom gap, then settled around an 18.12px gap because projection normalizes its origin to center. Match that existing resting center origin explicitly for backing cards from mount. Keep the front's existing motionStyle origin unchanged. This preserves the settled shadow/depth appearance instead of disabling projection or increasing visible peeks. Do not alter shadow tokens, image height, stack width, navigation thresholds or shared Discovery motion to mask the issue.

## First Observable Slice

Render six equal-height records through the real Recipes stack, advance twice via real drags, and observe each newly inserted tail from its first paint. Integration seams are real collection slicing/presence → RecipeStackCard → DOM layout/motion/CSS; HTTP alone uses existing mock-api boundaries. The expected correction removes both the full-pose entrance and the combined-height excursion while retaining one advance per gesture and the next-card preview. Then exercise alternating title heights and backward promotion using the same slice.

## User Experience

Keep the current shadows, depth spacing, image/time treatment, full wrapping front title, bounded immediate preview and quiet deeper peeks. No new controls or copy are needed. Preserve front Enter/Space detail opening, return focus, passive backing cards, drag cancellation and navigation availability. With short screens, enlarged text and bilingual names, intentional vertical scrolling remains preferable to clipping or imposing a new fixed-height card. Reduced motion must not expose an incorrect mount frame.

## Risks and Deferrable Questions

- Ref composition must work with the installed React 19 ref model and Motion measurement, while local hit-testing/focus refs still point to the same root. Verify the real presence boundary, not a mocked animation library alone.
- Frame regressions must assert before settling. Account for intentional front rotation/drag transforms and legitimate title reflow; compare untransformed layout height and depth-relative geometry, not a universal constant screenshot rectangle.
- The exact need for a later projection adjustment is a bounded implementation experiment, not permission to redesign the stack. If fixing it requires changing approved title, layout or gesture behavior, stop for review.

## Implementation checkpoint

The scoped correction uses the installed public Motion `useComposedRefs` hook to compose the React 19 ref prop with the local card ref, and supplies the calculated depth as the mount pose. Layout projection remains enabled, and the backing mount origin now explicitly matches its existing projected resting center. Shadow tokens, full titles and front gesture code remain unchanged. Initial equal/varied frame regressions passed without a projection adjustment. Extended frame cases passed for phones, iPad layout, landscape, French enlarged text and reduced-motion preferences; these are Chromium emulations with synthetic loaded images, not physical-device or photographic-asset qualification. Detailed commands, transient broader-test failures and later checks belong to tasks.md.

### Backing-origin measurements

A later raw-matrix-Y assertion was insufficient: projection can add compensation, so 71.8793px of transform was not itself a visual gap. Physical bounds established the actual remaining mismatch. Two fresh tails entered with a 45px parent-bottom gap (one bottom origin, one center origin with compensated Y), while the existing center-origin resting target was about 18.12px for a 358px card at scale .85 and Y45. Matching the backing origin to center at mount kept both new tails at 18.12px with Y45. Before/after samples are `/tmp/wfs-stack-origin-before.json` and `/tmp/wfs-stack-origin-after.json`. The regression now compares rendered parent-relative depth to the existing center-origin scaled target with 2px rounding tolerance, and checks resting appearance too. An exploratory front-only projection mode was not retained.
