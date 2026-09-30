# LIB-05 — Soft deletion and recycle bin: follow-up candidates

- [ ] **T1 — Add recoverable trash errors and cross-surface invalidation.**

  **Test seam:** unit/API: `RecycleBinSheet` tests, `soft-delete-contract.test.ts`, `RecipeSoftDeleteIntegrationTests.cs`; Playwright: failed trash load, restore, purge PIN rejection, and active-library refresh after restore; mock owner: recycle-bin vertical slice; route/method: trash GET, restore POST, purge DELETE; contract: `{ data: { items } }`, restore success, and elevated-PIN purge response/error.
