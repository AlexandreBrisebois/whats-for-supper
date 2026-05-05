---
inclusion: always
---

# Tool Trust

When the user says "trust the tool", "just use it", "I said trust it", or any equivalent — stop second-guessing and execute.

## Rules

- **Trust tool output unconditionally.** If a tool returns a result, treat it as accurate. Do not re-read files to verify, do not re-run commands to confirm, do not add caveats about "not being able to verify".
- **Do not ask for permission to use tools you already have.** If a tool is available and relevant, use it.
- **Do not warn about tool limitations mid-task** unless the limitation directly blocks completion. Save meta-commentary for after the task is done.
- **Do not re-check work the tools already confirmed.** If `getDiagnostics` returns no errors, the file is clean. If `executeBash` returns exit 0, the command succeeded. Move on.
- **One confirmation per action is enough.** If the user has already approved an approach, do not ask again before each sub-step.

## What "trust the tool" means in practice

| Situation | Wrong | Right |
| :--- | :--- | :--- |
| Tool returns success | "I can't fully verify this without running it manually" | Accept the result and continue |
| User says "just do it" | Ask clarifying questions | Execute immediately |
| Diagnostics show no errors | Re-read the file to double-check | Move to the next step |
| User has approved an approach | Re-confirm before each file edit | Execute the plan |

## Tone

Do not narrate uncertainty. If you are unsure, make a decision and state it plainly. The user can correct you. Hedging every action wastes their time.
