# Design

## Context

See proposal.md. This extraction connects all capture acquisition sources to the shared recipe agent and provider boundary. BSL-recipe-capture-023 records the trace, current identities and test limits.

## Goals / Non-Goals

**Goals:** Describe the observable request made to the external processing provider, including disabled overrides, without elevating prompt intent into a successful translation guarantee.

**Non-Goals:** Translation validation, configuration UI, member-preference policy, provider choice, deployment propagation or runtime qualification.

## Decisions

- First observable slice: ordinary photo intake -> `recipe-import` extraction -> `RecipeAgent.DoExtractRecipeAsync` -> `GetTranslationInstruction` -> external `IChatClient` request -> existing parser/store -> later library representation. URL acquisition reaches the same method via `url-import`; PDF pages via `ConvertPdf`; description intake reaches `DoSynthesizeRecipeAsync` through `goto-synthesis`.
- `RecipeAgent.GetTranslationInstruction` reads `IConfiguration["IMPORT_TARGET_LANGUAGE"]` at execution. Nonblank values other than case-insensitive NONE append translation instructions. `GenerateDescriptionAsync` uses the same enablement check and adds a target-language constraint. Retain the execution-time configuration boundary; no per-capture or per-member target is submitted in the intake contract.
- The requirement governs outbound requests rather than output language. The alternative of promising translated recipes is unsupported: parsing validates structure/content completeness, not language. Existing synthesis fallback remains possible.
- `RecipeAgentPromptSelectionTests.TranslationLanguageSet_InjectsInstructionIntoPrompts` checks that any captured message contains French; `TranslationLanguageNone_DoesNotInjectInstruction` checks no captured message contains Translate. These tests substitute configuration, prompts, chat responses, storage and EF in-memory state. They do not individually qualify every source, synthesis or generated-description branch; source supplies those branches' support.
- Member display/browse preference remains with member-preferences (no accepted main spec currently available). Deployment owns environment propagation. The Compose default NONE is supporting configuration evidence, not qualification of every deployment.

## Risks / Trade-offs

- Provider ignores or partially follows instructions -> no output-language guarantee.
- Value validation/normalization beyond blank/NONE checks is absent -> no supported-language enumeration or whitespace normalization promise.
- Configuration may differ when background work executes -> no intake-time snapshot guarantee.

## Migration Plan

No runtime migration, model calls or deployment. Review this draft and evidence first; promotion and archival require separate authorization.
