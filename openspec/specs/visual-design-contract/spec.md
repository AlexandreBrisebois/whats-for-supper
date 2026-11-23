# visual-design-contract Specification

## Purpose

Define and enforce the shared Family Cookbook visual token pairings, perceptual contrast floors, readable typography minimums, touch-target baselines, and ratcheted automated verification across PWA household surfaces.

## Requirements

### Requirement: Maintain monotonic warm-neutral and brand token scales

The PWA theme and Tailwind configuration SHALL define monotonic neutral stops (`50`..`900`), brand anchors (`#B85542`, `#E1AD01`, `#8A9A5B`, `#FDFCF0`), and dual-mode semantic role tokens (`:root` Standard AA vs. `:root[data-contrast="high"]` High Contrast AAA). Standard mode SHALL enforce `>= 4.5:1` text and `>= 3.0:1` icon-only affordances with quiet chrome; High Contrast SHALL enforce `>= 7.0:1` text/icons, crisp borders, and opaque `bg-cream` nav.

#### Scenario: Neutral scale progression has no lightness inversion

- **WHEN** `globals.css` and `tailwind.config.ts` theme neutral stops (`50` through `900`) are evaluated for sRGB relative luminance
- **THEN** each successive neutral stop from `50` to `900` is monotonically darker than its predecessor and primary `terracotta` (`#B85542`) matches across both owners

#### Scenario: Ochre and sage pairings respect perceptual lightness

- **WHEN** ochre or sage tokens style controls, badges, or surfaces carrying normal-size text or labeled icons
- **THEN** ochre uses soft sunlit tints (`ochre-50` or `ochre-100`, or white inside an `ochre-50` callout) paired with sunlight ink (`#856400` in Standard, `#664E01` in High Contrast) rather than solid `bg-ochre` (`#E1AD01`) with white or dark text, and sage uses cooled herb Garden tokens (`#4E6E52` in Standard, `#324D36` in High Contrast) for solid fills and tonal botanical pairs rather than mid-tone `#8A9A5B` (`sage-500`)

#### Scenario: Standard mode semantic role tokens satisfy WCAG 2.2 AA and hue separation

- **WHEN** `:root` semantic role tokens are evaluated under Standard mode
- **THEN** body ink (`#28231F` on cream `15.08:1`), muted copy (`#6E645B` `5.57:1`), Hearth primary fill (`#B85542` `4.61:1` cream / `4.76:1` white), Hearth secondary/danger ink (`#A44A37` `5.81:1` white / `5.03:1` blush), cooled herb Garden (`#4E6E52` `5.71:1` white / `5.10:1` `sage-50` / `4.58:1` `sage-100`), and Sunlight ink (`#856400` `5.50:1` white / `5.10:1` `ochre-100` / `4.70:1` `ochre-200`) all satisfy WCAG 2.2 AA (`>= 4.5:1`)
- **AND** icon-only non-text affordances satisfy `>= 3.0:1` (WCAG 1.4.11) while quiet `border-charcoal-200` and `.glass-nav` translucency are preserved

#### Scenario: High contrast mode semantic role tokens satisfy WCAG 2.2 AAA and opaque chrome

- **WHEN** `:root[data-contrast="high"]` semantic role tokens are evaluated under High Contrast mode
- **THEN** body ink (`#191512` `17.48:1`), muted copy (`#524A43` `8.42:1`), Hearth primary fill (`#7B3829` `8.35:1` cream / `8.61:1` white), Hearth secondary/danger ink (`#7B3829` `8.61:1` white / `7.46:1` blush), cooled herb Garden (`#324D36` `9.33:1` white / `8.33:1` `sage-50` / `7.48:1` `sage-100`), and icon-only affordances (`>= 7.0:1`) satisfy WCAG 2.2 AAA
- **AND** Sunlight ink uses `#664E01` `ochre-800` (`7.91:1` white / `7.32:1` `ochre-100` / `6.76:1` `ochre-200`), borders become crisp high-contrast boundaries, and bottom navigation renders opaque `bg-cream`

