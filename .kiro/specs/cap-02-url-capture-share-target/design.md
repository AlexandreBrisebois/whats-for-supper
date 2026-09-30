# CAP-02 — URL capture and share target design

OS share → manifest `share_target` → `/capture?url=&text=&title=` → capture page → `MinimalCapture` review state. The component uses the source context only as input to existing capture APIs/workflows; it does not define a new share HTTP API. Evidence: manifest, layout, `MinimalCapture`, capture page, and capture component tests. API/workflow persistence belongs to CAP-01/CAP-06.
