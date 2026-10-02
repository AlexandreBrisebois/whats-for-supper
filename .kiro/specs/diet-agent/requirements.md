# Dietary preferences and planning exploration — Requirements

**Kind:** Exploration

**Status:** Planned exploration. Existing files in this directory are legacy prompts with unrelated discovery, Cook's Mode, and React-key work; they are not an approved implementation scope.

## Outcome

Determine whether WFS needs a coherent, household-owned dietary-preferences and meal-planning capability, and define the smallest product outcome worth specifying.

## Exploration questions

1. Is the primary need dietary constraints, household preferences, recommendation explanation, shopping support, or an assistant-mediated workflow?
2. Which preferences are household-wide and which belong to individual members?
3. Which existing search, discovery, recipe, planner, and ingredient policies must remain server-owned?
4. Can existing metadata support the outcome, or is a new data/contract model needed?

## Constraints

- Do not treat a model/agent as the authority for dietary safety, eligibility, or household policy.
- Do not merge unrelated legacy fixes into this initiative.
- Any health, allergy, or nutrition claim requires separately scoped product, data-quality, and safety decisions.

## Promotion criteria

Promote this exploration to a planned feature only after a single user outcome, owner, data policy, and cross-feature boundaries are agreed.
