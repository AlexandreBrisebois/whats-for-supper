# Proposal — selective ingredient repair (deferred)

## Why
After safe conversion and manual correction exist, some evidenced missing or conflicting facts may still require consulting retained original sources. The current full re-import graph can overwrite unrelated content and media, so it is unsuitable for ingredient-only assistance.

## Outcome and Scope
Stage 3 is a deferred option dependent on `canonical-ingredient-correction`, to activate only if remaining manual correction effort justifies it. No stage 1 or 2 task depends on this change. Prepare the bounded candidate workflow; do not execute it through this planning approval.

## What Changes
- Explicitly select evidenced gaps and usable retained sources; skip accepted facts and valid unquantified content. No automatic repair on read, migration or API startup.
- Generate ingredient-only candidates using existing source loaders/provider boundary/workflow infrastructure, without publishing live facts, files, hero, basis or instructions.
- Validate evidence, identities and captured ingredient/basis/source revisions; treat provider confidence as insufficient evidence.
- Offer selected corrections inside existing Edit, publishing only through explicit revision-guarded Save. Keep Search flags separate from household reports.
- Retain resumable work outcomes and recoverable candidate/source relationships; restored candidates require revalidation and never trigger provider work automatically.

## Capabilities
### New Capabilities
- `ingredient-repair`: selective source-assisted candidates, validation, acceptance and recovery.

### Modified Capabilities
None. This capability extends the stage 2 guarded publication/recovery boundaries without replacing their contracts.

## Impact
An additive repair request/candidate contract, regenerated client and method-sensitive mocks, existing workflows/source loaders, recipe editor and full-fidelity recovery coverage. No new provider platform, review dashboard, automatic batch correction, full-share format or legacy storage deletion.

See [stage boundaries](../archive/2026-11-06-quiet-recipe-portions/scope-stages.md). All tasks remain unchecked and explicitly deferred; implementation requires a separate selected-stage request. DV reset and production actions remain separate.
