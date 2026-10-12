# Optional restaurant/plan notes — implementation evidence

Task session: `non-cooking-plan-notes`; baseline HEAD: `4d7931a44196714e952cedf6c79276db7ee14b6a`.
User authorization: reuse the exact We made plans message field for Order In/Eating out and remove No cook tonight.

## Scope review

The baseline worktree was clean. Reviewed all post-begin changes; no ambient paths or overlapping edits were present.

- `requirements.md`, `design.md`, `specs/openapi.yaml`: define optional preset notes, existing field reuse, validation and display.
- `api/database/schema.sql`, `api/database/compatibility.sql`: allow nullable or 1–80-character notes on order_in/eating_out; keep custom required and mystery label-free. Mark the constraint version so repeated compatibility application preserves it. No configured database was migrated.
- `ScheduleService.cs`: trim/persist optional notes, normalize blank notes to null, and enforce the existing Unicode scalar limit.
- API service, HTTP integration, PostgreSQL and management backup tests: cover notes, clearing, movement, limits, clean install/upgrade and backup restore. PostgreSQL tests use disposable databases only.
- `NonCookingDaySheet.tsx`: reuse the existing label, examples, styling and input for the three message-capable choices; only custom autofocuses/requires text.
- `nonCooking.ts`, Planner and Home: show optional preset notes beneath existing headings; remove No cook tonight; include Home note in the accessible name.
- PWA component/page and browser tests: cover same field, optional/required behavior, heading/note display, save/reload/edit/clear and Home reconciliation.
- Generated `models/index.ts`: manually synchronize only the unchanged DTO's description after generation timed out. No generated runtime shape or mapping changed.
- This evidence file records the bounded work and observed checks.

## Observed checks

Before implementation, focused PWA coverage had 10 expected failures and focused API coverage had 6 expected failures for absent fields/display and rejected preset notes.
After implementation, focused PWA tests passed 54/54 and focused service/HTTP API tests passed 29/29.

`task agent:prepare` failed when Kiota client generation exceeded its 20-second timeout. .NET 10 runtime is installed, but no successful generation is claimed. Affected PWA files were formatted separately; API formatting was invoked with an explicit affected-file list but its MSBuild host failed to bind a named pipe (SocketException 13, permission denied); formatting remains blocked.
Docker socket access is denied in this sandbox. Real PostgreSQL acceptance cannot be established here; `WFS_TEST_POSTGRES_CONNECTION` must point to an isolated admin connection to execute `NonCookingPostgresTests`. Configured production/development data was not changed.

The final automated command is `task agent:finish`. Its check statuses and tested content/runtime identity are recorded in the ignored `.task/agent-finish/last-run.json`. Read that record for the current attempt; this file does not predeclare broad validation success. Live endpoint parity, generated-client parity, real PostgreSQL behavior and mocked browser acceptance remain distinct evidence.


## Final observed status

The finish attempt tested identity `d50bb9309a49c0cb7ddfbb90f9d3914db3d676dff209814b25a7330855fe41a1`. Documentation, PWA formatting, typecheck, static routes/schema/mocks/API mapping, and content stability passed. Finish recorded lint, full unit/API and browser impact checks as failed (Task exit 201); client parity, live endpoints and database behavior were blocked. Do not treat that attempt as successful.

Follow-up diagnosis on the unchanged application code: `npm run test:unit` passed all 726 tests in 76 files. Full `dotnet test api/src/RecipeApi.Tests/RecipeApi.Tests.csproj --no-restore` aborted before tests because the VSTest TCP listener could not bind (SocketException 13, permission denied). Earlier focused API tests passed 29/29; that does not establish the full API or PostgreSQL results. Browser acceptance remains unverified. API formatting likewise failed at the sandbox named-pipe boundary. No sandbox escalation or database application was attempted.

Remaining local checks: `task agent:prepare`, followed by `task agent:finish`; execute `NonCookingPostgresTests` with `WFS_TEST_POSTGRES_CONNECTION` set to an isolated test admin connection. Apply the reviewed migration to the intended deployment database before using optional preset notes there. The generated DTO documentation was synchronized manually; actual generator parity remains blocked by its timeout.

This final status paragraph is a later documentation update; the finish identity above applies to the preceding source and evidence content, not this added paragraph.
