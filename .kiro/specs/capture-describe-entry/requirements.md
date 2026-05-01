# Requirements Document

## Introduction

The Capture page (`MinimalCapture.tsx`) currently presents three entry paths — Camera, Gallery, and Describe — via a tab bar at the top of the component. This redesign removes the tab bar entirely and integrates the "Describe It" path as a quiet tertiary option within the existing camera capture box. The camera and gallery paths remain visually and functionally unchanged. The describe form becomes accessible via a new "Or Describe It Instead" link that lives below the "Pick from Gallery" link inside the dashed capture box. This change affects only `pwa/src/components/capture/MinimalCapture.tsx` and introduces no API contract changes.

## Glossary

- **Capture_Box**: The dashed-border rounded container that holds the camera button, gallery link, and (after this change) the describe link.
- **Camera_Button**: The terracotta circular button that triggers the device camera.
- **Gallery_Link**: The existing secondary link ("Pick from Gallery") that opens the file picker for gallery images.
- **Describe_Link**: The new tertiary link ("Or Describe It Instead") added below the Gallery_Link.
- **Describe_Form**: The existing form (recipe name + description fields + submit button) previously shown only when the "describe" tab was active.
- **Tab_Bar**: The three-tab switcher (Camera / Gallery / Describe) currently rendered at the top of the component.
- **MinimalCapture**: The React component at `pwa/src/components/capture/MinimalCapture.tsx`.

---

## Requirements

### Requirement 1: Remove the Tab Bar

**User Story:** As a user, I want the capture page to feel focused and uncluttered, so that I am not distracted by navigation chrome when I just want to capture a recipe.

#### Acceptance Criteria

1. THE MinimalCapture SHALL render without the Tab_Bar.
2. THE MinimalCapture SHALL NOT render any tab switcher UI element (buttons, pill bar, or equivalent navigation row).
3. THE MinimalCapture SHALL preserve all existing camera and gallery functionality after the Tab_Bar is removed.

---

### Requirement 2: Add "Or Describe It Instead" Tertiary Link

**User Story:** As a user, I want a quiet third option to describe a recipe by text, so that I can access the describe path without it competing visually with the primary camera action.

#### Acceptance Criteria

1. THE Capture_Box SHALL contain a Describe_Link rendered below the Gallery_Link.
2. THE Describe_Link SHALL display the text "Or Describe It Instead" with a `PenLine` icon (already imported from `lucide-react`).
3. THE Describe_Link SHALL use a visual style that is more muted than the Gallery_Link, using `text-terracotta/40` (or equivalent `text-charcoal/40`) to signal tertiary hierarchy.
4. THE Describe_Link SHALL use the same uppercase, bold, small-tracking typographic style as the Gallery_Link (`text-sm font-bold uppercase tracking-widest`).
5. WHEN the Describe_Link is tapped, THE MinimalCapture SHALL reveal the Describe_Form.
6. THE Describe_Link SHALL include a `transition-colors hover:text-terracotta` hover state for interactive feedback.

---

### Requirement 3: Describe Form Reveal Behaviour

**User Story:** As a user, I want the describe form to appear smoothly when I choose the describe path, so that the transition feels intentional and polished.

#### Acceptance Criteria

1. WHEN the Describe_Link is tapped, THE MinimalCapture SHALL show the Describe_Form below the Capture_Box with an `animate-in fade-in` entrance animation.
2. WHILE the Describe_Form is visible, THE MinimalCapture SHALL continue to display the Capture_Box above it (the box does not disappear).
3. WHILE the Describe_Form is visible, THE Describe_Link SHALL change its label or visual state to indicate the form is already open (e.g. the link is hidden or replaced by a collapse affordance), preventing duplicate reveals.
4. IF the user has not tapped the Describe_Link, THEN THE MinimalCapture SHALL NOT render the Describe_Form.

---

### Requirement 4: Preserve Camera Box Aesthetics and Functionality

**User Story:** As a user, I want the camera capture experience to look and work exactly as before, so that the redesign does not regress the primary capture path.

#### Acceptance Criteria

1. THE Camera_Button SHALL retain its terracotta background, circular shape, shadow, and ring styles unchanged.
2. THE Gallery_Link SHALL retain its existing className (`flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-widest text-terracotta/60 transition-colors hover:text-terracotta`) unchanged.
3. THE Capture_Box SHALL retain its dashed border, rounded corners, background tint, and padding unchanged.
4. WHEN the Camera_Button is tapped, THE MinimalCapture SHALL trigger the device camera file input as before.
5. WHEN the Gallery_Link is tapped, THE MinimalCapture SHALL open the gallery file picker as before.
6. THE MinimalCapture SHALL continue to display the photo preview area, appreciation rating, notes field, and save button after images are added, unchanged.

---

### Requirement 5: Describe Form Functional Parity

**User Story:** As a user, I want the describe form to work exactly as it did before, so that switching to the new entry point does not break recipe submission.

#### Acceptance Criteria

1. THE Describe_Form SHALL accept a required recipe name and an optional description, as before.
2. WHEN the Describe_Form is submitted with a valid recipe name, THE MinimalCapture SHALL call the describe API endpoint and handle success and error states as before.
3. IF the recipe name field is empty when the form is submitted, THEN THE MinimalCapture SHALL display the existing validation error message.
4. THE Describe_Form SHALL use the ochre focus ring and border styles on its inputs, unchanged.
5. THE Describe_Form SHALL display the "Synthesize Recipe" button with its existing ochre styling and loading state, unchanged.
