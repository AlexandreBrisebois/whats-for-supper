## MODIFIED Requirements

### Requirement: Switch Planner rows into At the table inline

Planner SHALL expose Portions as a quiet plate-and-label control aligned with Ask the Family, using the same split date column, Today divider, card surfaces and spacing as Meals view. Each row SHALL right-align its joined minus/value/plus stepper and reset control in the thumb zone, replace full-row grayscale on read-only cooked days with a calm sage Cooked badge, and keep Week, Grocery and voting controls available.

#### Scenario: Enter portions mode on a phone
- **WHEN** Portions is activated for the loaded week
- **THEN** the same ordered dates show effective counts and permitted editing while saved recipes remain unchanged
- **AND** the entry is quieter than Ask the Family without looking disabled or hiding its label

#### Scenario: Portions view matches Meals date column and Today divider
- **WHEN** Portions renders the loaded week including deployment-local Today and past dates
- **THEN** each row uses the same left-hand weekday/day/month column and compact Today divider above Today's row as Meals view
- **AND** editable and past cards match Meals view card surface styling (`glass` for current/future and quiet `cream` for past) without applying full-row `grayscale`

#### Scenario: Thumb-zone stepper alignment and calm Cooked status badge
- **WHEN** Portions renders an editable day or a read-only cooked day
- **THEN** the joined minus/value/plus stepper (and compact usual-reset button when active) is right-aligned in the card's trailing thumb zone
- **AND** a read-only cooked day shows a calm sage `Cooked` badge beside its read-only portion count instead of greying out the entire row

#### Scenario: Long recipe name or missing photo
- **WHEN** a recipe has a long name or unavailable hero
- **THEN** the editor omits its name and uses its photo or neutral fallback without shrinking controls

#### Scenario: Empty and non-cooking nights
- **WHEN** a date is empty or non-cooking
- **THEN** an empty date permits portions editing with a neutral fallback; a non-cooking date keeps its recognizable icon/description without an active stepper
- **AND** dormant saved portions remain available for a future recipe

#### Scenario: Large text and tablet
- **WHEN** English/French labels, 320 CSS px or 200% text require reflow
- **THEN** dates, count controls, week navigation and voting remain readable with visible focus and 48 CSS px targets
