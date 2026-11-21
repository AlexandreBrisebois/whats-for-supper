---
name: slop-review
description: Opt-in read-only assessment of avoidable complexity, weak tests and repository fit in a task's final diff.
---

# Implementation quality review

Load [shared review context](review-context.md) first. Be a strict reviewer of
avoidable, low-trust work that creates bugs, review burden or maintenance work
because the implementation does not understand the repository. Judge the final
code, not who wrote it or how messy its iteration was.

## Understand before rating

Establish the intended behavior and trace every affected workflow, route, state
change and rule through the relevant boundaries. Read nearby established patterns
and tests. Check whether tests prove behavior rather than mirror the implementation
or new text, including relevant side effects, failure/recovery and real seams.
Mocked browser coverage is not API/database qualification. Missing execution during
this read-only review is not itself slop or proof that the author skipped checks.

Look for wrong assumptions, broken flows, bypassed rules, duplicate systems,
important behavior with weak checks, needless complexity and scope much larger than
its result. Inspect dead code, unused helpers, abandoned approaches, stale comments
and comments that repeat obvious code or narrate the editing history.

For WFS, check server-owned policy, generated-client/contract/mock agreement,
shared state reconciliation, persistence and failure recovery where affected.
Use established patterns as evidence of a simpler option, not as unquestionable
design authority. Explain why a proposed simpler approach preserves required behavior.

Necessary complexity is not slop. Diff size, commit count and stylistic preference
are not evidence. Do not charge the change for existing nearby problems or inflate
a rating because of several minor issues. Consolidate symptoms with one cause.

## Signal

Weigh severity, prevalence and avoidability together:

- **Low:** no real slop, or isolated small issues that do not weaken the main approach.
- **Medium:** a central wrong assumption, repeated low-trust work, weak checks for
  important behavior or meaningful avoidable rework. The core remains repairable.
- **Large:** problems are widespread, the core approach is wrong or misleading,
  and substantial implementation should be rewritten or removed.

## Report

Start with **Signal: Low | Medium | Large**. If material coverage gaps prevent a
defensible rating, use **Signal: not assessed** and explain the blocker.

Give the two strongest independent reasons, supported by concrete behavior,
architecture or test problems. If fewer exist, say so; do not invent a second.
Explain severity, prevalence and the established simpler option where relevant.

Report every concrete problem supporting the rating as a finding, ordered by
consequence and anchored to the changed code with the smallest useful line range.
Explain the trigger/evidence, impact and smallest useful correction. Keep uncertain
hypotheses separate from confirmed findings. Findings may be empty for Low.

If defect review already reported the same cause for the same source identity,
reference that finding instead of duplicating its body. A defect signal and a slop
rating measure different things; one serious defect need not imply widespread slop.

Finish with reviewed identity/scope, coverage limits and checks not run.
