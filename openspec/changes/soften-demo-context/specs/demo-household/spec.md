# Spec Delta

## MODIFIED Requirements

### Requirement: Offer a reopenable demo context explanation
The demo SHALL provide a compact pale sage strip with readable dark charcoal text at the top of the ordinary app shell, respecting safe areas, that opens one short phone sheet or compact iPad dialog. It SHALL explain the sample shared household, other visitors' changes, temporary resettable state and avoiding personal information. Start exploring and an explicit close SHALL dismiss it. Existing identity hints SHALL retain their noninteractive meaning.

#### Scenario: Tap the context band
- **WHEN** a visitor activates Demo · What to know or its French equivalent in the ordinary demo shell
- **THEN** a named, readable dialog opens with the shared-state explanation, Start exploring and an explicit close, without navigation, household mutation or a mandatory tour
- **AND** the band remains available after dismissal for voluntary reopening

#### Scenario: Truthful restrictions
- **WHEN** the explanation describes AI limitations or reset behaviour
- **THEN** its claims match verified restrictions for the delivered demo and do not imply universal AI blocking, zero cost, processed visitor uploads, a guaranteed reset countdown or a schedule not established by evidence

#### Scenario: Responsive accessible control and surface
- **WHEN** the context band and explanation render in EN/FR on iPhone, Pixel Phone or iPad
- **THEN** the band has at least a 44 CSS pixel touch height, visible focus and text contrast of at least 4.5:1 on each actual interaction background, with no text clipping or obscured navigation
- **AND** the phone sheet or compact tablet dialog supports readable focus, accessible name/description, contained keyboard focus, Escape/explicit close, focus return, reduced motion and reachable actions under text expansion

#### Scenario: Quiet visual weight without a smaller target
- **WHEN** the context band renders at ordinary text size
- **THEN** its full-width accessible target remains at least 44 CSS pixels high with cream outer space and an approximately 28 CSS pixel minimum colored inner strip
- **AND** the label uses 13px/18px medium text and a 16px help icon, retaining Demo · What to know and Démo · À savoir
- **AND** at 320px width or with enlarged text the label and strip can grow and wrap without clipping, horizontal overflow or overlapping targets

#### Scenario: Matching exploration action
- **WHEN** Start exploring or its French equivalent renders
- **THEN** it uses existing dark sage with white text, darker hover and pressed surfaces, contrasting visible focus and at least 4.5:1 text contrast in every state

#### Scenario: Approved subscription explanation
- **WHEN** the self-hosting explanation renders in English
- **THEN** it says exactly “A self-hosted household keeps your own plans. AI features require your own subscription.”
- **AND** French conveys the same meaning naturally without changing provider, account or authentication behavior
