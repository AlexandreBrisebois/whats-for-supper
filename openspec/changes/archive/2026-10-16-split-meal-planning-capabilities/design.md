# Design

## Context and Existing Ownership

See proposal.md for the agreed six-owner scope. This design is required because a documentation migration moves cross-capability ownership and must conserve existing contracts and evidence.

The current main spec is the authoritative content input, not older archived extraction deltas. Its recorded identity is below. The current baseline plan reports 96/222 and reconciliation reports 93/214, while the actual spec now has 104 requirements/249 scenarios. Those historical counts must not drive reconstruction or remove later accepted calendar/deferral changes.

Repository observation: the earlier conversation snapshot had 111 requirements; this checkout has 104. No seven-requirement Tomorrow-chain extension exists in this input. Preserve the present push/fallback/no-op and caller-specific recovery semantics; do not introduce the earlier snapshot's distinct Tomorrow operation or stronger transactional guarantees.

Existing business owners remain recipe-discovery for ranking/votes, recipe-search for retrieval, cooking for cooking history, grocery-shopping for grocery policy, household-live-updates for delivery/reconciliation, household-identity for access and tonight-meal-decisions for Home decisions. An operation's controller route or UI component does not determine its business owner.

## Decisions and Tradeoffs

1. **Six flat capability paths.** Retain `meal-planning` and add the five siblings in proposal.md. This matches existing recipe/household organization. Keeping one file with headings would reduce migration work but would retain the current loading and review burden; arbitrary size-based chunks would obscure ownership.
2. **Exact normative relocation.** Each requirement header, description and ordered scenario body is preserved verbatim, ignoring only trailing block whitespace. Existing cross-requirement title references continue to resolve globally through the owner map. Use ADDED at the destination and REMOVED at the source because OpenSpec has no cross-capability move operation; this expresses relocation rather than feature retirement. Do not use `skip_specs`, which would omit the requested ownership deltas. Do not split/shorten inherited requirements or change their names to satisfy style preferences.
3. **One shared deletion owner.** `meal-rescheduling` owns “Delete the recipe-free entry before clear follow-up work”, despite its inherited title. The same date-delete lifecycle serves non-cooking clear and recipe-backed removal. Keep that title and its scenarios unchanged; provide the ownership link in non-normative navigation. Renaming it is deferred to avoid unnecessary churn.
4. **Keep selection journeys together.** `meal-assignment` owns Quick Find interaction and selection/replacement orchestration. Recipe-discovery retains candidate/ranking policy; meal-rescheduling retains move/defer/delete semantics. First-open recipe placement stays with assignment. Direct suggestion API read boundaries remain in meal-planning, where they describe schedule reads rather than ranking policy.
5. **Central evidence with explicit consumers.** Preserve the existing meal-planning Evidence and qualifications section verbatim as a historical record, adding a clear non-normative heading/notice that early slice exclusions and counts are historical. Keep the meal-planning baseline evidence record and its BSL/U/A identities as the durable shared source. Every new main spec must link both that record and the preserved qualifications and state that applicable limitations transfer with requirements. No fresh runtime acceptance is inferred. Add a current ownership/count index alongside the historical evidence; do not duplicate source digests or rewrite old acceptance claims.
6. **Purposes and navigation are separate from behavioral deltas.** During apply, directly update the retained main Purpose to describe its 17 retained requirements. New main Purposes come from the five deltas. Add exact-title links and a compact dependency section outside normative blocks wherever a moved rule is consumed. Keep normative bodies unchanged; qualify legacy unadorned owner wording in navigation rather than rewriting contracts.
7. **Bound reference updates.** Search current main specs and `docs/openspec-baseline-plan.md` / `docs/openspec-baseline/*.md` for `meal-planning`, moved titles and old anchors. Retarget only current ownership/navigation references to a moved rule, preserving references to retained reading behavior. Historical records, archived changes, backlog investigations and old digests remain untouched. Do not broadly replace every occurrence of `meal-planning`.

## First Observable Slice

The smallest reviewable documentation path is one moved assignment requirement: locate its existing title/scenarios, locate its identical ADDED block in the meal-assignment delta, resolve its source REMOVED migration target, and follow its retained schedule/calendar dependencies. Acceptance crosses documentation seams only; no UI/API execution is required.

