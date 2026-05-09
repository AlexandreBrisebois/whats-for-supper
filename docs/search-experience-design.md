# Search Experience Design & Optimization

**Date**: 2026-05-09  
**Status**: Implemented  
**Owner**: Antigravity (Agent)

## Overview
This document captures the design decisions and architectural changes made to the "What's For Supper" recipe search experience. The goal was to modernize the interface, reduce visual redundancy, and integrate pantry-aware intelligence.

## 1. Layout & Aesthetics
We applied the **Mère-Designer** principles to resolve "layout squish" and improve one-thumb ergonomics:
- **Vertical Breathing**: Added `pt-6` (24px) to the main search page container to ensure consistent top-of-page spacing across all app views.
- **Glassmorphism**: The "Ask the Agent" input now uses `backdrop-blur-md` and `bg-white/60` with a subtle `border-white/20`, creating a premium "floating" feel on mobile devices.
- **High-Fidelity Typography**: Agent-led search titles and filters now use bolder weights and tracked-out uppercase labels for a curated, premium look.

## 2. Structured Intent & Filters
We introduced the **Healthy Choice** filter to simplify daily meal planning:
- **Backend**: Added `HealthyOnly` to `RecipeSearchFiltersDto` and implemented a server-side toggle that filters recipes by the `is_healthy_choice` property.
- **Agent Intelligence**: Updated the `AgentSearchTranslationService` LLM prompt to recognize "healthy" intent. The agent now automatically activates the `HealthyOnly` filter when users ask for "something light," "healthy," or "diet-friendly."
- **Localization**: Added full English (`en`) and French (`fr`) translation keys for all search labels and filters.

## 3. Pantry-Aware Ranking (Pantry Boost)
To bridge the gap between "What's in my kitchen" and "What's for supper," we implemented a photo-assisted ranking boost:
- **Logic**: The search engine retrieves the most recent temporary pantry snapshot (captured via camera).
- **Matching**: We perform an intersection between pantry ingredients and recipe ingredients (normalized for case and whitespace).
- **Boost**: Matching recipes receive a score boost (`+10.0`) to ensure they appear as "Top Picks."
- **Transparency**: Recipes that match the pantry are marked with a clear reason: *"Uses X ingredients from your camera photos."*

## 4. Result Deduplication & Structure
To reduce cognitive load and visual redundancy, we restructured the API response:
- **Top Pick Isolation**: The highest-ranked candidate is served as the `TopPick`. This item is now **explicitly excluded** from the secondary `Results` list.
- **Conflict Resolution**: This change resolved React key conflicts where identical IDs were rendered in the Hero and Grid views simultaneously, causing intermittent "non-rendering" artifacts.
- **Pagination**: The `hasMore` logic in the PWA was updated to check for `results.length >= limit`, ensuring accurate "Show More" behavior with the new separated structure.

## 5. Verification
- **Contract Integrity**: All changes remain 100% compliant with `specs/openapi.yaml`.
- **Testing**:
  - 19 backend integration tests passed (verifying deduplication and ranking).
  - 6 agent translation tests passed.
  - 38 PWA unit tests passed for the search page.
