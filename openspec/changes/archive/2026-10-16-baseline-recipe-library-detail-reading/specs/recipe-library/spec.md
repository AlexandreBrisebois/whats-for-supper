# Recipe library — detail-reading delta

## ADDED Requirements

### Requirement: Retrieve the selected library recipe for detail reading

When the library requests a detail sheet for a loaded recipe, the application SHALL request GET `/api/recipes/{id}` using that recipe's ID. Access and member context SHALL follow existing household-identity requirements.

#### Scenario: Request detail by the activated recipe ID
- **WHEN** the loaded library requests a detail sheet for recipe ID R
- **THEN** the application requests GET `/api/recipes/R` rather than using only the list record as detail content

### Requirement: Return persisted recipe detail for an available record

When an authorized ordinary-household GET `/api/recipes/{id}` successfully retrieves an available record, the API SHALL return 200 with `recipe` and `updatedAt` outside a `data` envelope. The recipe SHALL carry its persisted ID, name, description, total time, cuisine and meal types, and ingredients represented as strings.

#### Scenario: Return the retrieved record
- **WHEN** an authorized detail request retrieves an available record and its response succeeds
- **THEN** the unwrapped response contains `updatedAt` and that record's `recipe` with the persisted fields and string ingredient representation

### Requirement: Display returned recipe text and image reference

After successful detail retrieval, the sheet SHALL display the returned name and nonempty description. It SHALL omit an empty description and use the returned image reference, with a local placeholder reference when that reference is empty.

#### Scenario: Show returned name and description
- **WHEN** detail retrieval succeeds with a name and nonempty description
- **THEN** the sheet displays that name and description

#### Scenario: Omit absent description
- **WHEN** detail retrieval succeeds with a null or empty description
- **THEN** the sheet omits the description paragraph

#### Scenario: Select the detail image reference
- **WHEN** detail retrieval succeeds
- **THEN** the sheet uses the returned image reference or `/placeholder-recipe.jpg` if it is empty
- **AND** this reference selection does not establish image delivery

### Requirement: Display available recipe metadata in detail

The detail sheet SHALL display nonempty cuisine and returned nonempty meal-type values as badges. It SHALL omit absent cuisine and meal types without adding a default meal type for reading. It SHALL show a Ready In time label using formatted returned total time, with an empty time value when none is available.

#### Scenario: Show cuisine and meal types
- **WHEN** detail retrieval succeeds with cuisine Italian and meal types Supper and Lunch
- **THEN** the sheet displays Italian, Supper and Lunch badges

#### Scenario: Omit absent metadata badges
- **WHEN** detail retrieval succeeds without cuisine or meal-type values
- **THEN** those badges are absent without a synthesized Supper badge

#### Scenario: Format available time
- **WHEN** detail retrieval succeeds with total time `PT30M`, or with no total time
- **THEN** the Ready In label uses `30 MINS` for `PT30M` and an empty time value for absent time

### Requirement: Display returned ingredient strings in detail

The detail sheet SHALL show an Ingredients section listing returned ingredient strings in their returned order. With no ingredient strings, the section SHALL contain no ingredient rows.

#### Scenario: Read returned ingredients
- **WHEN** detail retrieval succeeds with ingredient strings Pasta followed by Sauce
- **THEN** the Ingredients section lists Pasta followed by Sauce

#### Scenario: No ingredients are returned
- **WHEN** detail retrieval succeeds with no ingredient strings
- **THEN** the Ingredients heading remains with no ingredient rows

### Requirement: Show pending recipe-detail feedback

While a newly opened sheet's detail request is pending, the sheet SHALL display loading feedback in place of recipe content and retain its Close controls.

#### Scenario: Detail retrieval is pending
- **WHEN** a newly opened library detail sheet is awaiting its detail response
- **THEN** loading feedback is visible instead of recipe content and Close remains available

### Requirement: Dismiss recipe detail back to the loaded library

Activating the detail sheet's Close control or surrounding backdrop SHALL dismiss the sheet while retaining the loaded library presentation. Closing while retrieval is pending SHALL dismiss the sheet without waiting for that retrieval to finish.

#### Scenario: Close loaded detail
- **WHEN** a person closes successfully loaded detail through Close or its backdrop
- **THEN** the sheet disappears and the loaded library remains

#### Scenario: Close pending detail
- **WHEN** a person closes a newly opened sheet before its detail request finishes
- **THEN** the sheet disappears without waiting for the request
