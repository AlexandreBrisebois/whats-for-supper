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

### 4. RAG Re-ranking (Agent Mode)
To provide decisive, high-quality recommendations, we implemented a two-pass search pipeline for Agent Mode:
- **Retrieval**: The system first performs a hybrid search (Trigram + Vector) to find the top candidates.
- **Planner Context**: If a `WeekOffset` is provided, the system fetches the names and dietary profiles of recipes already scheduled for that week. It uses the `WeeklyBalanceScorer` to generate deterministic dietary goals (e.g., "Add more plant-based protein").
- **LLM Rerank**: Gemini receives the original query, the current week's menu, and the dietary goals. It selects the single best **Top Pick** and generates a personalized **Planner Fit Note** explaining the choice (e.g., "I picked this light Mediterranean salad to balance out the heavier meat dishes you've planned this week!").
- **Transient Reasoning**: These AI insights are displayed for decision support on the search page but are not persisted, keeping the database clean.

### 5. UI Structure & Balancing (1+6 Grid)
To ensure a premium, balanced layout on all devices:
- **1+6 Rule**: Search results are now capped at exactly **1 Top Pick** (the hero) and **6 secondary results** (the grid).
- **Decisive UI**: The Top Pick is prominently featured with its AI justification (in Agent mode) or match reason (in Standard mode).
- **Glassmorphic AI Card**: Agent recommendations are housed in a luminous, glassmorphic container (`backdrop-blur-xl`, `bg-white/10`) with a "Sparkles" animation, signaling the Personal Chef persona.

## 6. Verification
- **Contract Integrity**: All changes remain 100% compliant with `specs/openapi.yaml`.
- **Testing**:
  - 524 backend integration tests passed (verifying re-ranking, balance context, and ranking).
  - 338 PWA unit tests passed, including new grid limit and AI reason rendering.
