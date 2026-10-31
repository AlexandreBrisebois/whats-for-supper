# Proposal

## Why

A cook currently reaches the original source through the cooking hero, recipe detail, then View Original. Direct access would let people check the source without leaving their cooking context, while a clearer header hierarchy would reduce competing controls on iPhone and iPad.

## Outcome and Scope

**Both visual layouts and behavior defaults approved by Alex; implementation separately authorized on the current Mac branch.** Phone uses a shallow fixed dish-photo header with a readable overlaid title and compact controls underneath, including labelled Original and the direct two-button view toggle. Only instructions scroll, on a single reading surface without a separate padded recipe card. iPad retains the full-image 40% sidebar and cookbook character, with controls lower-left and the reading column clear. Reading position belongs beside instruction context; accessible progress remains.

Alex confirmed both final designs (“I'm good with both designs”). The earlier large padded phone recipe-card composition, scrolling-away/collapsing photo and compact View-chooser alternative are superseded. Keep the dish image visible; do not place it behind instructions. The 390 × 844 mockup's 136 px photo/title + 56 px controls = 192 px header, 572 px instructions and 80 px footer exclude safe areas and illustrate intent, not validated or universal geometry. Reflow for long EN/FR, text growth, landscape, safe areas and 44 px targets remains required.

Alex separately approved D2 and D3: allow Original during unsaved edits while preserving the draft; disable activation during cooking saves/writes or completion pending; hide it when no usable original destination exists. D1–D3 are settled in [design.md](design.md). No product decision remains unresolved for this bounded change; implementation and acceptance evidence are tracked in tasks.md following Alex’s explicit “Start the implementation” request.

Include preparation, both reading modes, loaded recipes with unavailable instructions, phone/tablet portrait and landscape, narrow iPad Split View, English/French expansion, text enlargement, keyboard/focus return and repeated opening. Exclude API/storage changes, a new viewer, source editing, a PDF reader, new cooking completion behavior, changes to the library's eligibility rules, and the concurrent Profile change.

Alex reports that accessibility-oriented styling has weakened the calm, cozy cookbook feeling. Preserve both: let food photography, a confident recipe title, warm paper-like surfaces and quiet secondary controls lead, with readable text and generous hit areas. The local designer skill and current Solar Earth v2/North Star inform the recommendation; [design.md](design.md) records the actual sources and a bounded recommendation for reviewing visual-language examples, without a global redesign.

## What Changes

- Offer Original directly from cooking when loaded source metadata has a supported destination, without opening recipe detail first.
- Open website sources in a separate browsing context; reuse the original-image viewer above cooking controls for photos and rendered PDF-page images, including existing image fallback. Do not introduce a PDF-document reader.
- Preserve mode, exact reading offset, bookmark, preparation checks and any retained instruction draft; opening, viewing or dismissing originals never submits cooking completion.
- Use the approved compact presentation/Original control row and a quieter position indicator next to instruction context. Retain the progressbar; reading a last step does not mean cooking is complete.
- Preserve the fixed phone image/header and independently scrolling instructions, plus the iPad image sidebar; source access must not make the dish image disappear during reading.
- Reconcile canonical compact-chooser wording with the approved direct two-button control through this delta; canonical files remain untouched until the normal change lifecycle.
- Specify modal containment, named controls, viewer-only Escape and focus return for the cooking entrypoint without changing library behavior.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `cooking`: direct original-source access, responsive control hierarchy, preserved cooking state and explicitly reconciled presentation/position semantics.

`recipe-media` remains the owner of shared original-image ordering/navigation/zoom and library source behavior. This draft references those semantics and proposes no shared media delta.

## Impact

Future implementation is bounded to `CooksMode`, a scoped integration of the existing `OriginalPhotosViewer`/source action, relevant EN/FR labels, and focused component/browser regressions. Inspect shared-viewer integration before choosing a host adapter or optional caller behavior; do not globally alter library behavior to satisfy cooking-only requirements.

Existing loaded recipe metadata and GET `/api/recipes/{id}/original/{photoIndex}` suffice for the proposed flow. `specs/openapi.yaml`, Kiota output, server policy and database schema are outside scope. Canonical specs and the active `align-profile-visual-language` change remain untouched. Implementation and observed acceptance results at HEAD `733d51c8` are recorded in [tasks.md](tasks.md); focused acceptance passes, while full repository verification is not qualified.
