---
name: code-review
description: Opt-in read-only defect review of committed or uncommitted task changes before merge or commit.
---

# Defect review

Load [shared review context](review-context.md) first. Find introduced defects
the author would want to fix: bugs, regressions, broken invariants, data loss and
missing guards on paths the selected change adds or alters. Judge code, not authors.

## Trace and challenge

Read the whole selected diff, then trace each affected path through its real
callers, implementation and dependencies. Keep going after the first defect.
Look particularly for:

- Sequencing and partial failure: writes before fallible operations, inconsistent
  state, lost or orphaned work, early returns and cleanup that runs only on success.
- External/asynchronous state and values that can change between check and use.
- Composition, retries, concurrency and unknown outcomes. Report a race only with
  an interleaving the actual callers can produce.
- Source-established compile/type errors and logic wrong for reachable inputs.
- Relevant WFS seams: approved OpenAPI → Kiota → consumers and stateful mocks;
  server-owned policy, reconciliation/SSE and persistence where affected.

Before reporting, try to disprove the candidate. Read the triggering caller/input,
dependencies and guards. Trace the concrete path; never infer behavior from a name.

## Findings threshold

Report only discrete, fixable defects introduced or materially worsened by this
change, with real correctness, data, security or performance impact and a confirmed
trigger. Cite supporting callers, guards and configuration outside the finding's
lines by path and line. Respect specific documented exceptions within their scope;
existing weak code or a generic suppression comment does not exempt a new defect.

Exclude intended changes supported by approved scope/contracts, style, naming,
formatting, documentation-only issues, alternative designs and speculative inputs.
Missing tests alone belong to slop review unless an applicable review rule requires
them. Do not duplicate mechanical lint/format diagnostics; concrete correctness
defects remain reportable even if CI might catch them. Avoid findings on generated
or vendored output; trace defects to the changed source, contract, generator input
or integration that causes them and disclose cases where that origin is unresolved.
Security findings need a concrete reachable exploit path; speculative hardening
does not qualify. No praise or finding quota.

## Report

- **Signal: true** when at least one confirmed introduced defect remains.
  **Signal: false** when coverage is complete and none were found.
  **Signal: not assessed** when material gaps prevent that conclusion and no
  confirmed defect establishes true. A true signal may still have coverage gaps.
- Findings ordered by consequence, one per distinct cause. Anchor each to the
  changed line causing it, with a range of at most ten lines; name other occurrences.
  Give a concise title, severity and confidence, then one short paragraph explaining
  trigger, defect, impact, supporting references and smallest useful correction.
  Use at most three lines of code per finding.
- **High:** breaks an ordinary real path, loses/exposes data or creates a concrete
  security hole requiring correction before merge. **Medium:** a real defect under
  specific conditions or with limited impact. **Low:** a minor real defect.
  Do not confuse severity with certainty. Confidence must reflect a confirmed traced
  trigger; put unconfirmed candidates in limitations, outside the defect signal.
- Finish with reviewed identity/scope, coverage limits and checks not run.

On re-review, retain a previous finding only if it still applies to this net change.
It is fixed when current code removes its triggering path or incorrect consequence,
including a guard or caller correction elsewhere. A commit message is not proof.
