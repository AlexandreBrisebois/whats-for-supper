# HM-B specification workflow evidence

Date: 2026-09-10. Status: implemented for review, host qualification **unqualified**.
Only HM-B was selected. HM-C has not begun.

## Authorization, scope and preservation

The current user request authorized workflow/template, writer/reviewer, active
procedural caller migration (including retained orchestration planning links),
three skill retirements and registry updates. Baseline HEAD remains
`13fcddedffa9c2a07b2498afb530e7906394b006`.

All 15 existing manifest entries permitting HM-B touches matched their frozen
baseline hashes before editing. The worktree already contained HM-A tracked edits,
new ontology/home-E2E files and the untracked specification package. They were
preserved: all HM-A content identities still match, and every unrelated manifest
artifact matches baseline. HM-A evidence is unchanged historical evidence; its
unavailable host probes remain unqualified. No host/global memory was changed.

[Candidate identities](hm-b-content.json) cover the HM-B diff and evidence/checkers.
The frozen manifest and evaluation fixtures remain unchanged. The new candidate
checker verifies scope, HM-A preservation, unrelated manifest artifacts, active
retirement references, changed links, 16 registered skills and 15 copied CNF routes.
It does not claim all legacy links in retained implementation skills are repaired.

## Migration closure

| Source | Useful content destination | Deliberately removed |
|---|---|---|
| shared-understanding | Shared workflow Establish/Review; existing context-loading owner reused unchanged | Compulsory interviews, all-branch approval and turn-end memory writing |
| prompt-planner | Shared workflow Write/Review decomposition, dependencies, ownership and context | Brand tiers, universal orchestration, artificial seam/file limits and conflicting spec location |
| create-prompt | Execution-packet required contract and optional guidance | Engine-only format, forced model selection, layer-first split and prescriptive expansion |

The three entrypoints were removed only after content and incoming callers moved.
Writer/reviewer now route to shared owners, including procedures formerly delegated
to skills retired in later slices. Review can end with findings only. Non-UI work
has no UI requirement. Consequential unknowns still block dependent work; routine
choices use evidence and existing authorization persists.

Active updates: skills registry; specs README; CNF cross-spec requirements/design
and all 15 standalone kickoff blocks; CNF ingestion completion caller; public
Synology workstream packet guidance. Retained team-orchestration changes only its
two planning caller lines; implementation/delegation retirement remains HM-C.
Registry lists all 16 remaining entries with actual discovery names, including
aws-well-architected. Final ten-skill consolidation remains HM-E.

Reviewed but unchanged: public Synology design has no affected active procedural
caller; ROADMAP kickoffs are historical. Product decisions, resolved CNF branches,
release tasks and dependencies were preserved. Historical manifest mentions remain
as provenance, not active discovery.

The package validator now checks frozen manifest caller/existing-destination paths
at the recorded baseline commit. Checking their current existence would incorrectly
reject authorized retirements. Candidate existence and retirement closure are
checked separately by the HM-B checker. HM-A's old scope checker is preserved;
its “only HM-A changed” assertion is no longer applicable after selecting HM-B.

## Actual validation

| Check | Result and limit |
|---|---|
| `python3 .kiro/specs/harness-modernization/evaluation/check-specification-workflow.py` | Passed: three retirements, 16 skills, active references/changed links, 15 standalone CNF prompts, preservation and candidate scope/identity. Static checks do not prove model behavior. |
| `python3 .kiro/specs/harness-modernization/evaluation/validate-package.py` | Passed: 143 baseline artifacts, 33 target fingerprints, 14 requirements, seven acyclic tasks, eight scenarios, 37 payload hashes; package parsing/links and Python syntax. Not a full JSON Schema validator. |
| `task test:agent` | Passed: all 11 harness tests. Does not test native loading or product behavior. |
| `git diff --check` | Passed. New documents/checkers also covered by package/candidate checks. |
| Direct, writer, reviewer, generated-packet invocations | Passed session-level exercises; [inputs and actual outputs](hm-b-invocations.md). Two read-only subagents explicitly loaded candidate files; no independent fresh host/model trial. |
| Two read-only reviews | Caller reviewer found copied CNF prompts needed inline qualification; corrected in all 15 and re-reviewed as closed. Semantic reviewer found no blocking issue in workflow/reviewer/template. |
| HM-A host probes / HM-Q qualification | Not run, unqualified; no inference from file links, subagent exercises or installed tools. No token/latency improvement claim. |
| Application/live DB tests and `task agent:finish` | Not run for this selected documentation/procedural slice. Taskfile inspection shows finish invokes impact → drift → review; review stops shared processes and formats/generates unrelated application artifacts. HM-B uses its explicit reference/invocation checks plus harness regression tests. No completion-tool policy was rewritten; broad finish behavior remains HM-D work. |

## Stop

Review this diff and evidence. HM-B is `implemented-unqualified`; that status does
not qualify HM-A native probes or adopt the harness. No HM-C work, product changes,
commit, push, deployment or model benchmark occurred.
