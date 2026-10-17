# Design

## Context

See proposal.md. Existing cross-module boundary: manifest `pdfManifest` → controlling `sw.js` → `WfsPdfShare.matches/handle` in `pwa/public/pdf-share.js` → bounded body parse → stage transaction → 303 → capture. No server `/share-target` route or equivalent fallback was found. Source and scenario mapping: BSL-app-installation-004–006 in [capability plan](https://github.com/AlexandreBrisebois/whats-for-supper/blob/46234524072c1df2ca7f67b40d592559770bd440/docs/openspec-baseline/app-installation.md).

## Goals / Non-Goals

**Goals:** separate advertisement, worker transport, browser staging and existing capture acceptance.

**Non-Goals:** OS delivery, background uploads, offline application, deployment flag forwarding, uniform malformed-field rejection, changes to acquisition-owner policy.

## Decisions

- Preserve `pdfManifest` on/opt-in versus default GET behavior. Advertisement uses PWA process environment, independently of API configuration and member preference; no propagation guarantee.
- Preserve exact worker match and 303 success/restart outcomes. Worker does not check the deployment mode or member eligibility. Only controlled requests qualify; no assertion that the OS will issue them.
- Reference accepted recipe-capture link review. `MinimalCapture` takes direct url first, otherwise extracts HTTP(S) from text; sharedTitle is read but unused. Do not claim title import or arbitrary text acquisition.
- Keep worker cache implementation evidence non-normative except observable bypass boundaries. Install opens an empty `supper-v1` cache; ordinary GET uses caches.match then fetch, with no cache.add/put or offline fallback. Activation claims clients and catches share cleanup errors. This is not an offline capability.

## Risks / Trade-offs

- `pdf-share.test.mjs` runs the helper in a VM with synthetic Request/File and replaces stage; it asserts exact-origin matching, stage-before-redirect, text handoff and restart cases, not IndexedDB transactions or service-worker control → implementation-supported only.
- Parser counts all file-valued fields and separately counts entries named files; a mixed wrong-name File plus string files entry can pass the source condition. Strict rejection of every malformed field shape is withheld (AI-U03).
- No worker registration failure UI or server share fallback → fresh manual capture may be needed, without a transport delivery promise.
- Inspected `docker/compose/apps.yml` and `pwa/Dockerfile` do not explicitly forward the PDF variable → no flag propagation claim (AI-U02).

## Migration Plan

Documentation-only validation and authorized sync. No deployment or data migration.
