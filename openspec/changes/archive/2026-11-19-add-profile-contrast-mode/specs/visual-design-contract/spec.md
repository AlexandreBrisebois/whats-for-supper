# Spec Delta

## MODIFIED Requirements

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

### Requirement: Verify rendered composite contrast and touch targets in browser acceptance

Browser acceptance tooling SHALL expose a reusable Playwright verification helper inspecting rendered views for composite contrast according to an optional `contrastLevel` (`'aa'` default: `>= 4.5:1` normal / `>= 3.0:1` large; `'aaa'`: `>= 7.0:1` normal / `>= 4.5:1` large), `>= 48 × 48 CSS px` interactive target geometry, and absence of horizontal overflow at `320 CSS px` and `200%` text scaling.

#### Scenario: Browser helper detects a below-48px action button or low-contrast composite text

- **WHEN** a Playwright spec runs the shared visual-a11y helper against a rendered page or modal containing a `40 × 40 CSS px` action button or low-contrast text
- **THEN** the helper fails identifying the violating element, computed size/ratio, and failing rule

#### Scenario: Browser helper enforces WCAG 2.2 AAA ratios when contrastLevel is aaa

- **WHEN** a Playwright spec invokes the shared visual-a11y helper with `contrastLevel: 'aaa'`
- **THEN** ordinary text below `7.0:1` and qualifying large text below `4.5:1` fail contrast verification with element and ratio diagnostics
