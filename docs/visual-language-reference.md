# Family Cookbook Visual Language · Era 3 Reference

Normative visual reference for What's For Supper (WFS). Organized in three coherent industry layers—**Foundations → Functional Patterns → Domain Exemplars**—so routes reuse shared parts rather than inventing page-local habits. Read alongside the [North Star](creative-direction-north-star.md) and [designer judgment](agent-designer-identity.md). Runtime tokens live in [globals.css](../pwa/src/app/globals.css) and [tailwind.config.ts](../pwa/tailwind.config.ts); chronological Oct–Nov 2026 design diaries and the historical 25 October SVG checkpoint boards live in the [archived session history](archive/visual-language-session-history.md).

## Start with the 4 layered schematic boards

- [Board 01 · Layer 1 Foundations: color roles, type & icons](visual-language/01-foundations-roles-and-type.svg)
- [Board 02 · Layer 2 Functional Patterns: surfaces, controls, settings & recovery](visual-language/02-surfaces-controls-and-recovery.svg)
- [Board 03 · Layer 3A Domain: Supper Plan (Tonight, Weekly Planner, Portions & Groceries)](visual-language/03-domain-supper-plan-and-week.svg)
- [Board 04 · Layer 3B Domain: Recipe Cards, Browse Toolbar & Detail Sheet](visual-language/04-domain-recipe-cards-and-detail.svg)

![Board 01: Era 3 warm espresso-ink charcoal ramp, Hearth Terracotta, Tonal Ochre, Option A two-pole Sage (deep herb and tonal botanical), Outfit and Inter type scale, context-paired Ready in pills, 48px targets, outline-charcoal focus ring, and Lucide icon vocabulary.](visual-language/01-foundations-roles-and-type.svg)

![Board 02: Functional pattern grammar—four-tier opaque surface ladder with restricted glass, side-by-side card action row, role-locked aria-pressed choices, inline disclosures, 48px switches vs 24px checkboxes, Profile and Settings sections, Option A celebration, and uncertain-save recovery.](visual-language/02-surfaces-controls-and-recovery.svg)

![Board 03: Supper Plan domain continuity—Home Tonight states (TonightMenuCard side-by-side actions with View ingredients disclosure, TonightPivotCard, white TonightCardBase non-cooking, Option A deep herb Cooked celebration, tonal VotingNudgeCard) paired with Weekly Planner temporal rows, inline Portions editor, and Groceries with source disclosure.](visual-language/03-domain-supper-plan-and-week.svg)

![Board 04: Recipe domain continuity—four-context Recipe Card family, progressive Recipes Browse toolbar and planning banner, and annotated Nov 5–6 RecipeDetailSheet protecting Cook/GOTO/Gear toolbar, hero pills, 2/4/6 preview, Rating -> Notes -> Ask the Family, and bottom planning dock.](visual-language/04-domain-recipe-cards-and-detail.svg)

> [!NOTE]
> The boards distinguish **Shipped Era 3** controls from **Target Era 3** updates scheduled in follow-up migration waves (for example `VotingNudgeCard`, `Navigation.tsx`, `DiscoveryCard` descriptions, `PreviewFeaturesSection` pill switches, and opaque `bg-white` migration on Settings and Planner rows). Never copy Era 1–2 tokens still tracked in `LEGACY_ERA_ALLOWLIST` inside [visual-contract.test.ts](../pwa/src/test/visual-contract.test.ts).

## Refined Family Cookbook aesthetic

Food and the household's recipes carry anticipation and belonging. At ordinary mobile text size, let generous photography and a confident **Outfit** recipe title lead on warm cream (`#FDFCF0`, `.cookbook-bg`) and crisp opaque white (`#FFFFFF`) elevated cards (`TonightCardBase`), framed with considered whitespace, coherent rounding, and soft layered depth. Keep supporting **Inter** context calm and readable; do not flatten every surface or make every control compete at equal weight.

The user-supplied composition anchors ([planned meal anchor](visual-language/references/Screenshot_20261026-212933.png) and [pivot anchor](visual-language/references/Screenshot_20261026-212918.png)) establish portrait/5:4 photography hierarchy, deep corner rounding, soft outer elevation, and one dominant action per card. Keep Outfit headings and Inter body/data text; do not introduce extra display fonts, paper textures, or decorative badges.

