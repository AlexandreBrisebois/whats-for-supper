# Managed Demo Mode — Future work

- [ ] **PLAT-06-T1 — Define safe demo-mode observability and operator status.**
  - **Test seam:** demo processor/options and management integration tests; Playwright: authorized management user invokes selected demo operation and sees non-secret outcome; mock owner: PLAT-06 management slice; selected management demo route; request/response use approved management DTO and never expose credentials.
