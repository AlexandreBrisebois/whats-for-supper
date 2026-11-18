# Design

## Context and Existing Ownership

Track 4 runs exclusively on a dedicated exploration branch (`explore/adaptive-family-cookbook`) created from `main` after Tracks 1–3 (`align-family-cookbook-mission-and-voice`, `establish-cookbook-design-system-and-visual-ratchet`, `refine-mobile-planner-recipes-and-grocery-ux`, and `unify-legacy-surfaces-to-family-cookbook`) have stabilized the production baseline.

### Preserved Runtime & Store Boundaries (Zero Backend Changes Required)
This prototype re-architects **presentation, chrome adaptation, and design-system enforcement** while keeping every backend API operation (`specs/openapi.yaml`), database invariant, and Zustand store contract intact:
- [`pwa/src/store/todayStore.ts`](../../../pwa/src/store/todayStore.ts): Owns monotonic deployment-calendar freshness (`calendarAnchor`), tonight's slot state, and active GOTO readiness.
- [`pwa/src/store/weekStore.ts`](../../../pwa/src/store/weekStore.ts): Owns Monday-anchored week slots, proposed voting suggestions vs. committed meals, groceries, extras, and SSE reconciliation.
- [`pwa/src/store/discoveryStore.ts`](../../../pwa/src/store/discoveryStore.ts): Owns `session.phase` (`unowned` | `collecting` | `converged`), coverage metrics, voting stack, and generation guards.
- [`pwa/src/components/planner/useSupperServingsEditor.tsx`](../../../pwa/src/components/planner/useSupperServingsEditor.tsx) & [`pwa/src/lib/planner/useReplacementRecovery.ts`](../../../pwa/src/lib/planner/useReplacementRecovery.ts): Own dirty-draft persistence, version-conflict review, and partial replacement state machines.

The core hypothesis being tested on `explore/adaptive-family-cookbook` is two-fold:
1. **Behavioral & Cognitive UX:** Adapting chrome prominence and focal density to the household's **Four Energies** keeps *"Swipe, Match, Cook!"* joyful at the start of the week while creating genuine cognitive silence at 5:15 PM.
2. **Structural Drift Elimination:** Replacing ad-hoc per-component Tailwind styling with **six locked semantic Cookbook Primitives** backed by native CSS `oklch(L C H)` contracts makes visual drift structurally impossible rather than relying on discipline alone.

---

## Behavioral UX & Cognitive Ergonomics Architecture (The Four Household Energies)

### Why Family Voting MUST Remain the Hero Catalyst
Household meal planning fails when one adult becomes the sole "supper project manager" while everyone else experiences dinner either as a surprise complaint or an uninvited chore. In cognitive-labor terms (anticipate -> identify -> decide -> monitor), **identifying options everyone actually wants to eat** is the hardest emotional bottleneck.

Keeping **Family Voting ("Swipe, Match, Cook!")** as the unmistakable front door of the weekly loop solves this by splitting **playful preference expression** (60 seconds, zero commitment anxiety, kid-friendly) from **weekly commitment** (one calm confirmation pass in Planner):

```text
+-----------------------------------------------------------------------------+
|                    THE WEEKLY HOUSEHOLD SUPPER LOOP                         |
+-----------------------------------------------------------------------------+
|                                                                             |
|  [1. SUNDAY SPARK: "Swipe, Match, Cook!"]  <-- Energy 1: Playful Convergence|
|   Kids & partners swipe appetizing heirloom recipe cards (60s bursts).      |
|   Collective Family Table Progress: "3 of 5 nights matched" (zero shaming). |
|          |                                                                  |
|          v  (Match-to-Menu Bridge: "See your matches")                      |
|  [2. SET THE TABLE: Weekly Menu & Calm Capture] <-- Energy 2: Reflective    |
|   Review converged candidates alongside real life (Take Out, Mystery, etc.). |
|   Adjust portions; snap cookbook photos with non-blocking ribbon progress.  |
|          |                                                                  |
|          v  (Auto-derived shared grocery checklist)                         |
|  [3. AISLE RUN: Glare-Proof Shop Mode]     <-- Energy 3: In-Motion Utility  |
|   One-handed high-contrast checkoffs; partner updates sync quietly live.    |
|          |                                                                  |
|          v  (5:15 PM Weekday)                                               |
|  [4. THE QUIET TABLE: Tonight & Cook's Mode] <-- Energy 4: Depleted Brain   |
|   Chrome steps back. One dish, one primary Cook button, or one calm,        |
|   guilt-free <CookbookSheet> pivot when plans fall apart.                   |
|          |                                                                  |
|          +---- (Dreaming rotation ages cooked meals quietly back to [1]) ---+
+-----------------------------------------------------------------------------+
```

