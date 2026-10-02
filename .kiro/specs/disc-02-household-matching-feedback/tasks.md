# DISC-02 — Household matching feedback future work

- [ ] **DISC-02-T1 — Define stale vote reconciliation for rapid multi-device changes.**
  - **Test seam:** DiscoveryService/controller integration, discovery-store and stream tests; Playwright: two members vote/unvote rapidly and each sees approved count; mock owner: DISC-02 vertical slice; discovery vote route/method; request contains vote/member context, response/event contains `recipeId` and authoritative `voteCount` or documented version.
