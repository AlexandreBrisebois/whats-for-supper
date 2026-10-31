# Solar Earth visual language · v2

**Review reference, not an implementation specification.** This guide makes design
intent visible without changing the app, its palette, components or behavior.
Read it on demand for visual decisions; it is not a new startup requirement.

**Creative revision: 27 October 2026.** Alex reports that the implemented Home cards lost their refinement and cookbook feel; dark text on yellow is explicitly rejected for that Home direction. The planned-card and pivot cookbook treatments are implemented locally in Sessions 5–6 and reconciled in Session 7. The pre-refinement Home source snapshot was `e4d5be7e`; the original composition reference is its parent `a4d360558d35c2f79e9cca08a9d31638d8d25569`. Other journey examples retain their individually pinned source snapshots, not a new whole-app runtime audit.

**Current** means source-verified unless explicitly reported/observed. **Proposed** means review guidance, not shipped UI or permission to implement. The boards show selected roles/states; they are not cookbook compositions or screenshots. A mathematically readable pair establishes readability only, not aesthetic fit.

**No move away from green is agreed or proposed here.** The first boards
underrepresented both sage and icons by concentrating on Home contrast examples.
This correction makes their existing roles visible; it is not a new palette,
icon system or redesign. The source audit below is broader than the earlier
reported Demo inspection, but is not a new runtime observation or a usage census.

## Start with the pictures

[Open board 1 at full size](visual-language/01-roles-type-states.svg).

![Solar Earth green and icon vocabulary: sage supports preference, participation, plans, shopping and cooking progress, selection and celebration. Existing icons and labels are separated from proposed contrast, type, control-state and touch-target examples.](visual-language/01-roles-type-states.svg)

*Board 1: keep the warm cream, terracotta, ochre and sage identity; change the role
or existing shade when a foreground/background pairing cannot carry its meaning.
The font specimens use Outfit/Inter when available and system fallbacks otherwise;
they are not font-fidelity proofs. Current-role cards summarize source rather than
reproduce screens; their placement and explanatory copy are not implemented UI.*

[Open board 2 at full size](visual-language/02-home-state-map.svg).

> The original schematic boards retain their design-checkpoint wording. Current application copy uses **Take Out** / **À emporter**; this label records a plan and includes delivery.

![Home state map: unplanned offers recipe selection or Take Out; a suggestion is explicitly conceptual and unsaved; a planned meal offers Cook and Change Plan; non-cooking intent opens Planner; cooked offers Dismiss without undoing completion. Each sketch explains action consequences.](visual-language/02-home-state-map.svg)

*Board 2: a schematic of state/action consequences, with conceptual suggestions clearly separate. It omits food imagery and cannot establish cookbook refinement. Cook, ready-GOTO confirmation and primary Quick Find now use terracotta/light text locally. Planned actions currently precede inline ingredients. Sage non-cooking/cooked roles and other Home sections remain unchanged; their board treatments are separate proposals.*

## Refined family cookbook: the Home direction

Food and the household's recipes should carry anticipation and belonging. At ordinary mobile text size, let generous near-square/portrait photography and a confident Outfit recipe title lead. Use cream/warm white surfaces, considered whitespace, coherent rounding and soft layered depth. Give supporting context a quiet readable rhythm. Do not flatten every surface or make each control equally prominent in pursuit of consistency.

The user-supplied [Screenshot_20261026-212933.png](visual-language/references/Screenshot_20261026-212933.png) is the composition anchor: a portrait-shaped white card on cream, dominant nearly square photograph, deeply rounded image/card corners, substantial soft elevation, bold recipe title and a subtle blush duration pill. Preserve these qualities without reproducing faint tiny labels or hiding the new actions. The photograph need not be forced into a portrait crop simply because the overall card is portrait. The pivot reference [Screenshot_20261026-212918.png](visual-language/references/Screenshot_20261026-212918.png) shares the rounded frame, shadow and bold title but uses a wider image, then one primary and a compact row of two secondary actions. Let meal and pivot keep those distinct proportions within the same visual family. The pivot’s yellow primary and faint Order In are historical evidence, not treatments reinstated by using the screenshot. Navigation/Capture/voting shown in the references are outside this Home-card correction.

