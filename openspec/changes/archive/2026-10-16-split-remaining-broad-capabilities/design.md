# Design

## Context and Existing Ownership

The proposal defines the five selected splits. This design is required because cross-capability ownership, shared update effects and historical evidence must move coherently without changing behavior.

The authoritative inputs are the five current main specs, not archived extraction deltas. Their source identities and every canonical requirement block are recorded below. Their durable evidence lives in `docs/openspec-baseline/{recipe-library,recipe-search,recipe-quality,household-identity,data-backup-and-recovery}.md`; the existing meal-planning owner directory and prior changes in those documents must survive future navigation edits.

Observable behavior is defined by the current requirements and scenarios. This change does not re-qualify their source claims or resolve discrepancies recorded in their evidence. Original BSL/U/A identifiers, source digests, partial-success limits and API/runtime/database/model/clipboard/device qualifications remain applicable.

## Decisions and Tradeoffs

### One coordinated change, bounded family slices

The user selected all five candidates. Use one change so `search-indexing` is created once, receiving eight Search producer requirements and two backup/recovery repair requirements. Five separate changes would require an ordering contract or competing creation deltas for this shared destination. Application proceeds in bounded family groups with their own conservation/navigation checks; no archive occurs until explicitly requested later.

### Recipe library: four owners

Retain catalog eligibility, paged list and stack navigation, summary/detail reads, represented facts, readiness reads and vegetarian fact classification under recipe-library. Extract recipe-editing, recipe-media and recipe-recycle-bin using the exact map below. Vegetarian classification stays with its stored-fact owner rather than creating a four-requirement capability merely to shorten the file.

Recipe-editing owns partial PATCH persistence, instruction replacement, notes/ratings/discoverability updates and the shared post-save search-invalidating/file-projection lifecycle. Media and Recycle Bin have distinct endpoints and completion semantics. The Browse stack's toggle presentation remains library-owned and links to the persisted discoverability owner; do not duplicate its PATCH policy. Recipe-quality owns issue feedback; recipe-capture retains initial acquisition, including feature-enabled PDF rendering/recovery. Moving existing-recipe photo viewing/append does not transfer PDF capture behavior.

### Search and backup/recovery: one indexing owner

Retain chooser, query, lexical/semantic retrieval, ranking, Similar, promotion, continuation and obsolete-result guards under recipe-search. Search-indexing owns filter/affinity materialization, lexical/embedding publication, stale-source guards, bounded reconciliation and background backfill dispatch. The two recovery repair requirements move here from data-backup-and-recovery exactly once.

Keep backup/restore serialization and reconstruction together, including search sidecar schema/model compatibility and report recovery. Those are recovery policies, not competing index publication rules. Scheduled-maintenance owns Dreaming seeding, child composition, due commands, residue cleanup and reporting. It references search-indexing's producer contracts, planning-lifecycle's overdue finalization and background-processing's generic workflow/cron/retry rules. Do not extract generic workflow execution again. Runtime flags, provider behavior and existing local-date/UTC qualifications stay unchanged.

### Recipe quality: issue lifecycle versus capture recovery

Recipe-quality retains issue form/report/review/resolution, contextual re-import policy, returned failed-reference copy controls and attributed import reads. Copy-reference requirements belong to the issue form despite their failure terminology; they must not move into capture-recovery.

Capture-recovery receives failed-capture Settings/list/retry/clear/cleanup and bulk import/summary requirements. Bulk import deliberately selects unnamed recipes without requiring failure or eligible issue feedback; preserve that difference, including workflow-count semantics and active/paused exclusions. The capture cleanup safety requirement stays with that journey and references the scheduled-maintenance command consumer. Existing clear-time and execution-time rules remain separate, not rewritten into a stronger cleanup guarantee.

### Household identity: access, member records and active context

Retain shared passphrase authentication, household access cookies, protected access gates and the complete invite journey in household-identity. It continues to own `Authenticate protected API requests independently`, so the many current consumers of that title need no relocation.

Household-members owns member creation, name editing, deletion and their caller-specific identity handoffs. Member-context owns onboarding's existing-member list/selection, Profile switching/display, recovery, identity-cookie options, request transport/binding and capture submitter attribution. Keeping onboarding's selection list with context avoids splitting the selection journey around the underlying family endpoint. Existing member preferences remain member-preferences-owned.

Access must still precede context checks. Preserve raw-secret/token access distinctions, browser selection/header/cookie precedence, HttpOnly limits, parseable binding versus member existence, invite navigation versus confirmed arrival, and attribution versus exclusive ownership. Do not add a personal account or authorization guarantee through documentation relocation.

### Preserve normative text and evidence

Use REMOVED source deltas and identical ADDED destination blocks because OpenSpec has no cross-capability move operation. Preserve exact requirement titles, descriptions and ordered scenarios; ignore only trailing block whitespace for canonical identity. No feature is retired. New owners have Purposes in their deltas; retained-main Purposes are updated directly during apply from the proposed texts below, because an existing capability's delta Purpose is ignored by sync.

Preserve all other original preamble text, including evidence paragraphs and the household page-gate scope note currently before its first requirement. Add a historical-context notice where an old preamble describes the combined capability. Keep evidence centralized in its existing baseline record; new main specs link each originating evidence record and its preserved qualification text. Search-indexing links both Search and backup/recovery evidence. Preserve original digest tables and dated decisions rather than presenting them as new verification. Where a source has no evidence section, its baseline record remains the provenance owner.

Add a compact owner directory to retained specs and exact-title dependency links outside normative blocks. Resolve preserved legacy owner wording through those links; do not rewrite normative bodies or broad-replace old capability names. Current consuming-main navigation and current baseline ownership sections may be updated; historical source snapshots, archived changes, backlog investigations and old digest tables must remain untouched. Previously applied meal-planning normative blocks and all existing dirty work stay unchanged.

## First Observable Slice

The first complete documentation journey moves `Open initialized recipe-detail field drafts` and its related edit/persistence/recovery rules into recipe-editing, while library detail reads remain library-owned. Verify the identical title/body/scenarios at the destination and the exact-title link back to detail reading. This crosses specification/navigation/evidence seams only; no UI, API, database or external service execution is needed.

Then complete the whole library family before Search/backup, quality and household family groups. Search and backup transfers are one coherent group because they share search-indexing. Each group includes its navigation, evidence links and conservation checks rather than deferring these to final verification.

## Compatibility, Rollout and Reversal

This changes specification paths and ownership, not runtime contracts or stored data. Preserve source headings and requirement anchors at their new paths; retarget current links to moved anchors and retain original source provenance references as historical. Do not replay older archived deltas into the former combined owners.

Sync/archive does not author arbitrary evidence/navigation sections or update retained-main Purposes, so apply must write those explicitly and validate them. New main specs contain Purpose and Requirements, never delta operation headings or TBD placeholders. Archive only after a later user request and after confirming every delta is already represented in the mains; resync must not remove authored navigation.

Before edits, recheck recorded source identities and capture current staged/unstaged/untracked work. A changed source requires reconciliation of the map/deltas against its new accepted content before removal, not silent loss or restoration of old content. New owner paths must still be absent or explicitly reconciled. A requested reversal restores only this change's contribution using private before-images; later dependent changes need review. Never reset whole dirty files.

## Conservation and Acceptance

