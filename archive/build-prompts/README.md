# Build Prompts - Persistent Implementation Instructions

All implementation prompts for What's For Supper, organized by phase and session.

Each prompt is self-contained and designed to run in its own Claude Code session using **Claude 3.5 Sonnet**.

---

## Phase Overview

| Phase | Goal | Sessions | Status |
|-------|------|----------|--------|
| **Phase 0** | Recipe acquisition MVP | 10 sessions | 📝 In Progress |
| **Phase 1** | AI-powered recipe import | TBD | 🔄 Planning |
| **Phase 2** | Weekly meal planner + preferences | TBD | 🔄 Planning |
| **Phase 3** | Discovery/swipe UI + inspiration pool | TBD | 🔄 Planning |
| **Phase 4** | Calendar sync + planner integration | TBD | 🔄 Planning |
| **Phase 5** | Agents + real-time collaboration | TBD | 🔄 Planning |

---

## Phase 0: Recipe Acquisition MVP

10 sequential sessions to build onboarding + capture flow.

**Total time: ~9 hours distributed across 10 lean sessions**

| Session | Prompt File | Artifact | Time |
|---------|------------|----------|------|
| 1 | `phase-0/session-01-database.md` | `database/migrations/` | 30m |
| 2 | `phase-0/session-02-api-foundation.md` | `api/` project structure | 30m |
| 3 | `phase-0/session-03-api-endpoints.md` | Controllers, Services, DTOs | 60m |
| 4 | `phase-0/session-04-api-testing.md` | Unit + integration tests | 45m |
| 5 | `phase-0/session-05-pwa-setup.md` | Next.js + Tailwind config | 30m |
| 6 | `phase-0/session-06-pwa-core.md` | UI components + hooks | 60m |
| 7 | `phase-0/session-07-onboarding.md` | Identity + hints scaffold | 60m |
| 8 | `phase-0/session-08-localization.md` | i18n (English/French) | 45m |
| 9 | `phase-0/session-09-capture-flow.md` | Camera, rating, submit | 90m |
| 10 | `phase-0/session-10-integration.md` | Docker, E2E, docs | 60m |

**Start here:** `phase-0/session-01-database.md`

---

## How to Use These Prompts

### For Each Session

1. **Create new Claude Code session**
2. **Specify model:** Claude 3.5 Sonnet
3. **Copy the full prompt:** From the session file in this folder
4. **Execute:** Follow the prompt step-by-step
5. **Commit:** `git commit -m "session N: [artifact]"`
6. **Verify:** Run `task dev` and test locally
7. **Next:** Move to next session

### Between Sessions

```bash
# After completing a session
git status                    # Verify changes
task review                   # Pre-commit checks
git add .
git commit -m "session N: description of what was built"
git push

# Start new session (next day or whenever)
git pull                      # Get latest
# Start new Claude Code session with next prompt
```

---

## Adding New Phases

When a new phase is planned:

1. **Create phase folder:** `phase-N/`
2. **Create README.md:** Overview of phase goals
3. **Create session prompts:** `session-01.md`, `session-02.md`, etc.
4. **Update this README:** Add phase to table above
5. **Commit:** `git add src/build-prompts && git commit -m "docs: add Phase N build prompts"`

Use the `_template.md` as a starting point for new sessions.

---

## Template for New Sessions

See `_template.md` for the standard structure to use when creating new session prompts.

Key sections in each prompt:
- **Session Number & Title**
- **Artifact Description**
- **Context Needed** (what to read first)
- **What to Build** (step-by-step)
- **Success Criteria** (how to verify)
- **Prompt** (detailed instructions for Claude)

---

## Updating Prompts

If you find a prompt needs updates:

1. **Edit the file:** `phase-0/session-XX.md`
2. **Note the change:** Add comment at top with date
3. **Commit:** `git commit -m "docs: update session XX - [reason]"`

Keep git history clean so changes are traceable.

---

## Quick Commands

```bash
# View all Phase 0 sessions
ls phase-0/

# Start Phase 0 Session 1
cat phase-0/session-01-database.md

# View all phases (after Phase 0 complete)
ls phase-*/

# Search for a topic across all prompts
grep -r "Docker" .
grep -r "testing" .
```

---

## Phase 0 Context Files

These files are referenced by Phase 0 prompts:

- `src/specs/phase0-mvp.spec.md` — Requirements & specification
- `PROJECT_STRUCTURE.md` — Repository architecture
- `pwa/SRC_STRUCTURE.md` — PWA folder organization
- `Taskfile.yml` — Development commands
- `LOCAL_DEV_LOOP.md` — Development workflow
- `.env.example` — Environment variables
- `/Users/alex/.claude/plans/hidden-purling-gosling.md` — Hint system architecture (approved)

All Phase 0 sessions reference these files. Keep them updated as requirements evolve.

---

## Notes

- **Model:** Always use Claude 3.5 Sonnet for Phase 0-5 implementation
- **Context:** Each prompt is self-contained (~100k tokens)
- **Commits:** Commit after each session to keep history clean
- **Testing:** Run `task dev` and manual testing between sessions
- **Blocker:** If a session is blocked, document issue and move to next or create subtask

---

## Status Tracking

Track Phase 0 progress in this table:

- [ ] Session 1: Database schema
- [ ] Session 2: API foundation
- [ ] Session 3: API endpoints
- [ ] Session 4: API testing
- [ ] Session 5: PWA setup
- [ ] Session 6: PWA core components
- [ ] Session 7: Onboarding + hints
- [ ] Session 8: Localization
- [ ] Session 9: Capture flow
- [ ] Session 10: Integration

Update checkbox as you complete each session.

