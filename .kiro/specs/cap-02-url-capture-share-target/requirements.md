# CAP-02 — URL capture and share target requirements

## Status

**Implemented capability baseline.**

## Current behavior

- **CAP-02-R1.** The PWA manifest declares a GET share target to Capture; shared `url`, `text`, and `title` query values are consumed by `MinimalCapture`.
- **CAP-02-R2.** Capture presents shared material for review rather than treating the handoff as accepted recipe creation; the normal capture/import submission path owns validation and workflow acceptance.
- **CAP-02-R3.** Manual Capture remains available when platform share-target support or shared fields are absent.

## Limits and boundaries

Share targets are browser/OS dependent and query text is untrusted input. This packet does not promise offline submission, automatic source fetch success, or native-share availability. PREF-02 owns manifest/service-worker device integration; CAP-01/06 own capture/import workflow and failure behavior.
