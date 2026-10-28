# Tasks

**Local implementation explicitly approved after draft review.** Keep the correction separate from cooking and preserve the index.

## 1. Correct the advertised Find destination

**Outcome and scenarios:** “Read shortcut destinations,” “Find goes to recipe search,” “Shortcut destination requires household entry” and “Preserve Capture and member selection.”
**Owners and boundaries:** Base manifest destination, existing install-identity browser test and household/member gates; no new route, server policy or generated API work.
**Dependencies and prerequisites:** Post-draft application confirmation, current branch/overlap recheck and a qualified isolated local browser runner. Preserve parallel cooking/Profile work.
**Acceptance boundary:** Read the server-produced manifest and exercise existing entry handling. Local browser assertions do not certify an installed Android launcher refresh.

- [x] 1.1 Update the focused destination regression in `pwa/e2e/install-identity.spec.ts` to expect `['/recipes', '/capture']`, preserving names/icons/identity and entry-gate assertions. Run `task test:e2e -- install-identity.spec.ts --grep 'public install metadata'` against an isolated server and observe the intended `/discovery` versus `/recipes` failure before changing the manifest.
- [x] 1.2 Change only Quick Find's URL in `pwa/src/lib/baseManifest.json`, retain Capture/copy/icons, and rerun the same check green. Extend the existing entry test only if necessary to prove no-household and missing-member recovery plus authorized recipe-search entry; verify with `task test:e2e -- install-identity.spec.ts` and record what actually ran.

## 2. Final integration and verification

- [ ] 2.1 Reconcile scenario evidence, inspect the complete task-owned diff and run applicable scoped preparation/verification through the shared harness using the reviewed manifest/test/change paths. Record actual statuses and any concurrency blockers; preserve canonical specs until the authorized lifecycle step, and do not stage/commit/push/deploy without authorization.

## Specification and application evidence

The manifest destination and focused regression were modified after explicit post-draft approval. Canonical specs remain unchanged until the normal lifecycle. Strict change/documentation validation and observed runtime results are reported below.


## Applied evidence

The destination assertion first failed against `/discovery` in `.task/cooking-original-source/shortcut-red.log`. The one-field manifest correction is green in the 44-test combined run (`qualified-browser.log`), including all install-identity scenarios. The new server-request entry checks exercise both advertised destinations without access, with household access but no member, and with both accepted cookies. They do not qualify an installed Android launcher refresh. Capture/copy/icons/identity remain unchanged; normal Discovery navigation is not edited. Preparation, strict OpenSpec validation, whitespace/scope review and aggregate invocation include the complete reviewed path set; aggregate status/record_path are reported at delivery. The first aggregate exposed a cooking viewer locale-key issue, repaired without touching this shortcut behavior.

The repaired broad run also passed all five install-identity cases. Its overall result remains unqualified: 40 other cases lost the local server, three unrelated-path cases failed and Home passed on retry. The wrapper has no terminal final record; API/contract completion is not established. Task 2.1 remains open for a stable aggregate qualification, not for a further shortcut behavior change. See the cooking task's terminal aggregate checkpoint for evidence paths and limits.

The supervised full retry has a terminal record (`.task/agent-finish/runs/fff4a17583ae48d7a84686e4d0901f0e.json`): server healthy through gate exit, then owned cleanup. All five install-identity cases passed. Its broad browser result was 542 passed, four failed, 47 skipped and five flaky; API/static contract checks passed. A cooking footer/status interception found there was subsequently repaired, and all 54 focused cases—including Find/Capture—pass on the final code. The complete cooking task's 208-case gate also passes. Shortcut code is unchanged through these repairs. The broad full gate is not declared green; the two Browse All and Capture failures remain separate unresolved triage, with no baseline claim.
