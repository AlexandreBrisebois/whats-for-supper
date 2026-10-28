# Cooking delta — approved layouts and behavior defaults

## ADDED Requirements

### Requirement: Keep the cooking dish image visible while instructions scroll

When the viewed recipe has a dish image, cooking SHALL retain it in the fixed phone hero/header and full-image tablet sidebar while only instructions scroll. Essential header/source/presentation controls SHALL remain outside that scroller. Cooking SHALL NOT replace the image with a collapsed header on scroll or place it behind instruction text. Missing images SHALL retain honest existing fallback behavior.

#### Scenario: Read further down a phone recipe
- **WHEN** the cook scrolls through All steps on a phone with an available recipe image
- **THEN** the same dish image, hero/title and essential controls stay visible and stationary while instruction content moves

#### Scenario: Preserve the iPad cookbook view
- **WHEN** the cook reads later instructions in tablet portrait or landscape with an available recipe image
- **THEN** the full-image sidebar remains visible beside the scrolling instruction pane without an image background behind instruction text

#### Scenario: Read in narrow Split View
- **WHEN** available width changes to the stacked phone layout during cooking
- **THEN** the recipe image remains in the fixed hero/header rather than scrolling away or becoming a compact image-free replacement

### Requirement: Arrange cooking in the approved phone and tablet compositions

Phone cooking SHALL use a shallow fixed dish-photo header with a readable overlaid title and compact Original/direct two-button view controls underneath. Instructions SHALL use one reading surface without a separate padded recipe card. At sidebar-layout widths, cooking SHALL preserve the full-image 40% sidebar with controls lower-left, leaving the reading column clear. Reflow SHALL preserve these roles without treating mockup dimensions as fixed allocations.

#### Scenario: Read the approved phone composition
- **WHEN** the cook opens a loaded recipe on a phone
- **THEN** the dish-photo/title header and compact controls underneath remain fixed above a single scrolling instruction surface, without a separate padded recipe card

#### Scenario: Use the approved iPad composition
- **WHEN** cooking uses its tablet sidebar layout
- **THEN** the full-image 40% sidebar retains its lower-left controls and cookbook character while the separate reading column stays clear

#### Scenario: Accommodate text and safe-area growth
- **WHEN** long English/French content, enlarged text, landscape or safe-area insets reduce available instruction space
- **THEN** the composition reflows to retain readable labels, visible dish image and reachable controls without assuming the mockup's instruction-region height

### Requirement: Offer direct Original access from loaded cooking

After successful current-recipe detail loading, cooking SHALL offer a visibly labelled Original action when its URL source has a nonempty source URL or original images exist. It SHALL be available from preparation and both reading presentations without requiring recipe detail to be opened first. A failed or pending detail read SHALL NOT infer source availability.

#### Scenario: Consult source from preparation
- **WHEN** a loaded recipe has original images and the cook is preparing ingredients
- **THEN** Original is available directly in cooking without opening recipe detail

#### Scenario: Consult source while reading
- **WHEN** a loaded recipe has a URL source and nonempty source URL in either reading presentation
- **THEN** Original remains a visibly labelled action in cooking

#### Scenario: Instructions unavailable but source present
- **WHEN** detail loading succeeds with no usable instructions and a supported original destination
- **THEN** Original remains available alongside existing instruction recovery

#### Scenario: Source metadata unavailable
- **WHEN** the current recipe detail read is pending or fails
- **THEN** cooking does not expose an actionable Original based on guessed or departed-recipe metadata

### Requirement: Reuse existing original destinations from cooking

Cooking Original SHALL use the existing `recipe-media` external-URL or original-image behavior for the viewed recipe. A URL source with a present website URL SHALL open a new browsing context with noopener/noreferrer, without navigating the app. Otherwise available original photos or rendered PDF-page images SHALL open the existing image experience, retaining shared ordering, paging and zoom semantics, without introducing a PDF-document reader.

#### Scenario: Open the recipe source URL
- **WHEN** Original is activated for a URL recipe with a nonempty source URL
- **THEN** that URL is requested in a new browsing context with noopener/noreferrer and cooking stays mounted on the current app page

