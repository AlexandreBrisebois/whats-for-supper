# Opt-in review prompts

For a self-check before committing, ask:

> Review my current task's uncommitted work using
> `.agents/prompts/code-review.md`, then `.agents/prompts/slop-review.md`.
> Use HEAD as the base. Review only this task's changes. Report findings;
> do not fix, stage or commit anything.

Both prompts load [review context](review-context.md). The agent resolves HEAD
once, inventories staged, unstaged and untracked changes, and states the task
scope before reviewing. No context packet or temporary commit is required.
Supply paths or the selected OpenSpec tasks when the session does not already
identify your work. In a dirty shared file, paths alone do not establish ownership.

This checks the final working-tree result, including staged changes as they
currently appear on disk. It is not a staged-only review of the next commit.
To include already committed branch work, supply the exact earlier diff-base SHA.
For a committed change, supply exact base and head SHAs and request commit mode.
Never substitute the latest base-branch tip for an established diff base.

Use either prompt alone when only defects or implementation quality matter.
These are sequential read-only passes the current agent can perform itself.
Self-review is not an independent review or a substitute for required verification.
Fixes remain a separate implementation step within the authorized task; after
fixes, review the updated result and complete the applicable verification.
