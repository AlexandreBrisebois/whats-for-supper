# Installable PWA and Device Integration — Future work

- [ ] **PREF-02-T1 — Add supported-browser install/share regression coverage.**
  - **Test seam:** manifest/worker unit checks and `MinimalCapture` tests; Playwright: invoke `/capture?url=...&text=...&title=...` and retain source fields; mock owner: PREF-02/capture slice; `GET /capture`; query contract is `url`, `text`, `title`, with no API response.