#### Scenario: View original images
- **WHEN** Original is activated for a photo recipe with three originals and finished-dish index one
- **THEN** the original-image experience opens at its initial sequence position, leading with image one, under existing media ordering/navigation/zoom behavior

#### Scenario: Missing URL falls back to available images
- **WHEN** a URL recipe has no source URL but has original images and Original is activated
- **THEN** the image experience opens instead of requesting external navigation

#### Scenario: Consult rendered PDF originals
- **WHEN** a recipe has retained rendered PDF-page images as its original destination and Original is activated
- **THEN** those page images open in the existing image overlay rather than an external website, new PDF-document reader or raw-document download

### Requirement: Retain cooking work through original consultation

Opening or dismissing originals SHALL retain the mounted recipe, presentation, bookmark, exact reading offset, preparation context/checks and any retained instruction draft. It SHALL NOT save/discard edits, refetch recipe detail solely for consultation, change preferences or submit completion. Reopening images SHALL use their normal fresh initial view without resetting cooking.

#### Scenario: Return to preparation
- **WHEN** a cook with checked ingredients opens and closes the image experience
- **THEN** the same preparation context and checked indications remain without a completion request

#### Scenario: Return to later single-page reading
- **WHEN** the cook opens and closes originals from a later All steps bookmark and offset
- **THEN** the selected mode, bookmark and exact prior reading offset remain unchanged

#### Scenario: Repeated consultation
- **WHEN** the cook changes the viewed original image/zoom, closes, then reopens originals twice
- **THEN** each reopening starts at the media experience's normal initial image/fit state while cooking work remains unchanged and no update or completion is submitted

#### Scenario: Return from an external source
- **WHEN** a cook returns to the app after opening the recipe's source in another browsing context
- **THEN** the existing cooking recipe, mode, bookmark, preparation checks and draft remain without consultation-triggered completion or saving

### Requirement: Make original images the exclusive active cooking overlay

The cooking original-image experience SHALL appear above every cooking control, expose a named modal dialog and named interactive controls, contain keyboard focus and prevent background interaction. Close or Escape SHALL dismiss only that experience, restore focus to the invoking Original action and retain cooking. Dismissal SHALL remain available when an image cannot load.

#### Scenario: No cooking controls above the viewer
- **WHEN** original images are open
- **THEN** cooking Report, Close, view and completion controls are behind the overlay and cannot receive pointer or keyboard activation

#### Scenario: Keyboard dismissal returns to Original
- **WHEN** Escape is pressed while focus is inside the original-image dialog
- **THEN** only that dialog closes, cooking stays open, and focus returns to Original without cancelling a retained instruction draft

#### Scenario: Named viewer controls and contained focus
- **WHEN** a keyboard user traverses the open image experience
- **THEN** focus stays within it and its available previous, next, zoom/fit and close controls have accessible names

#### Scenario: Image unavailable
- **WHEN** the requested original image fails to load
- **THEN** a named Close remains reachable and returns to retained cooking work

### Requirement: Preserve an editable draft during read-only original access

Original SHALL remain available with an unsaved instruction draft, preserving it during read-only source consultation. New Original activation SHALL be disabled while a cooking save/write or completion request is pending, including instruction and presentation-preference saves, with an understandable busy indication and stable control placement. No delayed activation SHALL be replayed after a request settles.

#### Scenario: Compare a source while correcting a step
- **WHEN** the cook has changed an instruction draft without saving and consults original images
- **THEN** returning restores that same editor/draft and no instruction update is submitted

#### Scenario: Write request pending
- **WHEN** an instruction save or cooking completion request is pending
- **THEN** Original cannot open a source, explains its busy state, and does not open automatically when that request settles

#### Scenario: Preference save pending
- **WHEN** a cooking presentation-preference save is pending
- **THEN** Original remains in place but cannot activate until that request settles, without changing or repeating the preference request

### Requirement: Avoid opening an original experience without a destination

Cooking SHALL suppress Original when loaded metadata has neither a present URL for a URL source nor original images. It SHALL NOT open an empty image experience or invent a URL. This cooking-only availability rule SHALL leave the library's existing eligibility and behavior unchanged.

#### Scenario: URL type has no URL or images
- **WHEN** a loaded cooking recipe has source type URL, absent source URL and zero originals
- **THEN** cooking has no Original action and no empty viewer is opened

