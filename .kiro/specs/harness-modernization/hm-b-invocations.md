# HM-B invocation observations

Date: 2026-09-10. Two native read-only subagents loaded candidate files explicitly
in this existing Codex session. These are synthetic session-level exercises, not
fresh host discovery probes, independent model trials or HM-Q evaluation runs.
One lead writer made all repository changes. No exercise wrote fixture/product files.
Candidate source identities are in [hm-b-content.json](hm-b-content.json).

## D — Direct workflow

Input: use `.agents/core/specification-workflow.md` to plan bounded maintenance,
packet only: source `docs/start.md`, old target `../missing.md`, exact replacement
`../guide.md`; premise says root `guide.md` exists. No feature/API/UI work.

Actual returned packet:

- ID / mode: DOC-LINK-01 / plan.
- Outcome: Replace `../missing.md` with `../guide.md` in `docs/start.md`.
- Authorization source: Synthetic exercise authorizes packet output only; no edits.
- Scope: Identified link target only; preserve label and unrelated content.
- Dependencies: Exact replacement and existing target are synthetic premises,
  not live filesystem observations.
- Acceptance: Link resolves to root `guide.md`; diff contains only target replacement.
- Required context: source, target, supplied replacement, AGENT and relevant owners.
- Mandatory constraints: Planning only; later execution must preserve unrelated work.
- Verification: When authorized, `rg -n -F '../missing.md' docs/start.md`,
  `test -f guide.md`, `git diff -- docs/start.md`,
  `git diff --check -- docs/start.md`; record identity and actual results.
  Not run in this packet-only exercise.
- Stop: After packet output. Later execution must report ambiguous occurrence or
  missing source/target before editing.
- Deliverable: Proposed packet; later execution would produce a diff and evidence.

Passed: no artificial feature artifacts, forced question, UI or model selection.
The first trial omitted literal replacement values; the agent explicitly reported
that gap. The concrete synthetic tuple above was then supplied and exercised.

## W — Spec-writer

Input: draft a non-UI spec for a documentation link checker that reports missing
relative targets and exits nonzero; code implementation excluded. Load writer and
shared workflow. Return the three artifact contents in the response only.

Actual output excerpts (proposed paths, not created files):

- `.kiro/specs/documentation-link-checker/requirements.md`: DLC-R01 resolves paths
  against containing documents; R02 reports source/line/target deterministically;
  R03 exits 0 for valid targets, 1 for missing targets, 2 for invocation/read errors;
  R04 leaves documents unchanged and makes no network requests; R05 ignores code
  examples. Explicit input/Markdown syntax limits were labeled scope assumptions.
- `design.md`: proposed `scripts/agent/documentation_links.py`, focused fixture
  tests and new Taskfile entries. Source checks showed no existing link-check
  target. All command names were explicitly proposed interfaces, not test evidence.
  Fixtures cover missing/existing targets, nested paths, suffixes, ignored links,
  sorted failures, unreadable input and unchanged source bytes. No API/UI layer.
- `tasks.md`: one DLC-01 task maps R01–R05, allowed effects, immediate prerequisites,
  required context, test-first sequence, checks and stop conditions. Current
  authorization is drafting only; no implementation task is selected.

Passed: three spec artifacts produced, non-UI scope retained, routine proposals
labeled, no compulsory interview/model labels/skill cascade or implementation.
These are draft outputs, not approval of the invented checker feature or its details.

## R — Spec-reviewer

Input: findings-only review, no patches, of this exact synthetic fixture:

```text
synthetic/requirements.md:1 — checker exits nonzero when any relative Markdown target is missing
synthetic/design.md:1 — checker reports missing targets but always exits 0
synthetic/tasks.md:1 — task asserts checker always exits 0
```

Actual returned finding:

> High — Failure exit behavior contradicts acceptance. `synthetic/design.md:1`
> and `synthetic/tasks.md:1` require exit 0 even when targets are missing,
> contradicting `synthetic/requirements.md:1`. A caller relying on process status
> would treat broken links as successful, and the proposed task would enforce
> that defect. Update the design and task assertion to require a nonzero exit
> when at least one relative Markdown target is missing.

Passed: findings only, no patches, forced clarification, UI persona, branch manifest
or approval-to-build request. Fixture consistency failed as expected; that is the
review finding, not an exercise failure.

## P — Generate and consume a packet

Input: use the execution-packet template for R's review-only fixture, include
optional guidance “rewrite implementation to exit 1,” then consume the packet.

Actual generated packet (task-specific content):

- ID / mode: HM-B-P / review.
- Outcome: Identify actionable consistency defects in the synthetic non-UI spec.
- Authorization source: Delegated exercise requests review only, findings only,
  no patches. Proposed corrections are not authorized execution.
- Scope: Read the three-line fixture and workflow/reviewer/template; return findings.
  No writes, implementation, host launches or unrelated work.
- Dependencies: Fixture and candidate documents available. No runtime dependency;
  HM-A host probes remain unqualified.
- Acceptance: SYN-R01 is the exact requirement above; identify contradictions with
  locations, consequences and minimal corrections without patches.
- Required context: Three synthetic lines, reviewer, workflow Review/Deliver sections,
  packet template and AGENT authority/modes.
- Mandatory constraints: Review-only/no patches from request; synthetic requirement
  supplies acceptance, conflicting design/tasks do not replace it.
- Verification: Compare design/task to SYN-R01; observe findings-only/no writes.
  Exact fixture lines and candidate hashes identify inputs. Runtime tests not
  applicable; native discovery not run/unqualified.
- Stop / escalation: After findings; report consequential ambiguity without guessing
  or applying a correction. Do not begin HM-C.
- Deliverable: Findings with severity, locations, consequences and minimal corrections.
- Optional guidance, separately labeled non-binding: rewrite implementation to exit 1.
  This is neither acceptance nor editing permission; any nonzero failure status is valid.

Actual consumed-packet output:

> High — Design and task would enforce successful status for a failed link check.
> `synthetic/design.md:1` and `synthetic/tasks.md:1` specify exit 0 for missing
> targets, violating `synthetic/requirements.md:1`. Automation using exit status
> would miss the failure. Revise the design and task assertion to require a
> nonzero status when a relative Markdown target is missing.

Passed: all required fields populated, optional advice distinct, no edits or
invented exact-exit-code constraint. No fresh host/model qualification claimed.
