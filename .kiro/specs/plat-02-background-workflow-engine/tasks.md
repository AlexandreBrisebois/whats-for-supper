# Background Workflow Engine — Future work

- [ ] **PLAT-02-T1 — Specify recovery for a selected non-idempotent processor side effect.**
  - **Test seam:** processor and `WorkflowWorkerTests`, domain integration tests; Playwright: triggering the selected family flow shows accepted versus failed/recovered outcome; mock owner: selected workflow/domain slice; workflow trigger route/method; request is `WorkflowTriggerRequestDto`, response is workflow instance identity/status or documented error.
