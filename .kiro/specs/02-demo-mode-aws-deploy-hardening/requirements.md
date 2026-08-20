# Demo Mode AWS Deploy Hardening Requirements

## Vision
Deploying with `DEMO_MODE=true` on AWS must produce a predictable showcase environment: startup succeeds, scheduled reset is live, user-visible demo constraints are coherent, and no silent misconfiguration can degrade the demo experience.

## Pre-Mortem (Dead Ends and Blind Spots)
If this shipped and failed, the likely failures would be:

1. Database credentials diverged between RDS, migrator, and API, causing startup failures before demo workflows can run.
2. `demo-restore` seeded successfully but repeatedly failed because no master snapshot existed in `DATA_ROOT/demo/`.
3. Demo UI blocked agent search but left photo search enabled, producing recurring "busy" behavior with no clear user explanation.
4. Invalid `DEMO_RESTORE_CRON_UTC` silently disabled reset scheduling.
5. `DEMO_MODE` parsing accepted only exact `true`, leading to accidental non-demo runtime with no explicit startup warning.

## Product Decisions
1. Demo deploy safety is enforced as a contract with explicit startup diagnostics, not as documentation-only guidance.
2. Missing demo snapshot is treated as an operationally visible failure mode with clear status exposure.
3. In Demo Mode, all AI-costing entry points are coherently disabled or redirected with explicit user-facing messaging.
4. AWS credential wiring is unified through one authoritative secret path for DB user/password.
5. Cron and demo-mode environment parsing must fail loudly enough to be observable in deployment verification.

## Acceptance Criteria

1. **[AC-1] Unified AWS DB Credential Contract**
   - AWS infrastructure code defines one canonical DB credential source used by:
   - API runtime connection string construction.
   - Migration task connection/authentication.
   - Database initialization user provisioning.
   - A deploy-time validation test (or synth-time assertion) fails when usernames or password sources diverge.

2. **[AC-2] Demo Snapshot Readiness Signal**
   - API exposes a deterministic management status field indicating whether demo snapshot is complete (`manifest.json`, `family-members.json`, `recipes.json`, `recipe-search-documents.json`).
   - When missing, status response includes a machine-readable reason code.
   - No destructive restore action runs when snapshot is incomplete.

3. **[AC-3] Coherent Demo AI Surface Policy**
   - In `DEMO_MODE=true`, every user entry point that depends on blocked AI behavior is either:
   - disabled in UI, or
   - allowed but returns a deterministic demo-mode response mapped to explicit user notice.
   - Photo search behavior in demo mode is explicitly defined and tested.

4. **[AC-4] Cron Validation and Observability**
   - Invalid `DEMO_RESTORE_CRON_UTC` is reported in startup diagnostics and management status.
   - System behavior is deterministic: no silent success when restore seeding failed.

5. **[AC-5] Demo Flag Parsing Contract**
   - Accepted values for demo mode are explicitly defined and tested.
   - Invalid values generate explicit startup warning with the exact received value.

6. **[AC-6] Deterministic Verification Path**
   - Automated tests cover:
   - startup seeding behavior with fixed clock,
   - missing snapshot status,
   - demo UI state for agent/photo features,
   - AWS config parity checks.
   - E2E assertions use only `data-testid` selectors.

## Glossary
- **Demo Snapshot**: Master state in `DATA_ROOT/demo/` used by restore workflow.
- **Demo Restore Seeder**: Startup seeding of `demo-restore` workflow when demo mode is enabled.
- **Coherent Demo Surface**: User-facing behavior where all AI-disabled features are consistently communicated and testable.
- **Canonical DB Credential Source**: Single secret/user definition shared across RDS, migrator, and API runtime.
