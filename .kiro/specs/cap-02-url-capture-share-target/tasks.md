# CAP-02 — URL capture and share target future work

- [ ] **CAP-02-T1 — Add share-query regression coverage for supported browser handoff.**
  - **Test seam:** `MinimalCapture` tests and manifest/route checks; Playwright: visit `/capture?url=...&text=...&title=...` and verify review fields before submit; mock owner: CAP-02/capture slice; `GET /capture`; query contract is `url`, `text`, `title`, with no capture API response until normal submission.
