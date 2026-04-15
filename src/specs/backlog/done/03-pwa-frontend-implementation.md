# Implementation Prompt: Recipe PWA Frontend

## Background
You are a Senior Frontend Engineer and UI/UX Specialist. You are building the **"What's For Supper" PWA**, a mobile-first application designed for family household management.

## Objective
Implement the PWA frontend as defined in [recipe-pwa.spec.md](file:///Users/alex/Code/whats-for-supper/src/specs/recipe-pwa.spec.md).

## Key Requirements
1.  **Aesthetics**: Implement the "**Sophisticated Home (Earth Tones)**" or "**Modern Professional**" design systems. Prioritize a premium, vibrant feel with glassmorphism and smooth micro-animations.
2.  **Core Modules**:
    -   **Phase 0**: Profile Selection (Passwordless onboarding).
    -   **Phase 1**: Frictionless Recipe Capture (Camera integration + 4-point rating).
    -   **Phase 2**: Weekly Dashboard (3-meal vertical list, day scrubber).
    -   **Phase 3**: "The Light Bulb" (Swiping card UI for collaborative voting).
3.  **Discovery Logic**: Implement the "Dating App" swipe physics (rotation, stamps, consensus threshold) as detailed in the spec.
4.  **Sync**: Ensure the UI reflects calendar updates and shared "Inspiration Pool" changes efficiently.

## Supporting Docs
- Specification: `src/specs/recipe-pwa.spec.md`
- Visual Mockups: `src/specs/mockups/`
- API Reference: `src/specs/recipe-api.spec.md`

## Initial Task
Initialize a modern React or Next.js project. Setup the design system (CSS variables for the Earth Tones palette) and implement the Phase 0 "Who are you?" profile selection screen with localStorage persistence.