This is a contemporary family cookbook within Solar Earth: keep Outfit/Inter and existing tokens/icons. It does not call for a new serif font, fake paper texture, rustic ornament, decorative badges or a new theme.

| Home element | Local treatment (Sessions 5–6) | Preserve |
|---|---|---|
| Food image | Generous near-square meal photo and wider pivot crop, following their respective references; text/actions grow independently | Subject visibility, responsive reflow and navigation reachability |
| Recipe title | Main typographic anchor, confident weight and comfortable wrapping | Full EN/FR title and stable readable background |
| Context/duration | Quiet context; restrained blush terracotta duration pill as in the supplied reference, or small Clock cue when reflow needs it; no yellow badge | Existing localized Ready In wrapper, supplied units and missing-time behavior |
| Cook / Make this tonight / primary Quick Find | Rich terracotta with light text; deeper terracotta for pressed state | One dominant action per card, clear label, contrast and focus |
| Change plan / Take Out | Quieter tonal or restrained-edge secondary treatment | Visibly enabled actions and generous hit areas |
| Ingredients disclosure | Text-style label and chevron with transparent touch padding | Explicit expanded state, keyboard focus, 48 px target and local identity reset |
| Empty/failed image | Modest icon and warm intentional spacing rather than a dominant gray image slab | Honest state, recipe identity, choices and no invented image/readiness |

Ochre provides restrained accent warmth on these cards; dark text on a yellow action field is not this direction. This does not retire ochre from Discovery, voting or navigation. Sage retains its broad existing roles. A palette can preserve identity without using every hue as a filled action on every surface.

A large touch target need not have a large visible border. Readable contrast does not require making all text the same weight or framing every action. On the planned card keep one primary, a quieter secondary and a text-style disclosure. On the ready pivot keep one primary above a compact row of secondary choices when they fit, as in its reference. Stack when wrapping needs it, rather than making a rigid equal-weight button column the default composition.

**Sessions 5–7 observations:** matched light/dark photo renders restore the planned card’s near-square image, soft elevation, prominent title, blush duration and quiet outlined Change plan. Ingredient disclosure is text-style. The pivot retains a wider 5:4 photograph, one primary and compact icon-bearing secondary choices; French Home uses “Recherche”. Empty/failed images use a modest warm icon. EN/FR matrix and keyboard findings are recorded separately from automated results in the change tasks. This is an agent assessment, not blanket user approval. Local photo-filled comparison artifact: `.task/home-card-session7/final-photo-review.png`. The change tasks retain exact checks, failed earlier identities and qualification limits.

**Visual acceptance:** use the two supplied screenshots as the respective original composition anchors and compare current/corrected cards with the same real food photograph, recipe content, locale and viewport. Add an original-source reconstruction where available, clearly distinguishing it from the supplied capture. Assess photography, type hierarchy, material/depth, action emphasis and adaptive layout separately. Include light/dark food photos and ordinary text before missing-image/long-title stress cases. A missing-image fixture, contrast report or passing browser suite cannot establish cookbook refinement. Record qualitative findings honestly; do not infer user approval from those checks. The [change design](../openspec/changes/archive/2026-10-27-home-meal-card-visual-hierarchy/design.md) provides the rubric and [tasks](../openspec/changes/archive/2026-10-27-home-meal-card-visual-hierarchy/tasks.md) preserve historical evidence and cookbook-session findings.

## Seven principles for consistent decisions

1. **Lead with the truth about the task.** Make tonight's state, the next action and
   its consequence visible before decoration. A candidate, a saved meal and a
   cooked meal are different facts. Success should let the household leave.
2. **Assign colour a job without narrowing the identity.** Cream is the warm
   canvas; charcoal carries reading. Terracotta, ochre and sage all appear in
   actionable UI. Sage also carries preference, participation, plans, selection,
   progress and celebration. The identity reference's shorthand is not an
   exhaustive inventory. Pair state with words/icons, not colour alone; preserve
   contextual roles instead of forcing every action to terracotta or green to success.
