# Design

## Context and Existing Ownership

**Visual layouts, behavior defaults and local implementation approved.** Alex approved both final phone and iPad designs (“I'm good with both designs”), then separately agreed to allowing Original during unsaved edits, disabling it while saving and hiding it without a usable original. D1–D3 are settled below. Alex subsequently explicitly authorized implementation on the same current Mac branch; tasks.md records acceptance evidence.

Source inspection at HEAD `733d51c8` establishes:

| Owner | Current evidence and implication |
|---|---|
| [CooksMode](../../../pwa/src/components/planner/CooksMode.tsx) | Fetches full recipe metadata; renders a two-icon presentation group and a separate position pill over the hero. At `md`, the hero is a 40%-width full-height sidebar. Report and Close have their own top-right layer. Hero activation opens nested recipe detail. |
| [RecipeDetailSheet](../../../pwa/src/components/recipes/RecipeDetailSheet.tsx) | View Original opens a present URL in a new browsing context, otherwise the image viewer. Its eligibility test admits sourceType=url even with no URL/images; the proposed cooking-only availability rule needs review. |
| [OriginalPhotosViewer](../../../pwa/src/components/recipes/OriginalPhotosViewer.tsx) | Owns image sequence, zoom, pan and paging. It has a global Escape listener and its own z-index; the cooking caller must integrate modal ownership rather than assume nesting is sufficient. No new viewer is needed. |
| [Cooking specification](../../specs/cooking/spec.md) | Requires a compact named View chooser with expanded/dismissal semantics, although code renders two permanent buttons. Requires both a progressbar and position indicator. Existing mode persistence, editing guards, bookmark and completion rules remain owners. |
| [Recipe media specification](../../specs/recipe-media/spec.md) | Owns original URL/image destinations, sequence/navigation/zoom and library behavior. Reuse these semantics without an incidental library eligibility or viewer redesign. |

### Designer and visual-language sources actually read

- [Designer skill](../../../.agents/skills/designer/SKILL.md) and [designer judgment](../../../docs/agent-designer-identity.md): understandable work, evidence distinctions, bilingual/accessibility review and preservation of warm character.
- [Visual identity](../../../.agents/skills/designer/visual-identity.md) and [Solar Earth surfaces](../../../.agents/skills/designer/solar-earth-design.md): existing tokens, Outfit/Inter, considered surfaces and restrained motion.
- [Current Solar Earth v2 reference](../../../docs/visual-language-reference.md), especially “Refined family cookbook” and “Visual acceptance”: food/recipe title dominance, soft depth, blush secondary treatment and large hit areas without heavy visible framing. Its schematic boards explicitly do not establish cookbook refinement.
- [North Star](../../../docs/creative-direction-north-star.md): relief, belonging, household recipes, honest source evidence and warm distinctive beauty alongside accessibility.
- [globals.css](../../../pwa/src/app/globals.css) and [font/viewport setup](../../../pwa/src/app/layout.tsx): implemented cream/terracotta/sage/charcoal families, Outfit headings and Inter text. Root zoom restrictions are an existing limitation, not permission for a global viewport edit here.
- [In-progress Profile design](../align-profile-visual-language/design.md), read only: rounded warm composition, soft depth, tonal selection and readable controls without flattening all surfaces. Its implementation/evidence is separate from this draft and is not evaluated here.

No current browser render, physical-device session or usability study was performed. The reported loss of warmth is Alex's experience; the competing glass pills/tiny tracked status labels are source observations. Their perceived visual effect is a hypothesis for matched rendered review, not a measured contrast failure.

## Decisions and Tradeoffs

### D1 — Approved phone and iPad layouts

Alex explicitly wants to see the dish being cooked throughout cooking and describes the current iPad image-sidebar experience as the cookbook feeling to preserve. Both final visual designs are approved; their implementation and rendered/device acceptance remain unexecuted.

| Approved layout | Composition and scrolling |
|---|---|
| Phone | Shallow fixed dish-photo header, recipe title overlaid with readable contrast, compact controls immediately underneath including labelled Original and the direct Step by step / All steps button pair. Only instructions scroll. Use one reading surface, without a separate padded recipe card or image behind text; keep the footer outside the instruction scroller. |
| iPad | Full-image 40% sidebar preserves the cookbook composition, with title/view/Original controls lower-left in that existing sidebar. Keep the reading column clear, beside the image, and independently scrolling. |

The final phone mockup at **390 × 844 CSS px** allocates **136 px photo/title + 56 px controls = 192 px total fixed header**, **572 px instruction region** and **80 px footer**, excluding safe-area insets. These are illustrative design allocations, not measured implementation geometry or hard requirements. The 192 px total aligns with the ordinary source hero's `h-48` starting budget, but redistributes it between photo/title and controls. It does not establish that the mockup fits every locale, title, text size or browser chrome configuration.

Subtract real safe-area insets and allow accessible reflow; do not promise 572 px of instructions on other viewports or after text growth. Maintain 44 px targets, long EN/FR labels, a visible dish image and reachable controls in landscape and Split View. Rendered space-budget checks must determine actual allocations without hiding the photo, shrinking labels or clipping a fixed-height box.

Superseded alternatives: the earlier large padded phone recipe card; scrolling away/collapsing the dish photo into an image-free compact header; and replacing the direct button pair with a compact View chooser. They are not open layout options. The approved pair preserves one-activation presentation changes; flexible control-row reflow handles narrow space rather than an additional disclosure step.

The delta explicitly modifies “Offer a remembered cooking presentation” to reconcile canonical chooser language with the approved direct two-button group. Keep Report/Close distinct and reading position beside instruction context; retain the progressbar without implying completed cooking. Do not add menu ARIA to the button pair.

Original remains a visible labelled action, with equivalent natural French wording and a clear accessible name; do not hide it in overflow, conflate it with the view toggle or rely on tapping the food image. Keep existing hero-to-detail access. Label fitting does not authorize changing source policy.

### D2 — Approved: preserve unsaved edits and guard pending writes

Allow Original while an unsaved instruction draft is open, so the cook can compare the source during correction. Consultation is read-only: no auto-save/discard, the same draft remains, and dismissal returns focus to Original with the editor still reachable. Disable new Original activation while a cooking save/write or completion request is pending, including instruction and presentation-preference saves, with an understandable busy cue and stable layout. Preserve the existing prohibition on changing presentation while editing/completing.

Disabling Original for every unsaved edit was not selected: it would force Save/Cancel before checking the source. A pending-write guard protects in-flight work without discarding the draft. It does not block on unrelated background work, queue an activation or replay one after a request settles. Failed writes retain existing recovery; Original becomes available again when no cooking write is pending and a supported destination exists.

### D3 — Approved: hide Original without a usable destination

Show Original after a successful current-recipe detail read only when a URL recipe has a nonempty source URL or original images exist. With an absent URL and images, use the existing photo fallback. With neither destination, hide the cooking action; do not mount an empty viewer. Failed/loading reads do not infer source availability. A loaded recipe with unavailable instructions can still expose its available source.

The library currently shows its control for every URL source type. This approved rule applies only to the new cooking entrypoint; it does not normalize library behavior. An explained unavailable action was considered but not selected. Do not invent a replacement URL or add source repair to this change.

## First Observable Slice

Begin with a loaded photo recipe in All steps, checked prep ingredients and a later bookmark/offset: cooking → direct Original → existing photo viewer/image endpoint → Close → the same cooking state. Component acceptance verifies local state; Playwright exercises the real cooking/detail wrapper/viewer seams with the external asset response stubbed at its endpoint. No nested detail sheet, update, completion, preference save or redundant detail fetch is caused by this action.

Extend the working slice to URL opening, both presentations/prep/missing instructions, D2/D3 cases, repeated opens, focus/layer ownership, then responsive cookbook treatment. Existing GET detail and image contracts suffice; no API/schema, Kiota or database change is planned.

Original photos and retained rendered PDF-page images use the same existing image overlay and original-image endpoint; this is not a new PDF viewer or raw-document download. A present website source URL opens externally under existing URL behavior. Tests must distinguish these destinations instead of routing every Original activation into the same kind of view.

## State, Concurrency and Recovery

The cooking instance remains mounted. Suspend underlying keyboard/pointer interaction and scroll tracking while its photo dialog is active; do not let focus transfer or background scroll alter the bookmark. The source viewer owns Escape and returns focus to its invoking Original button, never closing cooking or cancelling its editor. Reopen with the media owner's initial image/fit state while retaining cooking's exact offset, checks, mode and draft. The image count in the viewer is distinct from the step count in cooking.

Place the photo overlay above all cooking controls, including top-right Report/Close, with a labelled dialog, focus containment and named image/zoom/navigation/close controls. The existing global viewer key listener/z-index is not proof these properties already hold. Prefer a scoped host integration or explicit caller configuration; if shared implementation must change, retain library regression coverage and do not change its specified destinations, ordering or dismissal behavior.

URL activation opens a new context using the existing noopener/noreferrer behavior; the app remains mounted. Browser tab focus/popup restrictions are platform controlled: test the opening request and, where supported, the popup, without promising forced tab focus. Returning to the app must not trigger completion or reset cooking. Original image failure leaves a working named Close and cooking return; do not broaden into an asset-recovery subsystem.

## User Experience

### Warm family cookbook with accessible controls

Food imagery and the recipe name remain the visual anchor. Retain the current Outfit/Inter family: propose a comfortable 20–24 px phone title, larger tablet title where space permits, 14–16 px supporting/action labels and relaxed instruction leading. Exact sizes are candidate starting points; verify with actual long recipes and 200% text rather than shrinking to maintain a fixed hero height. Do not add a serif, faux paper texture, ornament, decorative badge or new palette to signify “cookbook.”

Use the existing cream canvas and warm white reading surface, generous but purposeful spacing and soft depth. Fit a restrained cream/warm-white control treatment within the existing hero/header region rather than multiply glossy pills over photography or append a separate toolbar. Preserve meaningful space for the visible dish image and its natural crop; do not impose Home's near-square image rule on the cooking sidebar. Keep the title readable over light/dark food photographs using the existing gradient or a stable title surface, chosen through rendered comparison. Instruction text stays on its reading surface without an image behind it.

Retain the approved compact two-icon view group with distinct selected state and accessible labels. Use the warm sage selection and quieter blush/terracotta Original direction with icon plus readable sentence-case label; exact token shades still require composite/state measurement and are not claimed to pass contrast. Enabled secondary controls must look enabled. Reserve the stronger primary treatment for Start/Resume/Cooked in the footer. Keep Close easy to find without making every action equally emphatic.

Use roughly 8–12 px within a control group and 16–24 px between title, controls and reading context as initial spacing, allowing adaptation. Touch padding supplies at least 44 × 44 CSS px without requiring heavy borders or huge visible chips. Keep a quiet “Step n of total”/equivalent French context near the instruction heading, plus the progressbar; use Check & Prep and Steps unavailable when appropriate. Never label the last bookmark as completed cooking.

| Layout | Approved arrangement and acceptance |
|---|---|
| Phone/narrow portrait | Use the approved shallow fixed photo/title header and compact control band underneath, with no separate padded recipe card; only instructions scroll. Let controls reflow without truncation, smaller targets or horizontal scrolling. Position belongs to instruction context, not that row. |
| Phone landscape | Retain the visible dish image and non-scrolling header while preserving usable instruction height. Reflow compact controls within that model; do not solve the height budget by hiding/collapsing the image or scrolling the hero away. |
| iPad portrait/landscape | Preserve the approved full-image 40% sidebar and lower-left title/view/Original grouping. Keep the instruction column clear and put reading position beside its instruction context. |
| Narrow Split View | Use available CSS width, not device-name assumptions. Below the breakpoint retain the fixed visible-image phone header; above it keep the narrower image sidebar and wrap its controls. Only instructions scroll; Original stays visible/reachable. |

Preserve the fixed-image scroll model and stable geometry between modes. Do not freeze hero height solely to retain an old class assertion if long labels/text growth require reflow. In short landscape/enlarged-text cases, validate the remaining instruction space before accepting a control arrangement; a layout that cannot fit is an unresolved design constraint, not permission to hide the image. Enlarge text in a controlled fixture if the current viewport prevents real pinch/zoom; record physical-browser enlargement as unqualified instead of changing root settings here.

### Is a broader visual-language review warranted?

**Recommend a focused composition/exemplar review, not a global redesign.** Alex's report is material, but current v2 already explicitly restores cookbook imagery, title/depth hierarchy and warmth; the North Star and in-progress Profile design also preserve these qualities. The gap is demonstrating how accessible controls coexist with those compositions: the guide says its schematic boards omit food and cannot establish cookbook refinement. Cook's header currently places several small tracked/glass treatments together, making it a useful bounded comparison case.

Use this change's phone/tablet compositions as the first test, alongside the existing food-photo Home reference and a current Profile example if separately authorized. Review photo prominence, title hierarchy, spacing, material/depth, secondary-control quietness and perceived calm separately from contrast, targets and keyboard checks. Compare matched recipes/light and dark photos at ordinary size first, then stress cases. If recurring loss of warmth is confirmed across journeys, propose a separate update to visual-language exemplars; do not rewrite tokens, fonts, global accessibility rules or other journeys here. No visual-language document is changed by this draft.

## Review Decisions and Acceptance Boundaries

Both final visual layouts and the separately confirmed D2/D3 behavior defaults are approved. There are no remaining product decisions for this bounded change. Token tuning and actual responsive/contrast/focus results remain implementation acceptance work, not assumed verification. A material inability to fit the approved layout must be reported rather than silently reopening superseded alternatives; implementation was separately authorized; staging, commits and deployment remain outside this task.

Acceptance includes 320/375/390 px phones, short phone landscape, 768/820 px tablet portrait, 1024/1180 px landscape and narrow Split View, using EN/FR, long recipe names and text enlargement. Verify the recipe's dish image/header remain visible and stationary while instructions scroll; preserve the full-image tablet sidebar, with no collapsed replacement or image behind instructions. Also verify no overflow/collision; at least 44 px targets; focus containment/return; image-overlay dominance; repeated opening; no completion/update effects; mode/bookmark/offset/check/draft retention. Use matched food-photo rendered review for cookbook quality, not only geometry or contrast.

Read tests are evidence of assertions only. `recipe-original-viewer.spec.ts`'s URL-named case currently checks visibility/icon, not popup activation. `cook-mode-steps.spec.ts` checks 320/375/390/1180 widths and position semantics, not the full proposed tablet/Split View matrix. No application tests, screenshots, contrast measurements or physical-device checks have run for this draft.


## Implementation qualification

The shallow photo/header and 40% sidebar remain outside the instruction scroller. Original uses the existing viewer with an opt-in cooking modal and external URL dispatch. The cooking surface remains mounted and inert while the viewer is open. Shared library destinations and default media behavior remain unchanged.

Rendered enlargement exposed footer-label clipping; footer actions now wrap when necessary. A wrapped title over the light photo exposed insufficient contrast at 320 px; a quiet translucent charcoal backing protects the white title while retaining the dish photo. These are local accessibility refinements within the approved composition. Screenshots wait for the cooking entrance opacity to settle before capture.

Local qualification uses deterministic original images and API responses, including EN/FR, 320–1180 px layouts and controlled 200% text enlargement at 390/820 px. Safe-area CSS is present but desktop Chromium reports zero device insets; physical-device zoom, installed PWA chrome, reduced-motion behavior and live asset availability are not qualified by these checks. The global viewport’s existing zoom policy is unchanged. Short landscape preserves a scrolling reading area but offers substantially less context than portrait.
