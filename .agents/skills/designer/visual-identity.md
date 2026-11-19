# Family Cookbook Visual Identity & Token Contract

Authoritative color-science, contrast, typography, and token rules for What's For Supper (WFS). Runtime tokens live in [globals.css](../../../pwa/src/app/globals.css), [tailwind.config.ts](../../../pwa/tailwind.config.ts), [layout.tsx](../../../pwa/src/app/layout.tsx), and [button.tsx](../../../pwa/src/components/ui/button.tsx), and are enforced continuously by [tokens.test.ts](../../../pwa/src/test/tokens.test.ts) and [visual-contract.test.ts](../../../pwa/src/test/visual-contract.test.ts).

## 1. Perceptual Lightness & Warm Neutrals

Brand hues occupy different WCAG luminance bands: Terracotta `#B85542` ($L \approx 0.56$), Sage `#8A9A5B` ($L \approx 0.66$), and Ochre `#E1AD01` ($L \approx 0.77$). Never treat hues symmetrically with `"bg-<hue> text-white"`, and never put dark or black ink on mid-tone `#8A9A5B` or `#E1AD01`.

### Warm Espresso-Ink Neutral Scale (`charcoal`)

Neutral stops `50` → `900` darken strictly monotonically with a subtle warm umber undertone ($R \ge G \ge B$) so muted text and borders harmonize with warm cream `#FDFCF0` without simultaneous-contrast blue-slate chill:

| Stop | Hex | Cream `#FDFCF0` ratio | Primary use |
|---|---|---|---|
| `charcoal-50` .. `300` | `#FAF8F5`, `#F3EFEA`, `#E5DFD7`, `#CFC6BC` | — | Hairline dividers, quiet panel borders (`border-charcoal-200`), disabled fills |
| `charcoal-400` / `500` | `#9B9085` / `#6E645B` | — / `5.57:1` | Decorative icons (`400`) and muted UI boundaries |
| `charcoal-600` | `#524A43` | `8.42:1` | Supporting context, helper copy, metadata |
| `charcoal-700` | `#3D3630` | `11.43:1` | Strong secondary text |
| `charcoal` (`800`) | `#28231F` | `15.08:1` | Primary body ink (`15.55:1` on `#FFFFFF`) and standard focus ring (`outline-charcoal`) |
| `charcoal-900` | `#191512` | `17.48:1` | Maximum-contrast display headings |

## 2. Role-Locked Color Matrix

Every UI surface, badge, and action must use one of these contrast-verified role pairings:

| Role family | Classes / Tokens | Hex pair | Ratio | Notes |
|---|---|---|---|---|
| **Hearth Primary Action** | `bg-terracotta text-cream-100` (or `text-white`) | `#FDFCF0` / `#B85542` (`#FFFFFF` / `#B85542`) | `4.61:1` (`4.76:1`) | Primary CTA (`Cook`, `Search`, `Make this tonight`); hover `bg-terracotta-600` (`5.81:1`), active `bg-terracotta-700` (`8.61:1`) |
| **Secondary / Ghost Action** | `bg-white text-terracotta-700 border border-terracotta-200` | `#7B3829` / `#FFFFFF` | `8.61:1` | Secondary CTAs (`Change plan`, `Take Out`, `Edit supper plan`); `1px` border, hover `bg-terracotta-50` |
| **Sunlight / Voting Highlight** | `bg-ochre-50` or `bg-ochre-100 text-ochre-800` (hover `bg-ochre-200`) | `#664E01` / `#FFFBE6` (`#FFF7CC`) | `7.61:1` (`7.32:1`) | Tonal sunlit parchment for voting callouts and Discovery/GOTO highlights; or raised `bg-white text-ochre-800 border-ochre-300` (`7.91:1`) |
| **Garden Tonal Botanical** | `bg-sage-50 text-sage-700` / `bg-sage-100 text-sage-800` | `#525B37` / `#F1F3EB` (`#373D25` / `#E3E7D7`) | `6.45:1` (`9.07:1`) | Non-cooking icons (`bg-cream text-sage-700`), household selection (`NonCooking`), step badges, grocery progress |
| **Garden Deep Herb (Option A)** | `bg-sage-600`/`700 text-white` (`text-cream-100`) | `#FFFFFF` / `#6E7A49` · `#525B37` | `4.62:1` · `7.22:1` | `SuccessCard` celebration field (`from-sage-600 to-sage-700` with `bg-white text-sage-700` `Dismiss`), solid green CTAs (`Ask the Family`), pill-switch tracks |
| **Error & Destructive (`Button danger`)** | `bg-terracotta-50 text-terracotta-700 border border-terracotta-200` | `#7B3829` / `#F9ECE9` | `7.46:1` | Destructive actions and inline error banners with explicit message + icon |