Apply all 87 transfers and the retained 17 as one coherent documentation update before presenting the new mains as authoritative. Sequential file writes may occur, but a half-transferred inventory must not be reported as completed. Verify the complete six-spec result with the conservation criteria below.

## Compatibility, Rollout and Reversal

No runtime, payload, endpoint, setting or stored data changes. Preserve every existing requirement title so cross-document title references and generated anchors survive at their new paths. An old path with a moved anchor should be replaced in current navigation by the destination path plus unchanged anchor. Add a small owner directory to retained meal-planning so references to its broad historical role have a discovery path.

OpenSpec sync/archive does not carry arbitrary new-main evidence/navigation sections and ignores an existing-spec Purpose in deltas. Therefore apply must explicitly author those non-normative sections and the retained Purpose; do not rely on an archive side effect. Do not archive this change automatically. Never re-sync historical extraction changes to the old owner after this transfer.

Reversal, if requested before subsequent changes depend on the split, restores the saved original main and reverses only the associated ownership/navigation edits, removing only the five newly created main specs. Do not restore whole dirty files or discard unrelated edits. Later dependent spec changes require a newly reviewed reconciliation.

## Conservation and Acceptance

- Recheck the source SHA-256 before apply. If changed, compare new requirements/scenarios to this map and reconcile the deltas before editing mains; do not silently apply stale removals.
- Build a title-to-block inventory from the original source and the union of the six resulting main specs. Every original title must occur exactly once, with the same ordered body/scenarios after trimming trailing whitespace. There must be no added title. Compare per-block SHA-256 below; compare aggregate 104 requirements/249 scenarios and per-owner counts.
- During planning, simulate the result from retained source blocks plus destination ADDED blocks and verify each REMOVED title has exactly one identical destination. This validates the planned transfer, not completed main reorganization.
- Preserve the exact original evidence-section text and all BSL/U/A references; verify new evidence links resolve and that historical count/date claims are labelled historical rather than presented as current totals. No source digest is recalculated and presented as a new runtime result.
- Check links/anchors for current references to every moved title and review shared deletion, calendar references, voting-to-assignment, and replacement-to-rescheduling dependencies specifically.
- Run `openspec validate split-meal-planning-capabilities --strict --no-interactive`, `openspec validate --all --strict --no-interactive`, and `task verify -- <complete reviewed changed documentation paths>`. Include all modified mains/current navigation plus task evidence in apply's final path selection.
- API/unit/browser/database/model checks, generated-client work and red/green behavior tests are not applicable: no application behavior changes. Documentation conservation and strict validation do not prove runtime behavior.

## Requirement Ownership Map

Source: `openspec/specs/meal-planning/spec.md`.

Source SHA-256: `84a098961a8972ae17925266e8a3ac47b28ef8d7b7aa0875f799436b7a763d32`.

Block identities hash `block.rstrip() + "\n"` as UTF-8. Sequence numbers refer to this recorded source only.

| Owner | Requirements | Scenarios |
|---|---:|---:|
| `meal-planning` | 17 | 44 |
| `meal-assignment` | 28 | 63 |
| `non-cooking-plans` | 18 | 39 |
| `meal-rescheduling` | 20 | 52 |
| `planning-lifecycle` | 14 | 31 |
| `deployment-calendar` | 7 | 20 |

