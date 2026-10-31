# Design

## Context and Existing Ownership

### Exact release and source identity

GitHub connector evidence, retrieved 2026-10-31:

| Identity | Verified ref |
| --- | --- |
| Latest published beta | [`dockerhub/v0.1.37-beta.17`](https://github.com/AlexandreBrisebois/whats-for-supper/releases/tag/dockerhub/v0.1.37-beta.17), published 2026-10-31 04:08:46 UTC |
| Beta annotated tag object | `0589e4cb1cb43e4559cb2fde54095f510853c47b` |
| Beta source commit | `74ed426925896fa01b28f093e399e4f93e48d9a0` |
| Intended branch, verified remote head | `review/profile-settings-home-visuals` → the same `74ed4269…` |
| Publication | [run 41165857765](https://github.com/AlexandreBrisebois/whats-for-supper/actions/runs/41165857765), successful tag push at that source SHA; tested amd64/arm64 image pushes, manifests and installation ZIP publication all successful |
| Branch CI | [run 41165844684](https://github.com/AlexandreBrisebois/whats-for-supper/actions/runs/41165844684), successful branch push at the same SHA |
| Latest stable | [`dockerhub/v0.1.36`](https://github.com/AlexandreBrisebois/whats-for-supper/releases/tag/dockerhub/v0.1.36), published 2026-10-28 00:21:03 UTC |
| Stable tag object / source | `925650df2765e729ac0d6cbf3326a8695aa5f968` → `ee6e5ffe4057c1023be00112345a14e76b09ecdc` |

Release `target_commitish: main` is not the beta source: annotated-tag resolution, publication head SHA and branch CI establish the source above. Saved cloud checkout `/workspace/whats-for-supper` is clean at stable on local branch `work`; beta was fetched and reviewed in a separate detached worktree `/tmp/wfs-gesture-beta`. No remote source gap, Mac access or uncommitted local work is needed. Alex's later clarification that all changes are on the branch is consistent with the verified remote state. Published-source identity is established; the exact installed image/PWA cache on Alex's device has not been inspected.

### Gesture path comparison

All source locations below are relative to the beta worktree and pinned to `74ed4269…` unless stated otherwise.

| Mechanism | DiscoveryCard | RecipeStackCard / Browse |
| --- | --- | --- |
| Grab activation | Motion `drag='x'`, no application hold/delay or custom activation threshold | Same; no evidence of a higher grab threshold |
| Held displacement | `dragElastic=1`, constraints zero | `dragElastic=0.45`, constraints zero: movement visibly damped |
| Release intent | 80 px or 500 px/s; right LOVE, left PASS | 35 px or 280 px/s; right previous, left next; thresholds are release decisions, not grab activation |
| Tap | No detail tap | `didDrag` set at >5 px; reset only by `onDragStart`; `onTap` refuses while set |
| Capture/cancel | Motion owns pointer listeners; no custom capture | Same, with no explicit cancel guard in drag end |
| Layers | Front z-index `10-index`; image and cue overlays ignore hit testing | Same structure; import badge is a noninteractive span; no evident added blocker over the full card |
| Motion details | x → ±15° rotation; no momentum; 100/15 return spring; x reset before departure | Same rotation/no momentum; layout animation; 150/22 return spring; no explicit x reset before departure |

Source anchors: `pwa/src/components/discovery/DiscoveryCard.tsx:99–156`, `pwa/src/components/recipes/RecipeStackCard.tsx:109–205`, `pwa/src/app/(app)/browse-all-stack/page.tsx:438–465,740,857–881`. A tap calls `handleCardTap` → `setDetailRecipeId`; “flip” therefore maps to opening the detail sheet, not a new reverse-card interaction. Browser navigation/state ownership remains in Browse and `browseStackStore`; movement must not import the Discovery store, vote API, LOVE/PASS or family-interest semantics.

### Stable comparison and calibrated diagnosis

1. **Confirmed repeat-tap defect, high confidence:** `didDrag` remains true after a 12 px abandoned drag. A clean subsequent tap never invokes `onDragStart`, so it cannot clear the flag. Two later taps were both rejected in the isolated real-Motion experiment. This defect also reproduces in stable; it is not newly introduced by the beta diff.
2. **Confirmed movement difference, high confidence:** a 60 px held drag produced 27 px translation in Browse and 60 px in Discovery. This explains resistance relative to Discovery, but `0.45` already existed in stable. Lower Browse release thresholds do not remove that resistance.
3. **Confirmed cancellation defect, high confidence:** cancelling a 45 px horizontal touch gesture still invoked previous navigation once in both stable and beta. `handleDragEnd` ignores the event and treats cancellation as a normal release.
4. **Review hypothesis, superseded by the integrated experiment below:** `e4f61229d5bb765c286e1db9ceec28dd2f95e11c` changes the declared card touch policy from `none` to `pan-y`; `08771148…` adds scrollable card text, scrollable main content and revised responsive geometry. However, Motion 14.4.0 `render/html/use-props.mjs:43` overwrites `touchAction` with `pan-y` whenever automatic x dragging is enabled. Measured computed style is `pan-y` for stable, beta and Discovery alike. A declaration-only reversal is therefore not an evidence-backed fix. Added scroll containers may increase interruption opportunities; the isolated fixture does not prove that full-layout/device regression.

The review fixture alone did not demonstrate a newly introduced cause. Implementation qualification subsequently established a beta-specific inner-scroller cancellation in full-layout Chromium, as recorded below; this does not establish behavior on Alex's physical device or Safari. The root `none` → `pan-y` declaration alone remains an incorrect explanation.

### Diagnostic evidence and limits

Scratch packet: `/workspace/scratch/wfs-gesture-review/`. `release-evidence.json` records remote identities; `stable-beta.diff` records the card diff. `prepare.cjs` transpiles unmodified committed card logic into isolated fixtures, replacing only locale/image/duration/import-badge dependencies. `diagnose.cjs`, `confirm.cjs`, `results.json` and `confirm-results.json` preserve commands and raw pointer events. No product or existing test files were changed.

Final diagnostic runtime: exact beta-pinned Framer Motion 14.4.0, React/React DOM 19.3.1, lucide-react 1.60.0, with real browser gesture processing in installed headless Chromium, 390×700 mobile context. The preinstalled environment had Motion 13.4.6/React 19.3.0, so its exploratory run is labelled separately and was repeated after installing exact runtime packages only in scratch. This is an isolated component/CSS fixture with stub content and imposed dimensions, not a full PWA or real-device acceptance result. The first fixture run failed to resolve the badge import; after adding its stub, the experiment ran successfully.

| Input | Stable Browse | Beta Browse | Beta Discovery |
| --- | --- | --- | --- |
| Fresh stationary mouse tap | detail callback once | detail callback once | no detail semantics |
| 12 px slow mouse or touch drag, then two fresh stationary taps | zero detail callbacks | zero detail callbacks | no detail semantics |
| 60 px held horizontal mouse displacement | x=27 px | x=27 px | x=60 px |
| 60 px horizontal touch release | previous once | previous once | no vote at this displacement/low velocity |
| Diagonal touch (35,80) or (18,48) | pointercancel | pointercancel | pointercancel |
| Explicit cancel after 45 px horizontal touch | previous once, erroneous | previous once, erroneous | not tested in this control |

Browser implicit touch capture was observed; it did not prevent browser-originated pointercancel. No evidence supports adding manual pointer capture as the primary fix. Real Safari/iOS arbitration, iPad input, production CSS hit regions and installed PWA cache remain unverified.

### Integrated beta regression established during implementation

The real PWA test found a distinction hidden by the initial component fixture: a slow horizontal touch on the image works, but a touch on the title inside the beta's new `overflow-y-auto` card body receives native `pointercancel` and stops moving. The same title/body experiment passed against an unmodified stable server at `ee6e5ffe…` and failed against an unmodified beta17 server at `74ed4269…` (image moved 9 px for 20 px input under old elasticity; beta title moved 0 instead of 9). Both control servers used the same pinned dependencies, 390×844 Chromium touch context, network mocks and Webpack mode. Neither source checkout was modified.

A one-factor control on the current integrated PWA applied `touch-action: pan-y` only to the inner card-body scroller: image/title/body then all passed. The final correction adds `touch-pan-y` to that scroller, preserving vertical scrolling and every dimension class. `087711481d90a85ad163a058c2b6be85afb11f78` introduced this scroll boundary. Panning arbitration examines the hit element through its nearest inclusive scroll container, so the outer card's policy does not suffice for the new inner boundary ([Pointer Events §8.2](https://www.w3.org/TR/pointerevents3/#determining-supported-direct-manipulation-behavior)). This is a demonstrated beta regression in this browser; it is not a claim of universal device reproduction.

Evidence: `hit-region-debug2.log`, `scroll-arbitration-control.log`, `unmodified-beta-regression.log`, `unmodified-stable-regression.log` under the scratch packet. A replayable scratch `control.spec.ts`/`control.config.ts` retains the old-card 0.45 movement expectation; the committed regression always expects direct movement and contains no diagnostic overrides. Initial control startup with Turbopack rejected the cross-worktree dependency symlink; the supported `next dev --webpack` mode resolved that tool limitation before the valid controls ran.

## Decisions and Tradeoffs

Approved bounded implementation:

- Extract the actual neutral movement owner from Discovery into a small shared `useHorizontalCardMotion` hook (name provisional). Share motion value, rotation mapping, zero constraints, full elasticity and disabled momentum. A guarded manual Motion start lets nested controls keep their pointer events without adding a delay or changing Motion's activation threshold; shared styles preserve the automatic x-drag touch and selection policies. Each card retains its release-policy/action callback and presentation. Reuse actual runtime props, not a copied second algorithm or a generic card framework. Leave the existing consumer return/departure timings intact initially; share spring behavior only if the first observable regression demonstrates a need.
- Keep Browse's 35 px/280 px/s and Discovery's 80 px/500 px/s policies. Raising Browse to Discovery's thresholds would make navigation harder and contradict the existing library contract/tests. Keep the existing haptic policy and directional cues; no voting semantics enter Browse.
- Reset Browse tap suppression at the start of every primary pointer session, before Motion drag recognition, rather than only at drag start. Preserve >5 px drag suppression for that session and Motion's own tap/drag arbitration. Do not clear only at drag end: a delayed same-session tap callback could then open detail accidentally. A fresh tap after cancellation must start clean.
- In Browse, distinguish `pointercancel` from release before evaluating navigation thresholds; return and reset session state safely. Guard delayed departure completions with mounted/current-front lifecycle identity; invalidate on demotion, replacement, unmount, filter/presentation departure. Prevent duplicate navigation while a departure is already pending. Keep keyboard Enter/Space activation independent of stale pointer state.
- Preserve effective x-drag `pan-y` arbitration, explicitly apply that same policy to the new inner scroller, and retain all current layout/scroll behavior for this minimal correction. Do not add `!important touch-action:none`, drag listeners on the entire page, a long-press handle or a new drag threshold. Blocking vertical scrolling could hide content/actions on small phones and contradict accessibility. The inner-scroller correction is grounded in the full-layout red/control/green experiment above; further policy changes require fresh evidence.

Alternatives rejected: copying Discovery JSX/business callbacks duplicates ownership and imports voting; elasticity-only fixes do not address poisoned taps/cancellation; globally disabling scroll risks one-handed reachability; lowering release thresholds further does not improve grab tracking.

## First Observable Slice

Start with Browse short-drag → return → first new tap → existing detail sheet, using real Motion and the existing page/store/detail seam. Verify the selected recipe ID and retained ordinal through the existing GET detail handler. Then share movement with Discovery while preserving distinct release outcomes; complete cancellation/lifecycle guards as a separate bounded increment. No API, generated-client or mock contract changes are required.

## State, Concurrency and Recovery

Browse pointer sessions have idle, pressed, dragging, departing and cancelled states. A >5 px horizontal drag suppresses only its session's detail tap; an interrupted session produces no action. A genuine completed swipe can request one navigation only after departure; an obsolete completion cannot affect a newer front card or collection. Motion still owns movement delivery; Browse owns side effects and lifecycle validity. Existing pending-page, failed-page retry, filter identity and detail-close behavior remain authoritative.

## User Experience

Preserve `max-w-sm`/`md:max-w-xl`, current ordinary-phone heights and image proportions, max-height adaptations at 740/700 px, card text scrolling, safe-area treatment and reachable action bar. No card shrinking is proposed. Keep front-card role/name/tab order, Enter/Space opening detail, rear-card ineligibility, header Close/Search, and existing reduced-motion behavior. No new copy, visual language, icons or animation embellishment is needed.

## Acceptance Plan

At the review baseline, existing tests were useful but incomplete: `RecipeStackCard.test.tsx` mocks Motion and calls captured drag/tap handlers separately; it cannot detect real grab activation, computed touch policy or the missing cross-gesture sequence. `browse-all-stack.spec.ts` uses 200 px horizontal mouse swipes and clean clicks; its default config runs Desktop Chromium only. Add short and repeated sequences rather than retries or weaker expectations.

| Coverage | Required observable checks |
| --- | --- |
| Grab/drag | real Motion; image, title, text hit locations; pointer and touch; 2 px accidental motion; >5 px short drag; held 20/60 px movement compared with Discovery; exact 35/280 and 80/500 release boundaries retained |
| Detail/tap | fresh tap once; short drag then first fresh tap once; repeated failed attempts do not require another drag; suppress same-session post-drag tap; close detail retains recipe and ordinal; Enter/Space still work |
| Interruption | pointercancel below/above threshold; pointer leaving card; new gesture after cancel; navigate/filter/list/close during pending departure; no late or duplicate callbacks |
| Preservation | forward/backward wrap and page failure/retry; no vote writes from Browse; Discovery left PASS/right LOVE once; no detail action in Discovery; rear cards inactive |
| Geometry/input | 390×844 ordinary phone unchanged, 320×568 narrow phone, 390×700 short phone, 768×1024 iPad; text/action access, safe areas, no horizontal overflow; mouse/touch/keyboard and reduced motion; touch in iOS Safari and iPad on actual devices before release qualification |

Use `task test:unit -- src/components/recipes/RecipeStackCard.test.tsx`, the shared-hook test and DiscoveryCard tests for behavior/policy; retain real-Motion tests for the pointer seam. Run `task test:e2e -- e2e/browse-all-stack.spec.ts e2e/browse-stack.spec.ts e2e/discovery.spec.ts` against local mocked APIs, never a production BASE_URL. Existing schema-compliant mock owners are `pwa/e2e/mock-api.ts` and suite-local handlers/builders; GET `/api/recipes/{id}` verifies detail identity, existing library GETs verify position/wrap and POST `/api/discovery/{id}/vote` distinguishes voting side effects. Do not weaken existing 35/280 expectations or rely on DOM-dispatched synthetic pointer events alone to assert native touch scrolling. Tasks specify red/green and final checks.
