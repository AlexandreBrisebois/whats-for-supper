> **Superseded, unimplemented — 2026-11-07.** Do not apply this separate ingredient-candidate proposal. Its tasks remain unchecked as historical planning. Use canonical guarded import/reprocessing plus manual correction. Existing user recipe flags, Report/Review issue and eligible repair triggers remain supported, including their safety and retry safeguards. See [replacement foundation](../canonical-ingredient-correction/proposal.md). No archive or main-spec sync has occurred.

# Tasks — deferred

Do not activate automatically. Requires completed `canonical-ingredient-correction` and a later request selecting this optional retained-source repair scope. No stage 1/2 task depends on these tasks. No provider work or implementation is approved now. Named new suites below are future tests to create, not existing evidence.

## 1. Generate one selected candidate without live publication
**Outcome/scenarios:** ingredient-repair / Select source repair; Generate candidates; Validate evidence.
**Owners/boundaries:** additive POST `/api/recipes/{id}/ingredient-repair`, authorized candidate read, existing workflow status/source loaders/provider boundary and typed client. Selected line/source identities and captured revisions; no full re-import graph.
**Acceptance boundary:** actual workflow/API/PostgreSQL/file isolation; provider fixture only at external boundary.

- [ ] 1.1 Define OpenAPI request, operation/candidate responses, conflict/validation/failure semantics; run `task gen:client`. Add intended-red `IngredientRepairCandidatePostgresTests` and workflow cases covering known-plus-gap, salt/oil/no-action, missing evidence, wrong line/package, stale source and provider failure/cancel. Add method-sensitive POST/candidate GET/status mocks with durable attempt transitions; run `task test:database -- --filter FullyQualifiedName~IngredientRepairCandidatePostgresTests` before logic and retain observed behavioral red.
- [ ] 1.2 Implement selected source loading/generation/validation and staged persistence; run 1.1 green, affected workflow/API units, `task gen:client:check` and `task test:unit -- src/testing/mock-api.test.ts`. Verify current ingredients/basis/files/hero/instructions/household data are unchanged after successful, failed and canceled generation; invalid evidence never becomes accepted current facts. Record no provider call on reads/verification/startup.

## 2. Accept selected corrections through existing Edit and recover work
**Outcome/scenarios:** ingredient-repair / Accept corrections; Deliberate correction; Resume selected repair; Recover relationships.
**Owners/boundaries:** existing editor and stage 2 guarded PATCH, Search membership, attempt/candidate recovery and existing workflow status. No new dashboard or reading warning.

- [ ] 2.1 Add intended-red `IngredientRepairAcceptancePostgresTests`, editor units and `ingredient-repair-acceptance.spec.ts` for selected-field acceptance, concurrent human/source change, unrelated notes/rating, late worker, lost reply and independent reports. Implement typed candidate presentation and explicit acceptance with captured source/ingredient revisions, synchronizing OpenAPI/Kiota and stateful PATCH/GET/status mocks. Run the named database cases and browser file red→green; qualify actual generated-client/API/workflow/PostgreSQL acceptance with zero required skips, proving only accepted facts change and no stale worker wins.
- [ ] 2.2 Add intended-red `IngredientRepairRecoveryPostgresTests` for interrupted attempt/resume, unchanged-attempt deduplication, pending/stale candidates after full-fidelity restore and no automatic extraction. Implement only the candidate relationships/recovery extension; run those database cases and existing stage 2 recovery acceptance green with actual files and source revisions. Document restored states, explicit retry/revalidation and unchanged share 1.0 privacy boundary.

## 3. Final integration
- [ ] 3.1 Reconcile optional repair scenarios and stage 2 preservation boundaries, run applicable prepare/scope review and `task verify -- <complete reviewed paths>`, plus strict specs. Record provider-boundary fixtures separately from any separately authorized real-provider qualification, no current data loss and actual required seam outcomes. A candidate generated is not a correction saved or a downstream refresh completed.

## Workflow follow-up
- Keep deferred unless measured post-stage-2 correction effort warrants activation. Production repair execution/deployment and DV reset are separate actions.
