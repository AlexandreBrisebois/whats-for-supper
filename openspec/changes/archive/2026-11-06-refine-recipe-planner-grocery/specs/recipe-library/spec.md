## MODIFIED Requirements

### Requirement: Place appreciation near recipe identity

Viewing detail SHALL place the existing Dislike, Like and Love choices after recipe instructions, followed by Family notes and Ask the Family. Choices SHALL retain localized visible labels, accessible names and selected state. Rating remains optional and distinct from GOTO, family votes and cooking completion.

#### Scenario: Recognise appreciation before planning
- **WHEN** a recipe with a saved rating opens
- **THEN** its saved selection is recognisable in the ending Rating section and all choices remain operable under existing editing rules

#### Scenario: Plan without rating
- **WHEN** the recipe is unrated
- **THEN** planning remains available without choosing a rating

### Requirement: Keep household details after recipe reading

Detail SHALL end its reading content with Rating, Family notes and Ask the Family in that order. Family notes SHALL always expose a labeled writable field without Add a note. Existing debounce, acknowledged-save and draft recovery behavior SHALL remain. Editing, sharing, finding similar recipes and issue reporting remain discoverable under existing permissions and availability.

#### Scenario: Return to useful notes
- **WHEN** saved notes or a retained failed-save draft exists
- **THEN** the field shows that content and any unsaved state with explicit Retry save

#### Scenario: Start or clear notes
- **WHEN** notes are empty or the person deletes the final note text
- **THEN** the field remains directly writable, including while an empty-value save is pending

#### Scenario: Secondary management
- **WHEN** the person wants to edit or report an issue
- **THEN** named recipe actions expose those operations without competing with the primary planning action

### Requirement: Keep family controls visible near recipe identity

Detail SHALL place GOTO in the top action bar and Ask the Family after Family notes. Their existing meanings and selected states SHALL remain distinct from appreciation. The stack-browser Ask the Family control, wording and eligibility SHALL remain unchanged; neither rating nor a family toggle is required to plan.

#### Scenario: Find familiar family actions
- **WHEN** loaded detail opens
- **THEN** GOTO is available in the top action bar and Ask the Family ends recipe reading after notes, with their existing states and meanings
- **AND** the stack browser retains its existing Ask the Family control

### Requirement: Reach family notes before reading the instructions

When saved notes or a nonempty retained draft exist, detail SHALL offer the quiet Family notes shortcut near recipe information. It SHALL jump to the notes field with accessible focus without opening another surface or changing content. Empty notes SHALL omit the shortcut while keeping the field directly writable after Rating.

#### Scenario: Consult a family adjustment
- **WHEN** a recipe has Use less chilli and Family notes is activated
- **THEN** the notes field becomes visible and focused with content and saved or unsaved state intact

#### Scenario: No family notes exist
- **WHEN** saved notes and any retained draft are empty
- **THEN** no shortcut is displayed and the field remains writable without an Add button

### Requirement: Keep original evidence readable independently of hero imagery

Eligible View Original access SHALL appear at the lower right of the hero on a stable readable surface. Existing URL and original-photo destinations, controls and eligibility SHALL remain. Missing hero imagery SHALL retain identity and available source access without inventing a photograph. Source consultation SHALL preserve drafts and reading context.

#### Scenario: Light photograph or missing hero
- **WHEN** the hero is bright, missing or fails to load
- **THEN** eligible View Original remains legible and operable at the lower right of the hero or its neutral fallback

### Requirement: Make detail actions reflect their entry context

Detail SHALL preserve dated planning/recovery and source-date identity. Its existing cooking entry SHALL be labeled Cook with the former Steps icon; standalone Steps SHALL be removed. Planner-origin detail SHALL retain Cook and intentional Plan another day. Reading and previews SHALL never reassign or complete a meal.

#### Scenario: Read from a saved Planner meal
- **WHEN** a planned recipe opens from its dated Planner card
- **THEN** detail identifies that date, offers Cook and can intentionally plan another occurrence for another day
- **AND** closing returns to the same week without schedule mutation

#### Scenario: Plan for a day
- **WHEN** a valid dated assignment is available
- **THEN** Plan for day retains the explicit date and displays Planner's two-arrow change icon at the end
- **AND** Plan another day uses Home's quieter Change Plan treatment where applicable