3. **Choose pairs that fit and remain readable.** Use the creative direction to choose a fitting treatment, then measure actual text and
   control states on their composite backgrounds. Reuse darker existing variants
   before inventing colours. Pale surfaces can stay; faint essential text cannot.
4. **Use type to explain hierarchy.** Preserve Outfit headings and Inter body/data.
   Prefer sentence case and clear context over tiny, tracked all-caps labels.
   Visual size is not semantic heading level; the document outline still matters.
5. **Make controls look as available as they are.** Enabled secondary actions are
   not disabled actions. Distinguish pressed, selected, busy, unavailable and error
   with the relevant label, shape/edge and feedback; keep controls stable while busy.
6. **Design for hands and changing space.** Prioritize iPhone, Pixel and iPad touch
   use, text growth and safe areas before incidental desktop polish. Content should
   wrap and remain reachable rather than shrink to fit a fixed card.
7. **Say what happens, in both languages.** Use familiar action verbs, preserve
   meaningful choices, explain partial completion, and avoid promises the product
   cannot substantiate. English and French need equivalent meaning, not equal length.

These are WFS recommendations informed by the official references below, not an
import of another brand's visual style or a claim of accessibility certification.
They support the [North Star](creative-direction-north-star.md) and
[designer judgment](agent-designer-identity.md), which retain their existing roles.

## Colour and type: how to use board 1

### The current green language, from source

The audited journeys use the **sage** family (`#8A9A5B` and its variants), not a
new emerald/green palette. Soft fills, solid fields, outlines and icons play
different jobs. These are source-verified examples, not claims that every current
foreground or composite passes contrast.

