# LIB-06 — Portable recipe sharing: requirements

## Status

**Implemented capability baseline.** Canonical owner of portable recipe bundle export/import.

## Current behavior

- **LIB-06-AC1.** Detail disables duplicate sharing, obtains `GET /api/recipes/{id}/share`, then downloads a bundle file; it uses download rather than `navigator.share`.
- **LIB-06-AC2.** A persistent preparing toast is removed on completion/cancel/error. Non-abort failures set inline share error; export eligibility is enforced by the server (including hero requirement).
- **LIB-06-AC3.** `MinimalCapture` parses a selected/shared bundle, validates a portable shape, displays recipe/image/notes/rating preview, and imports only after explicit acceptance using `POST /api/recipes/import-bundle`.
- **LIB-06-AC4.** Client validation checks version/source/timestamp and image shape before preview; server import also rejects invalid operation/format. Imported recipes are new server-owned records.

## Boundaries and limitations

LIB-04 owns image acquisition/viewing; capture owns import UI. Export currently does not offer a native share sheet. Client validation is advisory; server validation is authoritative. No documented progress/cancellation protocol exists for large bundles.