1. Compare the original five-spec inventory to the union of the 13 resulting owners. Require exactly 260 unique titles / 609 scenarios, unchanged canonical block hashes and per-owner counts below. Every source removal has one identical destination; no added policy or duplicate title is allowed. This also proves ordered scenarios and failure/recovery statements were conserved.
2. During planning, simulate retained source blocks plus the eight ADDED deltas and verify all REMOVED titles, destinations and identities. This proves the planned transfer only; it does not claim the main specs were reorganized.
3. Preserve every original evidence/preamble statement outside the explicitly replaced Purpose, plus the household page-gate scope note. Check all new cross-owner requirement anchors and evidence links, including shared PATCH consequences, stack discoverability, delete/search exclusion, attributed import access, capture cleanup, index repair and maintenance dependencies.
4. Review affected current references in `openspec/specs/*/spec.md`, `docs/openspec-baseline-plan.md` and `docs/openspec-baseline/*.md`; resolve moved titles through new ownership links without editing historical records or unrelated behavior. Each consuming normative block remains unchanged. Verify application inputs and pre-existing work remain byte-identical except for authorized additive navigation edits.
5. Run `openspec validate split-remaining-broad-capabilities --strict --no-interactive`, `openspec validate --all --strict --no-interactive` and `git diff --check`; then run `task verify:plan -- <complete reviewed task paths>` and `task verify -- <same paths>`. Include final task/evidence content and all affected main/navigation documents. Report statuses and unique record_path directly; subsequent edits invalidate their original content identity.
6. Behavior red/green, unit/API/browser/database/model/device qualification, generated clients and preparation are not applicable to documentation-only relocation. Do not convert source or static documentation checks into runtime guarantees. No commit, deployment, archive or further capability decomposition is included.

## Proposed Purposes and Owner Counts

Retained Purpose text below is applied directly to its main spec; new Purpose text is carried in its delta.

| Capability | Requirements | Scenarios | Purpose |
|---|---:|---:|---|
| `recipe-library` | 46 | 100 | Let household members browse eligible reusable recipes, read stored detail and summary facts, and navigate list or stack presentation. This capability retains catalog eligibility, persisted fact representation, readiness reads and vegetarian fact classification. |
| `recipe-editing` | 25 | 54 | Let household members edit existing recipe content, ratings, notes and discoverability, preserving the supported partial-update, persistence, search-invalidation and file-projection boundaries. |
| `recipe-media` | 12 | 27 | Let household members view original recipe sources and photos, obtain recipe image assets, append original photos and request hero regeneration while distinguishing dispatch from completed asset delivery. |
| `recipe-recycle-bin` | 13 | 31 | Let household members move eligible recipes to the Recycle Bin, inspect and restore deleted recipes, and request PIN-protected permanent purge with existing eligibility and failure boundaries. |
| `recipe-search` | 39 | 90 | Let household members search and filter existing household recipes, retrieve and rank candidates, inspect Similar results, and continue or recover result navigation using published search state. |
| `search-indexing` | 10 | 19 | Produce and repair published recipe search documents and materialized filter and affinity state, preserving lexical availability, embedding compatibility and superseding-content guards independently of search requests. |
| `recipe-quality` | 28 | 74 | Let household members report and review saved recipe issues, request eligible contextual re-import, observe attributed attempts and explicitly resolve reports without conflating feedback with failed-capture management. |
| `capture-recovery` | 16 | 37 | Let household members inspect, retry and clear failed capture workflows and request bulk imports for unnamed stored recipes, distinguishing workflow acknowledgements and summary counts from repaired recipes and completed cleanup. |
| `household-identity` | 12 | 37 | Establish shared household access through passphrase entry and member invitations, apply household access-cookie and API authentication rules, and hand accepted access to separately owned member-context selection. |
| `household-members` | 14 | 35 | Let household members create, rename and remove household member records, with the existing validation, response, pending-feedback and identity-handoff boundaries. |
| `member-context` | 16 | 33 | Select and recover the active household member and carry that context through browser and server requests, preserving the distinction between context binding, member existence and shared household access. |
| `data-backup-and-recovery` | 24 | 58 | Export and reconstruct retained application data, including report and compatible search sidecars, while preserving current merge, legacy-data and partial-failure boundaries independently of scheduled maintenance. |
| `scheduled-maintenance` | 5 | 14 | Schedule and compose recurring application maintenance, process due maintenance commands and write local reports, distinguishing launch acceptance from child workflow completion and cleanup outcomes. |

## Source Identities and Complete Requirement Map

Canonical block SHA-256 uses UTF-8 `block.rstrip() + "\n"`. Sequence numbers belong to the recorded source only.

### recipe-library

Source: `openspec/specs/recipe-library/spec.md`; SHA-256 `87b9a07f8973cb673f5d05e825328c794c0c8c515235dd3dab4ad430efb2142d`; 96 requirements / 212 scenarios.

