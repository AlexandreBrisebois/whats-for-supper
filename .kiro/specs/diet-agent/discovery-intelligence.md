# Build Prompt: Discovery Intelligence & Family Convergence

**Goal:** Refine the "Quick Find" and "Discovery" recommendation engines to prioritize unvisited recipes and drive family consensus.

## Context
The user has identified gaps in the current recommendation and discovery flow:
1. Quick Find doesn't fallback gracefully when no discovery recipes are available.
2. The Discovery feed doesn't prioritize recipes that already have votes from other family members, leading to "divergence" rather than "convergence".

## 1. Quick Find (Fill-the-Gap) Logic
Update the backend recommendation logic (specifically for the `getFillTheGap` feature) to implement the following fallback hierarchy:
- **Tier 1:** Discovery recipes (AI-imported) not yet cooked.
- **Tier 2:** Discoverable recipes that have never been cooked OR have the oldest `last_cooked_date`.
- **Tier 3:** Any library recipe never voted on or cooked.
- **Tier 4:** General library fallback.

## 2. Family Convergence Sorting
Update the Discovery feed sorting logic to "funnel" members towards matches:
- When a family member opens Discovery, sort cards by `vote_count` descending.
- Recipes that already have votes from other family members MUST appear as the top-most cards.
- Ensure the state syncs so that as one person votes, the "momentum" is visible to others immediately.

## 3. Technical Requirements
- **Backend:** Update `RecipeService.cs` (or equivalent) to include `vote_count` and `last_cooked_date` in the recommendation scoring/sorting.
- **Frontend:** Ensure the `DiscoveryCard` stack in the PWA reflects this new sorting order provided by the API.
- **OpenAPI:** Update any response models if new metadata is needed for sorting visibility.
