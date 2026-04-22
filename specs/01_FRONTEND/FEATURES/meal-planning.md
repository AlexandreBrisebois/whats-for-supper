# Meal Planning Specification

This document defines the Weekly Planner feature for "What's For Supper". The planner is Phase 4 of the roadmap and serves as the family's home-base dashboard.

## 1. Overview

The Weekly Planner displays the current week's meal schedule as a vertical list, supports 3 meal slots per day (Breakfast, Lunch, Supper), and integrates with external calendars for constraint awareness.

## 2. Data Model

See [recipe-data.spec.md §2.3](recipe-data.spec.md) for full schema. Key objects:

- **CalendarEvent**: `id`, `recipe_id`, `slot` (Breakfast/Lunch/Supper), `date`, `status` (Planned/Cooked/Skipped)
- **SyncState**: Tracks last successful Google/Outlook calendar sync

## 3. Planner UI

### 3.1 Day View
- Vertical list of days for the current week.
- Each day shows a **Day Header** (e.g., "Monday Apr 14") with a quick-add button.
- Supper slot is always visible for current and future days.
- Breakfast and Lunch slots are **hidden unless a recipe is scheduled** (sparse list).

### 3.2 Day Scrubber
- Horizontal scrollable date strip at the top of the screen.
- Tapping a day scrolls the vertical list to that day.
- Current day is visually highlighted.

### 3.3 Meal Tile
Each scheduled recipe displays:
- Hero image thumbnail (`hero.jpg` if available, else first original).
- Recipe label.
- Family rating emoji.
- "Family Favorite" badge if `consensusReached = true` in inspiration pool.

## 4. Scheduling Actions

### 4.1 Add Recipe to Slot
- Tap empty slot → opens recipe picker (search or browse from library).
- Confirm selection → creates `CalendarEvent` via `PATCH /api/schedule`.

### 4.2 Move Recipe (Swap/Drag)
- Long-press a meal tile to enter drag mode.
- Drag to another slot or day to move.
- Dropping onto an occupied slot prompts to swap.
- Instant optimistic update in UI; confirmed via API.

### 4.3 Remove Recipe from Slot
- Swipe tile left on mobile, or long-press → "Remove" option.
- Sets `CalendarEvent.status = Skipped` (soft delete, preserves history).

### 4.4 Mark as Cooked
- Tap meal tile → "Mark as Cooked" action.
- Sets `CalendarEvent.status = Cooked`.

## 5. Calendar Sync

See [recipe-data.spec.md §4.1](recipe-data.spec.md) for sync architecture.

- A **Calendar Sync Worker** polls external calendars (Google, Outlook) every 5 minutes.
- "Busy" blocks on external calendars flag that day's Supper slot as constrained.
- Constrained slots are visually indicated (e.g., a lock icon or muted color).
- Planned meals are pushed to external calendars as events with meal title + prep time.

## 6. API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/schedule` | `GET` | Fetch calendar events for a date range |
| `/api/schedule` | `PATCH` | Add, move, or update a meal slot |
| `/api/schedule/{id}` | `DELETE` | Remove a meal slot (sets status=Skipped) |

## 7. Offline Behavior

- The current week's planner data is cached by the Service Worker.
- Offline mutations are queued and replayed when connectivity is restored.
- Zustand store is the source of truth for the UI; sync status is surfaced via a banner.

## 8. Phase Rollout

| Phase | Features |
|---|---|
| 2 (MVP Planner) | Supper-only, add/remove, no calendar sync |
| 2+ | Breakfast/Lunch sparse slots, day scrubber |
| 4 | Calendar sync (Google/Outlook), drag-drop swap, cook status |