| Source # | Requirement title | Destination owner | Scenarios | Block SHA-256 |
|---:|---|---|---:|---|
| 1 | Open the household library and offer list presentation | `recipe-library` | 2 | `f281fb363b4741da8d281f87543738def5e46790b30e1a12e0238a8fae1d1f43` |
| 2 | Return only eligible household library recipes | `recipe-library` | 4 | `da96bd3394092c7d543a742d695227c9b31a431d011106dc95ba5ae8460afc4e` |
| 3 | Return an explore-ordered library page | `recipe-library` | 3 | `df61e166b9bf2a8a92b9767fbe403a6b2024fdba51efd181ed0607a76283f8c5` |
| 4 | Request list pages for the selected library filter | `recipe-library` | 2 | `2a7159489f8c33c403ba7dec7ecab36b1e3af7cd80553f9ba4e08a0614666402` |
| 5 | Display successfully returned library items | `recipe-library` | 1 | `441dc424a3f23973aa82f820bf3ec4a1d37254df0008ed9178b83fa168a40ccb` |
| 6 | Request and append additional library list pages | `recipe-library` | 2 | `0754c4a8f02752cfc194afc35a8585d3cea66165545362222a13e2c941af8b87` |
| 7 | Show pending library-load feedback | `recipe-library` | 1 | `c140fb307b48a812a0eaca2e878cc0ae56f837b876c976fa555a58a21407ed25` |
| 8 | Show an empty All-mode library result | `recipe-library` | 1 | `1f950e3351621c3deab0d2d73132d63134e92ad60cbcf7d6a86f63f6d2cf00d5` |
| 9 | Offer retry after initial library-load failure | `recipe-library` | 2 | `3069d8d7a30dc9caeac3deece0fc3f4b92edd461098327857965f5ad5d36dcb3` |
| 10 | Retrieve the selected library recipe for detail reading | `recipe-library` | 1 | `4ae71814065d71c91073590fc11162e6653023353acecac01252ce7bb9c14f38` |
| 11 | Return persisted recipe detail for an available record | `recipe-library` | 1 | `3061598436eb77cb6c4e98a877336e26de281cc1e74736cb73c146b7d031c103` |
| 12 | Display returned recipe text and image reference | `recipe-library` | 3 | `c967810e91caa27a493047d1b1336aa4b278a785f810c693d27fd4f9ce298888` |
| 13 | Display available recipe metadata in detail | `recipe-library` | 3 | `77261ce487d203c87d3dc7baa86c9e611d51db394b6c999035640ebda664df00` |
| 14 | Display returned ingredient strings in detail | `recipe-library` | 2 | `cb0b4b1bc091bee8674e7fb9a0686f433f4ec352f260855b7347b8f0ee0b9879` |
| 15 | Show pending recipe-detail feedback | `recipe-library` | 1 | `7d42b3d658b8f453dbb21ca980962b7572fe20f3eb12406f35b1cc49fee5ad80` |
| 16 | Dismiss recipe detail back to the loaded library | `recipe-library` | 2 | `98e495e1c1a6d9d1d96b487a9c7d7465185f429667430432518144fb05288b34` |
| 17 | Open initialized recipe-detail field drafts | `recipe-editing` | 2 | `64bbbf4f660681805608b37eb4bdd773e5dd835f2020c04b26d924165c84c0de` |
| 18 | Edit ingredient rows in the detail draft | `recipe-editing` | 2 | `cb86636ec1f9067f0f232f5e579b121297dfe652cde5851efdac5dfd03bab07f` |
| 19 | Restrict local detail Save eligibility | `recipe-editing` | 2 | `1161e83a3970037d3be4d8b06793cbd37db5789e9ed7172e006d939265d13066` |
| 20 | Submit normalized detail fields for the loaded recipe | `recipe-editing` | 2 | `f221bbc4c51f81e4b0f982db409a245294b31cd85153da3f6949aec293a2bdd4` |
| 21 | Apply supplied non-null recipe-detail update fields | `recipe-editing` | 3 | `15db9de1ded7a54c71d83060e89c3ccd25072fc52a2b2f4f23ec8cd0c9d8ebfb` |
| 22 | Show pending detail-save feedback | `recipe-editing` | 1 | `8ac810679368bed06434f1b6442b4738e8eb89c18ab18bf12d7ccbacc1a3d34f` |
| 23 | Discard unsubmitted recipe-detail drafts with Cancel | `recipe-editing` | 2 | `3f2ba4ccfa12bc3bc0d87d055208c7f976aeed078d184ec69c573185265675c7` |
| 24 | Display the submitted snapshot after successful detail Save | `recipe-editing` | 1 | `2079d85450e970315898b9a044e6d9edef27f13fc6b5e9f971ecad69ab11b354` |
| 25 | Retain editing and offer another attempt after detail Save failure | `recipe-editing` | 2 | `07f528a7b0268500d49b425f62588f9da682f1622bbf2675064f7d847736e36c` |
| 26 | Initialize recipe-detail ratings and notes controls | `recipe-editing` | 3 | `e2a1f7699a1e46aea40ed9106d0b4b4a83db1deb2336cc30184d4f257e4dc651` |
| 27 | Select or clear the loaded recipe rating | `recipe-editing` | 3 | `3c60ebe2a0a761e8d64752c6081b136de0b89ac438747cbd3a009e461aeb6bbe` |
| 28 | Submit changed recipe notes after the editing delay | `recipe-editing` | 3 | `c3b6e9a50c62e730c5b1b1a2321ad008ee0af578e646b591612136a6e357e686` |
| 29 | Persist supplied recipe ratings and exact notes | `recipe-editing` | 3 | `6d918b99c9ba4f7d26306f6eeffb434fd274ea9f5f65086ef3ab61ecba647dc1` |
| 30 | Preserve omitted recipe content during ratings and notes updates | `recipe-editing` | 2 | `4cfe862cf748d9fd319c61e351165751a2fcc6d2f74493e17f8616c2d1f2cabb` |
| 31 | Retain local ratings and notes display on successful completion | `recipe-editing` | 1 | `f6cd87a22f8a6e09680f55b87f25ccee7893bc63aa52f17f8b38245da60f5da1` |
| 32 | Initialize the loaded-detail discoverability control | `recipe-editing` | 3 | `386ede38eb1a5ea06fc2d76e701e2a97f245798b22f80c81135847aaeb2ef012` |
| 33 | Submit the inverse discoverability state for the loaded recipe | `recipe-editing` | 2 | `a674f4f63b136cbf868a14733950642dcc58bb3175cedb58390a1390090f5347` |
| 34 | Persist the supplied recipe discoverability fact | `recipe-editing` | 4 | `e1acd66ce5845d1b28765e47dd91866a38b946185fd792105f666f1e4f089ac7` |
| 35 | Disable the detail discoverability button while pending | `recipe-editing` | 1 | `71276a2d2e48b1234d28f6158c2e1e73916705dc057e03e616029bd9c41cef1e` |
| 36 | Retain the local discoverability display after success | `recipe-editing` | 1 | `eff165fb941132feaa9ca5eb81cbd1807d6572d4f961c1b2c41eaecf89d8e9d7` |
| 37 | Restore local discoverability after rejection and allow another activation | `recipe-editing` | 2 | `fdfb18dd8f0b72ada63a1658a412789d63d9d68260726f66641dce86c480b97c` |
| 38 | Offer View Original control for eligible loaded library recipes | `recipe-media` | 4 | `96b58e4c7a2527f3687a86b24282c1e238b43a507780d0bab527782039d6985b` |
| 39 | Open external source URL in a new browser context | `recipe-media` | 1 | `594498227cfdf92066036b159118e3db41d1d12b294def5cbd8edd28c7caf60b` |
| 40 | Present original photos in the photo viewer overlay | `recipe-media` | 3 | `ba2d3ad5bd145630c16f7dffdf90f69bd642cd69f1c1dd7ca5aafa58cbd1560d` |
| 41 | Navigate between original photos with wrapping | `recipe-media` | 3 | `243bd61994b1b4bceadb5c5e3979318cac035d97df52be209ecb34ce0c43d23c` |
| 42 | Support photo zooming and panning | `recipe-media` | 2 | `e270f76dcd884f75d4641a0f6a967fffe2da8ec5f28d155c1d830fb14ebed96e` |
| 43 | Dismiss photo viewer and retain detail state | `recipe-media` | 3 | `8ad8c8669b72e071715525f17cb8ed46a065ee76d53b245fdea1994b944d32f4` |
| 44 | Serve raw original photo image binary | `recipe-media` | 2 | `104a27a497f8bac71e5b80136adb2de3dc66caa23fc8e9d59fe33bec6bee01d9` |
| 45 | Offer Move to Bin control for loaded library recipe detail | `recipe-recycle-bin` | 2 | `fa762db2e66ca07fe5f11c1ccd2bd0a7e86fe51e9e3b8a9992897c117a870432` |
| 46 | Soft-delete the loaded recipe when not assigned to active planner slots | `recipe-recycle-bin` | 2 | `eb2a62902c69a99ff44b2c6805fdd2792144b7772be8acff48605c92f8ff1346` |
| 47 | Reject soft-delete when recipe is assigned to active planner slots | `recipe-recycle-bin` | 2 | `0e9ba4f2245ef0617fedc82d9f9cc81f952089a953e8604e0c2ef785af6238de` |
| 48 | Synchronize library view and dismiss detail after deletion | `recipe-recycle-bin` | 2 | `2fa483c30f7a1aec92875736d9c728a93a9c9fa0098fa1e60a809f904daef443` |
| 49 | Exclude soft-deleted recipes from standard library listings and search | `recipe-recycle-bin` | 3 | `364fe36ee5191c84bed9be7f3691f0e71195f3b6e4736b98a4184768d37bf00a` |
| 50 | Open Recycle Bin sheet from library browse header | `recipe-recycle-bin` | 2 | `bc0758ee7c7b05b1189222df8cce43499bcfba3f037e5686eb7c559f6a92aad3` |
| 51 | List soft-deleted recipes in Recycle Bin | `recipe-recycle-bin` | 3 | `eba1f7b382ab44e0728c618e5eca3a5eb511584dea0df96b9206fa9a4c29bee6` |
| 52 | Restore soft-deleted recipe to active library | `recipe-recycle-bin` | 3 | `0e6058cfac68efbb2640ce80d06d0b45d6b0e4d1e3dd44d03895873ef712806b` |
| 53 | Present elevated PIN dialog for permanent purge | `recipe-recycle-bin` | 2 | `91d2e4e6b8c0f3edebce551d79efa5dbacf33796ad33314e45c6a9dc2b8ad236` |
| 54 | Permanently purge soft-deleted recipe with valid elevated PIN | `recipe-recycle-bin` | 3 | `8782c7130f33f6ccc32e6f14c3f15ae70567d6971d14b0aabb0fcbcf30d3ccaa` |
| 55 | Reject permanent purge on invalid PIN, missing configuration, or non-trash recipe | `recipe-recycle-bin` | 4 | `0564a20176834ecaa40cd243d86cd6e1aa56a748e9155f918c88415c2ce4fc67` |
| 56 | Return eligible library summary counts | `recipe-library` | 3 | `11d6fe4f1d3b9c01b91138711380c98c94be70e9a76cf77d30ef7f03d8740989` |
| 57 | Report never-cooked and persisted rating counts | `recipe-library` | 2 | `3d2db92a0954c59d95c23c6bdc2cc4009c6e55b6aee18eea4bd5f1b2847cdcf5` |
| 58 | Represent successful library summaries including empty collections | `recipe-library` | 2 | `ef999dea2ea4fa5a5c65a0a2c403c5880ea2ed43480ea50908d076cfae656a27` |
| 59 | Retrieve summary before the Browse first page | `recipe-library` | 3 | `b070fa996070dd93aa2ae8661941df071a66b84aca81c6466d9e3b71b5e5e2ba` |
| 60 | Select the initial Browse total by collection mode | `recipe-library` | 3 | `e48020f50a8f1232fd95e62de90763fdebaff9e14646e8a73516068895585f33` |
| 61 | Initialize Browse pagination from the selected count | `recipe-library` | 2 | `3846fa2cdf7d43a849585fad48adeda6a1098ff52cbb2436d56c11d52410bc90` |
| 62 | Offer and load library stack presentation | `recipe-library` | 2 | `10a4def0b0076ad2c2dc1d0896fcc8d2bf422124a2197a0b50e0a3a9c663501d` |
| 63 | Present the current stack card and visual depth | `recipe-library` | 2 | `a53df6bec69b7883590b844bf411affdd6423d65626fe8810e53fd8801cc8698` |
| 64 | Navigate loaded stack cards with directional swipes | `recipe-library` | 3 | `0fcaee680e242f96007d6ae6dad77905494ba0c6ec6dff71878807baa2b97266` |
| 65 | Open front-card detail only for a tap | `recipe-library` | 2 | `224615398de5202d6f0f766f21159f977784ecad9e08ae6b369ca720941059dd` |
| 66 | Wrap stack navigation within available results | `recipe-library` | 4 | `09c1707b7f6a04818cd0a3f9bfeac3c491b226baa22fb5a57c5bdbb960f25f82` |
| 67 | Bound empty-page probing during backward wrapping | `recipe-library` | 1 | `a3e2e625e8efb03dde6d93d283d4bac0fed256f3556f3e3b6c0c050a123ca8e6` |
| 68 | Prefetch additional stack pages near the loaded end | `recipe-library` | 1 | `15f1609e3a144ad6b904ee3ca73e1a3a5ba8179f023e96940a14895524cce36e` |
| 69 | Display the loaded stack position against selected total | `recipe-library` | 1 | `527f1542eb89bf059697f9e98f37609eb11939f8d01c8ca7b5383699b23e596e` |
| 70 | Toggle front-card discoverability with pending feedback | `recipe-library` | 3 | `f6fc6def04aae89381ada7950dc0f83c21e3ff9dce8b816732126c2114805fb8` |
| 71 | Leave the Browse overlay through its navigation controls | `recipe-library` | 2 | `6f4395615eee3be51da88d78e0ab16d7a954d811512befbab45b4fb16a8b6a35` |
| 72 | Show directional stack cues and request supported haptics | `recipe-library` | 2 | `568c39dbddcef06574fc6548f97c90fe68067a1d5ec3749f91941620b9423f92` |
| 73 | Return newest-created library pages by default | `recipe-library` | 1 | `0207240b37f4d15a63b7a3177ae80ac8405b4374c594f9de6f0a4844c0ec7f4c` |
| 74 | Constrain library lookups by supplied predicates | `recipe-library` | 5 | `145a9010955fb3327177ec111f206f7031acba186f7d7ef279021fb5687987ba` |
| 75 | Reject unsupported library order parameters | `recipe-library` | 1 | `319755000d16bed101af6212984fa304a9c13006c6521107f9d2d74a50e38f7f` |
| 76 | Read stored array instructions through recipe detail | `recipe-library` | 2 | `79416ecb939392a5e767e477040dd1d0664ff312c0a36a8eb2bfc49525283e9b` |
| 77 | Replace supplied array instructions while retaining other metadata | `recipe-editing` | 3 | `0dc2f00dcd21d4431fa746cd51fbde8c785f33c85e82ef0d0158efd414d59930` |
| 78 | Represent persisted recipe attribution and readiness | `recipe-library` | 2 | `61a430d838c09b7f678ec07f4feb6da079f1f49974ecbcc6dbf72b1ad71c9937` |
| 79 | Derive represented source provenance and reimport availability | `recipe-library` | 3 | `811ca51ed4635e59ab2360f1ef4e9ba00a40eb4b8db6a990fd36c8a17ff01466` |
| 80 | Represent the persisted vegetarian value without dietary inference | `recipe-library` | 2 | `a02e01a990a68cad5e362ca262f5c79885408887d15e35d709a2da08653f7c0e` |
| 81 | Serve an existing hero asset independently of recipe DTO reads | `recipe-media` | 2 | `438ff0811566a63e83515b0d5b78839c8cc704dab260ad91eeb48073d5bd2e52` |
| 82 | Append one original photo to an existing recipe | `recipe-media` | 2 | `3c8aa6e2c597933e567f647f140bd0c0a72d5dee8ff79101893e17aed35a89e0` |
| 83 | Dispatch original-photo append from detail Edit | `recipe-media` | 2 | `b22436e9099b03fc289b0b82175349dafab9b96b3b2fa17815f92ab7b0e1b237` |
| 84 | Accept an explicit hero-regeneration request after dispatch | `recipe-media` | 1 | `fcc3a3a1d1f2f6f54277c9069d235f8845c3e6f98238e4ee49b7261b88cebb5e` |
| 85 | Show immediate regeneration-request feedback in detail Edit | `recipe-media` | 2 | `18e118eff40e87d086202537ce2032424a0b18d2ad815a0555b7a8400bc7d4fb` |
| 86 | Mark search-derived recipe state pending with supported updates | `recipe-editing` | 2 | `2d8bb8693bfbda3bf8a5b51cce8bef362664ff3db20a870f550fb65775be6c48` |
| 87 | Attempt one index dispatch after saving a supported recipe update | `recipe-editing` | 2 | `60c34671f1ba063f4f0c88d17f3145ff99c3cf1a59cfabe5c1617919d6ec0614` |
| 88 | Write the supported recipe-info projection after the database save | `recipe-editing` | 2 | `23d53cc381d810d5986fd8ab8cd633a15e6713dd06fff997a50ad783aaf27c89` |
| 89 | Read the persisted recipe readiness status | `recipe-library` | 3 | `0d9a8c55136c29ae0d8b93e083187b00de0a4ac1d2b8796213b0ba36be18a6ff` |
| 90 | Reject status reads without an available recipe | `recipe-library` | 1 | `0d724b18822a1ef078834678af71d98da2f30fc7a32c2157315ad0bc7607f030` |
| 91 | Disable the restoring trash item during its request | `recipe-recycle-bin` | 2 | `f00ea141cf1e385bd142af8f67243215ca31f28546794ec2e39f13bf6cbb832b` |
| 92 | Display pending permanent-purge submission feedback | `recipe-recycle-bin` | 1 | `44903eb6bcbea739d00197c39ce314e24f64487260a1d2086628dec9a97526a8` |
| 93 | Classify stored vegetarian facts from ingredient evidence | `recipe-library` | 3 | `101c3714af3ed596f60e2d1a3fa75130d0956a65d7d85179f8a0732dc9091842` |
| 94 | Preserve confirmed facts when classification is ambiguous | `recipe-library` | 3 | `3217feda3cf1031e47f81a0341a8acfd8a216a4e57ff8da114fff577824e4e10` |
| 95 | Queue bounded vegetarian classification batches | `recipe-library` | 3 | `897ea06b805253f7f370634c85d8972ecf2c18ed0304c135b5adeed009e5acb9` |
| 96 | Distinguish classification launch counts from current facts | `recipe-library` | 2 | `8ee42102784f9d0944a3c6992e82593649203d3d4e1a200efdbe7f5aad3101b7` |

