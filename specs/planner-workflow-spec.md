# Planner Workflow Specification — The Planning Lifecycle
**What's for Supper · Phase 11 (Workflow & State)**

> **Status**: Draft Specification
> **Persona**: 🎨 Mère-Designer (UX Lead)
> **Goal**: Eliminate "Planning Blindness" by introducing a clear "Active Planning Session" and a friction-free "Reopen" workflow.

---

## 1. The Problem: "Planning Blindness"
Currently, the planner treats every week as an isolated silo. When a user finalizes a week ("Menu's In!"), they are often mentally ready to look at the *next* week, but the app doesn't acknowledge this transition. 
- **The Gap**: Navigating to next week feels like "starting over" rather than "continuing the flow."
- **The Confusion**: No visual indicator of which week is "under construction" versus which is "set in stone."
- **The Dead End**: Once a week is locked, the path to changing it is invisible.

---

## 2. The Planning Lifecycle (States)

We are evolving the `weekly_plans.status` to support a more fluid movement.

| Status | UX Label | Visual Treatment | Intent |
|---|---|---|---|
| **0: Draft** | *Idle* | Neutral / Pulse Border on empty slots | Gathering ideas, no pressure. |
| **1: VotingOpen** | **"Planning Active"** | **Ochre Glow** in Header | The family is actively voting; the "Hearth Pulse" is on. |
| **2: Finalizing** | *Finalizing...* | SolarLoader overlay | One-way transition while persisting pending recipes. |
| **3: Locked** | **"Menu's In"** | Sage Green Check / Locked Icons | Execution mode. Groceries are bought. |
| **4: Executing** | **"Tonight"** | Terracotta Highlight on Today | This is the current "Live" week. |

---

## 3. Workflow: The "Active Planning Session"

### 3.1 Defining the "Active" Week
The **Active Planning Session** is the global "Focus Week" for the family. 
- **Auto-Activation (The Monday Rule)**: If the user opens the app and the **Current Calendar Week** is in `Draft` state, the app automatically sets it as the **Active Week**.
- **Planning Gap Detection**: If the Current Week is `Locked`, and the Next Week is `Draft`, the app auto-promotes the Next Week to "Active" as soon as the user navigates to it.
- **Persistence**: The Active Week's `week_start_date` is stored in the `families` or `users` profile state. The API returns `isActive: true` in the `GET /api/schedule` payload if the requested week matches this stored date.
- **Visual Anchor**: The Week Navigator in the header displays a small **Ochre Dot** (Solar Pulse) next to the dates of the Active Week.
- **Global Context**: If you are viewing "Next Week" but "This Week" is still `VotingOpen`, a persistent "Floating Action Tab" appears at the bottom: *"Planning in progress for May 5-11 [Return to Planning]"*.

### 3.2 Explicit Declaration: The "Focus This Week" Action
If a user is looking at a week and wants to make it the focus:
- **Location**: Planning Pivot Sheet (Tapping the header or a day).
- **Action**: `[Set as Active Planning Week]`.
- **Why (Mère-Designer)**: Gives the user a sense of "Taking the Helm." It stops the mental juggling of which week they are currently trying to solve.

### 3.3 The "Success Transition"
When "Menu's In!" is clicked for the Active Week:
1. The week locks.
2. A success confetti animation plays.
3. **The Pivot**: The UI automatically suggests: *"All set! Start planning next week? [Next Week ->]"*.
4. **Auto-Pivot**: If they click, the `activePlanningWeekOffset` increments, and they land on the next week with the "Ask the Family" sheet already open.

---

## 4. Workflow: The "Reopen" & "Surgical Edit"

"Change happens." The app must respect that a "Locked" plan is not a "Permanent" plan, while minimizing friction for small tweaks.

### 4.1 The "Unlock" Trigger (Full Edit)
- **Location**: In the Locked State Footer (where it currently says "✅ Week finalized").
- **Action**: Replace or supplement with a secondary action: `[Edit Plan]`.
- **Interaction**:
    1. User taps `[Edit Plan]`.
    2. A brief confirmation sheet: *"Unlocking will allow changes. Do you want to notify the family to vote again?"*
    3. **The "Silent Edit" Toggle**: A checkbox `[ ] Reopen voting for family` (Default: False).
    4. **Action**: `POST /api/schedule/unlock?weekOffset=N&reopenVoting=true|false`.
    5. **State Change**: `status` reverts to `VotingOpen` (1).
    6. **Visuals**: The Sage Green "Locked" theme dissolves back into the Ochre "Planning" theme.

