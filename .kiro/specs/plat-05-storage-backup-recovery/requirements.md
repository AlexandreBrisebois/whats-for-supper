# Storage Backup and Recovery — Requirements

## Status

**Implemented capability baseline.**

## Current behavior

- **PLAT-05-R1.** `ManagementService` exports/restores managed data, including recipe import reports, through management processors/routes and file-backed backup artifacts.
- **PLAT-05-R2.** Restore reconstructs stored entities; interrupted re-import reports are restored as reported rather than reimporting.
- **PLAT-05-R3.** Management/status APIs are the operator boundary; family UI does not treat backup completion as a household workflow outcome.

## Limits and boundaries

This is operational recovery, not user rollback or point-in-time transaction consistency. File availability and restore ordering affect recovery; workflow/capture/report semantics remain their owning packets. PLAT-02 owns management workflow execution.
