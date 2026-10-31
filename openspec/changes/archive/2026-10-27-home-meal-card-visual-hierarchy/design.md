# Design

## Context and Existing Ownership

This revision incorporates Alex's 27 October 2026 feedback: the implemented cards lost the original refinement and cookbook feel, and dark text on yellow is specifically unsuitable for that direction. It refines the same Home scope rather than undoing its functional improvements. The user-supplied [Screenshot_20261026-212933.png](../../../../docs/visual-language/references/Screenshot_20261026-212933.png) is the visual anchor: a portrait-shaped white card on cream, a dominant near-square food image with deeply rounded corners, substantial soft image/card shadows, bold dark recipe title, quiet context and a blush terracotta duration pill. These are observed visual qualities of that screenshot, not measured CSS values or proof that a Git snapshot reproduces its deployment. The second reference, [Screenshot_20261026-212918.png](../../../../docs/visual-language/references/Screenshot_20261026-212918.png), shows the original pivot: the same deeply rounded white shell, image elevation and bold title, with a wider food crop, one full-width primary and two side-by-side secondary choices. These are complementary compositions, not identical image aspect ratios. Capture, voting and navigation shown in the references remain out of implementation scope.

Current source at `e4d5be7e` uses `TonightMenuCard.tsx` / `TonightCardBase` and `TonightPivotCard.tsx`: a bounded 4:3 image capped at 16 rem, `shadow-lg`, prominent stacked controls, charcoal on ochre for Cook/confirmation and charcoal outlined secondary/disclosure controls. The original source comparison is `a4d360558d35c2f79e9cca08a9d31638d8d25569` (the parent of that implementation commit). These are source references, not claims of matching live deployment.

Retained Session 4 contact sheets show the current treatment, including missing-photo and long-text stress cases. They help assess hierarchy but do not demonstrate an appetizing photo-led composition. Earlier command/contrast/geometry evidence in tasks.md remains historical evidence for its tested identity. It does not satisfy the two new aesthetic requirements.

Ownership remains local:
- Home's two cards own presentation, and the planned card owns disclosure visibility.
- `HomeCommandCenter.tsx`, Today/GOTO stores and existing services own branch selection, callbacks, freshness, eligibility, optimism and recovery; do not duplicate or revise their policy.
- `globals.css` owns existing Solar Earth tokens, Outfit/Inter and surface utilities. No font, palette, shared button primitive or package change is needed.
- `docs/visual-language-reference.md` and its SVG boards explain the direction, not runtime acceptance. Update them to separate historical/current treatments from revised proposals.

Before implementation in a new session, open both linked repository PNGs with the image-viewing tool and inspect them at readable resolution. They are unchanged copies of the user-supplied captures, not runtime test baselines. Read them alongside the current/proposed distinction below; do not rely on filenames or prose alone.

## Decisions and Tradeoffs

### Recipe-led composition

Keep the cream canvas, warm white/cream paper-like card, generous rounding, confident Outfit title and Inter body. Restore meaningful photographic space and soft layered depth rather than flattening the card into a stack of controls. At ordinary mobile text size start with a near-square photograph like the screenshot, with a taller crop also available where the subject warrants it, without the current shallow 16 rem cap. The card as a whole has portrait presence; the image itself need not be forced to 4:5. Keep image height independent of text and actions; allow a different image crop/proportion at narrow widths or enlarged text. Do not restore the original fixed card height or absolute flipping faces.

Use restrained elevation to distinguish the card from the canvas and subtly frame the image. Shadow strength, crop and spacing are visual decisions evaluated together; neither "remove all image shadows" nor "one shadow only" is an acceptance rule. Avoid decorative noise, fake paper texture, extra fonts and ornamental badges. Keep essential text on a stable readable surface.

