# Meal Planning Specification (Supper Planner)

**Status**: AUTHORITATIVE
**Lane**: 01_FRONTEND
**Phase**: 4 (Kitchen & Cook's Mode)

## 1. Overview
The Supper Planner is the "Peace of Mind" center of the app. It transitions from the "team sport" of Discovery into the "execution" of the week. It serves as the family's home-base dashboard, answering "What's for Supper?" in 2 seconds.

## 2. Visual Aesthetics (Solar Earth)
- **Canvas**: Soft Cream (`#FDFCF0`) background with organic, translucent "blobs" (Sage, Ochre, Terracotta) floating behind.
- **Glassmorphism**: Subtle glass effect (backdrop-blur 12px, white/5 border) for the main container and daily cards.
- **Typography**: *Outfit* for editorial headings; *Inter* for high-legibility UI data.
- **Colors**: Terracotta (#CD5D45) for primary actions, Sage Green (#8A9A5B) for completion/success, Ochre (#E1AD01) for discovery highlights.

## 3. UI Components & Layout

### 3.1 Header & Tabs
- **Segmented Control**: A primary tab switcher at the top of the screen.
- **Week Navigator**: Large editorial date range header with chevrons.
- **Progress Indicator**: A subtle text indicator next to the date (e.g., `5/7 planned`) to provide a sense of completion without clutter.
- **Animation**: "Flowing" horizontal slide transition for week flipping.

### 3.2 The Weekly List (Daily Cards)
- **Card Aesthetic**: Glass panels (12px blur, `white/5` border).
- **Unplanned Day**: Single **"PLAN A MEAL +"** button.
- **Planned Day (Drag-to-Swap)**: 
    - **Interaction**: Long-press triggers a haptic pulse and "lifts" the card.
    - **Mechanic**: Mom can drag the card to another day. Dropping on an occupied day "Swaps" the recipes instantly.
    - **Visual Hint**: A subtle vertical handle (two lines) on the right edge of the card.
    - **Animation**: Staggered "bounce" on initial load to show cards are moveable objects.

### 3.3 The Planning Pivot Sheet
Tapping the **"PLAN A MEAL +"** button on any day opens a glassmorphic bottom sheet with three distinct paths:
1.  **Quick Find**: Opens the **"Fill the Gap" Modal**—a focused stack of 5 high-quality recipes for Mom to swipe through immediately (Mom-only flow).
2.  **Search Library**: Navigates to the Search Page with a **"Add to [Day] [##]"** overlay. This is a one-way picker that returns Mom to the Planner once a selection is made.
3.  **Ask the Family**: Toggles the current week as "Open for Voting," making gaps visible to all family members in their Discovery feed.

### 3.4 Lockdown & Multi-Week Workflow
- **Voting State**: Only one week can be open for voting at a time.
- **Finalize Weekly Plan**: A persistent button at the end of the 7-day list.
- **Lockdown Side Effects (Instant Intelligence)**:
    1.  **Clear Voting Table**: Purges temporary Discovery votes for the week.
    2.  **Update Cooked Dates**: Updates `lastCookedDate` for all planned recipes. 
    3.  **Sync**: Any manual swap or move *after* lockdown instantly updates the DB and Discovery eligibility.
- **Next Week Trigger**: Once finalized, the button updates to **"Start Planning Next Week"**. Mom can "Re-open for Voting" if no other week's voting has started.

## 4. Scheduling Actions
- **Move/Swap**: Drag-and-drop to reorder the week. `lastCookedDate` follows the recipe to its new date.
- **Search & Swap**: Mom can search for a recipe at any time and choose to "Swap" it with an existing planned meal.

## 5. E2E Test Requirements (Playwright)
The implementation is driven by these tests, which must verify:

### 5.1 Initial Navigation & Layout
- **Navigation**: Clicking the "Planner" icon in the bottom nav routes to `/planner`.
- **Title & Tabs**: "SUPPER PLANNER" heading and the "Planner" / "Grocery List" tabs are visible.
- **Week Range**: Correct date range displayed for the current week.

### 5.2 Content & Week Flipping
- **Day Cards**: Exactly 7 daily cards rendered.
- **Week Navigation**: Clicking chevrons updates the header text and swaps the meal list with a slide animation.
- **State Rendering**: Differentiation between planned meals (text + image) and unplanned "Plan a Meal" buttons.

### 5.3 Lockdown & Future Planning
- **Lockdown Flow**: 
    - Verify "Declare Complete" button visibility.
    - Assert that "Start Voting" for next week is disabled until current is locked.
    - Verify API side effects: Purging votes and updating `LastCookedDate`.

### 5.4 Interactions
- **Grocery List**: Clicking the tab shows the "Coming Soon" placeholder.
- **Responsive**: Centered and readable layout on mobile viewports.

## 6. Implementation Strategy
1.  **State Management**: Zustand store for `lockStatus`, `currentWeekOffset`, and `activeTab`.
2.  **Animations**: Framer Motion for staggered card entry and week-to-week slide effects.
3.  **API Integration**:
    - `GET /api/schedule?weekOffset=X`
    - `POST /api/schedule/lock` (Purge votes + Update Cooked Dates).