### Cognitive Budget Matrix Across the Four Energies

| Energy Mode | Primary Surfaces | User Mental Bandwidth | Session Target | Max Focal Groups / Screen | Dominant Visual Tone | Motion Profile (`prefers-reduced-motion` -> opacity only) |
|---|---|---|---|---|---|---|
| **1. Playful Convergence** | Discovery Voting, Family Nudge | Curious, social, kid-friendly | 45–90 sec burst | **2** (Heirloom Card Stack + Thumb Vote Bar + quiet Progress Pill) | Warm Sunlight Ochre + appetizing full-bleed food photography | Tactile card physics (`spring(260, 24)`), crisp drag feedback |
| **2. Reflective Curation** | Planner Menu, Recipe Detail, Capture | Moderate, unhurried | 2–4 min | **3** (Week Rhythm Header, 7-Day Editorial Cards, Inline Portions/Status) | Layered Cream & White Paper + Sage Participation accents | Smooth layout shifts (`180ms cubic-bezier(0.2, 0.8, 0.2, 1)`) |
| **3. In-Motion Utility** | Grocery Checklist | Divided, one-handed, walking | Rapid glances | **2** (Aisle Progress Bar + Wide-Label Checklist + Bottom Extra Input) | High-contrast Paper (`>= 7:1` ink), muted aisle dividers, bold checks | Minimal instant check transitions (`120ms ease-out`); zero scroll jump |
| **4. Depleted Execution** | 5:00 PM Home, Cook's Mode, Pivot Sheet | Low, fatigued, time-pressured | 5–15 sec (Home) | **<= 3** on Home (Tonight Card, optional Vote Bridge, Quiet Add/Browse) | Quiet Paper + single Hearth Terracotta primary action (`Cook`) | Ultra-calm opacity/collapse (`150ms ease-out`); zero pulse/bounce chrome |

---

## Perceptual Color Science & Tactile Materiality (`oklch(L C H)`)

### Solving Luminance Asymmetry Mathematically
In Track 2, sRGB measurements exposed why naive hex tokens broke contrast: Terracotta (`#B85542`, $L \approx 0.56$), Sage (`#8A9A5B`, $L \approx 0.66$), and Ochre (`#E1AD01`, $L \approx 0.77$) live in incompatible perceptual lightness bands. Using CSS **OKLCH (`oklch(L C H)`)** aligns perceptual lightness $L$ directly with human contrast sensitivity (supporting both WCAG 2.2 AA ratios and APCA $L_c$ polarity checks).