For a ready GOTO, preserve the photo/title hierarchy and rounded/elevated frame while retaining explicit unassigned-family-choice context. Follow the pivot screenshot’s wider crop (roughly 5:4 as a starting point, subject-dependent) rather than forcing the meal card’s nearly square image onto it. Neither screenshot establishes a mandatory CSS aspect ratio. Empty/checking/preparing/Mystery states need an intentional composition: a modest existing icon, useful state text and clear choices. Do not reserve a large gray image slab when no useful recipe image exists. If an image URL fails, use the same warm fallback rather than a broken-image/alt-text block. Fallback handling is local presentation only; do not add image-fetch retries or generated imagery.

### Home action palette

Cook, ready-GOTO Make this tonight and the no-ready-GOTO primary Quick Find use light text on existing rich terracotta. Starting pair: white or cream-100 text on terracotta-600, pressed terracotta-700. Both light options must be checked against the actual background/states; white/terracotta-600 is documented at 5.81:1 and cream/terracotta-600 at approximately 5.63:1. Use implemented token classes, not copied hex literals. Prefer the subtly warmer light option when it fits the composition and passes measurement.

Ochre stays in the identity as restrained accent warmth on these cards, not as the Cook/confirmation field or a dark-text/yellow duration badge. Keep duration subordinate using the screenshot’s restrained blush terracotta pill with readable dark terracotta text, or quiet text beside the existing Clock vocabulary if wrapping needs it; preserve the current localized wrapper and units. Removing every badge is not a goal. This is a Home-specific creative decision: Discovery/voting/navigation and sage's broader roles remain untouched. Quick Find's current indigo is source evidence, not a rule requiring its retention as Home's primary action.

### Visible actions with less framing

Cook is the one visually dominant control on the planned card. Change plan remains directly visible using a quiet tonal/outlined secondary treatment; use an existing dark terracotta or readable charcoal label, avoiding a heavy black frame. View ingredients / Hide ingredients becomes a text-style button with a small chevron and a transparent generous hit area, not another full outlined pill. It retains `aria-expanded`, `aria-controls`, focus and 48×48 CSS px target.

Alex’s implementation review further requires the ordinary mobile planned card to keep Cook and Change plan in one compact row so the next Home options invite scrolling. Preserve the app’s action-icon convention, use modest horizontal padding, and allow whole-word label wrapping within that row at 320 px to fit complete EN/FR labels; retain the near-square food image. Enlarged text may reflow rather than clip or shrink labels.

An action row can put Cook beside Change plan when both complete EN/FR labels and hit areas fit; use content-driven stacking when necessary. Do not force a two-column row, shrink labels or treat all full-width layouts as a failure. Evaluate visual weight, spacing and grouping rather than counting rows. Keep actions before expanded details, using the existing callbacks and unique IDs.

For the pivot, follow the reference’s grouping: a primary action above two quieter side-by-side alternatives when labels/targets fit, stacking at narrow widths or under text growth. Make this tonight leads when ready; otherwise Quick Find leads. Order In remains enabled with its label/ShoppingBag cue in a quieter treatment, and Profile setup stays below immediate supper choices. One filled primary plus quieter alternatives should read as an invitation to supper. Dark outlined controls must not become the principal visual motif.

### Editorial typography

Keep the recipe title as the dominant text, with confident weight and deliberate line height rather than making headings/context/actions equally loud. Existing Outfit and Inter suffice. Context and duration are quiet through scale, weight and spacing, not low opacity or tiny tracked labels. Retain existing duration wrapper/units as required by the initial specification; this revision does not authorize changing exact localized duration behavior. Ingredients can read as recipe content with comfortable rhythm; avoid giving every ingredient the weight of an action. Preserve description, empty feedback and full EN/FR meaning.

## First Observable Slice

Session 5 restyles the actual planned card at `/home`, with a representative usable food photograph, ordinary title and supplied duration. The real seam is Home → card → image rendering/CSS/locale/disclosure → existing cooking/recovery callbacks. Use the supplied screenshot as the creative anchor, then compare controlled original/current/corrected renders at the same content, viewport and scale where source reconstruction is available. Do not claim a reconstruction is the actual supplied capture. Browser API fixtures stay at the existing external boundary. Do not check out/revert the shared worktree or start an original-version server on shared ports; use isolated rendering or an owned temporary worktree if an original render is needed.