| Journey | Evidenced green role | Source owner |
|---|---|---|
| Discovery | Sage Like/LOVE communicates positive preference; sage meal-type badges classify. A vote is not an assigned meal. | [Discovery page](https://github.com/AlexandreBrisebois/whats-for-supper/blob/fd4cd9bc5f5a91057dac0b4a6624354fea765072/pwa/src/app/%28app%29/discovery/page.tsx), [DiscoveryCard](../pwa/src/components/discovery/DiscoveryCard.tsx) |
| Matches / celebration | The shared `SuccessCard` has a substantial `bg-sage` field and Check medallion. Discovery's “Menu's in!” / “See your matches” uses dark small-text tone. A match does not prove the week is saved. | [SuccessCard](../pwa/src/components/ui/SuccessCard.tsx), [Discovery page](https://github.com/AlexandreBrisebois/whats-for-supper/blob/fd4cd9bc5f5a91057dac0b4a6624354fea765072/pwa/src/app/%28app%29/discovery/page.tsx) |
| Planning | Sage-filled **Ask the Family** and **Nudge family** are participation actions; planned count, unanimous-vote badges and non-cooking tiles also use sage. | [Planner page](https://github.com/AlexandreBrisebois/whats-for-supper/blob/fd4cd9bc5f5a91057dac0b4a6624354fea765072/pwa/src/app/%28app%29/planner/page.tsx) |
| Home | Non-cooking intent uses `bg-sage/10` and sage-700 icons; the cooked state uses full sage, then a soft-sage compact badge. An intentional takeout plan is not cooking success. | [HomeCommandCenter](../pwa/src/components/home/HomeCommandCenter.tsx), [HomeSections](../pwa/src/components/home/HomeSections.tsx) |
| Groceries | Sage marks checked items, aisle progress, selected sections, input focus and Save. Check marks, counts and checked state carry meaning beyond hue. | [GroceryList](../pwa/src/components/planner/GroceryList.tsx) |
| Cooking | Sage marks selected view, the visible VEGGIE badge and gathered-ingredient progress. Gathering ingredients is not completing the recipe. | [CooksMode](../pwa/src/components/planner/CooksMode.tsx) |

**Keep the breadth, repair specific pairs.** On flat base sage, white is **3.06:1**:
enough for qualifying large text, not small text. Sage-900 on the same green is
**5.52:1**, and charcoal is **4.79:1**. Discovery already demonstrates the useful
distinction: retain the broad green celebration while choosing dark small copy.
Home's default SuccessCard still uses white/70 small copy and sage text on its
white button; this is a different pairing, not evidence that Discovery's treatment
is universal. Glows, transparency and imagery need composite measurement.

Sage on cream is **2.97:1**, below 3:1 even before considering small text. Where
the icon or boundary is needed to identify a control/state, a darker existing
sage variant can repair that role without removing green surfaces. Likewise,
ochre can keep its action/emphasis role with readable text and a sufficient edge.
Neither “all green is success” nor “all pale colour must go” follows from contrast.

### Pair options, not palette replacement

All values below exist in [globals.css](../pwa/src/app/globals.css). The shared terracotta accent and primary default are now `#B85542`; hover uses `#A44A37`, and pressed uses `#7B3829`. Pale blush surfaces retain their existing tokens. Use the stronger terracotta-600 or terracotta-700 foreground on tinted surfaces; translucent text needs a separate actual-background contrast check.
These are **measured options**, not a menu of equally suitable aesthetic choices or blanket replacements. For Home primary actions use the terracotta/light-text direction above. The ochre/charcoal pair is retained as contrast reference only; it is not a recommended Home action treatment.

| Proposed role | Foreground / background | Ratio |
|---|---|---:|
| Body on warm canvas | charcoal `#1F2937` / cream `#FDFCF0` | 14.23:1 |
| Supporting context | charcoal-600 `#4B5563` / cream | 7.33:1 |
| Shared terracotta primary | cream / terracotta `#B85542` | 4.61:1 |
| Shared terracotta primary | white / terracotta `#B85542` | 4.75:1 |
| Hover terracotta | white / terracotta-600 `#A44A37` | 5.81:1 |
| Pressed terracotta | white / terracotta-700 `#7B3829` | 8.61:1 |
| Contrast reference only; not Home action guidance | charcoal / ochre `#E1AD01` | 7.12:1 |
| Small text on substantial sage field | sage-900 `#1B1E12` / sage `#8A9A5B` | 5.52:1 |
| Body on substantial sage field | charcoal / sage | 4.79:1 |
| Dark sage action option | white / sage-700 `#525B37` | 7.22:1 |
| Soft sage state or icon | sage-700 / sage-50 `#F1F3EB` | 6.45:1 |
| Error with explicit message | terracotta-700 / terracotta-50 `#F9ECE9` | 7.46:1 |

Ratios use WCAG sRGB relative luminance, `(Llighter + .05)/(Ldarker + .05)`,
rounded to two decimals **after** comparison. The opaque pairs above clear 4.5:1.
Normal text needs **4.5:1**; large text needs **3:1** (at least 18 pt regular or
14 pt bold, approximately 24 / 18.67 CSS px). A 10 or 11 px bold label is not large.
Meaningful control boundaries, state indicators and graphical objects need **3:1**
against adjacent colours where WCAG 1.4.11 applies; not every decorative card border
does. Text contrast does not prove non-text contrast or overall conformance.

For example, terracotta-600 against cream is 5.63:1, but ochre against cream is only
2.00:1. If an ochre control needs its boundary to identify it, give it an appropriate
contrasting edge; charcoal text alone does not fix that edge. The board's generic
secondary-control specimen demonstrates contrast, not a requirement to outline every Home action. A text-style control can be identified by its label and indicator without a dark enclosing border. The separated terracotta-700
focus outline is a visual recommendation, not evidence of implemented keyboard support.

**Historical inspection, not a ban on brand colours:** the supplied Demo 0.1.25 inspection
reported Tonight context at 10 px/900, charcoal 40% on white (2.35:1); active Home at
11 px, terracotta on cream (3.88:1); and enabled Cook at 10 px, white on ochre
(2.06:1). Those Tonight context/Cook roles predate Session 1 below; Home navigation
is outside that change. The independent opaque calculations
reproduce the latter two ratios; compositing charcoal at 40% over white also yields
approximately 2.35:1. These are below the normal-text threshold. The reported 30 px
charcoal recipe title on white is 14.68:1: preserve that strength. A different
viewport, overlay or glass background requires a new measurement.

**Current implementation, not the revised aesthetic target (Sessions 1–4):** the planned and pivot cards now
use content-driven height, a bounded 4:3 image region (maximum 16 rem high), one
restrained outer shadow, wrapping titles and vertically stacked actions. Context is
16/24 semibold, supporting text is 14 px, and actions are 16 px semibold with
at least 56 px unpressed height. The localized Ready In wrapper and duration units
retain their uppercase formatting. Titles remain Outfit; body/actions remain Inter. These functional/contrast choices were implemented, but the shallow image, yellow primary and repeated framed controls are now being refined under the cookbook direction; earlier acceptance does not establish that new aesthetic outcome.
Session 2 exposes Cook then Change plan on the initial planned card. A semantic
View ingredients / Hide ingredients button reveals description and ingredients
inline on white; empty ingredients have localized feedback. Non-control content
does not toggle details. A new recipe identity collapses details; same-recipe
hydration retains disclosure. Actions remain ahead of details in normal flow,
without a flip or motion dependency.

Session 3 implements the pivot hierarchy: a ready family GOTO leads with Make this
tonight; otherwise the filled indigo Quick Find leads. Outlined Take Out pairs its
label with a decorative ShoppingBag, and outlined Profile setup follows the immediate
choices when no active GOTO exists. Ordinary nights say Nothing planned for tonight;
a ready recipe is Your family's GOTO, without implying an assignment. Saved Mystery
uses its existing localized context instead of calling the night unplanned. Checking
and preparing feedback is localized and offers no confirmation. These prop states
do not change the active endpoint's ready-only eligibility or assignment optimism.

Rendered EN/FR acceptance covers 320×844, 390×844, 412×915, 820×1180 and 1180×820,
with fixture text enlarged to 200%, long/empty details and absent imagery. Retained
screenshots and measurements are local artifacts under `.task/home-card-session1/`,
`.task/home-card-session2/` and `.task/home-card-session3/`;
[Session evidence and final reconciliation](../openspec/changes/archive/2026-10-27-home-meal-card-visual-hierarchy/tasks.md)
records actual contrast, target and navigation measurements plus command results. Checking/preparing prop fixtures qualify their
component presentation separately from the active-GOTO endpoint. Browser emulation
and these local measurements do not establish physical-device or screen-reader
qualification, or conformance of other Home surfaces. The boards remain schematic.

**Type starting points, subordinate to composition:** heading 28/34, context 16/24 semibold, body 16/24,
supporting text 14/21 (size/line height in CSS px). These are review examples, not
minimum WCAG font sizes or a replacement scale. Current `globals.css` owns body
line height 1.5 and heading line height 1.2; components also override these. Verify
long recipe names, larger text and French wrapping before adopting a role.

**States to review where applicable:** default, hover on pointer devices, pressed,
focus, selected, busy, disabled, success and error. Inactive controls have contrast
exceptions in WCAG, but should still be understandable with a reason. Do not use
the disabled exception for an enabled Take Out control. For busy/error states,
retain the action's place and describe the actual stage; do not manufacture success.

## Icons are part of the language, not decoration added later

The app primarily uses **Lucide**, alongside actual text glyphs and grocery aisle
emoji. Preserve that vocabulary. Board outlines reuse Lucide 1.60.0 geometry
([upstream icons](https://github.com/lucide-icons/lucide/tree/1.60.0/icons),
[licence](https://github.com/lucide-icons/lucide/blob/1.60.0/LICENSE), retained in
each SVG); no package or app icon is changed. The board is a selective legend,
not a replacement asset catalogue or pixel-exact screenshot.

| Existing vocabulary | Meaning depends on the label and context | Source owner |
|---|---|---|
| Home, Search, Compass, Calendar, UserCircle | Home, Search, Discover, Planner, Profile. Navigation already pairs icons with labels and `aria-current`; Discover's prominent treatment is ochre. | [Navigation](../pwa/src/components/common/Navigation.tsx) |
| Camera, BookOpen | **Capture a Recipe**, **Browse your library**: recognized routes worth preserving. | [HomeSections](../pwa/src/components/home/HomeSections.tsx) |
| UtensilsCrossed, ArrowRightLeft | **Cook** opens Cook's Mode; **Change Plan** opens recovery. Both appear on the initial planned card, ahead of ingredient disclosure. | [TonightMenuCard](../pwa/src/components/home/TonightMenuCard.tsx) |
| ShoppingBag, UtensilsCrossed, Sparkles, CalendarDays | Takeout, eating out, mystery, custom non-cooking intent. The same UtensilsCrossed shape has a different job beside **Cook**. | [NonCookingIcon](../pwa/src/components/planner/NonCookingIcon.tsx) |
| ♥ / ✕ glyphs; Heart / X icons; ✓ glyph | Like/dislike buttons, LOVE/PASS overlays, and “Just planned” feedback are distinct contexts, not one interchangeable success mark. | [Discovery page](https://github.com/AlexandreBrisebois/whats-for-supper/blob/fd4cd9bc5f5a91057dac0b4a6624354fea765072/pwa/src/app/%28app%29/discovery/page.tsx), [DiscoveryCard](../pwa/src/components/discovery/DiscoveryCard.tsx) |
| Users, Share2 | Ask the Family and Nudge family: participation, not confirmation. | [Planner page](https://github.com/AlexandreBrisebois/whats-for-supper/blob/fd4cd9bc5f5a91057dac0b4a6624354fea765072/pwa/src/app/%28app%29/planner/page.tsx) |
| CheckCircle2 / Circle, Check; aisle emoji + names | Item checked, progress or Save; aisle recognition. Keep the count/name/checked state, not just a green symbol. | [GroceryList](../pwa/src/components/planner/GroceryList.tsx) |
| File, Layers3; CheckCircle2 / Check | All steps / Step by step selection; gathered ingredients. The selected-view controls already expose `aria-pressed`. | [CooksMode](../pwa/src/components/planner/CooksMode.tsx) |

**Review expectations, not a claim that all controls already comply:**

- Keep a visible label for ambiguous or consequential actions. An icon is a
  recognition cue, not a substitute for the action's consequence. Clock does not
  promise a duration filter; ShoppingBag does not mean a delivery order was placed.
- Give icon-only controls an accessible action name; keep a visible label in its
  accessible name. Hide purely redundant icons from assistive technology rather
  than announcing “icon” beside an already named action. Expose checked, pressed
  and current states semantically, not through colour alone.
- Separate glyph size from hit area: a 20–24 px icon can sit inside a generous
  48 × 48 CSS px target. Keep spacing and room for EN/FR labels; do not shrink
  the target to the drawing. These are proposed review targets, not audited sizes.
- Check meaningful icon/state contrast independently from text contrast, including
  overlays. Decorative symbols need not be treated as essential controls. Shape,
  label and state must still explain the UI without hue or motion.

These expectations follow W3C guidance on
[non-text alternatives](https://www.w3.org/WAI/WCAG22/Understanding/non-text-content.html),
[label in name](https://www.w3.org/WAI/WCAG22/Understanding/label-in-name.html) and
[non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html).

## Home: preserve meanings while discussing visual hierarchy

Source-verified behavior is owned by the Home components and Today store below;
[tonight-meal-decisions](../openspec/specs/tonight-meal-decisions/spec.md) owns its
approved requirements. Board 2 is a discussion aid, not a new state machine.
The five large sketches cover **tonight**, not every Home surface. The separate
family-voting invitation updated by #339 remains alongside tonight: **Vote Now**
opens Discover while collecting; **Menu's In** / **See your matches** opens the
active round's Planner week when converged. Its ochre presentation and Vote icon
are distinct from the full-sage Discovery celebration. Checking, unavailable and
Retry states remain explicit; matches are ready to review and save, not already
saved. This refreshed evidence is pinned to [HomeSections at 4682643](https://github.com/AlexandreBrisebois/whats-for-supper/blob/4682643cd6086b66008fc77ede4570329e29b5ae/pwa/src/components/home/HomeSections.tsx)
and [HomeCommandCenter at 4682643](https://github.com/AlexandreBrisebois/whats-for-supper/blob/4682643cd6086b66008fc77ede4570329e29b5ae/pwa/src/components/home/HomeCommandCenter.tsx).

- **Unplanned:** no assigned recipe. A ready family GOTO leads with **Make this tonight**;
  otherwise **Quick Find** leads, followed by outlined **Take Out** and then Profile
  setup when no GOTO exists. Preparing/checking variants have localized feedback
  without confirmation; saved Mystery retains its context. **Quick Find** opens recipe
  selection, not a cooking-duration filter ([issue #338](https://github.com/AlexandreBrisebois/whats-for-supper/issues/338)).
  Existing labels such as **Find Something Quick** do not establish a quick-cook guarantee.
- **Suggested:** the dedicated suggested Home card is **conceptual only**. Current
  GOTO availability and pending replacement choices must not be confused with a
  confirmed assigned meal. The proposed **Choose for tonight** label is not current copy.
- **Saved / planned:** **Cook** opens Cook's Mode; it does not mark cooked on entry.
  **Change Plan** opens recovery. The current localized backup choice is **Find
  Something Quick** (the source fallback says **Pick Something Else**); then the
  original meal's disposition is resolved before a retained replacement is saved.
  Partial failure distinguishes completed disposition from an unsaved or unknown
  replacement. **Retry save** and **Retry check** are not interchangeable.
- **Non-cooking:** **Take Out** records a non-cooking intention, not a blank night
  and not a food-delivery order. With no recipe the current handler updates locally
  while status validation runs in the background; local appearance is not proof of
  persistence. With a planned recipe, recovery asks what happens to the original.
  The non-cooking Home card opens Planner; **Leave this day unplanned** is Planner's
  separate blank-day action. Mystery night still offers supper choices on Home.
- **Cooked:** the success card offers **Dismiss**; dismissing compacts it without
  undoing cooking. The compact badge can reopen Cook's Mode. Do not imply all
  planning or household work is complete.

Anonymous designer feedback reported that Capture and Browse were clear, but Home
context was confusing, Order In looked disabled and yellow/light-grey treatments
were hard to read. This guides the examples; it is not a representative user study.
Preserve **Capture a Recipe** and **Browse your library** as recognizable routes,
not new required steps. Do not claim ingredient inventory from a saved plan: existing
recovery copy saying “We have the ingredients” is not evidence of stock knowledge.

## Mobile application and bilingual review

These are **proposed review targets**, not completed app checks:

- Use a generous **48 × 48 CSS px** touch-target starting point for primary and
  secondary actions, with separation and room for wrapped labels. WCAG 2.5.8's
  24 × 24 CSS px floor has exceptions; Apple recommends 44 × 44 **pt**, Android
  48 × 48 **dp**. The units and guidance are not interchangeable.
- At narrow widths, prefer one clear reading column. Check 320 CSS px reflow,
  200% text enlargement, long content and iPad portrait/landscape rather than
  scaling a desktop composition down. Current root viewport settings restrict
  user zoom; this reference does not claim the app already supports those checks.
- Reuse current safe-area utilities and navigation inset handling. Keep essential
  sheet actions above the keyboard/home indicator, and let content scroll without
  clipping the title, error or recovery action. Keep close/cancel intent explicit;
  recovery dismissal must respect pending and partially completed work.
- Glass, rounded cards and food imagery remain Solar Earth strengths. Place essential
  text on a stable readable surface; test the worst composite, not only a flat swatch.
  Reuse established motion; avoid motion as the only status signal.
- Keyboard implementation work is deferred in this touch-first review, not removed
  from the chosen WCAG target. Contrast is not deferred. Static boards verify neither
  focus order nor keyboard/screen-reader interaction.

| Content example | English | French | Status |
|---|---|---|---|
| Cook action | Cook | Cuisiner | Current locale values |
| Change intention | Change Plan | Changer le plan | Current locale values |
| Non-cooking action | Take Out | À emporter | Current; clarify it records a plan, not an order |
| Blank day | Leave this day unplanned | Laisser cette journée sans plan | Current Planner copy |
| Unsaved suggestion | Suggestion — not saved | Suggestion — non enregistrée | Proposed; language review required |
| Clearer recipe search | Choose another recipe | Choisir une autre recette | Proposed alternative, not a duration claim |

Allow French expansion and preserve the complete action instead of truncating it.
Locale files own implemented strings; several Home strings remain hard-coded.
This guide does not assert bilingual completeness or change any copy.

## Ownership and keeping the reference useful

| Canonical owner | What it owns |
|---|---|
| [globals.css](../pwa/src/app/globals.css), cross-check [tailwind.config.ts](../pwa/tailwind.config.ts) | Implemented colours, utility surfaces, safe areas and theme configuration |
| [Root layout](../pwa/src/app/layout.tsx) | Outfit/Inter loading and viewport setup |
| [Button primitive](../pwa/src/components/ui/button.tsx), [common re-export](../pwa/src/components/common/Button.tsx) | Existing shared button variants; not all Home controls use them |
| [Navigation](../pwa/src/components/common/Navigation.tsx) | Navigation appearance, active state and bottom inset |
| [HomeCommandCenter](../pwa/src/components/home/HomeCommandCenter.tsx), [todayStore](../pwa/src/store/todayStore.ts) | Current Home branches and action orchestration / Today state |
| [TonightMenuCard](../pwa/src/components/home/TonightMenuCard.tsx), [TonightPivotCard](../pwa/src/components/home/TonightPivotCard.tsx), [HomeSections](../pwa/src/components/home/HomeSections.tsx) | Recipe/inline details card, unplanned/GOTO choices, Capture/Browse/success |
| [SkipRecoveryDialog](../pwa/src/components/home/SkipRecoveryDialog.tsx) | Recovery presentation and stage-specific feedback |
| [English](../pwa/src/locales/en/common.json), [French](../pwa/src/locales/fr/common.json) | Localized strings, not proof every component uses them |

Maintain this guide with the affected designer/component owner when an accepted
visual decision changes its examples. Record the date, source and **Current** or
**Proposed** status; document intentional exceptions with their reason rather than
silently copying an old board. Runtime owners and approved specifications win if
this snapshot drifts. No new governance, framework, Storybook dependency, global
palette change or mandatory reading cascade is introduced.

Before an implementation decision, review the relevant board, state meaning,
actual pair/state measurements, small-screen/text-growth behavior and EN/FR copy.
Then seek the applicable implementation approval. This PR changes documentation
and static reference assets only; it is not acceptance evidence for a live redesign.

## Official grounding

Reviewed 25 October 2026. Use the practices, not another system's brand assets.

- GC Design System: [colour roles and accessible use](https://design-system.canada.ca/en/styles/colour/),
  [typographic hierarchy](https://design-system.canada.ca/en/styles/typography/),
  [buttons](https://design-system.canada.ca/en/components/button/) and
  [button content/design guidance](https://design-system.canada.ca/en/components/button/design/).
- Canada: [build accessibility in from the start](https://www.canada.ca/en/government/system/digital-government/government-canada-digital-standards/build-accessibility-start.html).
- W3C WCAG 2.2: [text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html),
  [non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html),
  [not colour alone](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html),
  [target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html),
  [reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) and
  [resize text](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html).
- Apple: [touch and legibility tips](https://developer.apple.com/design/tips/) and
  [layout and safe areas](https://developer.apple.com/design/human-interface-guidelines/layout).
  Android: [accessible touch targets](https://developer.android.com/develop/ui/compose/accessibility/api-defaults).

WCAG 2.2 AA is the project's chosen web target. These partial contrast calculations
and static illustrations establish neither whole-app conformance nor legal compliance.