| Home element | Era 3 Family Cookbook standard | Preserve |
|---|---|---|
| Food image | Generous near-square meal photo (`TonightMenuCard`) and 5:4 pivot crop (`TonightPivotCard`); text/actions grow independently | Subject visibility, responsive reflow, navigation reachability |
| Recipe title | Main typographic anchor in Outfit, bold weight, comfortable wrapping | Full EN/FR title on stable readable background |
| Context / duration | Quiet `charcoal-600` context (`#524A43`); sentence-case `Ready in 30m` pill (`bg-terracotta-50 text-terracotta-700` on white card; `bg-cream text-charcoal` on photo) | Existing localized Ready In wrapper and missing-time behavior |
| Primary CTA (`Cook`, `Make this tonight`, `Search`) | Rich terracotta `#B85542` with `cream-100` / white text (`>= 4.61:1`); hover `#A44A37`, pressed `#7B3829` | One dominant action per card, clear label, contrast, focus ring |
| Secondary CTA (`Change plan`, `Take Out`, `Edit supper plan`) | White surface with `1px` `terracotta-200` border and `terracotta-700` ink (`8.61:1`), `min-h-12` / `min-h-14` | Visibly enabled actions and generous hit areas |
| Ingredients disclosure | Left-aligned label and `ChevronDown` with transparent `>= 48 px` touch padding | Explicit expanded state, keyboard focus, local identity reset |
| Empty / failed image | Modest icon on warm `cream` slot (`bg-cream text-sage-700`) rather than a heavy gray slab | Honest state, recipe identity, no invented image |

## Seven principles for consistent decisions

1. **Lead with the truth about the task.** Make tonight's state, the next action, and its consequence visible before decoration. A candidate, a saved meal, an intentional `Take Out` plan, and a cooked meal are different facts.
2. **Assign colour a role without flattening identity.** Warm cream (`#FDFCF0`) is the canvas; warm espresso-ink charcoal (`#28231F` / `#524A43`) carries reading. Terracotta owns primary Hearth actions, personal config, and destructive recovery; tonal sunlit ochre owns voting/GOTO highlights; two-pole sage carries preference, household participation, plans, progress, and deep-herb celebration. Pair state with words and icons—never hue alone.
3. **Compensate for perceptual lightness asymmetry.** Base terracotta (`#B85542`, $L \approx 0.56$), base sage (`#8A9A5B`, $L \approx 0.66$), and base ochre (`#E1AD01`, $L \approx 0.77$) sit in distinct luminance bands. Never force `"bg-<hue> text-white"` across all hues and never put dark/black ink onto mid-tone `#8A9A5B` or `#E1AD01`.
4. **Use type to explain hierarchy.** Preserve **Outfit** headings and **Inter** body/data. Keep all readable copy at `>= 12 CSS px` (`text-xs` minimum), prefer sentence case (`Ready in 30m`, `Change plan`, `Take Out`) over `< 12 px` tracked all-caps, and preserve semantic heading order.
5. **Make controls look as available as they are.** Enabled secondary actions use clear outlined or tonal surfaces—never disabled-looking gray. Keep pressed, selected, busy, unavailable, and error states distinct and dimensionally stable while busy.
6. **Design for hands and changing space.** Prioritize touch ergonomics (`>= 48 × 48 CSS px` interactive targets), `320 CSS px` reflow, `200%` text scaling, and safe areas above mobile keyboards and bottom navigation.
7. **Say what happens, in both languages.** Use honest action verbs (`Take Out` / `À emporter` records a supper plan rather than placing a food-delivery order), explain partial completion, and allow natural French text expansion without truncation.

## Cross-section functional standards (Layer 2)

