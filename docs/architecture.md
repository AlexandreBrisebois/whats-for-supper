# Architecture

This is a concise technical reference for contributors and operators. For installation, start with the [quick start](install/quick-start.md) or the [home server installation reference](../release-template/synology/README.md). Published images and bundles do not by themselves qualify a particular host, backup destination or device.

```mermaid
flowchart LR
    Browser[Family browser] --> Proxy[Traefik]
    Proxy -->|all other paths| PWA[PWA]
    Proxy -->|/api| API[Recipe API]
    API --> Database[(PostgreSQL)]
    API --> Files[Recipe files]
    API -. optional AI work .-> Gemini[Gemini]
    API -->|Server-Sent Events| Browser
```

## Application shape

- The PWA is the family-facing web application.
- The Recipe API owns household data, recipe workflows, planning, and grocery state.
- WFS retains recipe facts (including ingredients, cuisine, meal types, and the vegetarian classifier) but does not interpret nutritional or dietetic health data. Any dietary interpretation is outside this application boundary.
- PostgreSQL stores relational data; recipe files are stored on persistent local storage.
- Traefik gives the browser one origin: `/api` reaches the API and other paths reach the PWA.
- Gemini supports recipe-processing work when it is configured; core household data remains local.

## Shared state and access

Planning, grocery, and voting changes are shared through Server-Sent Events, so household devices receive updates without manual refreshes. A household uses a shared `HEARTH_SECRET`; the app also records the active family member in cookies for requests and the event stream.

The documented public stack runs one API and one PWA on a single Docker host. SSE connections and broadcasts are held in the API process; they are not a durable or cross-replica event bus. Keep this single-instance topology rather than treating shared PostgreSQL alone as support for replicated API deployment.

## Where to read next

- [Family guide](user-guide.md) for the household experience.
- [Week lifecycle](flows/data-flows/week-lifecycle.md) for the live planning state machine.
- [Recipe search and recovery flow](flows/user-flows/recipe-search-and-library-recovery.md) for detailed library behavior.
- [Local development guide](../LOCAL_DEV_LOOP.md) for contributor setup.