| Source # | Requirement title | Destination owner | Scenarios | Block SHA-256 |
|---:|---|---|---:|---|
| 1 | Initialize week reading from shell and planner entry | `meal-planning` | 3 | `42f6a904fc59bba1b1585184f9839e37ee596f370bd652f20ca854e3e537e877` |
| 2 | Select the planner week from the URL | `meal-planning` | 3 | `e3e4e285a7602739600be149d6be4a85317151ea374b4e228554917bdfe155d1` |
| 3 | Navigate relative weeks and return to this week | `meal-planning` | 2 | `2fe029cbf8281e1b61104d17d32980d70e2129003934f9d6d27b78c8bb5bf777` |
| 4 | Read the household schedule through the protected GET operation | `meal-planning` | 3 | `12d6b089081c5642ce6c9d2b13ade4f38c089c4981475aad7a3c55b3f5e7ce2d` |
| 5 | Return seven dates from the deployment calendar week | `meal-planning` | 2 | `607a1aed6a6cf9a4df8f0478892f4311698821191537579778dfa1f518c9954c` |
| 6 | Project stored recipe and non-cooking read content | `meal-planning` | 3 | `8d08d9b056d077d34abcbc83fe18d3c1e52b3f9709bbca2667e9460818f4bcc2` |
| 7 | Read week status and stored adjuncts without creating a plan | `meal-planning` | 2 | `5a36eedeb5e56b90a1b9b657ab145166ca0f58a601e0d8d9f5bea6c2a622dc01` |
| 8 | Use enveloped schedule data for browser initialization | `meal-planning` | 3 | `79e64aaea9c8e5849f1d73485b43e6bed6909f33d0ab88b458c1060e1a2c120e` |
| 9 | Compose voting suggestions separately from persisted assignments | `meal-planning` | 3 | `fa5b59c96a07b6dfe78fd1dae543ca14c49ff1bc463de952f66186915a415370` |
| 10 | Discard initialization results for a different selected offset | `meal-planning` | 2 | `f8920c6eeda0f1b7d53cdb388d57026f8fc5326375d90742e82b87cb1e4ad084` |
| 11 | Show pending initialization without clearing loaded days | `meal-planning` | 2 | `674beed5c189454c7451a52a5e249f78affc790d8db49cba6066882b57ebf6fc` |
| 12 | Retain content after missing or failed initialization reads | `meal-planning` | 3 | `68a604339989edc69cb7d9d85960a932847c4f71ae17af13cb12ae070f0e7f6f` |
| 13 | Render the selected label and loaded date range | `meal-planning` | 3 | `eff7b728d8e7965f973ae66c57a6c9177384584ab5c2d8f31e2383f51cf38d1f` |
| 14 | Render day content and planned count from displayed state | `meal-planning` | 3 | `b5f3a739df66b55a6ef60097e98cda9a85f8fdaafbd7e1b996e157dbcaad2b12` |
| 15 | Display read week status without implying a transition | `meal-planning` | 3 | `a348419d1f170032cfb099e6b2794b987de81319d28fbee3bfff7ef8cdbda5a3` |
| 16 | Carry an empty planner day into recipe selection | `meal-assignment` | 2 | `507af9bf122dfb7285061d61ead0ffd6609f4648729db70c97cfded36435904c` |
| 17 | Select a returned Quick Find recipe for the target day | `meal-assignment` | 2 | `5532cb626732edf1091065477e81b5d91910d2f9a3ab1384c2b4c83f3abc2460` |
| 18 | Present the targeted recipe-detail planning action | `meal-assignment` | 2 | `92951dd186b05173b427ef6075d2856988c29dc9b7c1e5d0254f0786092ba313` |
| 19 | Read the explicit Search target before assignment | `meal-assignment` | 2 | `dd4b831e7d37759591c70a6e51cabd4d05afe0ed448c7f93e438fbd9994b5eb3` |
| 20 | Submit chosen-recipe assignment through the protected operation | `meal-assignment` | 2 | `a1c743c65e6a217989bb2360d9e2221677b96647274fdc18075a12f744ed6baf` |
| 21 | Resolve assignment dates from the server week | `meal-assignment` | 2 | `b120a70e8748c43f19330e6f387bfc7d88a66ab3cd3db6c3a771d2c3dd012426` |
| 22 | Ensure a weekly plan for assignment | `meal-assignment` | 2 | `0706cae221fa40e9481a061d2e894b0cc65aa93e154543d946c73073478bd7d0` |
| 23 | Persist a planned recipe entry for an empty date | `meal-assignment` | 2 | `fe92a33adf2ddad1324117459a1f12703f6ed88e95178e8862baa329f3567c33` |
| 24 | Invoke assignment follow-up work in order | `meal-assignment` | 2 | `6e69e18ed62cc494b0cd9b614b7ade370ff74bc5a1bea8501bd95c12afd8a49b` |
| 25 | Return the assignment success envelope | `meal-assignment` | 2 | `9944a3cf54385baeb9bc970ffcabb271cf8b5d226f51392264715bb903cab146` |
| 26 | Show the chosen recipe optimistically in Planner | `meal-assignment` | 2 | `783965864399dfcc9434c2c283a35b88cfe6603b9a04111769609c54efeac0c5` |
| 27 | Read assignment adjuncts after the Planner post | `meal-assignment` | 2 | `1795f078a9d6263b072feabe7e7d482bc105708c73d467392664187c2a278114` |
| 28 | Finish or recover the Planner Quick Find selection | `meal-assignment` | 2 | `a5fc8297d1dcfc7a30e644ff9244f2ec1358abd827a5b5e124fbcfaba4ebd6ee` |
| 29 | Show pending targeted detail submission and allow another attempt | `meal-assignment` | 2 | `a2b1543412a3d4555d2c1f60e8f447b5f710ba0de65fd0ecc6d3ec279d74e12f` |
| 30 | Return targeted Search assignment to Planner | `meal-assignment` | 2 | `e6784a6b44dc03f3c16ecdcd899372ddaaea51364088b9b2b56bb2b0f87f7818` |
| 31 | Offer recipe-free Other plans from a dated planner pivot | `non-cooking-plans` | 3 | `90b93579d4384cf54548130ced59b9357c8d050426a9469884f9a48d5ba3eb0e` |
| 32 | Initialize a date-specific supper-plan draft | `non-cooking-plans` | 2 | `e1cb29033d02629b053b30a1ba2161edecd7866a49552862e63e37cac6154677` |
| 33 | Retain the message while switching non-cooking choices | `non-cooking-plans` | 2 | `9d032d312661b73dd7cd126eaef901a0f5fafe4dd0eff31dafd28465bf57ed34` |
| 34 | Validate and normalize non-cooking message submission | `non-cooking-plans` | 3 | `29ad956836ed0777abfebdd9324bbd5548fb1686d39b9bfd72d34ee1c6ed2819` |
| 35 | Dismiss an unsubmitted supper-plan draft | `non-cooking-plans` | 2 | `f5a069fa773e5785781ebc43111129ead2e8075af2387004d6ce6c476dd98191` |
| 36 | Guard the sheet's pending submission | `non-cooking-plans` | 2 | `e86054c2f74f2871ca4ba48c2d274b299ad222a653439e5f3a311ef4f3a41200` |
| 37 | Submit non-cooking plans by explicit date through protected operations | `non-cooking-plans` | 2 | `45f6a9e5604680549a4a554d1b501a573f5b0dfb46ef62659291cfe8d936458c` |
| 38 | Reject invalid explicit non-cooking plans at the server | `non-cooking-plans` | 2 | `4ca903376ce653f8502eac0fde38115ff83771e3d40370199e5ffcbc7dbdc8e3` |
| 39 | Reject a non-cooking save against an occupied stored date | `non-cooking-plans` | 2 | `69b77cb8cbf090de7618a0e7f7859779b1643e652c4aacfa44b55aed85954e2b` |
| 40 | Persist recipe-free skipped plans without changing week status | `non-cooking-plans` | 2 | `db7092bf726285934de7dc6b71191c499ea5035d9cc023158215b71d53b06ded` |
| 41 | Publish a saved recipe-free slot before returning success | `non-cooking-plans` | 2 | `7ada62515194618497e5edf1db20039302fcdd87921c7fba19f9c2dd24b1f97f` |
| 42 | Return non-cooking save completion without cooked confirmation | `non-cooking-plans` | 2 | `387dab8d2944c9abcb2b138fd8c56ff68cf1db30cc13742ebf8a5d807cdd8575` |
| 43 | Reread the captured week after non-cooking save | `non-cooking-plans` | 2 | `0b086c6a750349617bec807cf36338ddda6d5ae8a10cbba3a5302ba6ba479e7b` |
| 44 | Retain editable non-cooking failure feedback | `non-cooking-plans` | 2 | `e7965d70c6912c0d9db044643f1a4a36a3916858cba44029ebdcac7ba9118390` |
| 45 | Clear an existing recipe-free plan from its sheet | `non-cooking-plans` | 2 | `335f19a1f2bf4185fd492329f11eb0388be02e0e6da5d8e5799dd976b0965a09` |
| 46 | Delete the recipe-free entry before clear follow-up work | `meal-rescheduling` | 5 | `00b1ff1af8938c912d85525c180fcc82626c3d99402cd9f9ba14f4dbb2b7a4f3` |
| 47 | Offer direct pivot clearing for a recipe-free plan | `non-cooking-plans` | 2 | `1ed8a35e75dc4f79194b111027645e96eb033232165af5d9f2548d17249551f6` |
| 48 | Display the saved non-cooking choice and note | `non-cooking-plans` | 2 | `fa1a09f4e7248abb1dae6410b945788bf25f11628e4d23a48b60a384c68c80e7` |
| 49 | Hand eligible Home plans back to Planner editing | `non-cooking-plans` | 3 | `01cb8e8d51e918a413694085c3b2c95360a38a684541f56a7084b94b315ff53c` |
| 50 | Advance Quick Find suggestions without changing the plan | `meal-assignment` | 2 | `c40e730bf5b697911adfcad7128a7c9a91d6bea5ed639194052979c252ba404a` |
| 51 | Enter recovery before replacing an occupied Planner day | `meal-assignment` | 2 | `657bba98b5a3c7859e9a3bd4ad8a7baab27f708412b7b8851a0d65e8eac4818c` |
| 52 | Resolve the previous Planner meal before replacement | `meal-assignment` | 6 | `473e579084da105f8992b780c0a3669ea66d047d64aa175453952006112115b9` |
| 53 | Retain completed Planner recovery work across replacement failure | `meal-assignment` | 3 | `bcd0378bf343e52e6e460cfa6caef1f6fce26ae7c2f3df98976019cc778a1b22` |
| 54 | Complete Planner recovery after awaited assignment | `meal-assignment` | 2 | `d73d8e21c9193c44352f239be96932070e06c17378a0216f11051ae781206c17` |
| 55 | Preserve caller-specific Search and Browse recovery routes | `meal-assignment` | 2 | `16054dc788fd1ca9dea34fbe421073fef2f6b54d2f49a0f04f4d65f76461d71d` |
| 56 | Replace a stored assignment at the resolved date | `meal-assignment` | 2 | `c5f366a689fb3374ef3d14695e4a41dc1dd7d616bbee44a0a8514090aab1aa98` |
| 57 | Report Sunday carry-forward after replacement follow-ups | `meal-assignment` | 2 | `44d6ff3d5457f2968225994966176a99568d69ed699b925cdb79a97e7114ba35` |
| 58 | Present Quick Find reads and failed-read retention | `meal-assignment` | 2 | `67a5c75d06f3dd78004a96a2f874d84b076f9e54a0cc827812ef182d0b9602b4` |
| 59 | Reconcile Quick Find after an eligible invalidation signal | `meal-assignment` | 3 | `77ce676d475004272383c94ae3372d7ae070d8992e0a5c57d6e95797e81f705a` |
| 60 | Inspect and dismiss the Quick Find deck | `meal-assignment` | 2 | `b0d9f3b56010d9462901d07ec83d7f6d414353f235e5c6cf5fcca8944c0b013d` |
| 61 | Preview a drag as a swap of dated Planner content | `meal-rescheduling` | 3 | `9a8d40a743d51849dcd5960fe196c98a7ced0b2b3b44a8e346d91a2a2a4cb795` |
| 62 | Submit dated-source movement through the protected operation | `meal-rescheduling` | 2 | `b65923e4a8350c677e23d4685f53844b0ca6763c408362454238d51cadf12e8e` |
| 63 | Prefer an explicit movement source with legacy fallback | `meal-rescheduling` | 3 | `92315d2e420bd56c8819a1e7cffe93a616e063bc3ec99619d4a271ab7a66c697` |
| 64 | Swap stored content within a week | `meal-rescheduling` | 2 | `a9d5c7369a007281377712f9e10acadc942e31f19efe3f35aa914ce64f814a17` |
| 65 | Push toward a later available date within the search window | `meal-rescheduling` | 2 | `2b4c588c6ecb7a19827adc3bfe302a3644895106db65cd5133ff55ce0c6a2380` |
| 66 | Place cross-week movement in the first available target-week date | `meal-rescheduling` | 2 | `973e5574cad65828a7e1d714c46147851e346f6610e2d0c4bf9532fd11626dc1` |
| 67 | Preserve a skipped source when moving its recipe forward | `meal-rescheduling` | 2 | `3bf7f3d10b39b5fa7f6ddb63e180833f4a526d55e8ba6b9534f06403b39d10ec` |
| 68 | Distinguish movement follow-ups from movement confirmation | `meal-rescheduling` | 3 | `bed90118fdcf68d4e9206368bd4a7e0d3db646910c218b7484ae05520581efcd` |
| 69 | Request Plan later from the selected Planner week | `meal-rescheduling` | 2 | `0cce3f3162a1bb6fe0b9fb1489c1b1c6dac69e9bfd57eca04f89e592e7b0ffe8` |
| 70 | Defer the exact dated recipe through a protected operation | `meal-rescheduling` | 3 | `ff03d634988b99ef25bb7a9986f3a8302a27bbe326ce8c54bcdd5f31d4ccf125` |
| 71 | Find a defer destination from deployment-current next week | `meal-rescheduling` | 4 | `53e43d982b7e3c8f6d3c551563d2e4fa142e247448bd48df28ea687d41e73925` |
| 72 | Return deferred content to Planned state | `meal-rescheduling` | 3 | `579b5bcae8a4540694b046c3f8d388cbe227e6e8f510c8a977c2fa5a56e5ce9e` |
| 73 | Complete defer after affected-week follow-ups | `meal-rescheduling` | 2 | `12cd7fe7edc96f3995df143bdbe3e18af545da81375f4ce7ca5ed3b3cd1bf0f3` |
| 74 | Remove a recipe-backed Planner assignment optimistically | `meal-rescheduling` | 2 | `15c7f4316868f733e7adbdeb35c76217c4dc82df2843650beac741cec6ae1365` |
| 75 | Apply the shared date-delete lifecycle to recipe-backed entries | `meal-rescheduling` | 2 | `92b031037fa34d140a14685be07c2b43a8aa01388867b046e887c4086f9e7376` |
| 76 | Find first-open placement after deployment-local today | `meal-assignment` | 3 | `9044cc4e93bbc3c6b2ffa4e9b7ef5cc4093b56402138219cc8868378b596f0b7` |
| 77 | Assign first-open placement through the shared assignment operation | `meal-assignment` | 2 | `607b8a86a0ca726efccef41258c6d7e197c57e1a152a84dc9a2972735da01fd6` |
| 78 | Open or reopen a protected planner week for voting | `planning-lifecycle` | 2 | `a023c6298a7e9ad24998c81152462788c69e845784b10e7c6d908dc89c1de0d6` |
| 79 | Reconcile Planner after opening voting | `planning-lifecycle` | 2 | `0573279eca8430052b8447c20affb7e0c90e4014f89720367c0d9c2ef47ba0c2` |
| 80 | Promote displayed pending suggestions before closing voting | `planning-lifecycle` | 2 | `b0889d70f3f71a27ee2648b100686dae64bcc2f8a1595b8c98431197448c76b2` |
| 81 | Finish the Planner close-voting presentation | `planning-lifecycle` | 2 | `0a0036e3281a503b1c091f30874f1ec00751c037d180765f9690cf9a2d97b51e` |
| 82 | Persist a protected week lock independently of browser promotion | `planning-lifecycle` | 2 | `27562697b6747398d483ff2f1f6884884192af551b387b48ea73472e506a54e4` |
| 83 | Lock persisted ordinary assignments while preserving recipe-free skips | `planning-lifecycle` | 2 | `2e7dd8edbb4ab9a12aa4105e602b5d208d87318b49aef80b9ec676d2149dc155` |
| 84 | Attempt voting-state publication after persistence | `planning-lifecycle` | 2 | `ba0408a5f25e93de55cf624a8407c701bc97c926949442a335a693135b72d62f` |
| 85 | Validate recipe-specific cooking without completing another assignment | `planning-lifecycle` | 3 | `085acd52fb83e50e9192f606fb4e3a36ee02242568ad78cd0629a05447fbe1dc` |
| 86 | Retain status-only day-validation compatibility | `planning-lifecycle` | 3 | `6bc739c28f8c1d4ecebcfc184daa46a4de2dd7961f31e21db597bd58ac599446` |
| 87 | Publish supported changed-day validation after saving | `planning-lifecycle` | 2 | `68be6e584f6d4daed262181806c08d1d2ad97726805e578720b33d9a788c0d0e` |
| 88 | Share the generated voting destination from Planner | `planning-lifecycle` | 2 | `28eca6da9771386c28beecbe459d0592a8a9c770718ae3d09647895aa9d09dc4` |
| 89 | Finalize only overdue planned or locked recipe assignments | `planning-lifecycle` | 2 | `6b783c2ca98b27eef1d7a7f1e821b503facfd023dd7caacdcfc4a25d3e9c0be9` |
| 90 | Recalculate cooking consequence before overdue publication | `planning-lifecycle` | 2 | `5f2bd4ecd07791d6f296ca62a9c2773a614203cf1e9da7f04a89b8e9263d951f` |
| 91 | Attempt affected-week snapshots after overdue persistence | `planning-lifecycle` | 3 | `9fad1850636b21965041ec0b60e29c6dd549272553fa9b2bf5bfc52ec33c7573` |
| 92 | Expose direct fill-the-gap reads without assigning recipes | `meal-planning` | 2 | `09b157a89269bd6c86ecb47b909c967c4cf802d67577df3725733115636517f9` |
| 93 | Expose direct smart-default reads without locking a plan | `meal-planning` | 2 | `f68e8531557b725f5eeb6b23398ba4982f90cb6f74ea5e35b22928cf14ac35fe` |
| 94 | Activate Planner dragging according to the effective hold preference | `meal-rescheduling` | 3 | `a70e5d13a3bf4eefc4c248f63af2e93473ad81c68e9b02c6a8c50d1fdf0b2816` |
| 95 | Cancel pending Planner holds before drag activation | `meal-rescheduling` | 3 | `143545ee4d5e9d55060ca282a80465eb41781a6b8e54d10be1ca85d4df1b4d81` |
| 96 | Bound Planner grabbed feedback to the active pointer interaction | `meal-rescheduling` | 2 | `c9a07ee81ef2a409502ae0b6d00f3ad4309ef053d77e6f5e41a8100742ee3638` |
| 97 | Resolve supper dates through the deployment calendar | `deployment-calendar` | 4 | `f223eede5409349ec83be262ff596ed4f88e55bf52acc7bf38b93924f426f110` |
| 98 | Configure deployment timezone through shipped deployment templates | `deployment-calendar` | 3 | `81e72c2b2798595e7cc19c363429ff888e8199f9894329178233bc4628cdd140` |
| 99 | Document deployment timezone setup and changes | `deployment-calendar` | 3 | `46717d1c3516b34608e104433ecebb128b6c34091e8dffb6e0c086a7f532bdd0` |
| 100 | Expose one authoritative calendar context with schedule reads | `deployment-calendar` | 2 | `7dcac08ccb326002169c2885843ec79efdf48675f75358f9321068922a3ef5e7` |
| 101 | Keep relative operations anchored to their intended calendar week | `deployment-calendar` | 3 | `57329629da5976b80483abf954eb00024e9e3bcf0c4cb60b349556581cab7c3d` |
| 102 | Refresh expired Today context before a new action | `deployment-calendar` | 2 | `c89ce502db4178890c5a5776ae8db5799fc0f406dc8ae2ec9af53c24de6b3e1f` |
| 103 | Preserve civil-date arithmetic through daylight saving changes | `deployment-calendar` | 3 | `779e92bc1d1f728bb908d8c50441cdf0413ce3ce80b2a964bb8e2ec2f12cae70` |
| 104 | Report deferral relative to the requested destination | `meal-rescheduling` | 2 | `a3167f4932b1c2aefa2b8b734bb51447ee2a3c9c5f43d4686a6742f3e340ea53` |