The first slice must demonstrate cookbook composition and preserve real initial Cook/Change plan, disclosure and cancel behavior before extending to pivot states in Session 6. Session 7 reconciles the combined current identity; it does not defer a prior session's own rendered review.

## State, Concurrency and Recovery

Disclosure remains explicit and local: a new recipe collapses it, same-recipe hydration retains it, and hidden content is not keyboard reachable. No ancestor whole-card flip is restored. Image failure presentation must reset when the source/recipe changes and must not alter selection or submit a mutation. Preserve all existing date, optimistic assignment, GOTO readiness, Mystery and staged recovery semantics. A visible recipe or successful image is not evidence of persistence. No new saved badge, automatic action, provider request or retry policy.

## User Experience

All eight delta requirements apply: retain the original six functional/accessibility obligations and add refined cookbook composition plus Home action styling. Use a focused visual rubric in each implementation session:

| Criterion | Evidence of the intended result | Rejection signal |
|---|---|---|
| Photography | Food/title lead; meal image near-square, pivot wider as in their respective references; subject retained | Shallow thumbnail, empty gray slab or controls dominate the card |
| Type | Recipe title anchors the composition, with quiet readable context/duration | Equally loud labels, oversized context or dense application-form appearance |
| Material | Warm canvas/card, coherent rounding, considered spacing and soft depth | Flat utilitarian panel or heavy borders enclosing each item |
| Actions | One terracotta/light-text primary; directly discoverable secondary and text-style disclosure | Dark-on-yellow action, three equally prominent boxed controls or faded enabled alternatives |
| Adaptation | Same character across planned/ready/empty states, with reflow for EN/FR and larger text | Fixed-height clipping, shrunk labels, forced columns or huge decorative fallback |

Retain both supplied screenshots alongside the review as the respective meal-card and pivot visual anchors. Capture controlled side-by-side comparisons using the same actual food photograph, ordinary recipe content, viewport and locale. Compare available original reconstruction, current pre-correction and corrected renderings. If the exact original photo/source is unavailable, identify that limitation and use the supplied screenshot for original composition plus matched representative photos for current/corrected comparisons; do not block on reconstructing a historical deployment or imply pixel equivalence. Record a short assessment per rubric row, describing what changed and any remaining mismatch. A designer assessment is qualitative evidence; do not claim that a pixel ratio or passing test proves beauty or that Alex approved an unseen result. This is part of normal scoped acceptance, not an extra approval workflow.

At ordinary size review representative usable photos first, including both light/dark food images; separately test missing/failed imagery, long titles, long/empty ingredients and checking/preparing props. Reuse existing EN/FR matrix at 320 px, 390×844, 412×915 and iPad 820×1180/1180×820, including 200% text growth. Check text and meaningful-control contrast on actual composites, 48×48 CSS px targets, page overflow, navigation clearance, Tab/Enter/Space, visible focus and reduced motion. A quiet control can have a large transparent hit area; an ornamental card edge does not need to become a dark control border.

No new screenshot-baseline service, design system or fabricated aesthetic unit tests. Add meaningful red coverage only for changed behavior such as image-failure fallback/reset; use before/after rendered evidence for style-only changes. Keep current interaction tests as regressions and preserve method/body assertions at existing API mocks. Physical-device/screen-reader/live-service qualification remains distinct from browser emulation.

## Risks and Deferrable Questions

- Generous imagery can push actions down the page. Preserve scroll/navigation reachability, use proportionate crops and relax proportions under text growth without losing photo priority at ordinary size.
- The original UI's tiny low-contrast labels and hidden actions are not part of the desired restoration. Restore its refinement while preserving current usability.
- The reference boards are schematics of roles/states, not a cookbook mockup. They must no longer recommend the rejected yellow Cook treatment; representative rendered photo review establishes the composition.
- Exact crop, elevation and spacing are tunable within this direction. Functional gate records are retained, and acceptance of the new aesthetic requirements remains pending until these sessions run.