1. **Opaque white surface ladder:** Crisp opaque `bg-white` (`#FFFFFF`) frames hero cards (`TonightCardBase` `rounded-[3rem]`), Settings/Profile section panels (`rounded-3xl`, `1px` `border-charcoal-200`), and active Planner day rows (`rounded-2xl`); flat `bg-cream` (`#FDFCF0`, `shadow-none`) marks past/muted rows and recessed wells. Reserve frosted translucency strictly for floating navigation (`.glass-nav`) and photo-overlaid capsules (`bg-cream/80 backdrop-blur-md` `View Original`).
2. **Context-paired `Ready in` badge:** Always sentence case (`Ready in 30m`, `12–14 CSS px` semibold/bold)—blush `bg-terracotta-50 text-terracotta-700` inside white card headers (`TonightMenuCard`), and solid warm `bg-cream text-charcoal` when overlaid directly on food photography (`RecipeStackCard`, `DiscoveryCard`, `RecipeDetailSheet`).
3. **Role-locked `aria-pressed` selection:** Raised `bg-white shadow-sm` on cream for neutral view/rating (`Rating` borderless choices with no red fill/checkmark; `Stack / List`); blush `bg-terracotta-50 border-terracotta-200 text-terracotta-700` for personal/recipe configuration (`Preview portions 2/4/6`, `Language`, active member); tonal `bg-sage-50 border-sage-200 text-sage-700` + `Check` for household supper-plan choices (`NonCookingDaySheet`).
4. **Pill-track switches vs. checkboxes:** Immediate binary toggles (`role="switch"`, such as `Ask the Family` and `Preview features`) use a `>= 48 px` row with a `56 × 32 px` rounded pill track (`bg-sage-700` or `bg-terracotta` active + white thumb); form options inside explicit-save forms (`Usual portions: Use family size`, `Keep amount fixed`) use a `22–24 px` rounded checkbox (`accent-terracotta`) inside a `>= 48 px` label row.
5. **Focus indicator & sheet shell:** Standardize keyboard focus on `focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-charcoal` (`#28231F`) across all interactive controls (including `<Button>`). Sheets and dialogs render an opaque `bg-cream` container (full-screen `< 768 px`, bounded dialog on tablet) over a warm dark scrim (`bg-charcoal/45 backdrop-blur-sm`) with sticky header, scrollable body, and safe-area bottom dock.

## Warm neutral & two-pole Sage roles

### Neutral ramp (warm espresso-ink)

[globals.css](../pwa/src/app/globals.css) and [tailwind.config.ts](../pwa/tailwind.config.ts) define a strictly monotonic warm espresso-ink `charcoal` ramp (`50` → `900`) tuned to harmonize with `#FDFCF0` cream without cool blue-slate simultaneous contrast:

- `charcoal-50`: `#FAF8F5` · `100`: `#F3EFEA` · `200`: `#E5DFD7` · `300`: `#CFC6BC` · `400`: `#9B9085`
- `charcoal-500`: `#6E645B` (`5.57:1` on cream) · `600`: `#524A43` (`8.42:1` on cream) · `700`: `#3D3630` (`11.43:1`) · `800` (`DEFAULT`): `#28231F` (`15.08:1` on cream, `15.55:1` on white) · `900`: `#191512` (`17.48:1`)

### Garden two-pole Sage roles in source (Option A)

**Sage** operates across two high-contrast poles—never dark ink or white text on mid-tone `#8A9A5B`:

| Journey | Sage pole & role | Source owner |
|---|---|---|
| Matches / celebration (`#5 Cooked`) | Deep Herb (`bg-sage-600`/`700`, `#6E7A49` → `#525B37`) + crisp white/cream text and `bg-white text-sage-700` `Dismiss` | [SuccessCard](../pwa/src/components/ui/SuccessCard.tsx) |
| Discovery | `LOVE` preference overlay (`bg-sage-700/90 text-white`), `Just planned ✓` badge (`bg-sage-50 text-sage-800`) | [DiscoveryCard](../pwa/src/components/discovery/DiscoveryCard.tsx) |
| Planning & non-cooking | `Ask the Family` / `Nudge family` (`bg-sage-700 text-white`), unanimous/prepared badges (`sage-50/700`), `NonCooking` icon (`bg-cream text-sage-700`) | `pwa/src/app/(app)/planner/page.tsx`, [TonightPivotCard](../pwa/src/components/home/TonightPivotCard.tsx) |
| Groceries & Cooking | Checked progress, aisle completion (`bg-sage-50 text-sage-700`), recipe-book source links (`text-sage-800`), cooked badges | [GroceryList](../pwa/src/components/planner/GroceryList.tsx), [CooksMode](../pwa/src/components/planner/CooksMode.tsx) |

## Role-Locked Color Matrix

All opaque text pairs below are verified via WCAG 2.2 sRGB relative luminance in [tokens.test.ts](../pwa/src/test/tokens.test.ts). Thresholds: `>= 4.5:1` for normal text, `>= 3.0:1` for qualifying large text (`>= 24 px` or `>= 18.67 px` bold) and meaningful non-text boundaries/icons.