#### Scenario: Pending or recovery footer
- **WHEN** target checking, assignment, uncertain persistence, known conflict or partial recovery is active
- **THEN** the existing loading, retry, review and staged recovery actions remain reachable without duplicate writes or a misleading enabled Plan action

#### Scenario: Prepared or legacy completed occurrence
- **WHEN** a completed occurrence is opened
- **THEN** instructions remain readable without another completion prompt and only known preparation metadata is shown
- **AND** a temporary preview does not replace its frozen cooking context

#### Scenario: Edit, read-only review or unavailable recipe
- **WHEN** editing, original-quantity review, loading or failed detail is active
- **THEN** edit Save/Cancel, original review, loading/retry or close behavior retains its own role without accidentally exposing a new planning write

### Requirement: Use one dated portion context while choosing a recipe

Detail SHALL retain its proposed/selected date and resolved planned portions before assignment. Changing day SHALL refresh that context without a write. An explicitly selected ingredient preview SHALL be labeled separately and SHALL NOT change the planning target. Missing configuration or failed reads SHALL remain explicit rather than show a stale scaled target.

#### Scenario: Change the proposed day
- **WHEN** detail changes from Wednesday with four portions to Friday with six
- **THEN** Friday and six planned portions replace the dated context, any temporary preview resets, reliable ingredients reflect Friday and no plan or portions are saved

#### Scenario: Portions unavailable or unconfigured
- **WHEN** dated portions fail to load or no default/override exists
- **THEN** failure offers Retry without a stale target, while unconfigured context uses original quantities without blocking unrelated planning
- **AND** recipe detail provides no link into saved Planner portions editing

### Requirement: Read planned recipe quantities in captured date context

Saved-supper detail SHALL show its dated projection by default. A recipe no longer matching that occurrence SHALL show changed-plan feedback rather than stale quantities. Prepared occurrences SHALL use frozen portions by default. A labeled preview SHALL remain separate from those saved facts; original-basis editing remains an explicit recipe correction.

#### Scenario: Planned supper needs six portions
- **WHEN** matching dated detail opens for a two-serving recipe planned for six
- **THEN** reliable amounts initially display at three times their originals with date and six planned portions visible

### Requirement: Display returned ingredient strings in detail

Original reading SHALL show returned ingredient strings in order, with no rows when absent. Dated or explicitly selected preview reading SHALL use the server projection and completeness state in order, retaining original access. Reading any representation SHALL NOT change stored ingredients.

#### Scenario: Read returned ingredients
- **WHEN** original detail returns Pasta followed by Sauce
- **THEN** Ingredients lists Pasta followed by Sauce

#### Scenario: No ingredients are returned
- **WHEN** successful detail has no ingredient strings
- **THEN** Ingredients remains present without invented rows

### Requirement: Display localized servings in recipe detail

Detail SHALL identify the positive original basis or active projection count beside Ingredients with localized singular/plural wording. Preview and dated counts SHALL be clearly distinguished. Original basis remains inspectable. Unknown basis SHALL not be invented or carried from another recipe, and no serving count SHALL appear beside Ready in. Loading, failure, close and stale-response protections remain.

#### Scenario: Four servings in each language
- **WHEN** original detail returns servings four
- **THEN** English shows 4 servings and French shows 4 portions with Ingredients

#### Scenario: One serving
- **WHEN** original detail returns servings one
- **THEN** English shows 1 serving and French shows 1 portion

#### Scenario: Known recipe followed by unknown recipe
- **WHEN** detail moves from basis four to null or absent basis
- **THEN** the new recipe shows no invented original count or prior preview selection

### Requirement: Keep the ingredient serving badge readable and noninteractive

The basis/dated badge SHALL remain read-only, readable at 320 CSS px and 200% text, and follow Ingredients in accessible reading order, wrapping as needed. Separate labeled preview controls SHALL not turn that badge into a saved-portions editor. Edit mode retains its original-basis field. Badge text SHALL meet 4.5:1 contrast.

#### Scenario: Narrow or enlarged bilingual heading
- **WHEN** detail is narrow or enlarged in English or French
- **THEN** Ingredients, count, preview controls and associated feedback reflow without clipping, overlap or horizontal scrolling

