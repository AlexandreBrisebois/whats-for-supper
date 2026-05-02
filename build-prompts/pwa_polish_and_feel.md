# Build Prompt: PWA Polish, Feel & Integration

## Objective
Elevate the "Supper Planner" and "Search" experience to ensure the aesthetic and interactive "feel" is equal or superior to the rest of the "Solar Earth" application. This session requires the **Mère-Designer** skill for a rigorous aesthetic audit.

## Context
The core Planner UI and lockdown logic are implemented, but the transitions, micro-interactions, and search integration need the final 10% of polish that defines the premium experience.

## Requirements

### 1. Aesthetic & Interaction Audit (Designer Skill)
- **Review**: Use the Designer skill to audit `planner/page.tsx` and `QuickFindModal.tsx`.
- **Transitions**: Implement high-fidelity Framer Motion transitions between week flips (e.g., slide + fade).
- **Staggered Entrance**: Ensure daily cards use a staggered spring bounce on load.
- **Micro-interactions**: Add haptic-like visual feedback on card press and drag start.

### 2. Search-to-Planner Integration
- Complete the flow from `/recipes` back to `/planner` using `addToDay` and `weekOffset`.
- Handle the transition back to the planner with a "Success" micro-animation on the targeted day card.

### 3. Functional Polish
- **Processing Feedback**: Add a "Solar Earth" style loader or pulse for recipes currently being processed by the AI worker.
- **Empty States**: Refine the "Plan a Meal" button to feel more inviting (e.g., subtle pulse or glowing border).

### 4. Cook's Mode (Early Prototype)
- Design the transition from a Planner card to "Cook's Mode" (High-visibility, hands-free UI).

## Verification
- **Visual Audit**: Perform a screen recording and review against the "Solar Earth" design tokens.
- **E2E Integration**: Ensure the search-to-planner round-trip is covered in Playwright tests.