| Role family | Foreground / background tokens | Hex pair | Ratio |
|---|---|---|---:|
| Body on warm canvas | `text-charcoal` / `bg-cream` | `#28231F` / `#FDFCF0` | 15.08:1 |
| Body on elevated card | `text-charcoal` / `bg-white` | `#28231F` / `#FFFFFF` | 15.55:1 |
| Supporting context | `text-charcoal-600` / `bg-cream` | `#524A43` / `#FDFCF0` | 8.42:1 |
| Hearth primary action | `text-cream-100` / `bg-terracotta` | `#FDFCF0` / `#B85542` | 4.61:1 |
| Hearth primary (white ink) | `text-white` / `bg-terracotta` | `#FFFFFF` / `#B85542` | 4.76:1 |
| Hearth hover / pressed | `text-white` / `bg-terracotta-600` · `-700` | `#FFFFFF` / `#A44A37` · `#7B3829` | 5.81:1 · 8.61:1 |
| Secondary / Ghost action | `text-terracotta-700` / `bg-white` (`border-terracotta-200`) | `#7B3829` / `#FFFFFF` | 8.61:1 |
| Sunlight voting / highlight | `text-ochre-800` / `bg-ochre-50` (`bg-ochre-100`, hover `-200`) | `#664E01` / `#FFFBE6` (`#FFF7CC`, `#FFEE99`) | 7.61:1 (`7.32:1`, `6.76:1`) |
| Sunlight raised action | `text-ochre-800` / `bg-white` (`border-ochre-300`) | `#664E01` / `#FFFFFF` | 7.91:1 |
| Garden soft state / badge | `text-sage-700` / `bg-sage-50` (`text-sage-800` / `bg-sage-100`) | `#525B37` / `#F1F3EB` (`#373D25` / `#E3E7D7`) | 6.45:1 (`9.07:1`) |
| Garden Deep Herb solid / celebration | `text-white` / `bg-sage-600` · `bg-sage-700` (`text-cream-100` / `bg-sage-700`) | `#FFFFFF` / `#6E7A49` · `#525B37` (`#FDFCF0` / `#525B37`) | 4.62:1 · 7.22:1 (`7.00:1`) |
| Error & destructive (`Button danger`) | `text-terracotta-700` / `bg-terracotta-50` (`border-terracotta-200`) | `#7B3829` / `#F9ECE9` | 7.46:1 |
| Disabled reference | `text-charcoal-600` / `bg-charcoal-200` | `#524A43` / `#E5DFD7` | 6.56:1 |

**Disallowed & automatically ratcheted tokens** (enforced by [visual-contract.test.ts](../pwa/src/test/visual-contract.test.ts)):
- Off-palette colors (`indigo`, `lavender`, `pink`, `red-*`, `ochre-dark`).
- Solid `bg-ochre`, `bg-ochre-400`, or `bg-ochre-500` behind text or icon controls—under either light (`2.06:1`) or dark/charcoal ink; reserve `#E1AD01` strictly for non-text accents (filled star glyph, glow, ambient pulse).
- Dark or white text on mid-tone `#8A9A5B` `bg-sage`/`bg-sage-500` (always use Deep Herb `sage-600`/`700` with white, or Tonal Botanical `sage-50`/`100` with `sage-700`/`800`).
- Bare `text-ochre` (`1.91:1`) or `text-sage` (`2.97:1`) on light surfaces, `text-charcoal/20`–`40`, and `< 12 px` micro-type (`text-[8px]`..`text-[11px]`).

## Protected domain flows & bilingual copy

- **Home & Tonight (`03-domain-supper-plan-and-week.svg`):** **Cook** opens Cook's Mode without marking cooked; **Change plan** runs backup → original disposition → replacement save before inline `View ingredients` disclosure; **Take Out** records a supper plan (including takeout and delivery) rather than placing an external order; **Cooked (`SuccessCard`)** uses Deep Herb **Option A** white-on-green and compacts without undoing completion.
- **Planner, Portions & Groceries (`03`):** Temporal rows (`bg-cream` past vs opaque `bg-white` upcoming, `Today` terracotta divider), inline `Portions` mode with compact numeric reset (`[4]`) and dirty departure guard, and embedded/standalone `GroceryList` with recipe-book source disclosure keeping incomplete-subtotal hints outside.
- **Recipes, Detail & Settings (`04` & `02`):** Progressive Browse search/Discovery/GOTO/Stack-List/RecycleBin toolbar; `RecipeDetailSheet` protecting toolbar order (`Cook` + `GOTO` + `Share` + `•••` + `Close`), `2 / 4 / 6` portion preview, locked **Rating → Notes → Ask the Family** order, and bottom `Plan for {{day}}` + icon-only `Change day`; `Profile` & `Settings` preserving active member, `Language`, `Manage family`, `Usual portions`, `Failed captures`, and `Preview features`.

