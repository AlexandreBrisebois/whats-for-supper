# Spec Delta

## MODIFIED Requirements

### Requirement: Preserve the app name across locales

The landing and Welcome branding headings SHALL display the exact literal `What's for Supper?` in English and French, including the apostrophe and question mark. This applies only to `landing.title`, `auth.welcomeTitle` and their component fallbacks; ordinary localized meal questions and surrounding copy SHALL retain their existing meaning.

#### Scenario: English or French entry heading

- **WHEN** the visitor opens the landing page or Welcome in English or French
- **THEN** its branding heading is exactly `What's for Supper?`
- **AND** localized helper text and explicit household entry behavior remain unchanged