### recipe-search

Source: `openspec/specs/recipe-search/spec.md`; SHA-256 `6e9e52e95337e5507d7139bcd278848eaccb1a485498a75cb39d510077c16f72`; 47 requirements / 105 scenarios.

| Source # | Requirement title | Destination owner | Scenarios | Block SHA-256 |
|---:|---|---|---:|---|
| 1 | Enter Search with optional planning and detail context | `recipe-search` | 3 | `a1363cb320e3845b326789c333cd1b36db23fa26d63c41dfe05cb23950d14955` |
| 2 | Submit typed search after settling or Enter | `recipe-search` | 2 | `4cfbf42467339684ee738329159ccac00ddec73736142e28b1f21702c915402d` |
| 3 | Represent search results and loading feedback | `recipe-search` | 2 | `90da63ace587f3eb5a72fe7012adf30cdc6034d9afbd020c009fd54d97a5bc92` |
| 4 | Offer recovery navigation for successful empty results | `recipe-search` | 2 | `33560ff92b199f1872167f9d99230285b46629c2b11b52b995e1f21bceca84f2` |
| 5 | Return from Search detail to mounted results | `recipe-search` | 2 | `4f74dcea742c891f3f38655c4520a4cd888e0d5b55020fc824854711ce0983d7` |
| 6 | Refresh Search after a successful detail deletion | `recipe-search` | 2 | `05ab15a1a62e6e2dc2aea3866bc668be99455363de2688558b3d932ff6439ed7` |
| 7 | Apply or discard filter drafts | `recipe-search` | 2 | `ae24d4f0c8775531dfa0b3d9a02d63f20e6533c9efa349a6a72fe39913b223b4` |
| 8 | Clear selections without clearing the search text | `recipe-search` | 2 | `3560d9dec370e7598d57041ab7681681a63bd93119fca8ff4509a3cba8a3922b` |
| 9 | Expose supported shortcut and grouped controls | `recipe-search` | 2 | `7cde37df36505974b1c98e334c46da5965439d6e6f61e1a6b08215e0ccc22023` |
| 10 | Separate Focus preferences from hard selections | `recipe-search` | 2 | `5f9b52518e64f51f000d81b334e2bac756d29cb580d6a533475eacf13e1686f7` |
| 11 | Constrain cuisine and meal groups together | `recipe-search` | 2 | `aae94df027b7fa7513da7561481d27a4b3e2fff88dfc4fae20d0f2b00c8a37b7` |
| 12 | Apply supported boolean filters from stored facts | `recipe-search` | 3 | `783add772c7daf714b0fe24ff2ec8db53abdae04aaa544775887e4bdec2b08cf` |
| 13 | Use report membership without a separate review route | `recipe-search` | 2 | `5ada7d673383dfc9b3d98af45ecd7b53df9bea407e819e7193e98a677b2a6823` |
| 14 | Keep mounted search state through detail and chooser use | `recipe-search` | 2 | `184a57e82c8136e854c23150a1d1c93e25860d0945a2a856558e58ae765960c9` |
| 15 | Load filter vocabulary without blocking built-in choices | `recipe-search` | 3 | `1740b02ac12803431df1826dc71a2e95912f348e75186daa5c4c336b0ce6c059` |
| 16 | Use validated filter configuration defaults | `recipe-search` | 2 | `f30c4482ec5818c83be7d1c9ea533a5297cc004cf756e7a2471e3088e3ba34e8` |
| 17 | Choose browse only without usable search content | `recipe-search` | 2 | `9825fa5590447f37fcffb6aec46d4eaaca7b2fb8cb68ea916666d195c7309627` |
| 18 | Retrieve typed lexical candidates from published documents | `recipe-search` | 2 | `9139c2c21280fbc846227df579802f7ccd4649822b8b40613913bdeb75e478c2` |
| 19 | Attempt compatible semantic retrieval when enabled | `recipe-search` | 2 | `36e7558728f59ac64ca33869ea245138c5367305d485570159ce97668ae0d48d` |
| 20 | Use Focus concepts as semantic search content | `recipe-search` | 2 | `9cda4a62a9d07074b6e07a04d398bb90979265f005d9d82ec870ce39e42015c3` |
| 21 | Fall back from unavailable semantic work without promising relevance | `recipe-search` | 3 | `d9925cf743e886de9b4d4193deb8b5f466b889bb73e4274cc180494fb4928bb0` |
| 22 | Enter Similar from loaded detail | `recipe-search` | 2 | `59b65607ea89ba4fbd9f4b55328aa625e6acebf673ff2ef6e370218fe1f94566` |
| 23 | Rank Similar using source recipe facts with lexical recovery | `recipe-search` | 3 | `b55511d59743f6a2e55b6ad25c11332a20af516f729e3b35ef7550eaecb00c85` |
| 24 | Keep semantic availability a serving option | `recipe-search` | 2 | `a59a8c8867a171b3fdd223193a0cc354acd186f46929f59a5956885db0aade14` |
| 25 | Combine ranked retrieval candidates by recipe identity | `recipe-search` | 2 | `a41a8ef8d598887d10e97256c4f5d18161282208748c2336889aed4c6cde0502` |
| 26 | Keep browse rediscovery eligibility on the server | `recipe-search` | 3 | `1a2f6ddef89e02c5466462d672d3690559f4d5fd632dec60ba9732dbf8016b96` |
| 27 | Order browse promotion before ordinary rediscovery | `recipe-search` | 3 | `f1aa94c47f94e8a0f9ddd26165aa4261cac138189a2e35b444d498c29d6d786e` |
| 28 | Apply family signals only to retrieved standard ranked candidates | `recipe-search` | 3 | `5fe7b3ebff67e92a976561ecac8d9e9b6e90bc07970cc8320da9d690342d878e` |
| 29 | Demote ranked candidates already shown in the target week | `recipe-search` | 2 | `3091322215aa23a77c15ab8e214e4271917bccda5449e94b25ffb7d9351c445a` |
| 30 | Select ranked Top Pick separately from browse promotion flags | `recipe-search` | 3 | `bda981656c568a446ab9841702e1015cf219b417b0a078a0a57d88c744f7c97a` |
| 31 | Use server eligibility for local Surprise Me | `recipe-search` | 3 | `772f8ff90d93e2a512760be4e60424f244c34b7d2471cb037f87b5dc417298e3` |
| 32 | Bound alternatives and reject unsupported requests | `recipe-search` | 3 | `b3608a60170da75e75af2bff94c0fc300bfd97781c76b6a5a92de24f230589f6` |
| 33 | Load continuation through the result sentinel | `recipe-search` | 2 | `8bcace39d4133d790d6e6e3093d9ce2b59380ca73264363338e6cade21772ee3` |
| 34 | Append current continuation without repeating loaded alternatives | `recipe-search` | 2 | `5d310f1fd98346aa965bcabd89451bd336e5d8c41d9f9abbf188f73bce1b6669` |
| 35 | Keep ranked continuation eligibility narrower than a fresh search | `recipe-search` | 2 | `95e0768bfc76138f4a882fcdd653ddc39ed90f4122f95c190fe9b9a3eff6a83f` |
| 36 | Reject unavailable or incompatible continuation state | `recipe-search` | 3 | `5bf2583c1ba356178bdbf6dbf2cf6ebc6b60ce8f28759d8fbb3b63bb8fe79304` |
| 37 | Retain cards and expose continuation retry or restart | `recipe-search` | 2 | `78a734933c83d9500d1f71d8e06e4094f634cf856eee6d61a6bdeb6b5a93681c` |
| 38 | Suppress obsolete search success without claiming network cancellation | `recipe-search` | 2 | `ab1fdbe282becd36b22aff76fbe51d7c5b207d55d90b0f1156889862cadba783` |
| 39 | Restart mounted browse after received promotion invalidation | `recipe-search` | 2 | `f3e7c8cdb260a4f99686d1340cf39261b139190564b22987388d13637ed8d6a2` |
| 40 | Materialize affinity from eligible stored recipes | `search-indexing` | 2 | `83292521e326dd5bf7d661c90000d90bbcba000caf40617b28e0f9be18b5ab61` |
| 41 | Materialize deterministic cuisine choices | `search-indexing` | 2 | `0b1e7cbe08fc1a0737c0448e706dc1886a7e0bcb4133ac43c7673dfd23fab7c2` |
| 42 | Persist filter snapshot and facts as one materialization | `search-indexing` | 2 | `52fef67f93edc33c999067b326ca2b54934fe25c49d97a09a88eb17a1e13e881` |
| 43 | Initialize filters after overdue finalization | `search-indexing` | 2 | `ac113fb41b25983372a27a808e70c738aca47a9376d975b2f46fa18e9027380f` |
| 44 | Skip obsolete or contentless search index work | `search-indexing` | 2 | `0f8746d1bbb0345a18edc631818de213463f41981ddbbe77b54101de63c8667a` |
| 45 | Publish lexical content before optional embedding work | `search-indexing` | 2 | `ec6b0dc24ff3ee960a123cd806d207217f4c360185a002937ac5f8a45ae8289a` |
| 46 | Protect superseding search content during embedding publication | `search-indexing` | 1 | `a4d80daf3c820bcb8aebd701c158bba32858e8322be443e27a3d96baf4fcfda4` |
| 47 | Retain lexical content when embedding work fails | `search-indexing` | 2 | `9b07bd46f8cabbdea62d553ff58e72ffcf76c2e25c7f7e93befec96a395a2cf3` |

