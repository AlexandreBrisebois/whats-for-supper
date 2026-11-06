# Design — deferred

## Context and Existing Ownership
Requires the completed stage 2 canonical contract, revision-aware Edit/Save, independent Search repair facts and full-fidelity recovery. Current source loaders, PDF preparation, provider boundary and durable workflow engine can supply selected evidence. RecipeAgent/full re-import currently publishes recipe.json and can execute unrelated processing; it must not be used unchanged for ingredient-only repair.

## Decisions and Tradeoffs
Keep this optional until post-conversion manual correction effort demonstrates need. Explicitly select recipe/lines and retained source/version. Current URL refetch is an explicit source choice; generated hero or synthesis guesses are not original ingredient evidence. Do not repair accepted numeric facts or valid qualitative content to improve completeness statistics.

Add a narrow ingredient-only workflow: capture ingredient/basis/source revisions and extraction settings, load selected source, generate a separate candidate, validate it and expose it inside existing Edit. Reuse provider infrastructure without running hero generation, unconditional recipe.json/sync or whole-recipe publication. High confidence does not establish source association, correct line membership or legal quantities. Missing usable source leads manual correction, not invented amounts.

Candidate rows identify proposed fields and evidence; a person accepts selected fields into the ordinary draft. Stage 2 Save rechecks current revision, source identity and protection atomically. Unaccepted fields stay unchanged; remaining reasons stay searchable. No unattended publication or separate review screen.

## First Observable Slice
For one canonical recipe with a verified amount and one evidenced source gap, request repair for the gap, stage a provider-boundary fixture response, inspect it through the generated client and accept only one field in Edit/Save on real PostgreSQL. Assert the verified amount, text/order, human protections, basis, hero, instructions and other files remain unchanged until explicit Save. Then race a human edit/source change before acceptance and require conflict with no overwrite. Provider doubles remain at the external boundary, not across internal workflow/publication seams.

## State, Concurrency and Recovery
Persist selected inputs and bounded attempt outcomes separately from current recipe facts: queued/running, candidate/no-action/human-review, changed-deferred/failed/canceled and verified. Retry is guarded by captured revisions and deduplicates an unchanged attempt; it does not replay a completed Save. Provider failure/cancellation leaves current content intact. Validation and candidate acceptance cannot clear newer repair reasons or independent household reports.

Extend full-fidelity recovery to candidate/source relationships and incomplete outcomes; normalize restored in-flight work for explicit retry and revalidate before acceptance. Restore/read/verification/startup never invokes providers automatically. Share 1.0 excludes private repair state. No new recovery platform or provider replacement is proposed.

## Compatibility, Rollout and Reversal
This is an additive optional contract after stage 2, not a dependency of stage 1 or 2. Proposed POST `/api/recipes/{id}/ingredient-repair` accepts selected line/source identities and captured revisions, returning an operation reference for existing workflow status; candidate detail is an authorized read and explicit acceptance travels through stage 2 PATCH. Specify and generate these shapes before logic during apply. Quota/errors/cancellation remain visible via existing workflow outcomes. No automatic source fetch or feature activation occurs during migration.

A later request to activate this stage must select the retained-source workflow and release scope; planning completeness is not approval to spend provider calls or change recipes. Ordinary current facts remain usable when the optional workflow is disabled. Accepted corrections retain stage 2 recovery semantics, so disabling generation does not undo accepted data.