## 3. Typography, `Ready in` & Selection Roles

- **Fonts:** **Outfit** (`font-heading`, `--font-outfit`) for headings/recipe titles; **Inter** (`font-sans`, `--font-inter`) for body, ingredients, controls, and numeric data.
- **Minimum size floor:** **`12 CSS px` (`text-xs` / `text-[12px]`) minimum** across all copy, metadata, badges, and navigation labels. Prefer sentence case over tiny tracked uppercase labels.
- **Context-paired `Ready in` pill:** Sentence case (`Ready in 30m`, `12–14 CSS px` semibold/bold)—`bg-terracotta-50 text-terracotta-700` on white cards (`TonightMenuCard`), and solid `bg-cream text-charcoal` when overlaid directly on food photos (`RecipeStackCard`, `DiscoveryCard`, `RecipeDetailSheet`).
- **Role-locked `aria-pressed` choices:** Raised `bg-white shadow-sm` for neutral view/appreciation (`Rating` borderless choices without red fills/checkmarks, `Stack / List` view switcher); blush `bg-terracotta-50 border-terracotta-200 text-terracotta-700` for personal/recipe config (`2 / 4 / 6` portions, `Language`); tonal `bg-sage-50 border-sage-200 text-sage-700` + `Check` for household supper plans (`NonCooking`).
- **Large text threshold:** Only text `>= 24 CSS px` regular or `>= 18.67 CSS px` bold qualifies for the `3.0:1` WCAG AA floor; all other text requires `>= 4.5:1`.

## 4. Do / Do Not Matrix

| Do (Era 3 Family Cookbook) | Do Not (Blocked by Visual Ratchet) |
|---|---|
| Use `#B85542` `bg-terracotta text-cream-100` for primary Hearth CTAs and shared `<Button>` | Never use off-palette Tailwind hues (`indigo`, `lavender`, `pink`, `red-*`, `ochre-dark`) |
| Use tonal sunlit `bg-ochre-50`/`bg-ochre-100 text-ochre-800` for voting/highlights; reserve `#E1AD01` strictly for non-text accents (filled star glyph, glow) | Never place text or icon controls on solid `bg-ochre`, `bg-ochre-400`, or `bg-ochre-500` (with white, charcoal, or black ink), or use bare `text-ochre` on light backgrounds |
| Use two-pole Sage: `sage-50`/`100` + `sage-700`/`800`, or Deep Herb `sage-600`/`700` + `text-white`/`cream-100` (Option A) | Never pair mid-tone `bg-sage` / `bg-sage-500` (`#8A9A5B`) with dark ink (`sage-900` / `charcoal`), with `text-white` (`3.06:1`), or bare `text-sage` (`2.97:1`) |
| Use `text-charcoal-600` (`8.42:1` on cream) for supporting text and `>= 12 px` (`text-xs`) | Never use `text-charcoal/20`–`40` copy or `< 12 px` micro-text (`text-[8px]`..`text-[11px]`) |
| Model new UI on Era 3 clean files ([TonightMenuCard.tsx](../../../pwa/src/components/home/TonightMenuCard.tsx), [ui/button.tsx](../../../pwa/src/components/ui/button.tsx)) | Never copy styling patterns from files still tracked in `LEGACY_ERA_ALLOWLIST` inside `visual-contract.test.ts` |

Consult the four layered schematic boards and prose standards in the [visual language reference](../../../docs/visual-language-reference.md).