### recipe-quality

Source: `openspec/specs/recipe-quality/spec.md`; SHA-256 `8e564c9f00e9ee157cfff812c90d8d23c343d0a99a529143c9512c2d751f61c9`; 44 requirements / 111 scenarios.

| Source # | Requirement title | Destination owner | Scenarios | Block SHA-256 |
|---:|---|---|---:|---|
| 1 | Offer reporting from loaded recipe detail | `recipe-quality` | 3 | `e952ac2ecd0fdef8757661a2787ebb1b8ad5978a2f813c6b6970bc8291a9eccd` |
| 2 | Dismiss and reopen an unsubmitted issue form | `recipe-quality` | 2 | `fbbce2fbfec220d9d66f0ba6eca3d525b9acf234f78b0584feaa186e4184b382` |
| 3 | Select issue reasons and an optional note | `recipe-quality` | 3 | `692c6dc4e69cd3578404b61e7b8f3b30b9ab79ca2612ac0db37af910e02553c9` |
| 4 | Submit feedback through Save with bounded pending feedback | `recipe-quality` | 3 | `9d8f9bb19660307debfdbac916699f643640d64b501a5aecaa51ce17cb758e1d` |
| 5 | Retain the open draft on submission error | `recipe-quality` | 2 | `4b14e41806c70bb5777105e93407f299f807658452382c8551da38627445d5c9` |
| 6 | Validate report input at submission | `recipe-quality` | 3 | `83f2672ec31e6d27568326958e83a1645d81a59f9ba1316bbde0a582f47b20c6` |
| 7 | Persist recipe-level feedback before attempting re-import | `recipe-quality` | 2 | `cbd4c109fa61cdc6f9e2296238a31d6add97d0ca8215473b203f4420bc529c94` |
| 8 | Let the server decide whether feedback requests contextual processing | `recipe-quality` | 3 | `e45b44adb2ba06bfdfdf96ce40561c89cdeced7c3f88b42952b54eddb4102077` |
| 9 | Reuse active feedback and avoid unchanged terminal retries | `recipe-quality` | 4 | `aabfb2069b6db794958059e388b327701e348f37baf8d48621b7566b18f2e921` |
| 10 | Apply the authoritative submission result in detail | `recipe-quality` | 2 | `f0ea786cd393a5232da7aea5cbebd78d649c4353af55173cc9ed31a2e0fbebb2` |
| 11 | Observe a returned import ID while detail remains active | `recipe-quality` | 3 | `9b8a1ba9080ae806aafaca856a21c4f1cfc7e0b00a0edd5eaec2b0bf9b5a8e59` |
| 12 | Expose guarded contextual processing outcomes | `recipe-quality` | 3 | `224236859d5285cdea79b4258278c4fdf8f426dcc6b4418a95c2ac465e44e2f4` |
| 13 | Display returned issue indicators | `recipe-quality` | 2 | `0b00d84440c42be0d6b181d200fd9439dbaf4d091d7b0f8ae9adda6154c95189` |
| 14 | Discover and apply recipe review filters | `recipe-quality` | 4 | `23e2242b0b9d8b0432ac39de33c719256e7fcc39af6a6cab44469442733c3398` |
| 15 | Select saved issue membership for review | `recipe-quality` | 4 | `39c25390db74b03a37099ae2f8fa09e0706b1610c93db6c3ffa722ae4ff59ba8` |
| 16 | Present review matches as ordinary results | `recipe-quality` | 2 | `2b865048076744c231586cd967ef749fd82ed12bfe324cf45f20d426aabe35b3` |
| 17 | Offer explicit manual resolution for an existing issue | `recipe-quality` | 3 | `0da3f360dd1ef3f4f1d1d0b0b17c1c21f92a3d224dd433c4caa1713971c5c728` |
| 18 | Lock resolution during submission and contextual processing | `recipe-quality` | 2 | `8adde0ed6b90b419b7f4c278031450776bd79bcfa980a7cc5faddc80170e12e7` |
| 19 | Address manual resolution to the loaded recipe with member context | `recipe-quality` | 3 | `96a136e86b9523e6d5b6d929aa442ec3195416fa4def8a8bf8b6a551aa568488` |
| 20 | Remove saved feedback through repeatable manual resolution | `recipe-quality` | 2 | `41d3d8b959844890c5069b0f9e26fbcbeebe1c82c2504b43114f2cf7beab8b9d` |
| 21 | Reject resolution while the linked contextual attempt is active | `recipe-quality` | 2 | `238df3b12c24e3e415c5013132cf6a35c08a29cd38b3f79924dd7dad7617ed86` |
| 22 | Apply successful resolution to the open detail | `recipe-quality` | 2 | `6e184fb8109740a6aefdf9dcc44ff5ae8d8ba10b0b16c434c3a92bcec78aa07c` |
| 23 | Retain the mounted issue draft after resolution failure | `recipe-quality` | 2 | `49dba5bb35a46686c97a03f3d017a52a930a49c22f609e987de196fc53fd4737` |
| 24 | Reflect persisted resolution in subsequent successful reads | `recipe-quality` | 2 | `6789ef769af090d3088cf990b977c4b22e926c0c4edba4de9ac75bcef943dafb` |
| 25 | Enter failed-capture management through Settings | `capture-recovery` | 2 | `7c530d087d4e52e1cdfde71f490c2dd9dc76af9fa6d010fcc68ca3d9db215eeb` |
| 26 | Show failed-capture management only for a loaded nonempty list | `capture-recovery` | 3 | `ee9a5cde6a999bfd924ae42d46e28608a8f099f3b289968b2ae66d60974cd666` |
| 27 | List active paused capture failures in update order | `capture-recovery` | 2 | `5b555b7b9e7c58027d9b4a99607a23e288a215e9290d644dde53abc04b85dcd2` |
| 28 | Present friendly capture-failure guidance without raw diagnostics | `capture-recovery` | 2 | `f485bbf046557cfd611144636ba9b4df731c1af98f16482c3c00ffdacadfddc4` |
| 29 | Address capture retry to the loaded workflow failure | `capture-recovery` | 2 | `412c340febc31294baf5be55b975f4cc0cd891cd944d82191981a0abb4dd68e8` |
| 30 | Retain failed-capture rows after rejected retry | `capture-recovery` | 2 | `ad103efe5565735b6c8ba4399917a0df1866aa48a5726205770a3958bd049d23` |
| 31 | Accept retry by resetting existing failed work | `capture-recovery` | 2 | `429fd729f6f487b08ba1a053b50adcbe7025842c8e139f1e652f035116eadce3` |
| 32 | Confirm and lock failed-capture clearing | `capture-recovery` | 2 | `b58f2b73d04e5e3a939190de9c0bc09cc44cf504a3eb22478c466b330ef50cc5` |
| 33 | Apply clear acknowledgement to the loaded list | `capture-recovery` | 2 | `2ba685745f20c1571c261544e1b447eb3ce2eb2338e9339cf8f13f115e3883e5` |
| 34 | Retain failed-capture rows after rejected clear | `capture-recovery` | 2 | `0e5f1173fd85b1d1576b24f602cbafbbdca4e9863e07e9452679333fc7b17e9d` |
| 35 | Persist clear and return queued cleanup identity | `capture-recovery` | 2 | `4feb32f3368599725826f85dce510538111755b22cc365ca28ee49a135cce68c` |
| 36 | Protect usable recipe content during failed-capture cleanup | `capture-recovery` | 3 | `fbbe88c53dde6616be3d85682b45e1b4c278277160d3773e6cf2577adf8a6be8` |
| 37 | Distinguish subsequent failure reads from stale mounted state | `capture-recovery` | 3 | `8b340637222e7e6c01c52e6e1cac05161e4bbd0f4c836bc0ce263844d8a10a8f` |
| 38 | Merge contextual issue reasons with loaded saved feedback | `recipe-quality` | 3 | `e3245033bc683c97134c65d0437b40055af897567845fde88cd2d71b041a6432` |
| 39 | Offer failure reference copy controls when identifiers are returned | `recipe-quality` | 3 | `7aecc2bcf96d9372d9273eb1cd1ddc8658c2c88a8cbe11382026acb38e9d6dc6` |
| 40 | Acknowledge successful failure reference copying | `recipe-quality` | 2 | `9929f0cb07f6bdd220f7dc750503a1048130b2321300f0931a89253c0fe0d4e6` |
| 41 | Select unnamed stored recipes for bulk import requests | `capture-recovery` | 3 | `da653a27dcd0e010cc3026f211d7b0a86963a013dc94adde4cbb874291fbee90` |
| 42 | Return accepted bulk workflow identities without certifying repair | `capture-recovery` | 2 | `fe11ada8250c47bea12c6897ec2c19165c30d0e88f3c249adf25921ebaba0ce1` |
| 43 | Count stored recipe-import workflows in the import summary | `capture-recovery` | 3 | `ad1e0f4dac0b93557860aefbbd38e4c3769db824624c4aafb20fa39775b1cb0b` |
| 44 | Restrict import identity reads to attributed recipe context | `recipe-quality` | 3 | `c344e214c2ed680e865275db1855b5ca346be55aa0320cd9cc21f783718d43b0` |

