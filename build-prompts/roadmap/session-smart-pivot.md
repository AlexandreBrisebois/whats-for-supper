# Session: The Smart Pivot (Express Discovery)

**Goal:** Implement a high-utility, card-swiping module directly on the Home screen for 30-second meal planning.

## Task Overview
You are building the **Smart Pivot** module. This is a functional card stack that lives on the Home screen to help users quickly handle "What's for Supper?" when they haven't planned ahead.

## Context Needed
- `pwa/src/app/(app)/home/page.tsx`
- `specs/discovery-search.spec.md`
- `docs/agent-designer-identity.md`

## Step 1: Smart Pivot Card Component
Create `pwa/src/components/discovery/ExpressCard.tsx`:
- **UI**: A compact version of the full Discovery card. Size: ~300px width.
- **Glassmorphism**: Use the Solar Earth glass design tokens.
- **Content**: Hero image, recipe title, and metadata chips (e.g., "15 min", "Quick").
- **Interaction**: Needs to support "flick" gestures using Framer Motion (or simple CSS transitions).

## Step 2: Home Page Integration
Modify `pwa/src/app/(app)/home/page.tsx`:
- **Conditional Logic**: Only show the Smart Pivot if `isPlannedForTonight` is false.
- **Micro-Copy**: "Express Discovery: Quick meals, instantly recommended for you."
- **Layout**: Position it prominently below the greeting and above the "Family Pulse" activity feed.

## Step 3: Swipe & Plan Logic
- **Swipe Right (Plan)**: 
    - Trigger a "Planned for Tonight" animation.
    - Call the Planner API to schedule the recipe for `TODAY`.
    - Replace the Discovery module with the "Tonight's Menu" tile immediately (no refresh needed).
- **Swipe Left (Skip)**:
    - Show the next suggestion in the stack.
    - Record the "skip" in the inspiration pool state.

## Guidelines
- **Snappiness**: The transition from Swipe -> Planned must be under 300ms.
- **Visual Feedback**: Use the "LIKE" stamp (sage green) during the swipe-right phase.
- **Constraint**: Only suggest "Quick" recipes (metadata tag) in this express module.
