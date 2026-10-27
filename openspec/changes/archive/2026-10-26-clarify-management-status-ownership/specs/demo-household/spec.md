## REMOVED Requirements

### Requirement: Read latest management workflow diagnostics

**Reason**: Shared GET /api/management/status selection and result projection belong to data-backup-and-recovery, including selection across ordinary and demo workflows. This removes duplicate ownership without removing endpoint behavior.

**Migration**: Use data-backup-and-recovery requirement `Project the latest selected management result`. Move `Latest management selection` and `Completed task result` scenarios there verbatim. Retain demo-household requirement `Report snapshot-file and cron diagnostics with management status` and all its scenarios unchanged. Add the shared-owner reference and relocation note specified in design.md when applying; no caller, payload or runtime migration is needed.
