# Spec Delta

## MODIFIED Requirements

### Requirement: Expose cooking reading and control semantics

Cooking SHALL expose position/count through an accessible progressbar without implying completion. Stacked phones SHALL omit the status row and visible counter; tablet sidebars SHALL retain their indicator beside instructions, separate from tools. Preparation/unavailable states SHALL be honest. Ingredient checks, named Close and Mark recipe as cooked actions SHALL remain. Single-page instructions SHALL use an ordered list with named per-step Edit controls.

#### Scenario: Reading position is exposed
- **WHEN** the single-page reading bookmark changes to step two
- **THEN** the progressbar exposes position two and the total count without submitting completion; the phone has no separate visible counter and the tablet retains its indicator

#### Scenario: Find step controls
- **WHEN** single-page instructions are displayed
- **THEN** the ordered list and named per-step edit controls are available

#### Scenario: Read the final step without completing cooking
- **WHEN** the cook scrolls to the last All steps instruction
- **THEN** the position reaches the last step but cooking remains uncompleted until the existing explicit completion action succeeds

#### Scenario: Preparation or no usable instructions
- **WHEN** the cook is in preparation or a loaded recipe has no usable instructions
- **THEN** the reading content identifies preparation or unavailable instructions respectively, without presenting a fictitious step count as progress or adding a phone status strip

### Requirement: Arrange cooking in the approved phone and tablet compositions

Phone cooking SHALL keep a photo/title header and compact Original/direct two-button view tools fixed above one scrolling reading surface without a padded recipe card or status row. The progressbar SHALL sit directly above instructions; focused Edit SHALL join tools below the image. Tablet cooking SHALL retain its 40% full-image sidebar with lower-left controls and a clear reading column. Reflow SHALL preserve these roles without fixed mockup allocations.

#### Scenario: Read the approved phone composition
- **WHEN** the cook opens a loaded recipe on a phone
- **THEN** the dish-photo/title header and compact controls underneath remain fixed above a single scrolling instruction surface, without a separate padded recipe card or reading-status row

#### Scenario: Use the approved iPad composition
- **WHEN** cooking uses its tablet sidebar layout
- **THEN** the full-image 40% sidebar retains its lower-left controls and cookbook character while the separate reading column stays clear

#### Scenario: Accommodate text and safe-area growth
- **WHEN** long English/French content, enlarged text, landscape or safe-area insets reduce available instruction space
- **THEN** the composition reflows to retain readable labels, visible dish image and reachable controls without assuming the mockup's instruction-region height

#### Scenario: Recover phone reading space
- **WHEN** the same loaded recipe in All steps is compared before and after this change at ordinary 390 by 844 and 430 by 932 CSS-pixel portrait viewports with default text size
- **THEN** both the dish-photo region and instruction viewport are taller, with no separate status row or replacement counter badge

#### Scenario: Keep focused editing with the phone tools
- **WHEN** a supported instruction is displayed in Step by step on a phone outside an active editor
- **THEN** a named Edit action with at least a 44 by 44 CSS-pixel target is available beside the controls below the image and opens that current instruction without opening recipe detail

#### Scenario: Avoid an ambiguous global edit action
- **WHEN** the phone is in preparation, has no usable instructions, is already editing, or displays All steps
- **THEN** the focused-step header Edit action is absent and All steps retains its named per-instruction edit controls when instructions exist


## ADDED Requirements

### Requirement: Present the phone recipe title directly over the dish photo

The phone recipe title SHALL appear as live, wrapping white text over a continuous dark photo gradient without a separate rectangular title backing. Text SHALL achieve at least 4.5:1 contrast against its actual composited background. Long titles and enlarged text SHALL remain readable without clipping or colliding with header actions. Missing images SHALL retain the existing fallback.

#### Scenario: Read titles over different photographs
- **WHEN** a phone displays the same recipe with light or dark food photographs
- **THEN** the title sits directly over the graded photo and every occupied title region meets the contrast target without relying on text shadow

#### Scenario: Wrap a long title
- **WHEN** a long English or French title is displayed at 320 CSS pixels wide or text is enlarged to 200 percent
- **THEN** the title wraps readably, the gradient covers all title lines and the title and header controls do not overlap

### Requirement: Keep phone reading progress understandable without a counter row

The phone progress bar SHALL distinguish filled and remaining lengths by lightness with at least 3:1 contrast, preserving an understandable position without relying on terracotta hue. During instruction reading it SHALL expose current position and total count to assistive technology. All steps SHALL identify this as reading position, without implying that reading records cooking completion.

#### Scenario: Read progress without colour perception
- **WHEN** a phone recipe is partly read and the progress bar is viewed in grayscale
- **THEN** filled and remaining lengths remain distinguishable and the accessible bar exposes its current position and total count

#### Scenario: Reach the last instruction
- **WHEN** the cook reads to the last All steps instruction on a phone
- **THEN** the bar reaches the last reading position and cooking remains uncompleted until the explicit completion request succeeds
