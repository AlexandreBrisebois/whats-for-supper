# ADR 003: PWA UX and Identity Strategy

## Status
Accepted

## Context
The "What's For Supper" PWA is designed to be a frictionless, family-oriented "Home-First" application. It aims to solve "decision fatigue" through engaging, game-like interactions while remaining accessible to all family members across various mobile and tablet devices. The system must handle profile persistence without the friction of traditional passwords.

## Decisions

### 1. Passwordless Profile-Based Identity
We will use a selection-based identity model ("Who are you?") instead of traditional password-based authentication.
- **Rationale**: Frictionless access for family members on shared or personal home devices. Identity is stored in `localStorage` or persistent cookies for cross-session continuity.
- **Implementation**: A "Family Foundation" (Phase 0) provides the `/api/family` endpoints and onboarding UX.

### 2. "Dating App" Interaction Model for Discovery
The "Light Bulb" (Recipe Discovery) module will use a high-fidelity stacking card UI optimized for one-handed mobile use.
- **Rationale**: Leverages familiar swiping gestures to reduce cognitive load and make recipe selection engaging.
- **Dynamics**: Specific physics including proportional rotation (max 15°), commit thresholds (25% displacement), and soft spring restoration animations.

### 3. Shared Inspiration Pool & Veto Consensus
Discovery is a collaborative "Kitchen Game" rather than an individual activity.
- **Rationale**: Ensures meal planning is a shared household responsibility.
- **Logic**: 
    - **Right Swipes**: Added to a shared **Weekly Inspiration Pool**.
    - **Consensus**: Marked as "Family Favorite" after reaching a threshold (e.g., 2+ votes).
    - **Veto**: Any **Left Swipe** (Dislike) immediately removes the recipe from the pool for the entire family.

### 4. Dual-Option "Aesthetic-First" Design System
The PWA will support two curated aesthetic options: **Option A (Earth Tones)** and **Option B (Vibrant Tones)**.
- **Rationale**: High-end visuals ("WOW factor") are prioritized to ensure user delight. Option A targets a "Modern Organic" vibe, while Option B is "Modern Professional/Tech-forward."
- **Standard**: All UI components must adhere to **WCAG 2.1 Level AA** contrast ratios and feature glassmorphic effects (backdrop-blur).

### 5. Sparse Weekly Planner Logic
The Weekly Dashboard will prioritize the "Supper" slot and hide empty breakfast/lunch slots by default.
- **Rationale**: Minimizes visual clutter. Most families focus on dinner planning; showing empty slots for every meal creates unnecessary vertical scroll.
- **Interaction**: Features a horizontal "Day Scrubber" for navigation and instantaneous "Slide to Move" swapping.

### 6. Mobile-First "Frictionless" Requirements
Strict adherence to touch-friendly and safe-area standards.
- **Rationale**: Ensures the PWA feels native on iOS and Android.
- **Touch Targets**: Minimum `44px x 44px`.
- **Safe Areas**: Use of `safe-area-inset` variables to avoid interference with notches and system gestures.

## Consequences
- **Positive**: High engagement through gamification; zero login friction; premium feel through high-fidelity animations and curated themes.
- **Neutral**: Reliance on `localStorage` means clearing browser data resets the identity selection.
- **Negative**: The veto power (single left swipe) can be aggressive if one family member is particularly picky.

## Participants
- **David** (Product/UX Engineer)
- **Architect Alex** (Infrastructure Lead)
- **Maya** (AI/LLM Specialist)