### household-identity

Source: `openspec/specs/household-identity/spec.md`; SHA-256 `4c7f5a1faafd5439ab6f261b1efb140a4b0c10643cf16d087874c3c52ee9b749`; 42 requirements / 105 scenarios.

| Source # | Requirement title | Destination owner | Scenarios | Block SHA-256 |
|---:|---|---|---:|---|
| 1 | List existing household members for selection | `member-context` | 3 | `24c95a3a030730f52ab3d2191a3e8cc2fbedd08971cbb1d9d31f099dc077419a` |
| 2 | Select an existing member from onboarding | `member-context` | 1 | `4424c9f0eb2f623e6e97ac7948938ff2b5e86da457c3570455b0a11a2c598086` |
| 3 | Resolve the current member through the API | `member-context` | 3 | `45e58ea862ccc7f524624d0012b905adaf72f9bb1c620391517c99e251d71216` |
| 4 | Recover identity when the protected client has no selection | `member-context` | 2 | `b3146a95a120df5c5aa437cade7404ae270b1357dc85026336cb468299a83878` |
| 5 | Display the selected member on Profile | `member-context` | 1 | `5370f728049f77a4f328bedcf7a11b5e67c0b841b529c4792afc567db0bea63e` |
| 6 | Enter the household with its shared passphrase | `household-identity` | 2 | `67ba411e185266d16bac8b49d5264f2b7e66a7ccdd0eb830d1b0554fefec705e` |
| 7 | Give passphrase submission feedback and allow retry | `household-identity` | 5 | `4921b31057543a16ae2ee0650203f499c7e473f21fa7fb59e1bd9ea15b581676` |
| 8 | Set household access-cookie options | `household-identity` | 3 | `71e96eca3c36c2a780dc564ac7034b88abf5b78a1c1930baa240ab1e8f685063` |
| 9 | Gate protected page entry with household access | `household-identity` | 4 | `1cdac60a463ec5325a51134268c862f07ab34611d5cc1893f4fe2f8dc9db1514` |
| 10 | Apply member context after household access | `member-context` | 2 | `0149602a27a9c43d87b7f405c5942da5d0464b9a0ceeb031d96b1108d7d8d9ab` |
| 11 | Authenticate protected API requests independently | `household-identity` | 4 | `55e1f51b07f236db8f4e60dd3c7a9f9dc9f1f0621f158766a31aae79ebe86892` |
| 12 | Exempt health from household authentication | `household-identity` | 1 | `af75634e78ace5defad56d0d359e557f3125ff02af4d07a728d36b663f80d1f1` |
| 13 | Generate a member invite link from Settings | `household-identity` | 2 | `54f9ab439ce8dd7099cada614d7ed5d2ac37b03f37911d9411b20be1c01b3f46` |
| 14 | Copy share and dismiss the member invite dialog | `household-identity` | 5 | `0fb34e071b0a37f51c4d0f3f16d0a37de3ad09a59a09055db0e950252367ec05` |
| 15 | Validate invite access before writing its access cookie | `household-identity` | 2 | `0498d9e0b6e763fb7e2bcb77721383cdc0f48d5ef692b50fcca21fc2a71efd85` |
| 16 | Request the invited member context and default Home navigation | `household-identity` | 2 | `74198780b6066c4433b23c0dd6a72304ac00b5180e9ae379c3685505cbd5b509` |
| 17 | Preserve member context when an invite supplies no member ID | `household-identity` | 2 | `123b37e0e4b7cb751d85b151fb802018bd706f3dc40a369c9f643feddf098584` |
| 18 | Show invite rejection and offer Welcome recovery | `household-identity` | 5 | `34a2f8b2a6697ed13a3f9643cb14b99878e1df64b6fbce532f69dca177b8e120` |
| 19 | Open and cancel the member-creation form | `household-members` | 4 | `92d365787ff9e16360358ed45048025481c3e361dcbe9b018cc0a477712e645a` |
| 20 | Submit a trimmed nonblank member name | `household-members` | 3 | `511fd4707cff9d5de5bf8a7cb21c7ea294e708eff5933f01be3db0a6c8043ebf` |
| 21 | Display member-creation pending feedback | `household-members` | 1 | `6bb62b707925f315adc3a38fad58b17fe88bf79ace0063c6c6c5770e56a5cbc7` |
| 22 | Create and return a named household member | `household-members` | 3 | `292f811f81c0a4556956e3c4d277ff5f751c11e26301b00d42b3cda781799ca2` |
| 23 | Prevent duplicate member names during creation | `household-members` | 6 | `1092c8b5b97cce6a58e5197bdd4898a1da177b0c5586f2f04e2ba5a9bc5384b4` |
| 24 | Display the created member without switching Settings identity | `household-members` | 2 | `0c8b08bd72fe51853d5868047e4e62b8550d062dc11f17013b13a57e3975a166` |
| 25 | Request onboarding identity handoff after creation | `household-members` | 2 | `b1435a4f05ac0fe894dbf381723581c6e6bd1970e085678350430b81fa94e47c` |
| 26 | Open an existing household member name for editing | `household-members` | 2 | `5ab6475fbcdad0acb95ff031800707d832a3c8a867a30ae4de3d09a21fafc9d6` |
| 27 | Cancel an unsubmitted member-name edit | `household-members` | 3 | `c217609784def416fb0f09a087f9f0778eaa8db6e17bd3c43f57310e4f960228` |
| 28 | Submit a trimmed nonblank member-name edit | `household-members` | 3 | `73b455ee7f02650a88b9bea7f12fbc5fe6d6423142310d081a9a17c6f1ec9d19` |
| 29 | Update and return the existing household member | `household-members` | 2 | `67b1c510d7096278e87416224680b58ebac6e2e1a9fcbc10cf9d385252bf3301` |
| 30 | Display a renamed member without changing active identity | `household-members` | 2 | `ffcfe974983805ba44c29e5615abd52f0052833a776c97fa241fc9360a877bd6` |
| 31 | Remove an existing household member through the API | `household-members` | 1 | `d90b90662a064564c2a018fb1777c1cf5319c16f00fd14e7fbed81b5f7da3868` |
| 32 | Exclude a removed member from subsequent family listing | `household-members` | 1 | `bc0a7314260c1f378112a3601d6b29639677b1d732a5d541e3546d8822b16d50` |
| 33 | Offer the loaded household members in the Profile menu | `member-context` | 3 | `5b5f3a9c798d5a66a74f4953e1ddc87d304564b018254ee1254995a5a0ab8e25` |
| 34 | Dismiss the Profile member menu before selection | `member-context` | 2 | `a1440afd42ade1d3c14143e2031a02dc5020fefe80d04c1fcc233126a99172b2` |
| 35 | Request member selection and Home from Profile | `member-context` | 2 | `09dd3c134a2ac12db43f4652450df7df3c704c57e8634e244ff0e07ad4b3b276` |
| 36 | Continue from Profile with the loaded selected member | `member-context` | 1 | `233ec72bbe80b8e09c383e5e864ee7c0622b92b5215a01ba6bfd94de3a896400` |
| 37 | Attribute initial URL and photo captures to the bound member | `member-context` | 2 | `2d169372cc43151eb37e514cf19db45c87c3a07a087f68fe09e0a5c06fad6ae6` |
| 38 | Set primary member identity-cookie options | `member-context` | 1 | `1e0896f38dc90ea85da0b47db9468d7df35277bb68bdb6df7de32d01bdad670a` |
| 39 | Route hydrated landing context to the next household page | `member-context` | 2 | `3a8f386af13aab21f967536952185c0ad4872d7703e8e683f1e3cb59a051bbad` |
| 40 | Carry browser member context on shared SDK requests | `member-context` | 3 | `f1ae342d348ab0a5598b474c1afb0af2c6a8a51539bd839de20896189fc0812f` |
| 41 | Forward server-rendered household request context | `member-context` | 2 | `84cff060697b5192f8f65571f314e06047e68326ba4483225568b0a3b699b40d` |
| 42 | Bind shared API member context independently of membership validation | `member-context` | 3 | `365994b923ff6736fc58c4f5898cd86380bd5985ec91dc2cc2d5ad314326c91b` |

