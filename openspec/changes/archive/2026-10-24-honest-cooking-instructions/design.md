# Design

## Context and Existing Ownership
CooksMode fetches getRecipe and parses recipeInstructions through stepParser. Its getFallbackSteps currently fabricates content both after rejection and parsing no steps. Existing finishCooking owns pending, duplicate submission, celebration and error recovery. The hero opens RecipeDetailSheet and its original URL/photo actions. RecipeImportIssueSheet and saveRecipeImportIssue already own contextual report submission and server-driven background reimport acknowledgement.

## Decisions and Tradeoffs
Remove fallback generation and use an empty parsed array plus read-error state. Render an honest instruction recovery surface when empty, retaining the hero, presentation chooser and completion footer. Offer named Report steps only after a valid eligible detail result, using existing shared sheet and steps context. Parse the authoritative submission/resolution recipe; retain explicit Retry after background launch rather than introducing polling. Failed reads cannot infer reporting eligibility.

## First Observable Slice
Reject getRecipe in CooksMode.test.tsx, observe failure and Retry without fabricated text, then resolve retry with actual steps. Exercise UI -> existing wrapper/generated client in Playwright with failed and successful GET overrides; existing backend contracts remain unchanged. Extend to absent instructions, contextual report and completion failure recovery.

## State, Concurrency and Recovery
Each current-ID read enters pending, clears prior read failure, and accepts only its own active response. Retry must not clear checks/bookmark. Empty steps select Mark cooked directly through existing finishCooking. Existing error/pending UI remains its owner. Returning usable steps reuses the selected presentation and bounds the bookmark to returned step count without replacing persisted server policy.
