## 1. Design System

The application uses a modern, vibrant, and approachable design language. Users may choose between two curated aesthetic options.

### Mockup References
- **Option A (Earth Tones)**: [light_theme_mockup.png](file:///Users/alex/Code/whats-for-supper/src/specs/mockups/light_theme_mockup.png)
- **Option B (Vibrant Tones)**: [vibrant_light_mockup.png](file:///Users/alex/Code/whats-for-supper/src/specs/mockups/vibrant_light_mockup.png)
- **Dark Mode Reference**: [demo_mockup.png](file:///Users/alex/Code/whats-for-supper/src/specs/mockups/demo_mockup.png)

### 1.1 Color Option A: Sophisticated Home (Earth Tones)
Curated to feel warm, organic, and premium. Targeting a "Modern Organic" vibe.

#### Light Mode
- **Background**: `#FDF8ED` (Warm Cream)
- **Surface**: `#FFFFFF` (White)
- **Primary**: `#4B5D4D` (Dark Sage Green)
- **Secondary**: `#B25E4C` (Deep Terracotta)
- **Text (Primary)**: `#2D312E` (Deep Charcoal Green)

#### Dark Mode
- **Background**: `#1A1C1A` (Deep Pine Charcoal)
- **Surface**: `#2D312E` (Dark Forest)
- **Primary**: `#9DA993` (Light Sage)
- **Secondary**: `#E2A292` (Soft Terracotta)
- **Text (Primary)**: `#FDFBF7` (Off-White)

### 1.2 Color Option B: Modern Professional (Vibrant Tones)
Curated to feel energetic, clean, and tech-forward.

#### Light Mode
- **Background**: `#F5F3FF` (Light Lavender)
- **Surface**: `#FFFFFF` (White)
- **Primary**: `#4F46E5` (Indigo 600)
- **Secondary**: `#DB2777` (Pink 600)
- **Text (Primary)**: `#111827` (Gray 950)

#### Dark Mode
- **Background**: `#0F172A` (Slate 950)
- **Surface**: `#1E293B` (Slate 800)
- **Primary**: `#818CF8` (Indigo 400)
- **Secondary**: `#F472B6` (Pink 400)
- **Text (Primary)**: `#F8FAFC` (Slate 50)

### 1.3 Accessibility & Aesthetic Standards
- **Contrast**: Both options must adhere to **WCAG 2.1 Level AA** (minimum 4.5:1 ratio).
- **Typography**: Use elegant sans-serif fonts (e.g., *Outfit*, *Inter*) or sophisticated serifs for headings (e.g., *Playfair Display*).
- **Glassmorphism**: Use subtle translucency (backdrop-blur) and soft shadows (`0 8px 30px rgba(0,0,0,0.04)`).

### 1.3 Aesthetic Principles
- **Family-Oriented**: Friendly, rounded corners (8px - 12px), and legible typography.
- **Engagement**: Use smooth micro-animations and transitions for feedback.
- **Frictionless**: Minimize required fields and prioritize visual inputs (photos/icons).

### 1.4 Device & Touch Requirements
- **Cross-Platform Compatibility**: The UI must adapt seamlessly across iPhone, iPad, Android Phones, and Android Tablets.
- **Touch Targets**: All interactive elements (buttons, ratings, gallery remove actions) must have a minimum touch target of `44px x 44px` to ensure usability on smaller screens.
- **Adaptive Layout**:
  - **Phones**: Single-column vertical layout with bottom-fixed actions for easy thumb access.
  - **Tablets/iPad**: Adaptive multi-column or centered-constrained layouts to prevent excessive line lengths and utilize screen real estate.
- **Safe Areas**: Use environment variables (e.g., `safe-area-inset-bottom`) to ensure UI doesn't conflict with system gestures or "notches".
- **Orientation**: While optimized for `portrait`, the app should be functional in `landscape` (especially for tablets).

### 1.5 Family Identity & Persistence
The application uses a passwordless, profile-based identity model to track family involvement.
- **Identity Selection**: Upon first launch, the user is presented with a "Who are you?" overlay to select their family profile.
- **Persistence**: The selected identity is stored in `localStorage` or a persistent cookie, ensuring the user remains logged in across sessions on the same device.
- **Profile Management**: New family members can be added or removed at any time through a dedicated "Family Settings" interface (accessible via Settings).
- **Manual Override**: Profile switching is available in the Settings menu for devices shared by multiple family members.

## 2. PWA Asset Requirements

As a "Home-First" self-hosted application, the PWA must provide a native-like experience.

- **Favicons**: Support for all standard sizes (16x16, 32x32, 48x48).
- **App Icons**: 
  - `192x192` and `512x512` (masked and unmasked) for Android/iOS homescreens.
  - Apple Touch Icon (`180x180`).
- **Web App Manifest**:
  - `display`: `standalone` (to hide browser chrome).
  - `orientation`: `portrait` (optimized for mobile use).
  - `theme_color`: `#6366F1`.
  - `background_color`: `#F5F3FF`.

## 3. Recipe Acquisition Module

The "Add Recipe" flow is the primary entry point for populating the family recipe library.

### 3.1 Feature Overview
Users can quickly capture a recipe by taking one or more photos and assigning a simple family rating. Every captured recipe is attributed to the family member who added it.

### 3.2 User Experience (Frictionless Capture)
1. **Photo Acquisition**: 
   - *Requirement*: The user must have an active family profile selected (enforced by Phase 0 onboarding).
   - Single-tap access to the device camera.
   - Support for multiple photos in a single session.
   - Visual gallery with horizontal scrolling for review.
   - One-tap removal of unwanted photos.
2. **Rating System**:
   - A clear 4-point rating system using large, touchable emoji buttons:
     - `❓ Unknown` (Default/New)
     - `👎 Dislike`
     - `👍 Like`
     - `❤️ Love`
3. **Optional Metadata**:
   - **Label**: A short, optional text field (e.g., "Grandma's Pie").
   - **Notes**: An optional text area for extra context.
   - *Requirement*: These fields must not block the "Save" action if left empty.

### 3.3 Visual States
- **Idle**: Prompt to "Tap to add photos".
- **Capturing**: Previewing photos in a horizontal gallery.
- **Saving**: Visual progress indicator (spinner) and disabling of buttons.
- **Success/Error**: Clear, temporary feedback messages before returning to idle.

## 4. Weekly Dinner Planner

The Planner is the heart of the "home-base" experience, providing a clear dashboard for the family's meals.

### 4.1 Feature Overview
A vertical list of the current week's plan, optimized for quick scanning and easy adjustments.

### 4.2 3-Meal Support & Sparse Logic
- **Meals**: Supports Breakfast, Lunch, and Supper.
- **Focus**: Supper is the prioritized entry; it is always visible for the current and future days.
- **Sparse List Requirement**: To keep the UI clutter-free, Breakfast and Lunch slots are **hidden by default** unless a recipe is scheduled for them.
- **Day Navigation**: A horizontal "Day Scrubber" (Calendar strip) at the top allows for quick jumps to specific days.

### 4.3 Switching & Swapping
- **Frictionless Re-entry**: Recipes can be swapped between days or meal slots using a simple "Slide to Move" or "Long-press & Drag" interaction.
- **Unbreak the Flow**: Moving a recipe should be instantaneous with haptic feedback and smooth transitions, ensuring the user stays in the planning "flow".

## 5. Recipe Discovery ("The Light Bulb")

Discovery is the application's core engagement engine, designed to solve decision fatigue by transforming meal planning into a shared "Kitchen Game" for the whole family.

### 5.1 The "Dating App" Interaction Model
The interface uses a high-fidelity stacking card UI optimized for one-handed mobile use.

#### 5.1.1 Swipe Physics & Gestures
To ensure a premium tactile feel, the swiping engine must implement the following dynamics:
- **Rotation**: As a card is dragged horizontally, it rotates proportionally to the displacement. Max rotation is **15 degrees** at 50% screen width.
- **Commit Threshold**: A swipe is considered "committed" if the horizontal displacement exceeds **25%** of the container width OR the flick velocity exceeds **0.5 px/ms**.
- **Restoration**: If released before the threshold, the card must snap back to center using a soft spring animation (duration: 300ms, easing: `cubic-bezier(0.18, 0.89, 0.32, 1.28)`).
- **Z-Index Stacking**: The top card is at `z-index: 100`. The card immediately below (`z-index: 90`) is slightly scaled down (0.95) and blurred (2px) to create depth.

#### 5.1.2 Visual Feedback (The "Aha!" Moment)
- **Dynamic Stamps**: As the user drags right, a Sage Green "LIKE" stamp (opacity up to 80%) appears in the top-left corner of the card. Dragging left shows a Terracotta "NOPE" stamp in the top-right.
- **Color Overlay**: The background of the Discovery session should subtly tint towards the dominant color of the active swipe (Sage or Terracotta) to provide immersive feedback.
- **Dedicated Undo**: A prominent "Back" button (curated iconography, glassmorphic style) is located in the bottom action bar to restore the previously swiped card to the top of the stack.

### 5.2 "The Kitchen Game" (Collaborative Voting)
The app treats Discovery as a shared household activity focused on consensus building.

- **Passwordless Identity**:
  - **Profiles**: The app supports a list of defined family members (e.g., Mom, Dad, Alex).
  - **Selection**: Upon first use or when cleared, each device prompts the user to "Select your profile."
  - **Persistence**: This selection is remembered via persistent cookies or `localStorage`, ensuring a seamless, passwordless experience.
- **Shared Pool Logic**: Multiple family members participate in the same discovery session. When a card is swiped on one device, it is immediately updated across all devices in the family group.
- **Voting & Consensus**:
  - **The Shared Inspiration Pool**: Recipes swiped "Right" (Like/Love) are added to the shared **Weekly Inspiration Pool**.
  - **Consensus Threshold**: A recipe is visually flagged as "Family Favorite" only after achieving a minimum number of votes (e.g., 2+ family members). Individual "voter" identities are tracked internally to prevent duplicate voting, but are not displayed as icons on the planner tiles.
  - **The Veto Power**: If any family member swipes "Left" (Dislike), the recipe is immediately removed from the active session and the Inspiration Pool for everyone.
- **Gamification**: No daily limits. The session is designed to be played like a game; the stack is continuously replenished to encourage exploration.

### 5.3 Card Architecture
Each discovery card is designed for high visual impact and "gut-feeling" decision making.
- **Hero Image (Primary)**: The hero image occupies the top 75% of the card, using `object-fit: cover`.
- **Information Panel**: The bottom 25% features a glassmorphic overlay containing:
  - **Recipe Label**: Bold, clear typography (Outfit).
  - **Family Rating**: The original emoji rating assigned during the Acquisition phase.
  - **Metadata Chips**: Minimalist badges for context (e.g., "Grandma's recipe").
- **Phase 2 Expansion**: Cards are designed to support a "Tap to Expand" or "Long Press" gesture to reveal a translucent instructional preview (Ingredients/Steps) without leaving the discovery flow.

## 6. Technical Requirements (Technology-Agnostic)

### 6.1 Data Model: Recipe Object
The primary data object for a recipe (used during acquisition and discovery) must include:
- **images**: A collection of binary image files.
- **rating**: An integer (0-3).
- **label**: String (optional).
- **notes**: String (optional).
- **metadata**:
  - `addedBy`: Identifier of the family member who captured the recipe.
  - `initialRatingBy`: Identifier of the family member who provided the first rating.
  - `addedDate`: ISO 8601 timestamp.

### 6.2 Data Model: Schedule & Discovery
To support planning and the "Light Bulb" mode:
- **Schedule Object**:
  - `recipeId`: Unique reference.
  - `date`: ISO Date.
  - `slot`: Enum (Breakfast, Lunch, Supper).
- **Discovery State**:
  - **familyProfiles**: A list of defined user names for the household.
  - **inspirationPool**: A collection of records representing recipes liked by the family.
    - `recipeId`: Unique reference.
    - `voterIds`: A collection of unique identifiers (from `familyProfiles`) who swiped "Right".
    - `consensusReached`: Boolean flag (true if `voterIds.length >= threshold`).

### 6.3 API Interaction
- **Config**: The app should fetch configuration (e.g., API base URL) on startup.
- **Upload**: Recipes and their binary images are sent via a multipart request to a `/api/recipes` endpoint.
- **Planning**: A `PATCH /api/schedule` endpoint handles the movement of recipes between dates and meal slots.
- **Protocol**: HTTP/HTTPS (Self-hosted environment).

## 7. Implementation Roadmap

### Phase 0: Family Foundation
**Goal**: Establish the passwordless identity layer and shared household data.
- **Features**: Identity API (`/api/family`), "Who are you?" onboarding, device persistence, "Manage Family" settings.
- **Value**: Ensures every action is attributed to a family member from day one.

### Phase 1: Recipe Acquisition (Current Focus)
**Goal**: Build the entry-point for digitizing recipes with a focus on mobile speed and attribution.
- **Features**: Camera capture, 4-point rating, `addedBy` metadata, PWA home-screen foundation.
- **Value**: Replaces manual uploads with a frictionless, personalized tool.

### Phase 2: Weekly Dashboard
**Goal**: The "Home Base" for the family to see what's planned.
- **Features**: 3-meal vertical list, horizontal day scrubber, sparse-list logic (hides empty meals).
- **Value**: Provides a clear, at-a-glance view of the week.

### Phase 3: Recipe Discovery ("The Light Bulb")
**Goal**: Solve decision fatigue with engaging interactions.
- **Features**: "Dating App" swiping UI, Thumbs Up/Down feedback, Inspiration Pool.
- **Value**: Makes chooses recipes fun and interactive for the family.

### Phase 4: Recipe Companion
**Goal**: The kitchen companion for actual cooking.
- **Features**: Ingredients/Instructions view, Hero image display, non-locking "Cook Mode".
- **Value**: Completes the loop from capture to table.

### Phase 5: PWA Polish & Hosting
**Goal**: Deployment and final UX refinements.
- **Features**: Dark/Light mode optimization, full asset deployment, Docker-based self-hosting guide.