### data-backup-and-recovery

Source: `openspec/specs/data-backup-and-recovery/spec.md`; SHA-256 `c933bb3006a9baf0490fd04a144f8cac0b28b60a93a7210dc30812aabb50dbb6`; 31 requirements / 76 scenarios.

| Source # | Requirement title | Destination owner | Scenarios | Block SHA-256 |
|---:|---|---|---:|---|
| 1 | Accept ordinary management requests through household access | `data-backup-and-recovery` | 3 | `ec0ee842058ccc979231ac2b05c8d79efa6208efae4702b43cbc19ff93c3e549` |
| 2 | Keep management acceptance separate from recovery completion | `data-backup-and-recovery` | 1 | `a5358768a259f5026fce5bb960e11cd6735c590109654ce61cb9b3120a8f074d` |
| 3 | Project the latest selected management result | `data-backup-and-recovery` | 2 | `4c269bea5af87fba7c72b7e641926aa74dad0ff778d4e56c9ec7e970a5ba8b5e` |
| 4 | Append missing member identities to the member export | `data-backup-and-recovery` | 2 | `0593dc45d75e62a1cd8ad2a5fec6ff9aa90c88ddf02e3e5ebbd313ab679677da` |
| 5 | Select recipes with persisted export payload | `data-backup-and-recovery` | 3 | `d639ad39637a858811352ad402b8c1fdfc3fb2ee14c70bb673959cc7ec760734` |
| 6 | Refresh metadata while retaining existing recipe content | `data-backup-and-recovery` | 3 | `5ab1dece9d973a68e2703d90acdaa658af622f99fafe820c077f03eb42789512` |
| 7 | Write nonempty plan and calendar exports | `data-backup-and-recovery` | 1 | `6f0a9401219d4427e0e3ba8b172951037db2974ec6eaf3c8e715323038f6d48c` |
| 8 | Replace the ingredient category export | `data-backup-and-recovery` | 3 | `ce48e57143ea5a6a58a09552b7456b76ea0b0e1bdcb8aa495119c084636b721f` |
| 9 | Merge members by exported identity | `data-backup-and-recovery` | 2 | `51894fc68711084d464873db03529046b9d10f2a72ad03680ade2ae4bad0bc5d` |
| 10 | Reconstruct recipes from retained metadata and content | `data-backup-and-recovery` | 2 | `3a6d6c5940e8b97f74691389e1efd086d44e1f9a41c693e6d28372ca4a587bef` |
| 11 | Merge recipes without replacing unrelated stored state | `data-backup-and-recovery` | 3 | `a523c1cad1fc8bb8f0ef8b4595375eae9877835e8f3326eca0263b79901bbdea` |
| 12 | Read supported legacy recipe content | `data-backup-and-recovery` | 3 | `b79bf77d80bdcbabcfd4fa8704ab63d37cdc2256f8c3972080227e6cbd9a3416` |
| 13 | Retain unfinished PDF readiness on reconstruction | `data-backup-and-recovery` | 3 | `0e816d8587c83d25e25dce050c4189b8756d17a474af13862efe295d4cd1c3be` |
| 14 | Count malformed recipe loads without stopping later loads | `data-backup-and-recovery` | 2 | `e99dd5970a3d1910190a5e9a09f6a74de03bf5d838e172ee0b78f372342668b1` |
| 15 | Merge planning files and initialize missing event weeks | `data-backup-and-recovery` | 4 | `2cb00bae314d807da0cde99874ac3932348030999e1428fa7007df21be1caa18` |
| 16 | Merge category rows and skip invalid rows | `data-backup-and-recovery` | 3 | `1cbd92e1db9a98a0dd1bae3347c43636b9c1d642ff4bf11b6420b7369f8ed6f8` |
| 17 | Backfill retained finished-dish references | `data-backup-and-recovery` | 2 | `b68830e58034e27b30e8fa94c8518464d4bcd88bc50a58245da5d0afab71d11b` |
| 18 | Replace the active report export even when empty | `data-backup-and-recovery` | 2 | `e7a0dcd24ced796b7727365e34769a8292b6094a8a1f1b0ea843343a26835abc` |
| 19 | Restore report dependencies and normalize interrupted work | `data-backup-and-recovery` | 3 | `9f273054ff381224dcfe0dad63fc54436c62d3286e6dbc8e369f60c6e31abbb0` |
| 20 | Tolerate absent or unreadable report artifacts | `data-backup-and-recovery` | 2 | `83909f65e0834042e95852c48ab7787456fb82d853282a917ae55efb5568b700` |
| 21 | Export ready search documents as sidecars | `data-backup-and-recovery` | 3 | `bb7b2020fc106d1ff7025740b8f695335e301ba49de84bb7bdaf574e62d3c713` |
| 22 | Rebuild lexical search content during compatible restore | `data-backup-and-recovery` | 2 | `c72732ea6624968b54ab39af855ef27198abc22c2939c9811a93705106c8b0f3` |
| 23 | Qualify embedding reuse separately from lexical readiness | `data-backup-and-recovery` | 2 | `49efe4a7e9007cd615dafb84850789c4954d3d2b0541a9eb715ab6e2638fc9d6` |
| 24 | Mark missing or obsolete sidecars pending | `data-backup-and-recovery` | 2 | `2bd43a0034801d0d0ae7d4d06264c10571d36167337a592e87187f5776e8ed2a` |
| 25 | Repair derived search state in bounded batches | `search-indexing` | 3 | `0a5a1fa11cc1e76b96511d34821ae00535e656930a188baea437c6d57b58160b` |
| 26 | Acknowledge background backfill dispatch separately | `search-indexing` | 1 | `1828f599c3fb5261ba919276598c47d90efe40fe5f47a637f75c0007a3e5aab4` |
| 27 | Seed the maintenance schedule when no active instance exists | `scheduled-maintenance` | 3 | `8a67e96714df7eabadd23d96286755e662121993e0cf84e683c8a3ccdce50ca0` |
| 28 | Compose maintenance without waiting for launched child completion | `scheduled-maintenance` | 2 | `2e8de7a6e00b9a299972284e4fc02aee9c44c345c7051a3ea48237f64cf11b7e` |
| 29 | Process due pending maintenance commands with recorded outcomes | `scheduled-maintenance` | 3 | `4467ac54075167efec46acbad8b363566b12339f67c0410209fae7f9aa7b8aba` |
| 30 | Clean failed-capture residue subject to the current recipe guard | `scheduled-maintenance` | 3 | `5a0f7a65735efb08464b8bd7c4951245877fffa55d85432d86165d7a53754171` |
| 31 | Write a dated local maintenance report | `scheduled-maintenance` | 3 | `8198fd4ab5159a58e3c2537d83b973436e65b475e701967b58daf04f151d6953` |