### Requirement: Provide accessible Family Cookbook shared Button variants

The shared `Button` primitive SHALL map `primary`, `secondary`, `ghost`, and `danger` variants to dual-mode Family Cookbook semantic role tokens (WCAG 2.2 AA in Standard mode and AAA in High Contrast), preserve at least `48 CSS px` height (`min-h-12`/`min-h-14`), display a visible `focus-visible` indicator, and keep disabled/loading states distinguishable and stable.

#### Scenario: Danger variant avoids low-contrast white-on-ochre

- **WHEN** `Button` renders with `variant="danger"`
- **THEN** it uses accessible destructive semantic Hearth tokens (`bg-terracotta-50` with semantic Hearth ink `#A44A37`/`#7B3829` and border) rather than white text on ochre

#### Scenario: Standard and large shared buttons preserve 48px touch targets

- **WHEN** `Button` renders at `size="md"` or `size="lg"`
- **THEN** its classes enforce at least `min-h-12` (`48 CSS px`) and include explicit visible `focus-visible` outline styles

#### Scenario: Shared Button variants adapt between Standard AA and High contrast AAA

- **WHEN** `Button` renders under `data-contrast="standard"` vs. `data-contrast="high"`
- **THEN** computed `primary`, `secondary`, `ghost`, and `danger` colors switch cleanly via CSS semantic role variables to satisfy AA in Standard and AAA in High Contrast

### Requirement: Enforce ratcheted visual contract checks against off-palette and micro-type drift

Automated unit tests SHALL scan PWA source for off-palette hues (`indigo`, `lavender`, `pink`, `red-*`, `ochre-dark`), low-contrast or disallowed pairings (opaque `bg-ochre`/`ochre-400`/`ochre-500` fills on text or icon controls, white-on-base-sage, bare `text-ochre`/`text-sage`), and `< 12 CSS px` text. Non-allowlisted files with violations SHALL fail, and allowlisted files clearing all violations SHALL fail until removed from the allowlist.

#### Scenario: New component introduces off-palette or banned solid-ochre class

- **WHEN** a component outside the temporary legacy allowlist uses `text-indigo`, `bg-pink`, `bg-ochre text-white`, `bg-ochre text-charcoal`, or `text-[10px]`
- **THEN** the visual contract unit test fails naming the offending file, line, and violated rule

#### Scenario: Migrated legacy file clears all violations

- **WHEN** a file listed in the temporary legacy allowlist removes its last visual-contract violation
- **THEN** the ratchet check fails with instructions to remove that file from the allowlist so migration progress cannot regress

### Requirement: Verify rendered composite contrast and touch targets in browser acceptance

Browser acceptance tooling SHALL expose a reusable Playwright verification helper inspecting rendered views for composite contrast according to an optional `contrastLevel` (`'aa'` default: `>= 4.5:1` normal / `>= 3.0:1` large; `'aaa'`: `>= 7.0:1` normal / `>= 4.5:1` large), `>= 48 × 48 CSS px` interactive target geometry, and absence of horizontal overflow at `320 CSS px` and `200%` text scaling.

#### Scenario: Browser helper detects a below-48px action button or low-contrast composite text

- **WHEN** a Playwright spec runs the shared visual-a11y helper against a rendered page or modal containing a `40 × 40 CSS px` action button or low-contrast text
- **THEN** the helper fails identifying the violating element, computed size/ratio, and failing rule

#### Scenario: Browser helper enforces WCAG 2.2 AAA ratios when contrastLevel is aaa

- **WHEN** a Playwright spec invokes the shared visual-a11y helper with `contrastLevel: 'aaa'`
- **THEN** ordinary text below `7.0:1` and qualifying large text below `4.5:1` fail contrast verification with element and ratio diagnostics

#### Scenario: Capture Playwright suites enforce both Standard AA and High Contrast AAA acceptance

