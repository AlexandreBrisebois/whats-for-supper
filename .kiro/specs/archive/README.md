# Archived Kiro specifications

Everything in this directory is retired from active execution. It includes completed work, old drafts, historical bug reports, and superseded plans. Archive placement does not certify that every original acceptance criterion shipped.

Read a specific entry only for historical context. Its original unchecked boxes, "Pending" phases, "Start here" prompts, model assignments, and validation commands remain a record of that time, not an active backlog. Current authority comes from `specs/openapi.yaml`, repository doctrine, and the approved active spec. Use the current Taskfile for authorized work.

Do not automatically resume, complete, or revalidate archived tasks. If the user wants to reopen an idea, establish its current scope in an active spec and verify the relevant implementation first. Historical paths and technical descriptions may be obsolete even where the link still resolves.

See [AGENTS.md](AGENTS.md) for agent handling rules and the [legacy archive](../../../specs/05_ARCHIVE/README.md) for older specs and build prompts.

## Audit findings — 2026-09-08

- Reviewed all 138 Markdown documents and 22 `.config.kiro` metadata files across 53 entries. One entry (`planner-ux-hardening`) contains metadata only.
- Added a historical-reference notice to every document, including design and requirements files that can be opened without their task list.
- Preserved historical checkboxes and validation evidence. Some documents say all tasks are checked while associated requirements still contain unchecked criteria; these are historical records, not a current completion audit.
- `semantic-recipe-search-draft` is the earlier search plan; the v2 revision explicitly expands it. Both are archived. Neither should be reopened automatically.
- `next messages.md` contains old planner follow-up questions, not an instruction to start another task.
- Corrected the archived `dev-loop-optimization` metadata status from `In Progress` to `Archived`. Other Kiro identifiers remain historical metadata, not current task routing.
- Repaired resolvable archived-spec references and marked incoming flow-document references as historical. Old implementation paths and obsolete commands were retained as evidence, not modernized into runnable prompts.

## Inventory

The notes describe the recorded documents, not verified current implementation. "Unchecked markers" may be task, acceptance, validation, or example checkboxes; they do not assign work.

