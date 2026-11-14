## ADDED Requirements

### Requirement: Use one dated portion context while choosing a recipe

Detail with a proposed or selected date SHALL show that date and its resolved portions together before assignment and use those portions for ingredients. Changing day SHALL update the projection without a write. No separate preview calculator SHALL be offered. Without a date, detail SHALL show the original basis. Missing portion configuration SHALL be explicit, not an invented household number.

#### Scenario: Change the proposed day
- **WHEN** detail changes from Wednesday with four portions to Friday with six
- **THEN** the same recipe shows Friday and six portions, its reliable ingredient quantities update, and no plan or portions are saved

#### Scenario: Portions unavailable or unconfigured
- **WHEN** a dated portion read fails or no default/override is configured
- **THEN** failure offers Retry without presenting a stale scaled target; unconfigured context shows original quantities and an optional Set usual portions link without blocking unrelated planning

### Requirement: Read planned recipe quantities in captured date context

Detail opened from a saved supper SHALL show its dated portion projection. A recipe no longer matching that occurrence SHALL expose changed-plan feedback instead of old quantities. Prepared occurrences SHALL use their frozen prepared portions. Portions editing SHALL use At the table; original-basis editing SHALL remain a separate recipe correction.

#### Scenario: Planned supper needs six portions
- **WHEN** detail opens for a matching dated two-serving recipe with target six
- **THEN** reliable amounts display at three times their originals and the date and six-portion context are visible

### Requirement: Retain recipe selection through portions editing

A portions-editing link from detail SHALL open At the table at the selected date and retain the recipe, planning target and origin. Done or Cancel SHALL support return to that detail; Done rereads saved portions and Cancel preserves them. Neither action SHALL assign the recipe. Prepared or otherwise read-only dates SHALL not offer a misleading editable shortcut.

#### Scenario: Adjust Friday without searching again
- **WHEN** someone opens At the table from a selected recipe for Friday, finishes the inline editor and returns to detail
- **THEN** the selected recipe and Friday destination remain, with saved portions refreshed after Done or unchanged after Cancel, and Add to Friday remains an explicit separate action

## MODIFIED Requirements

### Requirement: Display returned ingredient strings in detail

Without scaling context, detail SHALL show returned ingredient strings in returned order, with no rows when absent. With proposed-date or saved dated context, it SHALL show the server ingredient projection and its completeness state in returned order while preserving access to original content. Reading either representation SHALL NOT change stored ingredients.

#### Scenario: Read returned ingredients
- **WHEN** detail retrieval succeeds with ingredient strings Pasta followed by Sauce
- **THEN** the Ingredients section lists Pasta followed by Sauce

#### Scenario: No ingredients are returned
- **WHEN** detail retrieval succeeds with no ingredient strings
- **THEN** the Ingredients heading remains with no ingredient rows

### Requirement: Display localized servings in recipe detail

Without scaling context, loaded detail SHALL show the known positive recipe serving basis beside Ingredients with localized singular/plural wording, omitting unknown basis. A scaled projection SHALL instead identify its target count and incomplete state, with original basis available in serving details. Counts SHALL remain within the heading's accessible meaning, absent beside Ready In. Existing loading, failure, close and stale-response protections SHALL remain.

#### Scenario: Four servings in each language
- **WHEN** successful detail retrieval without scaling context returns servings 4
- **THEN** English detail shows “4 servings” immediately beside Ingredients and French detail shows “4 portions” immediately beside Ingrédients, each within the corresponding heading

#### Scenario: One serving
- **WHEN** successful detail retrieval without scaling context returns servings 1
- **THEN** English detail shows “1 serving” and French detail shows “1 portion”

#### Scenario: Known recipe followed by unknown recipe
- **WHEN** detail without scaling context changes from a recipe with servings 4 to one whose response has null or absent servings
- **THEN** the new detail shows no serving label and retains none from the previous recipe

### Requirement: Keep the ingredient serving badge readable and noninteractive

The serving badge SHALL remain readable without truncation or horizontal scrolling at 320 CSS px and at 200% text size. It SHALL follow the Ingredients title in reading order and wrap beneath it when needed. The base/dated portion count SHALL remain read-only; no independent serving-preview adjustment SHALL be offered. Edit mode SHALL retain its separate original-basis field. Badge text SHALL meet 4.5:1 contrast against its rendered background.

#### Scenario: Narrow or enlarged bilingual heading
- **WHEN** detail is displayed at 320 CSS px or with 200% text size in English or French
- **THEN** the full Ingredients title and serving badge remain visible in reading order, wrapping within their section without overlapping content or causing horizontal scrolling

#### Scenario: Serving field in edit mode
- **WHEN** a recipe enters editing with known or missing servings
- **THEN** a keyboard-accessible labeled servings field is available alongside existing recipe editing, initialized with the saved count or blank respectively

#### Scenario: No ingredient quantities are rescaled
- **WHEN** the Ingredients heading shows a base count without an active scaling context
- **THEN** the ingredient list retains its returned quantities and the read-only badge provides no mutation of recipe or dated servings