- **WHEN** Capture browser acceptance suites (`capture-flow.spec.ts`, `pdf-capture.spec.ts`, `url-capture-recovery.spec.ts`) execute across entry, photo staging, URL review, description capture, PDF confirmation, failure recovery, and completion notifications
- **THEN** they invoke `assertCookbookVisualA11y` in both `'aa'` and `'aaa'` contrast modes without violations or horizontal overflow

### Requirement: Style inline decision, recovery, and status surfaces with Family Cookbook tokens

Inline decision panels, conflict recovery cards, and status or error banners SHALL use opaque Family Cookbook surfaces (`bg-white` with `border-chrome-line` or Hearth blush/border), shared `Button` variants, sentence-case `font-heading` headings, `>= 48 CSS px` interactive targets, and visible `ink-body` focus outlines.

#### Scenario: Neutral, hearth, and garden surface roles distinguish outcome states

- **WHEN** a Tier 1 inline decision, conflict recovery, or status surface renders for confirmation, pending progress, or failure recovery
- **THEN** neutral decision containers use opaque `bg-white` with `border-chrome-line`, quiet status notices use tonal Garden styling, and alert or conflict recovery cards use Hearth tint and border tokens with shared `Button` actions

#### Scenario: Interactive targets and focus outlines satisfy Standard AA and High Contrast AAA

- **WHEN** inline recovery buttons, close controls, retry triggers, and conflict toggles render in Standard and High Contrast modes
- **THEN** each interactive control exposes at least `48 × 48 CSS px` hit geometry, a visible `focus-visible` `ink-body` outline with at least `3:1` contrast, and composites passing `assertCookbookVisualA11y` at `'aa'` and `'aaa'`

#### Scenario: Narrow 320px viewports at 200% text scaling remain readable without overflow

- **WHEN** any Tier 1 decision or recovery surface renders at `320 CSS px` width with `200%` text scaling in English or French
- **THEN** button labels and recovery messages wrap cleanly without horizontal clipping or overflow (`scrollWidth <= clientWidth`)

### Requirement: Unify compact pivot and recovery sheet geometry and affordances

`SkipRecoveryDialog`, `PlanningPivotSheet`, and `NonCookingDaySheet` SHALL share an opaque Era 3 `bg-cream` shell with a locked top-left title (`0px` shift), top-right `>= 48px` `[Back] [Close]` controls, an optional `4px` 2-step bar, and non-clickable terracotta-bar meal context above a hairline divider. All three SHALL fit without scrolling on `412 × 915` (EN/FR) and reflow cleanly at `320px` and `200%` text scale.

#### Scenario: Pixel 10 zero-scroll and locked header across Plan B Step 1 and Step 2

- **WHEN** `SkipRecoveryDialog` renders Step 1 and transitions to Step 2 for a long multi-word recipe title on a `412 × 915 CSS px` viewport in English or French
- **THEN** the entire sheet, including `Back`, `Close`, and all disposition choices, fits inside the viewport with zero vertical scrolling (`scrollHeight <= clientHeight`)
- **AND** the bounding box of the `Plan B` title remains locked at the same `x` and `y` coordinates across Step 1 and Step 2

#### Scenario: Planner options and Other plans match Era 3 opaque shell without scrolling

- **WHEN** `PlanningPivotSheet` (with a planned recipe and all 5 actions) or `NonCookingDaySheet` (with an active family note input) renders on a `412 × 915 CSS px` viewport
- **THEN** both render opaque `bg-cream` Era 3 surfaces (`backdrop-filter: none` on the sheet panel), expose `>= 48 × 48 CSS px` touch targets on `Close`, `Back`, and all options, fit without scrolling, and pass `assertCookbookVisualA11y` in both `'aa'` and `'aaa'` contrast modes

#### Scenario: Narrow 320px reflow and 200% text scaling remain usable

- **WHEN** `SkipRecoveryDialog` (including the 3-up `Not cooking tonight` row and inline `Made plans` input), `PlanningPivotSheet`, or `NonCookingDaySheet` renders at `320 CSS px` width or `200%` root font scaling in English or French
- **THEN** controls wrap without horizontal clipping or overflow (`scrollWidth <= clientWidth`) and remain reachable via internal sheet scrolling