| Concept | English | French | Notes |
|---|---|---|---|
| Cook action | Cook | Cuisiner | Opens Cook's Mode |
| Change intention | Change plan | Changer le plan | Opens recovery |
| Search / Suggestions | Search / Suggestions | Recherche / Suggestions | Recipe selection (not a duration filter) |
| Non-cooking plan | Take Out | À emporter | Records a plan (includes takeout and delivery), not an order |
| Blank day | Leave this day unplanned | Laisser cette journée sans plan | Separate Planner action |

## Mobile review & automated verification

Before shipping UI work, verify both EN and FR across `320 px` narrow phone (`200%` text scaling), `390×844` phone, and tablet viewports using [visual-a11y-contract.ts](../pwa/e2e/visual-a11y-contract.ts) (`assertCookbookVisualA11y`), [tokens.test.ts](../pwa/src/test/tokens.test.ts), and [visual-contract.test.ts](../pwa/src/test/visual-contract.test.ts):

- **Touch targets:** `>= 48 × 48 CSS px` (`min-h-12` / `min-h-14` on `<Button>` and action links), `whitespace` separation, and non-clipped wrapped EN/FR labels.
- **Keyboard & focus:** Visible `:focus-visible` CSS `outline` + `outline-offset` (`outline-charcoal` `#28231F`, `>= 3:1` in light and Forced Colors modes), logical tab order, and focus return from modals/sheets.
- **Composite contrast & motion:** Measure actual composited backgrounds on `.glass-nav` and hero `View Original` capsules over light and dark photography; respect `prefers-reduced-motion` and keep busy controls dimensionally stable.

## Canonical code & contract owners

| Owner | Responsibility |
|---|---|
| [globals.css](../pwa/src/app/globals.css) & [tailwind.config.ts](../pwa/tailwind.config.ts) | Authoritative Era 3 colors, warm charcoal ramp, `.cookbook-bg`, `.glass*`, safe areas |
| [Root layout](../pwa/src/app/layout.tsx) | Outfit / Inter font loading and viewport setup |
| [button.tsx](../pwa/src/components/ui/button.tsx) & [common/Button.tsx](../pwa/src/components/common/Button.tsx) | Shared Era 3 `<Button>` (`primary`, `secondary`, `ghost`, `danger`, `min-h-12`/`14`, `focus-visible:outline-charcoal`) |
| [SolarLoader.tsx](../pwa/src/components/ui/SolarLoader.tsx) & [ui/index.ts](../pwa/src/components/ui/index.ts) | `CookbookLoader` primitive and `SolarLoader` compatibility alias |
| [tokens.test.ts](../pwa/src/test/tokens.test.ts) & [button.test.tsx](../pwa/src/components/ui/button.test.tsx) | Monotonic warm neutral luminance, brand parity, role contrast floors, and `<Button>` contract |
| [visual-contract.test.ts](../pwa/src/test/visual-contract.test.ts) | Static palette, tonal ochre, sage, micro-type, and shrinking `LEGACY_ERA_ALLOWLIST` ratchet |
| [visual-a11y-contract.ts](../pwa/e2e/visual-a11y-contract.ts) | Computed composite contrast, `>= 48 px` target geometry, and `320 px`/200% reflow helper |
| [English](../pwa/src/locales/en/common.json) & [French](../pwa/src/locales/fr/common.json) | Localized strings |

## Official grounding

- GC Design System: [colour roles and accessible use](https://design-system.canada.ca/en/styles/colour/), [typographic hierarchy](https://design-system.canada.ca/en/styles/typography/), [buttons](https://design-system.canada.ca/en/components/button/), [button design](https://design-system.canada.ca/en/components/button/design/).
- W3C WCAG 2.2: [text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html), [not colour alone](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html), [target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html), [reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html), [resize text](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html).
- Apple: [touch and legibility tips](https://developer.apple.com/design/tips/), [layout and safe areas](https://developer.apple.com/design/human-interface-guidelines/layout); Android: [accessible touch targets](https://developer.android.com/develop/ui/compose/accessibility/api-defaults).