| Token Name | CSS `oklch(L C H)` | sRGB Fallback | Contrast Partner & Ratio (WCAG / APCA) | Permitted Semantic Role |
|---|---|---|---|---|
| `--paper-canvas` | `oklch(0.988 0.014 98)` | `#FDFCF0` | Primary page canvas | App background & sheet canvas |
| `--paper-card` | `oklch(0.998 0.004 95)` | `#FFFEF9` | Warm cookbook card surface | Recipe, planner & voting cards |
| `--paper-inset` | `oklch(0.958 0.012 85)` | `#F4EFE6` | Subtle depressed surface | Input wells, collapsed sections, past days |
| `--ink-primary` | `oklch(0.235 0.018 55)` | `#26201B` | `15.4:1` / $L_c \approx 101$ on `--paper-card` | Headings, recipe names, body text |
| `--ink-secondary` | `oklch(0.415 0.016 55)` | `#524A43` | `8.5:1` / $L_c \approx 82$ on `--paper-card` | Descriptions, metadata, supporting copy |
| `--ink-quiet` | `oklch(0.515 0.015 55)` | `#6D645B` | `5.6:1` / $L_c \approx 67$ on `--paper-card` | Helper captions, secondary labels (`>= 4.5:1` guaranteed) |
| `--hearth-fill` | `oklch(0.545 0.145 28)` | `#B85542` | `#FDFCF0` ink: `4.61:1` / $L_c \approx 68$ | Single primary CTA per surface (`Cook`, `Save`, `Make this tonight`) |
| `--hearth-hover` / `--hearth-pressed` | `oklch(0.485 0.140 28)` / `oklch(0.395 0.125 28)` | `#A44A37` / `#7B3829` | `#FFFFFF` ink: `5.81:1` / `8.61:1` | Interactive hover/active depth |
| `--hearth-tint` / `--hearth-ink` | `oklch(0.945 0.025 28)` / `oklch(0.395 0.125 28)` | `#F9ECE9` / `#7B3829` | `7.46:1` paired together | Duration blush pill, error surfaces, destructive buttons |
| `--sunlight-fill` | `oklch(0.775 0.165 86)` | `#E1AD01` | `--ink-primary`: `7.4:1` / $L_c \approx 75$ | Family voting hero invitation (`Vote` active state, GOTO highlight) |
| `--sunlight-tint` / `--sunlight-ink` | `oklch(0.965 0.045 92)` / `oklch(0.410 0.095 82)` | `#FFF7CC` / `#664E01` | `8.3:1` paired together | Warm nudge banners, active discovery filter, `Extra` cue |
| `--garden-fill-strong` | `oklch(0.455 0.065 122)` | `#525B37` | `#FFFFFF` ink: `7.22:1` | Solid participation actions (`Ask the Family`, `Nudge family`) |
| `--garden-tint` / `--garden-ink` | `oklch(0.950 0.022 122)` / `oklch(0.365 0.055 122)` | `#F1F3EB` / `#373D25` | `8.8:1` paired together | Cooked badges, gathered ingredients, selected toggles, match chips |

### Paper Materiality Over Reading-Card Glassmorphism
In earlier eras, `.glass` (`backdrop-filter: blur(12px)` over `rgba(253, 252, 240, 0.4)`) was applied to planner rows, settings panels, and sheets. On busy food imagery or scrolling feeds, translucency creates unpredictable contrast hotspots and mobile GPU jank. Under Track 4:
- **Reading cards & modal bodies** use solid/near-opaque **warm cookbook paper** (`--paper-card` on `--paper-canvas`) separated by subtle hairline edges (`1px solid color-mix(in oklch, var(--ink-primary) 8%, transparent)`) and dual-layer ambient umber elevation (`0 2px 6px color-mix(in oklch, var(--ink-primary) 5%, transparent), 0 18px 42px -18px color-mix(in oklch, var(--ink-primary) 16%, transparent)`).
- **Translucent material** is reserved strictly for floating overlays that sit directly over photography (`View Original` hero capsule) and the bottom navigation dock (`backdrop-blur-lg` over 88% opaque `--paper-canvas`).

---

## Marketing, Onboarding & Two-Audience Narrative Arc

