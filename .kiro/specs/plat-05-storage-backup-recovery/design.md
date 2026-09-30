# Storage Backup and Recovery — Design

`ManagementService` serializes backup datasets and restores them through management operations/processors. It explicitly normalizes interrupted recipe-import-report state during restore. `ManagementController`, management DTOs/OpenAPI, ManagementService tests and management processor tests are evidence. This packet owns backup/recovery boundary, not domain-level conflict resolution.
