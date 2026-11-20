# Spec Delta

## REMOVED Requirements

### Requirement: Present readable Solar Earth recipe detail across viewports

**Reason**: Retired the "Solar Earth" nomenclature in favor of the Shared Table identity while preserving contemporary cookbook composition.
**Migration**: Governed by "Present readable Shared Table cookbook recipe detail across viewports".

## ADDED Requirements

### Requirement: Present readable Shared Table cookbook recipe detail across viewports

Detail SHALL use the established Shared Table typography, palette and components in a contemporary cookbook layout, with prominent recipe identity and food imagery, warm readable surfaces, sentence-case labels and stable text hierarchy. Phones SHALL use full-screen detail; larger screens SHALL use a bounded spacious dialog. At 320 CSS px and 200% text, English/French content, focus and 48 CSS px action targets SHALL remain reachable without horizontal overflow.

#### Scenario: Ordinary phone and tablet reading

- **WHEN** a complete photo-filled recipe opens on phone or tablet
- **THEN** photograph, title, rating and recipe content have clear hierarchy and the primary action remains reachable without shrinking text or targets

#### Scenario: Long French content and keyboard

- **WHEN** long French content, enlarged text or the on-screen keyboard reduces available space
- **THEN** headings and actions wrap in reading order and all content and focused controls can be reached by scrolling
