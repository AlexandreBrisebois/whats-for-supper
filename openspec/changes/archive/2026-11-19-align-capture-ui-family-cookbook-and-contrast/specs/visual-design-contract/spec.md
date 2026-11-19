# Spec Delta

## MODIFIED Requirements

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
