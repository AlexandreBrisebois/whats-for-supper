# Sync and archive — 2026-10-31

Alex explicitly authorized “Sync and archive specs I'll handle the device checks later”, followed by the authorized commit/push workflow. This archive contains only the original thirteen completed removal tasks. The three proposed F1 tasks and their proposal/design text were preserved verbatim in a separate local, unarchived draft at `docs/proposals/remove-unconsumed-search-metrics.md`; that draft is excluded from the completed-work commit. None of that follow-up is implemented, approved or marked complete. Independent search meters and ordinary logging remain.

The five observation capability documents were retired after their exact removal deltas removed all requirements and their remaining sections were only title/Purpose/Requirements. `standard-telemetry-export` now owns the four absence/preservation requirements and its explicitly approved retirement Purpose. Existing archived evidence and acceptance limitations remain unchanged.

Retired owners and Purposes:

- `anonymous-error-observation/spec.md`: minimized unexpected browser/Next failure evidence with correlation/delivery limits.
- `anonymous-navigation-observation/spec.md`: minimized route/surface evidence without business-success or identity claims.
- `anonymous-pwa-telemetry/spec.md`: opted-in anonymous first-screen evidence and bounded delivery.
- `native-technical-observation/spec.md`: minimized server timing/structure, not browser or durable-success evidence.
- `recipe-issue-observation/spec.md`: bounded issue Save/persistence/removal evidence, not reimport success.

Historical definitions remain recoverable from base commit `e4cd725dfbd0092667d04ddaa4062dea3846b843`, for example `git restore --source=e4cd725dfbd0092667d04ddaa4062dea3846b843 -- openspec/specs/anonymous-error-observation/spec.md` (and the corresponding other retired paths). This is recovery guidance, not an action performed in this session.

Physical-device checks are **deferred to Alex, not passed**. Existing source, synthetic browser/host, isolated PostgreSQL and static evidence is preserved in `implementation.md`; archived status adds no device, deployed-service, retention or external-consumer guarantee. No runtime source changed during lifecycle work. No deployment or credential/retention action was performed. Final lifecycle documentation and normal commit hooks must pass separately.