The prototype connects external positioning directly to the in-app experience so a visitor moving from `README.md` or a family invite link experiences zero tonal whiplash:
- **External / Coordinator Hook:** *"Swipe, Match, Cook! — Fun enough for the kids to pick Friday's dinner; calm enough to take supper off your mind all week."*
- **Invite & Onboarding Welcome ("Pull up a chair"):** When a partner or teenager taps an invite link from `FamilyNudgeDialog`, `/welcome` and `/onboarding` immediately greet them with warm cookbook typography, clear explanation of their household's shared kitchen table, and one clear path straight into tonight or open voting.
- **No Guilt / No Notification Fatigue:** Unlike habit apps with streaks or red notification dots, adaptive navigation elevates `Vote` gently in warm Sunlight Ochre *only* when an authoritative voting round is collecting or the current week has open nights—celebrating togetherness when needed and disappearing into calm parity once dinner is sorted.

---

## The Six Locked Cookbook Primitives (`pwa/src/components/cookbook/`)

Feature routes inside the exploration branch compose UI exclusively from six semantic primitives (enforced by extending `visual-contract.test.ts` to forbid raw `bg-*`, `text-*`, `rounded-*`, and `text-[...]` classes inside prototype pages):

1. **`<EnergyShell energy="convergence | curation | shopping | execution" showChrome={boolean} captureStatus={...}>`**
   - Renders safe-area layout, non-blocking background capture status ribbon (replacing forced countdown locks when dismissed), adaptive navigation dock (elevated warm `Vote` pill during active collecting/empty week vs. uniform quiet bar during planned weeknight execution), and complete chrome recession (`showChrome={false}`) inside Cook's Mode.
2. **`<CookbookCard elevation="flat | resting | raised" surface="paper | inset | hearth | sunlight | garden" padding="compact | editorial">`**
   - Owns consistent Cookbook rounding (`rounded-[1.75rem]`–`rounded-[2.25rem]`), warm paper surfaces, hairline umber border, and ambient paper elevation. Never renders `backdrop-blur`.
3. **`<CookbookSheet open={boolean} onRequestClose={fn} title={string} contextLabel={string} guardDismiss={boolean}>`**
   - Built on native HTML `<dialog>` (`showModal()` top layer, verified against `modern-web-guidance` `"modal dialog"` guidance during implementation):
     - Automatic top-layer stacking (eliminates competing `z-[50]`/`z-[60]`/`z-[80]`/`z-[100]` overlay bugs across `SkipRecoveryDialog`, `PlanningPivotSheet`, `QuickFindModal`, `NonCookingDaySheet`, `RecycleBinSheet`, and `FamilyNudgeDialog`),
     - Automatic `inert` background behavior and focus return to the invoking trigger element on close,
     - `cancel` event interception when `guardDismiss` is true (e.g., during pending mutations or partial replacement state in `SkipRecoveryDialog`),
     - Backdrop pointer-down coordinate guard + `max-h-[calc(100dvh-2rem-env(safe-area-inset-bottom))]` internal scrolling so virtual keyboards on iOS/Android never obscure primary/recovery buttons.
4. **`<Typography variant="hero | title | section | body | supporting | caption | meta" tone="primary | secondary | quiet | inverse" clamp={1|2}>`**
   - Maps Outfit (`hero`, `title`, `section`) and Inter (`body`, `supporting`, `caption`, `meta`) scales with a strict `12px` (`0.75rem`) floor (`meta`), sentence-case defaults, and automatic EN/FR line-height comfort (`leading-snug`/`leading-relaxed`).
5. **`<Action intent="primary | secondary | quiet | sunlight | garden | destructive" size="standard | compact | icon" pending={boolean} icon={ReactNode}>`**
   - Pre-baked role-locked foreground/background contrast pairs (`hearth` primary, quiet terracotta outlined secondary, warm `sunlight` ochre + dark umber ink, solid `garden` `sage-700` + white, and `hearth-tint` destructive). Enforces `min-h-12` (`>= 48 CSS px`), `min-w-12` on icon actions, stable label layout when `pending` is true, and `focus-visible` outlines.
6. **`<StatusBadge tone="hearth | sunlight | garden | neutral" icon={ReactNode}>`**
   - Semantic non-interactive status pill (duration, Cooked, GOTO, Extra text label, Family Table Progress) guaranteed never to pair white on ochre/base-sage or render `< 12px`.