#### Scenario: Serving field in edit mode
- **WHEN** editing opens with known or missing servings
- **THEN** its labeled original-basis field starts with the saved count or blank respectively

#### Scenario: No ingredient quantities are rescaled
- **WHEN** no dated or preview context is active
- **THEN** original returned quantities remain and the badge itself performs no mutation

## REMOVED Requirements

### Requirement: Retain recipe selection through portions editing

**Reason**: Recipe detail now offers quantity previews rather than navigation to saved Planner portions editing.
**Migration**: Saved usual/date portions remain editable from Planner's Portions entry; preserve existing supported Planner routes and guards without exposing this recipe shortcut.

## ADDED Requirements

### Requirement: Save directly writable notes without losing newer text

Notes SHALL autosave after a pause and show quiet Saving/Saved status based on acknowledgement. Failure SHALL retain the latest draft and expose Retry save. A late read or acknowledgement SHALL NOT replace newer text. Closing or changing recipe SHALL preserve unsaved drafts by recipe within the existing tab lifetime, without claiming durable offline storage.

#### Scenario: Type during a save then close
- **WHEN** text changes while a previous note save is in flight and detail closes
- **THEN** the latest text remains retained for that recipe, saves remain serialized and no older acknowledgement marks newer unsaved text saved

#### Scenario: Save fails then reopen
- **WHEN** autosave or close-time flush fails and that recipe is reopened in the tab
- **THEN** the draft and error remain, Retry save submits current text, and Saved appears only after acknowledgement

### Requirement: Show known readiness on the hero

Detail SHALL place known Ready in duration on a readable hero surface, consistent with stack/Discovery. Unknown or unusable duration SHALL omit the badge, without a blank label or invented estimate. Source access, readiness and top actions SHALL remain separate operable elements.

#### Scenario: Missing duration and image
- **WHEN** both duration and hero image are unavailable
- **THEN** the neutral hero retains available source access and identity without an empty Ready in badge

### Requirement: Preview two four or six portions without saving

With a valid original yield, detail SHALL offer 2, 4 and 6 as immediate ingredient-only previews, clearly identifying the selected count and temporary meaning. The default remains the dated projection or original basis; returning to it SHALL be available. Preview SHALL NOT change saved portions, groceries, rating, preparation, cooking checks or completion context.

#### Scenario: Preview four for Friday planned for six
- **WHEN** a two-serving recipe with reliable 200 g pasta is planned for six and four is selected
- **THEN** the preview shows 400 g while Friday remains planned for six and groceries remain based on six
- **AND** returning to planned quantities shows 600 g without a write

#### Scenario: Unknown yield or unreliable amount
- **WHEN** original yield is missing or an ingredient cannot reliably scale
- **THEN** an unknown yield offers explicit Set original yield through recipe editing and no fabricated preview, while unreliable lines retain original text and uncertainty feedback
- **AND** intentionally unquantified text remains ordinary content

#### Scenario: Yield correction is cancelled or fails
- **WHEN** original-yield editing is cancelled or saving fails
- **THEN** preview does not assume the unsaved basis and the existing editor retains its Cancel/failure recovery
- **AND** saving a correction is identified as a saved recipe change, distinct from a temporary preview

#### Scenario: Rapid selections or changed identity
- **WHEN** two, six and four are selected before responses return, or recipe identity changes
- **THEN** only the current recipe and latest selection can install a preview, with retry on failure and no stale amount presented as current

#### Scenario: Cook after a temporary preview
- **WHEN** Cook is activated after an ingredient preview
- **THEN** cooking receives its existing dated/frozen or standalone context rather than the temporary count

### Requirement: Keep refined detail usable across layouts and languages

Refined controls SHALL retain visible keyboard focus, localized accessible names/state, 48 CSS px action targets and readable contrast. Phone/full-screen and tablet/bounded detail SHALL reflow at 320 CSS px and 200% text in English/French. Content and notes SHALL scroll clear of the footer, safe area and keyboard without duplicate bottom reservations.

#### Scenario: French notes with keyboard and recovery footer
- **WHEN** long French content, enlarged text and an active keyboard constrain detail while a recovery message is visible
- **THEN** the notes field, retry, Close and contextual actions remain reachable without overlap or horizontal scrolling
