# Proposal

## Why

Configured processing language belongs to recipe-capture but has no promoted requirement. Current source supports requesting a target language from the provider; it does not establish that model output always uses that language.

## What Changes

- Extract target-language request behavior for existing extraction, synthesis and generated descriptions.
- Specify disabled override behavior for absent, blank and case-insensitive NONE configuration.
- Keep member display-language preference, deployment propagation and output-language accuracy outside the claim.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `recipe-capture`: configured processing-language requests at the provider boundary.

## Impact

Documentation only. BSL-recipe-capture-023 in `docs/openspec-baseline/recipe-capture.md` records symbols, test assertions and substitutes. No application, prompt, contract, client, configuration or dependency changes. Human review pending; no promotion, archival, runtime/model qualification or guarantee of translated output.