### 4.2 Surgical Edits (The "Quick Swap")
If a week is `Locked`, certain non-destructive actions are permitted without a full "Unlock."
- **Allowed Actions**:
    - **Swap**: Dragging one locked recipe onto another.
    - **Move**: Dragging a recipe to an empty slot within the *same* locked week.
- **Why (Mère-Designer)**: Since these recipes are already "in the house" (on the grocery list), moving them doesn't invalidate the shopping trip. It only changes the timing.
- **Feedback**: A subtle "Toast" confirms: *"Meal swapped! No changes to grocery list."*

### 4.3 The "Single Slot Change" (Destructive)
If a user wants to replace a recipe in a locked week:
- **Interaction**: Tapping a locked day card opens the Pivot Sheet.
- **Visual**: The card has a "Lock" icon.
- **Action**: `[Replace Recipe]` → Triggers the "Unlock" confirmation sheet (Section 4.1).

---

## 5. UI Components & Micro-Animations

### 5.1 The "Hearth Pulse" Header
When a week is `VotingOpen`:
- The background of the Segmented Control (`[Planner] [Grocery]`) has a faint, slow Ochre pulse.
- **Theoretical Payoff**: Ambiently signals that "the hearth is active"—family input is welcome.

### 5.2 Transition: Draft → Planning
When the first meal is assigned to a Draft week:
- A "Solar Flare" animation (particle burst) emanates from the assigned card.
- The footer slides up to reveal the `[Menu's In]` button (disabled until threshold met).

---

## 7. Workflow: Contextual Recipe Search

When a user pivots from the Planner to the Recipe Library, the search experience must maintain the "Planning Thread."

### 7.1 The "Planning Header" in Search
- **Visual**: A slim, sticky Ochre bar at the top of the `/recipes` page (only when `?addToDay` is present).
- **Label**: *"Adding to Monday, May 12"*
- **Action**: `[Cancel]` returns to `/planner`.

### 7.2 Mission Persistence (The "Stay or Go" Choice)
- When a recipe is selected in this mode, the "Add" button is replaced by **[Add to Monday]**.
- Tapping it:
    1. Fires the `assign` API.
    2. **The Mission Toast**: A floating snackbar appears at the bottom.
        - **Label**: *"Added to Monday!"*
        - **Actions**: `[Return to Planner]` or `[Keep Searching]`.
- **Auto-Behavior**: If the user takes no action for 5 seconds, the toast disappears, but they **remain in Search**. This allows for "Comparison Shopping" or planning multiple days (e.g., "I'll find a side dish for that chicken now").
- **Manual Return**: Tapping the `[X]` or `[Cancel]` on the Planning Header always returns to the Planner.

---

## 9. Home Page Integration: The "Start Your Week" Pivot

The Home Page (Command Center) is the primary engine for starting the cycle.

### 9.1 Scenario: "Monday Morning & Empty Plan"
- **Context**: It is Monday (or any day this week) and the Current Week is `Draft`.
- **UI**: Instead of a "Tonight's Menu" card, the top of the Home page features a **Large SolarPivotCard**.
- **Label**: *"The week is a blank slate. What's for supper?"*
- **Action**: `[Plan the Week]` (Navigates to `/planner` for the current week and triggers the "Ask the Family" sheet).

### 9.2 Scenario: "Execution Mode + Next Week Gap"
- **Context**: Current week is `Locked`, but Next Week is `Draft`.
- **Temporal Gate**: This nudge **only appears from Thursday through Sunday**.
- **Why (Mère-Designer)**: Early-week nudges (Mon-Wed) cause "Foresight Fatigue." Thursday is the natural pivot point when the "What are we doing next week?" thought begins to emerge.
- **UI**: A small "Next Week" badge or card appears below the main execution card.
- **Label**: *"Looking ahead: Start planning next week?"*
- **Action**: `[Start Next Week]` (Navigates to `/planner` with `weekOffset=1`).

---

## 10. Implementation Notes (Next Steps)

### 6.1 API Updates
- **[NEW]** `POST /api/schedule/unlock?weekOffset={int}`: Reverts status to `VotingOpen`.
- **[MODIFY]** `GET /api/schedule`: Include `isActivePlanningWeek: boolean` (computed based on user's last interaction or earliest future VotingOpen week).

### 6.2 PWA Updates
- `plannerStore`: Track `activePlanningWeekOffset`.
- `WeekNavigator`: Add the Ochre Dot indicator.
- `Footer`: Implement the "Unlock" button logic.
