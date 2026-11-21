# Spec Delta

## Purpose

Define and enforce the shared Family Cookbook visual token pairings, perceptual contrast floors, readable typography minimums, touch-target baselines, and ratcheted automated verification across PWA household surfaces.

## ADDED Requirements

### Requirement: Maintain monotonic warm-neutral and brand token scales

The PWA theme stylesheet and Tailwind configuration SHALL define monotonically darkening neutral stops (`50` through `900`) and synchronized brand tokens (`terracotta` `#B85542`, `ochre` `#E1AD01`, `sage` `#8A9A5B`, `cream` `#FDFCF0`). Role pairings SHALL meet WCAG 2.2 AA text (`>= 4.5:1`) and large/non-text (`>= 3.0:1`) contrast.

#### Scenario: Neutral scale progression has no lightness inversion

- **WHEN** `globals.css` and `tailwind.config.ts` theme neutral stops (`50` through `900`) are evaluated for sRGB relative luminance
- **THEN** each successive neutral stop from `50` to `900` is monotonically darker than its predecessor and primary `terracotta` (`#B85542`) matches across both owners

#### Scenario: Ochre and sage pairings respect perceptual lightness

- **WHEN** ochre or sage tokens style controls, badges, or surfaces carrying normal-size text or labeled icons
- **THEN** ochre uses soft sunlit tints (`ochre-50` or `ochre-100`, or white inside an `ochre-50` callout) paired with warm golden-umber `ochre-800` ink (`>= 6.7:1`) rather than solid `bg-ochre` (`#E1AD01`) with either white or black/charcoal text, and sage uses tonal botanical pairs (`sage-50`/`100` with `sage-700`/`800`) or deep-herb solid/celebration pairs (`sage-600`/`700` with `white`/`cream-100`, `>= 4.5:1`) while retiring dark ink on mid-tone `#8A9A5B` (`sage-500`)

### Requirement: Provide accessible Family Cookbook shared Button variants

The shared `Button` primitive SHALL map `primary`, `secondary`, `ghost`, and `danger` variants exclusively to contrast-verified Family Cookbook tokens, provide at least `48 CSS px` height (`min-h-12`) for standard (`md`) and large (`lg`) actions, display a visible keyboard `focus-visible:outline-charcoal` (`#28231F`) indicator, and keep disabled/loading states visually distinguishable and stable.

#### Scenario: Danger variant avoids low-contrast white-on-ochre

- **WHEN** `Button` renders with `variant="danger"`
- **THEN** it uses accessible destructive terracotta tokens (`bg-terracotta-50` with `text-terracotta-700` and `border-terracotta-200`) rather than white text on ochre

#### Scenario: Standard and large shared buttons preserve 48px touch targets

- **WHEN** `Button` renders at `size="md"` or `size="lg"`
- **THEN** its classes enforce at least `min-h-12` (`48 CSS px`) and include explicit `focus-visible:outline-charcoal` outline styles

### Requirement: Enforce ratcheted visual contract checks against off-palette and micro-type drift

Automated unit tests SHALL scan PWA source for off-palette hues (`indigo`, `lavender`, `pink`, `red-*`, `ochre-dark`), low-contrast or disallowed pairings (opaque `bg-ochre`/`ochre-400`/`ochre-500` fills on text or icon controls, white-on-base-sage, bare `text-ochre`/`text-sage`), and `< 12 CSS px` text. Non-allowlisted files with violations SHALL fail, and allowlisted files clearing all violations SHALL fail until removed from the allowlist.

#### Scenario: New component introduces off-palette or banned solid-ochre class

- **WHEN** a component outside the temporary legacy allowlist uses `text-indigo`, `bg-pink`, `bg-ochre text-white`, `bg-ochre text-charcoal`, or `text-[10px]`
- **THEN** the visual contract unit test fails naming the offending file, line, and violated rule

#### Scenario: Migrated legacy file clears all violations

- **WHEN** a file listed in the temporary legacy allowlist removes its last visual-contract violation
- **THEN** the ratchet check fails with instructions to remove that file from the allowlist so migration progress cannot regress

### Requirement: Verify rendered composite contrast and touch targets in browser acceptance

Browser acceptance tooling SHALL expose a reusable Playwright verification helper capable of inspecting rendered views for WCAG 2.2 AA foreground/background text contrast on actual composite backgrounds, `>= 48 × 48 CSS px` interactive target geometry (for primary/secondary controls outside inline prose links), and absence of horizontal overflow at `320 CSS px` and `200%` text scaling.

#### Scenario: Browser helper detects a below-48px action button or low-contrast composite text

- **WHEN** a Playwright spec runs the shared visual-a11y helper against a rendered page or modal containing a `40 × 40 CSS px` action button or low-contrast text
- **THEN** the helper fails identifying the violating element, computed size/ratio, and failing rule