---

## First Observable Slice

1. Create exploration branch `git switch -c explore/adaptive-family-cookbook` from stabilized `main`.
2. Add the native `oklch()` token layer in `pwa/src/app/globals.css`, implement the 6 Cookbook Primitives (`pwa/src/components/cookbook/`), and mount `/dev/cookbook-lab` (guarded to `404` in standard production builds).
3. Render **Energy 1** (*"Swipe, Match, Cook!"* card + Family Table Progress cue) and **Energy 4** (*5:00 PM Quiet Tonight card + `<CookbookSheet>` pivot*) inside `/dev/cookbook-lab` in both English and French, verified by Vitest unit/contract tests (`visual-contract.test.ts` primitive-only enforcement + `CookbookSheet` native `<dialog>` keyboard/focus tests) and Playwright `cookbook-lab.spec.ts` reusing `assertCookbookVisualA11y` at `320px`/200%, `390px`, and `834px`.

---

## State, Concurrency and Recovery

- **Zero relaxation of data/recovery invariants:** All existing async safeguards remain authoritative inside the new primitives:
  - `CookbookSheet` honors `guardDismiss` so `SkipRecoveryDialog`'s `confirmAbandon` flow and `useSupperServingsEditor`'s dirty-exit prompt (`Save and continue` / `Keep editing` / `Discard changes`) behave identically.
  - Non-blocking background capture status ribbon tracks `captureStore` + SSE `recipe_ready` / failure events without manufacturing success or silently dropping interrupted uploads.
  - Family Table Progress reads only collective round coverage (`discoveryStore.session`) and current-week open slots—never tracking individual member non-participation or auto-locking the week.

---

## Compatibility, Graduation Rubric, and Reversal

Because all prototype work lives on `explore/adaptive-family-cookbook`, **nothing on `main` is exposed to breaking changes or feature-flag bloat**. Individual innovations graduate back to `main` only after passing a five-point physical-device household rubric on `/dev/cookbook-lab` and live exploration flows:
1. **Contrast & Optical Legibility (APCA + WCAG 2.2 AA):** All four energies verified in morning sun (grocery store simulation) and warm evening kitchen light (5:00 PM Home) on iPhone/Pixel/iPad.
2. **One-Handed Thumb Ergonomics:** Every primary action (`Like`/`Pass`, `Cook`/`Change plan`, grocery check, sheet close/save) reachable and `>= 48 × 48 CSS px` without two-handed stretching.
3. **Bilingual Parity (EN & FR):** Zero clipping, overlap, or wrapping regressions at 320 CSS px and 200% font scale.
4. **Emotional Energy Fit (Qualitative Family Check):** Kids find Energy 1 (*"Swipe, Match, Cook!"*) inviting and effortless; the household cook reports Energy 4 (5:00 PM Home) feels visibly calmer than the pre-exploration baseline.
5. **Reversibility & Clean Graduation:** Winning primitives (`CookbookSheet` native `<dialog>`, OKLCH tokens, Family Table Progress, adaptive nav salience) are promoted to `main` via small, individually scoped OpenSpec changes; any experiment that adds clutter instead of calm stays behind on the branch.

---

## Open Exploration Questions (For Live Iteration on `explore/adaptive-family-cookbook`)

- **Nav Bar Architecture:** Evaluate keeping 5 tabs (`Home`, `Recipes`, `Vote`, `Planner`, `Profile`) vs. testing a direct `Shop` tab on `/dev/cookbook-lab`.
- **Family Table Progress Copy:** Test exact EN/FR phrasing for kids & parents (*"3 of 5 nights matched"* vs *"3 dinner picks ready for the week"*).
- **Capture Multi-Photo Flow:** Evaluate whether a non-blocking ribbon lets someone photograph 3 cookbook pages back-to-back in under 30 seconds while glancing at their week.
