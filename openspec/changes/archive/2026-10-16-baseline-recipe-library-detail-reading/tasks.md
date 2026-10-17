# Tasks

Documentation extraction only under A50 in the [durable plan](https://github.com/AlexandreBrisebois/whats-for-supper/blob/46234524072c1df2ca7f67b40d592559770bd440/docs/openspec-baseline-plan.md). Seven additions/13 scenarios mapped in BSL-recipe-library-006; U32–U34 non-normative under A12. No application implementation tasks. Behavior TDD, application/API test execution and client regeneration are not-applicable to this edit. Runtime browser/API/PostgreSQL qualification is not-run under A34.

## 1. Extract and reconcile the bounded documentation

- [x] 1.1 Recheck prior library evidence and trace the actual loaded recipe ID through caller, RecipeDetailSheet, getRecipe, generated GET/OpenAPI, Detail/GetRecipeDetail, persistence mapping and returned local state. Verify BSL-recipe-library-004/005 records predicates, representations and actual assertion substitutions; all 33 reused digests match and eleven additional detail inputs are recorded.
- [x] 1.2 Draft proposal, seven ADDED requirements/13 scenarios and extraction design. Verify every scenario has a BSL-recipe-library-006 source/assertion row, no duplicate main requirements, no unsupported instruction/completeness/recovery/delivery promise, and exact BSL-015 historical sentence/caveat retained with BSL-018–025/U23–U31.

## 2. Validate the integrated documentation draft

- [x] 2.1 Run `openspec validate baseline-recipe-library-detail-reading --strict --no-interactive` and final `openspec validate --all --strict --no-interactive`; require success. Verify seven additions/13 mapped scenarios, no MODIFIED/REMOVED requirements, no Purpose rewrite and all four planning artifacts present. Record draft status and evidence without acceptance/promotion/archival.
- [x] 2.2 Review the six selected paths (metadata, proposal, delta, design, tasks and plan); run `task verify --` with those exact paths and require passing documentation/content checks. Compare all pre-existing file hashes and staged diff bytes, allowing only the plan edit; confirm deleted navigation spec remains absent, main library nine/18 and identity 36/92 unchanged, and four prior changes remain active. Report exact outcomes and final content identity; static success is not runtime qualification.

## Workflow follow-up

- Approved and promoted under A51 (user “I approve, move to propotion”, 2026-10-15): exact seven requirements/13 scenarios appended to main recipe-library, now 16 requirements/31 scenarios. Existing Purpose and nine list requirements/18 scenarios retained verbatim. Change remains active; archival and successor discovery require separate authorization. Runtime qualification remains deferred.
- A34 defers implementation/database qualification; completed documentation tasks do not establish application acceptance or resolve historical member-creation evidence.