#### Scenario: Synthesized recipe has no source
- **WHEN** a loaded cooking recipe is synthesized with no original images
- **THEN** cooking omits Original while retaining its existing reading, detail and completion controls

### Requirement: Reflow cooking source controls across phone and tablet

Cooking SHALL keep Original, presentation choices and Close reachable without overlap, clipped labels or horizontal scrolling on phone/tablet portrait, landscape and narrow Split View, accounting for safe-area insets. Interactive targets SHALL be at least 44 by 44 CSS pixels. English/French expansion and enlarged text SHALL reflow the composition rather than shrink essential labels or targets to preserve a fixed header height.

#### Scenario: Narrow phone with expanded French labels
- **WHEN** cooking is shown at 320 CSS pixels wide with a long recipe name and French labels
- **THEN** the title and controls wrap without colliding, Original stays labelled/reachable, and every control retains its target size without horizontal overflow

#### Scenario: Tablet sidebar and Split View
- **WHEN** available space changes between tablet portrait, landscape and narrow Split View
- **THEN** the cooking hero/sidebar or stacked composition adapts and retains usable source/presentation/close controls

#### Scenario: Enlarge text
- **WHEN** text is enlarged to 200 percent in the cooking surface
- **THEN** labels and instruction context remain readable and controls reflow without clipped actions, overlap or smaller hit targets

### Requirement: Preserve a calm cookbook hierarchy in cooking

The cooking composition SHALL let food imagery and the recipe title lead, with warm surfaces, readable supporting text and quieter secondary controls. Original and presentation selection SHALL NOT compete visually with the primary cooking action. Rendered acceptance SHALL assess cookbook character separately from contrast, target-size and interaction checks, using matched recipe content and food photographs.

#### Scenario: Review ordinary food-led composition
- **WHEN** phone and tablet cooking layouts are compared with the same recipe, locale and light/dark food photographs
- **THEN** review records photo prominence, title hierarchy, spacing, depth and control emphasis as well as readability, without treating automated passes as approval of warmth or calm

## MODIFIED Requirements

### Requirement: Offer a remembered cooking presentation

Cooking SHALL offer a compact, named View group with direct Step by step and All steps buttons in preparation and both reading presentations. The selected member's explicit cookingViewMode SHALL select the presentation; an absent member or absent preference SHALL default to All steps. Each choice SHALL expose its selected state, use at least a 44 px target and stop hero navigation. Selecting a view SHALL retain focus on that choice.

#### Scenario: No explicit preference
- **WHEN** cooking opens for a member without a saved cookingViewMode
- **THEN** All steps is selected without consulting a feature flag

#### Scenario: Saved focused preference
- **WHEN** cooking opens for a member whose cookingViewMode is step-by-step
- **THEN** Step by step is selected

#### Scenario: Direct presentation selection
- **WHEN** the cook activates the other presentation button while no existing editing/completion guard blocks it
- **THEN** the presentation changes in one activation, its selected state is exposed, focus remains on that choice and hero detail does not open

### Requirement: Expose cooking reading and control semantics

Cooking SHALL expose current position and step count through a progressbar and visible indicator beside instruction context, separate from the Original/presentation action row. Preparation and unavailable-instruction states SHALL be identified honestly. Reading position SHALL NOT imply completed cooking. Ingredient checked indications, a named close button and named Mark recipe as cooked action SHALL remain; single-page instructions SHALL use an ordered list with named per-step edit controls.

#### Scenario: Reading position is exposed
- **WHEN** the single-page reading bookmark changes to step two
- **THEN** the indicator beside instruction context and progressbar expose position two without submitting completion

#### Scenario: Find step controls
- **WHEN** single-page instructions are displayed
- **THEN** the ordered list and named per-step edit controls are available

#### Scenario: Read the final step without completing cooking
- **WHEN** the cook scrolls to the last All steps instruction
- **THEN** the position reaches the last step but cooking remains uncompleted until the existing explicit completion action succeeds

#### Scenario: Preparation or no usable instructions
- **WHEN** the cook is in preparation or a loaded recipe has no usable instructions
- **THEN** context indicates Check & Prep or Steps unavailable respectively, without presenting a fictitious step count as progress
