# Discovery & Matchmaking Specification

This document defines the recipe discovery and "matchmaking" experiences for "What's For Supper". Discovery is Phase 3 of the roadmap; it transforms meal planning into an engaging, collaborative family activity.

## 1. Overview: The Discovery "Light Bulb"

The core experience is **Matchmaking Discovery**—a card-based collaborative voting system (often called "Tinder for Recipes"). This is the heart of the app's social engagement, designed to bring the family together around the kitchen table (digitally).

## 2. Matchmaking Discovery (Primary Mode)

### 2.1 The Card Stack
- **Hero Focus**: A single, large card dominates the screen to minimize cognitive load.
- **Deck Visualization**: Subtle card edges underneath the top card indicate the remaining "Inspiration Deck."
- **Visuals**: High-resolution food photography (75% of card area).
- **Glassmorphism**: Soft cream/translucent panel for recipe title and metadata.

### 2.2 Swipe Interaction & Buttons
- **Gestural**: Swipe Right (Plan/Like), Swipe Left (Skip/Veto).
- **Tactile Buttons**: Two large, floating buttons for one-handed use:
    - **Like (Sage Green)**: Adds to the household Inspiration Pool.
    - **Dislike (Terracotta)**: Vetoes the recipe for the entire family.
- **"The Eureka Spark"**: A small light bulb icon in the header or on the card indicates an AI-recommended "Eureka" recipe.

### 2.3 Consensus & Collaboration
- **Matchmaking Power**: When two or more family members "Like" the same recipe, it is flagged as a "Family Match" or "Family Favorite."
- **Real-Time Pulse**: Successful matches trigger a notification or visual spark in the "Family Pulse" feed on the Home screen.
- **Veto Dominance**: A single "Dislike" from any member removes the recipe from the active deck for all household devices to prevent unwanted meals.

## 3. Natural Language Search (Secondary Mode)

For when the family knows exactly what they want (e.g., "Taco night").
- Semantic search powered by `SearchRecipesAgent`.
- Hybrid vector/SQL search across the family library + authorized external sources.

## 4. UI Design Tokens (Solar Earth)
- **Palette**: Terracotta buttons for Veto, Sage Green for Like.
- **Typography**: 'Outfit' for titles to maintain the premium, editorial feel.
- **Animation**: Snappy card physics using Framer Motion. Spring-based snap-back for uncommitted swipes.

