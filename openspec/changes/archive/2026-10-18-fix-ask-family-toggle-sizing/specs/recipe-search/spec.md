## ADDED Requirements

### Requirement: Present compact regular Search cards

Regular Search cards SHALL use the compact Browse list presentation: edge-to-edge 4:3 images, small rounded corners, padded content with names visible up to two lines and readable formatted time. Narrow mobile layouts SHALL retain two columns with compact spacing. Supplied issue badges SHALL remain visible. Top Pick SHALL retain its distinct hero, reason and Surprise Me control.

#### Scenario: Narrow results with Top Pick
- **WHEN** Search shows a Top Pick and ordinary alternatives at 360, 390 or 430 CSS pixels
- **THEN** ordinary cards match Browse list image treatment and content spacing while Top Pick remains distinct
- **AND** long names occupy up to two lines and issue badges remain inside their images

#### Scenario: No Top Pick
- **WHEN** Search returns ordinary alternatives without a Top Pick
- **THEN** the same compact grid displays them in their returned order without inventing a promoted card

#### Scenario: Return from compact card detail
- **WHEN** a person opens a compact card and closes its detail
- **THEN** the mounted query, selections and cards retain their existing return behavior and compact geometry without a close-triggered search
