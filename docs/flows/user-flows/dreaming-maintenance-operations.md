# Flow: Dreaming Maintenance Operations

This flow describes how an operator understands and intervenes in the recurring Dreaming maintenance cycle.

Dreaming is intentionally quiet. A family member should not have to think about it during normal meal planning. It exists for system health: prune old workflow history, trigger backup, write a report, and schedule the next run.

## Normal nightly flow

```mermaid
sequenceDiagram
    autonumber
    participant API as API startup / worker
    participant Dreaming as dreaming workflow
    participant Backup as db-backup workflow
    participant DataRoot as DATA_ROOT
    actor Operator

    API->>Dreaming: Seed first scheduled instance if none active
    Dreaming->>Dreaming: Prune old terminal workflow history
    Dreaming->>Backup: Start db-backup workflow
    Backup->>DataRoot: Flush backup artifacts to disk
    Dreaming->>DataRoot: Write reports/dreaming-yyyy-MM-dd.md
    Dreaming->>Dreaming: Start next dreaming instance with scheduled root task
    Operator->>DataRoot: Optionally review latest Markdown report
```

## Operator check flow

The operator checks Dreaming when something feels off, after deployment, or as part of routine maintenance.

```mermaid
flowchart TD
    A[Operator opens DATA_ROOT/reports] --> B{Latest dreaming report exists?}
    B -->|Yes| C[Read summary]
    B -->|No| D[Check workflow telemetry for dreaming]
    C --> E{Failed workflows listed?}
    E -->|No| F{Keep an eye on these list empty?}
    E -->|Yes| G[Inspect failed workflow instance and task errors]
    F -->|Yes| H[No action needed]
    F -->|No| I[Inspect stuck workflow instances]
    D --> J{No pending or processing dreaming instance?}
    J -->|Yes| K[Trigger dreaming through generic workflow API]
    J -->|No| L[Wait for scheduled_at or inspect task failure]
```

## Manual trigger path

Dreaming does not have a custom public endpoint. It uses the existing generic workflow trigger API like every other workflow.

```http
POST /api/workflows/dreaming/trigger
Content-Type: application/json

{
  "parameters": {}
}
```

Use this when:

- validating a deployment,
- restoring a broken recurring chain,
- forcing an immediate maintenance pass after a large workflow migration.

Do not use manual triggering as the normal schedule. The final Dreaming task owns scheduling the next instance.

## Human-readable states

| Observation | Meaning | Operator action |
|-------------|---------|-----------------|
| Latest report exists and has no failed/stuck workflows | Dreaming is healthy | None |
| Report lists failed workflows | Some workflow reached terminal failure in the last 24h | Inspect workflow task error messages |
| Report lists "Keep an eye on these" | Workflow is pending/processing longer than expected | Check whether task is legitimately scheduled or stuck |
| No recent report and no active `dreaming` instance | Self-reschedule chain likely broke | Trigger `dreaming` through generic workflow API |
| `dreaming` task failed on `reschedule` | Next run was not scheduled | Fix failure cause, reset/trigger workflow |

## UX principle

Dreaming is operational, not household-facing. It should not interrupt Home, Planner, Search, or Cook's Mode. Its visibility belongs in reports and workflow telemetry until a future admin dashboard exists.
