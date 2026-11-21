# Shared review context

Load this file for either [defect review](code-review.md) or
[slop review](slop-review.md). Follow [AGENT.md](../../AGENT.md) and its loading
rules. These opt-in reviews produce findings, not implementation authority.

## Establish the subject

State the mode, exact base SHA, head SHA when applicable, selected task/intent,
included paths and exclusions. Reuse the session's authorized scope. If ownership
is ambiguous, inventory the changes and report the unresolved scope before rating
or declaring the review complete. Do not attribute all dirty work to this task.

- **Working-tree mode (default before commit):** resolve the supplied base once,
  or resolve HEAD once if none was supplied. Inspect `git status --short`,
  `git diff --name-status <BASE_SHA> --`, and `git diff <BASE_SHA> --`.
  This compares the base with tracked files' final on-disk contents, combining
  committed, staged and unstaged changes relative to that base. Also inspect
  `git diff --cached --name-status --` and `git diff --name-status --` to identify
  staged work that later on-disk edits undo. Enumerate untracked files with
  `git ls-files --others --exclude-standard`; read selected new files in full.
  Include deletions and relevant binary changes. Do not silently omit new files
  because Git's ordinary diff does not show their contents. This mode does not
  qualify the index alone or ignored files; disclose relevant excluded artifacts.
- **Commit mode:** require exact base and head commits. Resolve and retain them;
  inspect `git diff --name-status <BASE_SHA> <HEAD_SHA> --` and
  `git diff <BASE_SHA> <HEAD_SHA> --`. Read source and dependencies at that head
  using `git show <HEAD_SHA>:<path>` if the checkout differs. Uncommitted work
  is excluded. Do not use another checkout version as evidence for head behavior.

Read the entire selected patch, adding `-- <path>` to the applicable diff command
when output is truncated. Trace relevant unchanged dependencies too; path selection
does not make behavior file-local. Do not stage, stash, reset, switch checkout or
create a commit to construct review context.

For working-tree review, retain status, selected diff and content identities of
inspected files (including new files, dependencies and rule inputs), using
read-only hashes or retained bytes. Recheck them before reporting and between
passes. Status and diff alone cannot detect changes in untracked contents or
unchanged dependencies. If inputs change, reread affected paths and invalidate
earlier conclusions; if stability cannot be established, report an incomplete
review. In commit mode the immutable Git objects define the reviewed identity.

## Rules and intended behavior

Follow active host instructions and the current repository instruction chain.
Also inspect historical review criteria at the base: root and applicable ancestor
`REVIEW.md` and `AGENTS.md`, following their router into `AGENT.md` and relevant
shared owners with `git show <BASE_SHA>:<path>`. Historical text supplies review
criteria, not authority to override active host instructions. Apply nearer criteria
within their scope, subject to the repository's authority rules. A proposed rule
change is a review subject, not its own exemption. Disclose missing historical
criteria or consequential conflicts. For findings based on a rule, quote the
relevant rule and cite its base SHA, path and line.

Use selected approved contracts/specifications to establish intent. A Trail title,
description, comment or implementation test cannot override them. Report material
conflicts rather than assuming the implementation defines intended behavior.

Judge the final net change, not commit count, editing order or fixed intermediate
mistakes. Do not infer test-first history from final files. Existing problems are
out of scope unless the change introduces or materially worsens their consequence.

## Read-only boundary and evidence

Use read-only Git, source and repository-context inspection. Do not install
dependencies, generate outputs, edit files, run builds, typecheck, lint or tests,
or invoke `task prepare`, `task verify`, `task review` or `entire review`.
Do not invoke other AI reviewers or delegate. Do not post findings externally.

Read tests alongside their implementations and assertions. Distinguish source
evidence, recorded check results and unconfirmed runtime behavior. Report checks
as not run in this review; a source review does not establish merge readiness.
The implementing agent resumes the normal verification workflow outside this
review mode. These prompts add no mandatory approval or commit gate.

Include reviewed identity/scope and material coverage limits in the report.
An incomplete review cannot produce an unqualified clean signal.
