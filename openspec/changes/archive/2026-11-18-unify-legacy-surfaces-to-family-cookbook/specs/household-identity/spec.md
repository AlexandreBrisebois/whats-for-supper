# Spec Delta

## ADDED Requirements

### Requirement: Present Welcome and Onboarding with Family Cookbook visual hierarchy

Landing, Welcome, Onboarding, and Invite recovery screens SHALL use Family Cookbook cream/white surfaces, warm `charcoal` Outfit headings, `terracotta` primary entry actions clearing `4.5:1` contrast, `terracotta-700` accessible `role="alert"` error messaging, and `>= 48 CSS px` interactive controls without off-palette colors.

#### Scenario: Visitor opens Welcome or Landing

- **WHEN** an unauthenticated visitor opens `/` or `/welcome`
- **THEN** headings, helper text, passphrase input, and Enter control render with Family Cookbook terracotta/cream/charcoal tokens clearing WCAG 2.2 AA contrast and `>= 48 CSS px` targets

#### Scenario: Invalid passphrase or member load error

- **WHEN** Welcome passphrase validation or Onboarding member loading fails
- **THEN** error feedback renders in accessible `terracotta-700` alert styling rather than undefined pink/indigo tokens