| Archived entry | Documents | Historical record notes |
| --- | ---: | --- |
| [00-live-schedule](00-live-schedule/tasks.md) | 3 | Checked markers recorded; current behavior not re-audited |
| [capture-describe-entry](capture-describe-entry/tasks.md) | 3 | Checked markers recorded; current behavior not re-audited |
| [capture-duplicate-detection](capture-duplicate-detection/tasks.md) | 3 | Checked markers recorded; current behavior not re-audited |
| [cook-mode-enhancements](cook-mode-enhancements/tasks.md) | 3 | Checked markers recorded; current behavior not re-audited |
| [cook-mode-steps-display](cook-mode-steps-display/tasks.md) | 3 | Checked markers recorded; current behavior not re-audited |
| [demo-mode](demo-mode/tasks.md) | 3 | Checked markers recorded; current behavior not re-audited |
| [dev-loop-optimization](dev-loop-optimization/tasks.md) | 3 | 6 unchecked markers retained; not active work |
| [discovery-vote-visual-simplification](discovery-vote-visual-simplification/tasks.md) | 3 | Checked markers recorded; current behavior not re-audited |
| [dreaming](dreaming/tasks.md) | 3 | Checked markers recorded; current behavior not re-audited |
| [e2e-route-handler-regression](e2e-route-handler-regression/tasks.md) | 3 | 2 unchecked markers retained; not active work |
| [e2e-test-audit](e2e-test-audit/tasks.md) | 3 | Checked markers recorded; current behavior not re-audited |
| [e2e-test-failures](e2e-test-failures/tasks.md) | 3 | Checked markers recorded; current behavior not re-audited |
| [fix-family-goto-settings-reactivity.md](fix-family-goto-settings-reactivity.md) | 1 | Historical description; no checkbox completion record |
| [grocery-item-check-off-404](grocery-item-check-off-404/bugfix.md) | 1 | Historical description; no checkbox completion record |
| [grocery-reclassification](grocery-reclassification/tasks.md) | 3 | 1 unchecked markers retained; not active work |
| [grocery-section-categorization](grocery-section-categorization/tasks.md) | 3 | Checked markers recorded; current behavior not re-audited |
| [health-service-extraction](health-service-extraction/tasks.md) | 3 | 21 unchecked markers retained; not active work |
| [hero-image-webp-migration](hero-image-webp-migration/tasks.md) | 3 | 1 unchecked markers retained; not active work |
| [high-fidelity-sharing](high-fidelity-sharing/tasks.md) | 3 | 11 unchecked markers retained; not active work |
| [home-command-center-hardening](home-command-center-hardening/tasks.md) | 3 | 5 unchecked markers retained; not active work |
| [home-empty-state-ux](home-empty-state-ux/bugfix.md) | 1 | Historical description; no checkbox completion record |
| [home-recovery-flow-hardening](home-recovery-flow-hardening/task.md) | 3 | 3 unchecked markers retained; not active work |
| [home-today-sync](home-today-sync/bugfix.md) | 1 | Historical description; no checkbox completion record |
| [image-caching-fix](image-caching-fix/tasks.md) | 3 | Checked markers recorded; current behavior not re-audited |
| [phase-12-no-menu.md](phase-12-no-menu.md) | 1 | 30 unchecked markers retained; not active work |
| [phase-13-goto-synthesis.md](phase-13-goto-synthesis.md) | 1 | 1 unchecked markers retained; not active work |
| [phase-14-ux-hardening.md](phase-14-ux-hardening.md) | 1 | 24 unchecked markers retained; not active work |
| [planner-consolidation](planner-consolidation/tasks.md) | 3 | Checked markers recorded; current behavior not re-audited |
| [planner-drag-debounce](planner-drag-debounce/tasks.md) | 3 | Checked markers recorded; current behavior not re-audited |
| [planner-enhancements](planner-enhancements/tasks.md) | 3 | Checked markers recorded; current behavior not re-audited |
| [planner-recipe-actions-clarity](planner-recipe-actions-clarity/tasks.md) | 3 | 1 unchecked markers retained; not active work |
| [planner-ux-hardening](planner-ux-hardening/.config.kiro) | 0 | Metadata only; no spec documents |
| [planner-voting-ux](planner-voting-ux/tasks.md) | 3 | Checked markers recorded; current behavior not re-audited |
| [planner-week-voting-actions](planner-week-voting-actions/tasks.md) | 3 | Checked markers recorded; current behavior not re-audited |
| [recipe-categorization](recipe-categorization/tasks.md) | 3 | Checked markers recorded; current behavior not re-audited |
| [recipe-detail-action-labels](recipe-detail-action-labels/tasks.md) | 3 | 18 unchecked markers retained; not active work |
| [recipe-detail-image-import-actions](recipe-detail-image-import-actions/tasks.md) | 3 | 17 unchecked markers retained; not active work |
| [recipe-duplicate-and-grocery-reclassification](recipe-duplicate-and-grocery-reclassification/tasks.md) | 3 | Owner-confirmed complete and archived 2026-09-08; actual gate recovery recorded |
| [recipe-import-reporting](recipe-import-reporting/tasks.md) | 3 | Checked markers recorded; current behavior not re-audited |
| [recipe-photo-import](recipe-photo-import/requirements.md) | 1 | Historical description; no checkbox completion record |
| [recipe-share-and-capture](recipe-share-and-capture/tasks.md) | 3 | Checked markers recorded; current behavior not re-audited |
| [recipe-stack-browse](recipe-stack-browse/tasks.md) | 3 | 5 unchecked markers retained; not active work |
| [remove-backend-proxy](remove-backend-proxy/tasks.md) | 3 | 1 unchecked markers retained; not active work |
| [semantic-recipe-search-draft](semantic-recipe-search-draft/tasks.md) | 3 | Earlier draft; see archived semantic-recipe-search-v2 |
| [semantic-recipe-search-v2](semantic-recipe-search-v2/tasks.md) | 3 | Checked markers recorded; current behavior not re-audited |
| [smart-defaults-active-voting-week-regression](smart-defaults-active-voting-week-regression/tasks.md) | 3 | Checked markers recorded; current behavior not re-audited |
| [stack-browse-clarity-and-wrap-fix](stack-browse-clarity-and-wrap-fix/tasks.md) | 3 | Checked markers recorded; current behavior not re-audited |
| [today-slot-persistence](today-slot-persistence/tasks.md) | 3 | 11 unchecked markers retained; not active work |
| [tonight-card-sync](tonight-card-sync/tasks.md) | 3 | Checked markers recorded; current behavior not re-audited |
| [url-import-html-capture](url-import-html-capture/tasks.md) | 3 | Checked markers recorded; current behavior not re-audited |
| [workflow-429-retry](workflow-429-retry/tasks.md) | 3 | Checked markers recorded; current behavior not re-audited |
| [workflow-retry-backoff](workflow-retry-backoff/tasks.md) | 3 | Checked markers recorded; current behavior not re-audited |
