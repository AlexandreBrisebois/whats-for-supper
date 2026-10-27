# Stage 2 ownership and overlap findings

Revision: a3232949b1fd627771ebe9ee68a975170f1798ad. Canonical specs were read only.

## Method and limits

Consume Stage 1 requirements.json; candidates.py documents exact normalization, fixed stopwords, score and stable ordering. All 808 requirements are compared for exact title and whitespace/NFC-normalized pre-scenario body. Lexical scoring covers cross-capability pairs only, title + normative body, ASCII identifier tokens, Jaccard >= 0.25 and at least five shared terms. No embedding or automatic semantic decision. Exact raw bodies, full blocks, hashes and inclusive 1-based spans accompany every candidate in candidates.json.

Results: 0 exact-title duplicate pairs; 1 normalized-body duplicate pair; 50 cross-capability lexical pairs; 51 distinct flagged pairs. Reviewed all 51 generated pairs fully including scenarios, plus 4 targeted boundary pairs. Zero generated candidates remain unreviewed. This exhausts the declared exact-match/lexical candidate set, not all semantic relationships; no exhaustive absence-of-contradictions claim. 1 proven duplicated normative text/shared finalization obligation restated for two intake paths (not established as an architectural defect), 1 unresolved ownership overlap; remaining reviewed pairs intentional. Candidate counts are not duplicate counts.

## Findings

### C0001 — intentional_dependency

- `openspec/specs/app-installation/spec.md:84-95` — Launch through the household root entry; block SHA-256 `e9784548cc680353b9dcbf9b5a5f3e184e17e1198ec8726d31704b4277c82672`, body SHA-256 `e07e971f8cc8000623fc94baded692e5c0fe695f98b87531ca04011129ece4f6`
- `openspec/specs/member-context/spec.md:170-181` — Route hydrated landing context to the next household page; block SHA-256 `89bc3ddbf39b05545e22e83431469a00c55caf91f396c82e7ffc290d508954e8`, body SHA-256 `dec65e7cc7051dc895d799afdd97f484400adf7d4e5aa2cbb1d38e46bf3f67f0`

Manifest root entry delegates to existing access/member routing. Preserved body names former household-identity owner; app-installation lines 10-15 explicitly relocate the member requirements to member-context. This is intentional preserved wording plus navigation dependency, not a stale-owner defect. A selected-block loader must retain relocation/dependency preambles or read the relevant full scope.

### C0002 — intentional_overlap

- `openspec/specs/app-installation/spec.md:175-187` — Stage a compatible shared PDF before capture handoff; block SHA-256 `65fe1f313ba4430f082caf1432db051206135c62178d69ffa8a8eec5e032243b`, body SHA-256 `cf7557746612db55661e3f8492c77d8376e128da650a0bf13ad259f85c94c556`
- `openspec/specs/recipe-capture/spec.md:412-423` — Validate PDF file selection before confirmation; block SHA-256 `dc77605c9d08f1426c169183824e21fe0035b53cd93bb245c4a779e35369236b`, body SHA-256 `adbd01ef6d50917bd7f0b341e70b3fa88281ff8f08ca643999004a99437953ea`

Shared PDF transport limits apply separately to browser share staging and ordinary picker validation. Share commits staging and redirects; picker opens confirmation. Neither parses document content or certifies extraction.

### C0003 — intentional_difference

- `openspec/specs/background-processing/spec.md:267-282` — List workflow instances by persisted active status; block SHA-256 `cdd4f5d94441b0672ef65edad78a39a101548fd604f7b0793c319572d276b29e`, body SHA-256 `a5f463e0eb2e1326efd0a7209d5710439e7e50bce62dbc512e335972e55f50e3`
- `openspec/specs/capture-recovery/spec.md:221-236` — Count stored recipe-import workflows in the import summary; block SHA-256 `295ea5b5c24736a743b89854ae362961c79ae04f6b7b7b772e9ea7cb5662b4bc`, body SHA-256 `b2381daa5fef8df099df37568c6acecd40b25583d5a3f4735739f08f3f1c5803`

Active workflow listing selects Processing/Paused across workflows; import summary counts Completed/Pending/Processing/Failed recipe-import instances and explicitly excludes Paused. Different endpoints, selections and response shapes; status terms do not imply contradiction.

### C0004 — intentional_dependency

- `openspec/specs/background-processing/spec.md:479-502` — Resolve child cron schedules against future UTC minutes; block SHA-256 `3761e32af57cf4be2d259ee33aa32e06712a912549ae434a378288de68c28113`, body SHA-256 `8f6317bf42b60d9e72c5a408eb18aa7ed38b7c218a9a3169bd8e27234b18dd96`
- `openspec/specs/demo-household/spec.md:299-314` — Default the automatic restore schedule to daily UTC; block SHA-256 `2196181351c093da44af8f0602863416f3f2d39abd76784da6ffd1da3f3017bb`, body SHA-256 `64cc7aa9d33b3d2985cd662064ae11513d663ff6bc235a1d9009d9efe24e5a02`

Demo restoration supplies default or configured cron; background-processing owns parsing and strictly future UTC-minute selection. At-target scenario agrees with the generic next-minute rule.

### C0005 — intentional_overlap

- `openspec/specs/cooking/spec.md:277-288` — Retain single-page edit failure and retry controls; block SHA-256 `44df61220b3b1041b7fdeee85ae0bb142b554a0c517564c91325f00f45bb7ea9`, body SHA-256 `cf6aca676c905e529a7781dc5a1e103fd3cd11eeae1ffa129e40ea6e9e3d1ab2`
- `openspec/specs/recipe-editing/spec.md:118-129` — Retain editing and offer another attempt after detail Save failure; block SHA-256 `95712e1a5fbf7676e720d20c284984f36e85507bdc750312673ec6a5ed8e4a47`, body SHA-256 `9ff116639c83b9740fb75e32ac84cd5b949572a2f85823c551915dcb91b2d433`

Cooking single-page instruction editor and detail-field editor each retain their own draft after rejected save. Different UI contexts and pending controls; shared retry pattern is not duplicate ownership.

### C0006 — intentional_difference

- `openspec/specs/data-backup-and-recovery/spec.md:41-56` — Accept ordinary management requests through household access; block SHA-256 `e456e82baa7d84ef1d37d4085dacbae2827cd2d0cfee18261830776840478e7d`, body SHA-256 `960f0a1fa50ca8f138e125cc7f9b4976151f8daa2e53893e4662038de73953d2`
- `openspec/specs/demo-household/spec.md:120-134` — Accept demo snapshot capture as background work; block SHA-256 `be0a085c1b3b7b3cfb9c37259dc4f9a92a57160e08db247a0cdb52bafb0a682c`, body SHA-256 `12edcd02c4e89754c0660c7ba6061806b87d0dd0160f75d9da3a326b796d2582`

Ordinary backup/restore/disaster-recovery acceptance and demo snapshot capture invoke different workflows/endpoints. Demo capture explicitly has a mode guard; ordinary 202 envelope similarity establishes shared background acceptance convention only.

### C0007 — unresolved_ownership

- `openspec/specs/data-backup-and-recovery/spec.md:65-76` — Project the latest selected management result; block SHA-256 `9482f1af993f461cf75ba38ee24cdae5678e2c7b775b966af9626ddcbe129171`, body SHA-256 `3b0f21ebfcd48b2a7fcaa35e3b0c7b4cfcc906f2b7269fab2562d0cdb0ad1cca`
- `openspec/specs/demo-household/spec.md:373-384` — Read latest management workflow diagnostics; block SHA-256 `a0177e372dd0fd29448b91a7828c27f2f8b33120b0ccf12a250cd3b95c84c3d0`, body SHA-256 `0a824afb1bbe5fd59774ccfdac485bebbdef6c46983bdae479bffb9680a0e87b`

Same GET status endpoint/result projection overlaps for ordinary workflows; demo requirement additionally owns selection across ordinary and demo types. Outcomes agree, but projection authority is not named. Request owner clarification before any consolidation; no contradiction proven.

### C0008 — intentional_dependency

- `openspec/specs/data-backup-and-recovery/spec.md:357-368` — Rebuild lexical search content during compatible restore; block SHA-256 `11cf8e5d5d1668d55d79f839b73c1b7bdf202ca3aeb136e2551d74ea261a6ed9`, body SHA-256 `cc5f9dba97e3db0bc6e90d3cdaf61270b4296e6d3c2ae111b88ff6fccfe1a57e`
- `openspec/specs/search-indexing/spec.md:87-98` — Publish lexical content before optional embedding work; block SHA-256 `07723dde58c10a1c0b64a4daa3a3a43f040cb0483c06c6bec443757d1dde9728`, body SHA-256 `d46e498ab9e29196849993a63e02404c685c2cb609712dc9b19c7df779ec8dcb`

Restore with compatible sidecar rebuilds from restored facts; ordinary indexing publishes before optional embedding. Different triggers and guarantees; search-indexing explicitly links restore ownership.

### C0009 — intentional_overlap

- `openspec/specs/demo-household/spec.md:279-298` — Seed an initial restore only for eligible demo startup; block SHA-256 `0849d242fbfaf6519d2818a6c04884e15a6495ffc7b6012e139640cdefc9dc11`, body SHA-256 `0df0124c05f4f8eef3e63e55c5fc5a8b89a8dcd0f8a701a1e6b8c5ec1d86a70c`
- `openspec/specs/scheduled-maintenance/spec.md:27-42` — Seed the maintenance schedule when no active instance exists; block SHA-256 `b88aed268652ecaa219e6703d13aad4f36d2361d3fef56fb04cc99155c5a874c`, body SHA-256 `d2343c8a301f287e9c1584bb91d5f035af6642361276e7a03959b28ae439f0c5`

Separate startup seeders guard separate workflow IDs: demo-restore versus dreaming. Both avoid duplicate Pending/Processing seeds, but demo has enabled-mode predicate and different cron. Paused history scenario is consistent with both guards.

### C0010 — intentional_dependency

- `openspec/specs/grocery-shopping/spec.md:673-692` — Include current outstanding extras when shopping any future week; block SHA-256 `f6be18f0c8696bbcba1d911960112b9a2357017af7bf088bd90e51ff7dc806f6`, body SHA-256 `b7fbcec282ae3d2d0833bd988245c2b90f58bdc3c43c222cc6443af2b0ae2292`
- `openspec/specs/household-live-updates/spec.md:600-619` — Apply received extras only to eligible shopping views; block SHA-256 `dd35720f8962016ebdcd0e75063e31170db4e50544767407f099bc34e7b81d15`, body SHA-256 `1c8f23ad7c2b2f5b29b1f0f8be31f202ba42ede379c55937b38c04458aef3c3e`

Shopping owns projected unchecked current-week extras in future-week views and edit targets; live-updates owns receiving eligible absolute-week collections. Same inclusion policy is intentionally reflected in read presentation and received reconciliation.

### C0011 — intentional_dependency

- `openspec/specs/household-identity/spec.md:71-87` — Set household access-cookie options; block SHA-256 `a812eec82f019f8679e7457cce4b96297dcd82a14eeadee9c6ee7a755eae1859`, body SHA-256 `ba75da47f10018389c991a7b093030b6b1fcb8fb110a593af0f702b57991fa5f`
- `openspec/specs/member-context/spec.md:161-169` — Set primary member identity-cookie options; block SHA-256 `8ae9e13b745e37af2204294fda9d45ed420d5c17fe326d818d60ff1de5aedbb4`, body SHA-256 `e06a57a9d21623d5d8228266db66cd556accead903253d5a5f60e5cc85db4831`

Different cookies and writer actions. Member cookie explicitly consumes access-cookie domain/Secure policy; common flags are intentional dependency.

### C0012 — intentional_dependency

- `openspec/specs/household-identity/spec.md:88-107` — Gate protected page entry with household access; block SHA-256 `2eb6fab0091f59f32fc59423bae42a417c833698384038d5ef1ffa99924b007c`, body SHA-256 `82c52e24677db3d33c33be419a190d82e2a5484603bb352452a81793ff5e9260`
- `openspec/specs/member-context/spec.md:84-96` — Apply member context after household access; block SHA-256 `efb6197c1c2106d2ef934c23f9d843dca47deff70c6afb10a3946747229c5f48`, body SHA-256 `867380f1a9e6f4bb5a5fbc18e79845bb8bcb7105f16da971348a7617033c23e8`

Household access signature gate runs first; member gate only applies to pages subject to both gates. Onboarding can pass access without preselected member, so valid-access onboarding scenario does not contradict absent-member redirect for both-gated app pages.

### C0013 — intentional_overlap

- `openspec/specs/household-identity/spec.md:149-173` — Copy share and dismiss the member invite dialog; block SHA-256 `59829b77a63c990071249fb67e42a8eb92c490422ba7cd1ff53ab63c4bbb834d`, body SHA-256 `ef9d90bb66282784c03b046649cb2cd2e2408e8b08be3fb5ddf8aeaaa8342b85`
- `openspec/specs/planning-lifecycle/spec.md:185-196` — Share the generated voting destination from Planner; block SHA-256 `9d80e5ca703dd5ce23817d78418d19d04c5d10a8659bc42253a5af0f7b7a8d1d`, body SHA-256 `00f8e8bc59003494a970be808717dde1aee00634d03269f9a00dd370662cb595`

Member invite and voting nudge dialogs separately expose Copy/Share/dismiss patterns. Generated URLs and link-generation fallback differ; voting dialog additionally prohibits plan changes. UI consistency does not establish redundant capability behavior.

### C0014 — intentional_overlap

- `openspec/specs/household-identity/spec.md:186-198` — Request the invited member context and default Home navigation; block SHA-256 `f51f42c6d16747d279c1433ab7a657f43a0b47c23e20588d9051bde4dbbd58ed`, body SHA-256 `38ffe98b38ddcab61c951954595efd68dc8c156494fad8967be2fe0aa32da989`
- `openspec/specs/household-members/spec.md:125-136` — Request onboarding identity handoff after creation; block SHA-256 `de57b38f2910cfb4e7a4e6a1256627681118d23e7b23c75772b0a4c8ee8ed877`, body SHA-256 `f3b96a9ae8cea1eddff27c57498c21f75b2a0ca2e6a5540f9ef8d30f875225ca`

Invite acceptance selects an existing invited identity; onboarding first creates a member. Common selection/Home handoff does not erase distinct triggers or failure boundaries.

### C0015 — intentional_overlap

- `openspec/specs/household-identity/spec.md:186-198` — Request the invited member context and default Home navigation; block SHA-256 `f51f42c6d16747d279c1433ab7a657f43a0b47c23e20588d9051bde4dbbd58ed`, body SHA-256 `38ffe98b38ddcab61c951954595efd68dc8c156494fad8967be2fe0aa32da989`
- `openspec/specs/member-context/spec.md:39-47` — Select an existing member from onboarding; block SHA-256 `f6c9bbad3e36879fabe540bfa83ff89f3c6f35f5d6ca90766c2e61d0b3ac7a0c`, body SHA-256 `44a2af2e9752b0ff7df3c52918c713e8f5dda0b78973d5e2f8fefc9fec44f015`

Invite supplies accepted existing member ID after access writes; onboarding selection chooses a listed existing member. Both select identity and request Home under different triggers; no creation is required by either.

### C0016 — intentional_dependency

- `openspec/specs/household-identity/spec.md:186-198` — Request the invited member context and default Home navigation; block SHA-256 `f51f42c6d16747d279c1433ab7a657f43a0b47c23e20588d9051bde4dbbd58ed`, body SHA-256 `38ffe98b38ddcab61c951954595efd68dc8c156494fad8967be2fe0aa32da989`
- `openspec/specs/member-context/spec.md:84-96` — Apply member context after household access; block SHA-256 `efb6197c1c2106d2ef934c23f9d843dca47deff70c6afb10a3946747229c5f48`, body SHA-256 `867380f1a9e6f4bb5a5fbc18e79845bb8bcb7105f16da971348a7617033c23e8`

Invite writes/selects supplied member and requests navigation; page gate later checks access then presence of member cookie. Post-invite gate failures remain possible and explicitly delegated.

### C0017 — intentional_overlap

- `openspec/specs/household-identity/spec.md:186-198` — Request the invited member context and default Home navigation; block SHA-256 `f51f42c6d16747d279c1433ab7a657f43a0b47c23e20588d9051bde4dbbd58ed`, body SHA-256 `38ffe98b38ddcab61c951954595efd68dc8c156494fad8967be2fe0aa32da989`
- `openspec/specs/member-context/spec.md:125-138` — Request member selection and Home from Profile; block SHA-256 `943e0abc91282bf1b6cb473f71fb8ce8f59c354d0517993f19c0c5175f0421c9`, body SHA-256 `484f6af5d6a0ac45d991ea9f496024bcce1c3961d1123f6c771976594fe1f71e`

Invite acceptance versus Profile member-menu selection; different triggers and cookie prerequisites, shared downstream selection.

### C0018 — intentional_difference

- `openspec/specs/household-identity/spec.md:186-198` — Request the invited member context and default Home navigation; block SHA-256 `f51f42c6d16747d279c1433ab7a657f43a0b47c23e20588d9051bde4dbbd58ed`, body SHA-256 `38ffe98b38ddcab61c951954595efd68dc8c156494fad8967be2fe0aa32da989`
- `openspec/specs/member-context/spec.md:139-146` — Continue from Profile with the loaded selected member; block SHA-256 `d7a12e6bd4c94ac9188c64406df46cc153e89276519bd0d1ae0afdddcd239981`, body SHA-256 `609c1d4b3f9f010d6026bd814adbc127724f2cd66906074b124e74abf240182f`

Accepted invite supplying member ID changes selected identity/onboarding; Continue-as on Profile explicitly requests only Home with existing identity and no cookie write. Different triggers justify different side effects.

### C0019 — intentional_dependency

- `openspec/specs/household-identity/spec.md:186-198` — Request the invited member context and default Home navigation; block SHA-256 `f51f42c6d16747d279c1433ab7a657f43a0b47c23e20588d9051bde4dbbd58ed`, body SHA-256 `38ffe98b38ddcab61c951954595efd68dc8c156494fad8967be2fe0aa32da989`
- `openspec/specs/member-context/spec.md:170-181` — Route hydrated landing context to the next household page; block SHA-256 `89bc3ddbf39b05545e22e83431469a00c55caf91f396c82e7ffc290d508954e8`, body SHA-256 `dec65e7cc7051dc895d799afdd97f484400adf7d4e5aa2cbb1d38e46bf3f67f0`

Invite handling requests Home after supplied-member setup; hydrated root landing chooses Home/onboarding from current selected context. Navigation request is distinct from later identity validation, as both qualifications state.

### C0020 — intentional_dependency

- `openspec/specs/household-identity/spec.md:199-210` — Preserve member context when an invite supplies no member ID; block SHA-256 `fa57e36d574469d7725dbdaa17e3df225674a889b25c4f46b2b7b3ab8872ab42`, body SHA-256 `b8b98e69047475aae0a683307a2916961bb6db1db72d78c9a9968ba70e53044b`
- `openspec/specs/member-context/spec.md:84-96` — Apply member context after household access; block SHA-256 `efb6197c1c2106d2ef934c23f9d843dca47deff70c6afb10a3946747229c5f48`, body SHA-256 `867380f1a9e6f4bb5a5fbc18e79845bb8bcb7105f16da971348a7617033c23e8`

Memberless invite retains context and requests Home; later page member gate may redirect to onboarding if cookie absent. Explicit subject-to-existing-gate qualification resolves apparent Home versus onboarding difference.

### C0021 — intentional_exception

- `openspec/specs/household-live-updates/spec.md:40-55` — Apply shared access and stream-specific member checks; block SHA-256 `6ba1fdbb6a88ccc5f431f0405da2c39d9fae875857d653a3a68bab5e5ce49e0d`, body SHA-256 `3e1990c635277c4d84f7d5a45230a2bd38171eed783ac9677c7cb8fd2c473357`
- `openspec/specs/member-context/spec.md:211-225` — Bind shared API member context independently of membership validation; block SHA-256 `365994b923ff6736fc58c4f5898cd86380bd5985ec91dc2cc2d5ad314326c91b`, body SHA-256 `0cbf2dcb47795ed341699d4fd281e99c665578c63a82bbe0bdc88e59f16810d6`

Stream requires cookie specifically; general binding permits header precedence only for shared-binding actions and explicitly preserves endpoint-specific checks. Not a contradiction.

### C0022 — intentional_difference

- `openspec/specs/household-members/spec.md:59-66` — Display member-creation pending feedback; block SHA-256 `aebf25bf078e39438973732a02eeea71945d85bd8213f5d5cc67fe2426be0f60`, body SHA-256 `092e9d5fc0d9359d7358a6d7ba0b530bda896ed638c63b1afc829040f4384999`
- `openspec/specs/recipe-recycle-bin/spec.md:191-198` — Display pending permanent-purge submission feedback; block SHA-256 `a4d2a5c48770837ab5ed5fdd5cc35b703dc2a616855d64f59bc93015989c5a44`, body SHA-256 `e8fd8ff4ec481cb0144323eac6883f7fc236a45bbcb67bbc20829a7267456946`

Member creation pending disables name input; purge pending leaves PIN editing and Cancel available. Different form/action contexts; only common disabled-submit/progress vocabulary generated this candidate.

### C0023 — intentional_overlap

- `openspec/specs/household-members/spec.md:125-136` — Request onboarding identity handoff after creation; block SHA-256 `de57b38f2910cfb4e7a4e6a1256627681118d23e7b23c75772b0a4c8ee8ed877`, body SHA-256 `f3b96a9ae8cea1eddff27c57498c21f75b2a0ca2e6a5540f9ef8d30f875225ca`
- `openspec/specs/member-context/spec.md:125-138` — Request member selection and Home from Profile; block SHA-256 `943e0abc91282bf1b6cb473f71fb8ce8f59c354d0517993f19c0c5175f0421c9`, body SHA-256 `484f6af5d6a0ac45d991ea9f496024bcce1c3961d1123f6c771976594fe1f71e`

Onboarding handoff follows creation of a new member; Profile selection chooses an already loaded member and creates none. Common selection/onboarding/Home steps serve distinct triggers.

### C0024 — intentional_difference

- `openspec/specs/household-members/spec.md:125-136` — Request onboarding identity handoff after creation; block SHA-256 `de57b38f2910cfb4e7a4e6a1256627681118d23e7b23c75772b0a4c8ee8ed877`, body SHA-256 `f3b96a9ae8cea1eddff27c57498c21f75b2a0ca2e6a5540f9ef8d30f875225ca`
- `openspec/specs/member-context/spec.md:139-146` — Continue from Profile with the loaded selected member; block SHA-256 `d7a12e6bd4c94ac9188c64406df46cc153e89276519bd0d1ae0afdddcd239981`, body SHA-256 `609c1d4b3f9f010d6026bd814adbc127724f2cd66906074b124e74abf240182f`

New-member creation handoff writes/selects identity; Profile Continue-as explicitly preserves selected identity without writes or onboarding changes. Different actions, not competing rules for one action.

### C0025 — intentional_difference

- `openspec/specs/meal-assignment/spec.md:83-94` — Submit chosen-recipe assignment through the protected operation; block SHA-256 `b02f00adc714705ea0ee3969ae3a13aca2d19bc967d3ae9d34ca9f6377f6fe5e`, body SHA-256 `ff3c256b872fd66029ee900704f6af19243e6d2fc5e89aebaa3ed266d5a5c0bc`
- `openspec/specs/meal-rescheduling/spec.md:71-82` — Submit dated-source movement through the protected operation; block SHA-256 `9a998a8d0da81e27a5d33c146e529ea75ff744afe831840d7f47abfacf91abc0`, body SHA-256 `51f0400a43a7365357d45be02ea60b1897c9f6e2cdb41df18c42a7f088bf9bdc`

Assign accepts chosen recipe and relative target; move accepts dated-source indices and optional cross-week intent. Shared household API authentication is a dependency, while request identities and mutations differ.

### C0026 — intentional_difference

- `openspec/specs/meal-assignment/spec.md:83-94` — Submit chosen-recipe assignment through the protected operation; block SHA-256 `b02f00adc714705ea0ee3969ae3a13aca2d19bc967d3ae9d34ca9f6377f6fe5e`, body SHA-256 `ff3c256b872fd66029ee900704f6af19243e6d2fc5e89aebaa3ed266d5a5c0bc`
- `openspec/specs/meal-rescheduling/spec.md:191-206` — Defer the exact dated recipe through a protected operation; block SHA-256 `224fa8da4abe413da25c5f943697876804b18638e708da027bafb240cc50a82f`, body SHA-256 `60847beb72dfb8c22ed2ebdb811b3d237d93c4b0cf62a0bcb774b7e777aaac01`

Assign chooses target recipe/date; defer identifies exact sourceDate/recipe pair and rejects absent/AwaitingConsensus sources. Different operations and guards; common access rule is intentionally reused.

### C0027 — intentional_overlap

- `openspec/specs/meal-assignment/spec.md:83-94` — Submit chosen-recipe assignment through the protected operation; block SHA-256 `b02f00adc714705ea0ee3969ae3a13aca2d19bc967d3ae9d34ca9f6377f6fe5e`, body SHA-256 `ff3c256b872fd66029ee900704f6af19243e6d2fc5e89aebaa3ed266d5a5c0bc`
- `openspec/specs/non-cooking-plans/spec.md:104-115` — Submit non-cooking plans by explicit date through protected operations; block SHA-256 `aaa0e4f3b8251293efd2f6ce0c4680a26c2f8b0def03195ec5ea6a68cf030b36`, body SHA-256 `fef0bf6038d6926164d0617ca289041367edd9a0892dc74d62ab3f467083efda`

Recipe assign POST takes relative week/index/recipe; non-cooking validate/remove use explicit date and no recipe. Shared authentication policy does not make operations duplicates.

### C0028 — intentional_difference

- `openspec/specs/meal-assignment/spec.md:119-130` — Persist a planned recipe entry for an empty date; block SHA-256 `613eedb4c4da1eba1c1113582bcdaa610f08ff8c7835a1c9f58f46570c8f3c31`, body SHA-256 `865f2942addf382ab601d549866eca7d1f94c5c4559b282ecd3e812d3dabd770`
- `openspec/specs/non-cooking-plans/spec.md:140-151` — Persist recipe-free skipped plans without changing week status; block SHA-256 `99cf02c519ba7e39f5dffb386a5eb3ec54d618504dea5e06d1557f17517fa415`, body SHA-256 `8d6fab85b19da1cdc69477e2e59ced7273219078115affec672662f8df84c48c`

Empty-date recipe assignment creates Planned recipe-backed entry; non-cooking save creates recipe-free Skipped entry and may update existing non-cooking metadata. Default slot zero is a common representation invariant, not contradictory statuses for same trigger.

### C0029 — intentional_difference

- `openspec/specs/meal-assignment/spec.md:131-142` — Invoke assignment follow-up work in order; block SHA-256 `92b1ac31e35714539c2fd03f5148434726168d72c4cd6dc859fcd0bb07d36d01`, body SHA-256 `30ec2ed61d5604231e4e3146d82af8cf29aab9e70c588d4f84140fd51c6f1055`
- `openspec/specs/non-cooking-plans/spec.md:152-163` — Publish a saved recipe-free slot before returning success; block SHA-256 `6f41f88bb121c562ca8617d01c6e0da3e1a9b7c23266ec954b7652de7a2498a2`, body SHA-256 `50a88c94711acd15eaf8d0f5b4a8051c7faab0bd90080c211d037fe077751d01`

Recipe assignment recomputes groceries and emits week + invalidation; recipe-free save emits slot only and explicitly forbids those follow-ups. Different triggers/representations.

### C0030 — intentional_overlap

- `openspec/specs/meal-assignment/spec.md:400-407` — Gate every Tomorrow recovery caller on committed movement; block SHA-256 `dec59cae24c534bf39eb23caeee0667711f9228569b03380ee3702c6d1995239`, body SHA-256 `39107ea2d5aaa5487477b2a3b40359d6a27200e1eb8cdf2792ce66bac26b596a`
- `openspec/specs/tonight-meal-decisions/spec.md:464-479` — Consume the committed Tomorrow result before continuing Home recovery; block SHA-256 `26f22f99eccd3f369e641c99596960e056016cf8e40debcee8ff253452631f06`, body SHA-256 `d31ac9bab82bd30dc1c3c6e73eabb7d08eade5d94143fd83bef4cc00f60de9ec`

Planner/Search/Browse and Home callers separately require committed Tomorrow result; Home adds validation and incomplete-follow-up scenarios. Shared invariant, distinct caller coverage.

### C0031 — intentional_difference

- `openspec/specs/meal-assignment/spec.md:488-507` — Preserve meaningful ordering inside Quick Find pools; block SHA-256 `d2a201c58ece0d0347aad25b3b67826130b9813d8da28dce1d95ea2cbbb38a8c`, body SHA-256 `7e29498d4b40869e9691ea3ec10542fe139bca737c65fac1bef677824d7cbf86`
- `openspec/specs/recipe-discovery/spec.md:71-84` — Order discovery by likes and cooking recency; block SHA-256 `10d04cb40e435f1bf5c731a90d23dbd207b4d6fca1c4534e1794fd61c3f8fe79`, body SHA-256 `00d4742caa7194fbf8b89ccc45bcc42c7dae98540c73c66f64bffc8f3c3cc242`

Quick Find live pool prioritizes cooked-date before likes; Discovery queue prioritizes likes before date. Separate query surfaces and scenarios explicitly establish different orderings.

### C0032 — intentional_overlap

- `openspec/specs/meal-planning/spec.md:289-299` — Expose direct smart-default reads without locking a plan; block SHA-256 `f68e8531557b725f5eeb6b23398ba4982f90cb6f74ea5e35b22928cf14ac35fe`, body SHA-256 `200bc2387146f6afa6f8803baad9a4e0145ce8dba265aa54511eb5f4834f8e3c`
- `openspec/specs/recipe-discovery/spec.md:282-295` — Return consensus candidates as suggestions without assignment; block SHA-256 `02c64e7e4f38cecbeeeeb7cc859e78938a8b94a9a82bed42790f786dbe8c25a7`, body SHA-256 `77d148656435c4d376c8158532309e16d5fe376cdb3adedb58823767ca122795`

Same GET suggestion contract/read-only guarantee is repeated, but meal-planning explicitly retains Discovery threshold/ranking authority. Preserve caller safety and policy ownership; potential documentation compression requires traceability design.

### C0033 — intentional_difference

- `openspec/specs/meal-rescheduling/spec.md:71-82` — Submit dated-source movement through the protected operation; block SHA-256 `9a998a8d0da81e27a5d33c146e529ea75ff744afe831840d7f47abfacf91abc0`, body SHA-256 `51f0400a43a7365357d45be02ea60b1897c9f6e2cdb41df18c42a7f088bf9bdc`
- `openspec/specs/planning-lifecycle/spec.md:24-35` — Open or reopen a protected planner week for voting; block SHA-256 `eefc4c14c77f0902a720f7a9dc0ca207edbad4e9fb55d8ce48e9387252326fcf`, body SHA-256 `609c4e415a326310b11218857c57b97c6364c386cc6eeb80df60360f2ca5752c`

Move mutates calendar entries; voting open changes weekly plan/round while preserving entries. Both consume calendar-relative dates and household access, but triggers and effects are separate.

### C0034 — intentional_difference

- `openspec/specs/meal-rescheduling/spec.md:71-82` — Submit dated-source movement through the protected operation; block SHA-256 `9a998a8d0da81e27a5d33c146e529ea75ff744afe831840d7f47abfacf91abc0`, body SHA-256 `51f0400a43a7365357d45be02ea60b1897c9f6e2cdb41df18c42a7f088bf9bdc`
- `openspec/specs/planning-lifecycle/spec.md:88-99` — Persist a protected week lock independently of browser promotion; block SHA-256 `b8e2edef0e2927dfbc98697345a66147ccc31630a6b36718f5ca8807e3d293f7`, body SHA-256 `620eb4436950a89d4cce7ee8442066390b003290c28b06df6710d10b214e3f41`

Move mutates source/destination content; direct lock changes weekly plan status and creates no suggested assignments. Shared date/access handling is intentional dependency.

### C0035 — intentional_difference

- `openspec/specs/meal-rescheduling/spec.md:99-110` — Swap stored content within a week; block SHA-256 `5a105913f17f3060a6908162e508d174c85340afb71730a615c4b4d0e3d2c799`, body SHA-256 `a5363d3b3f24fe8116fc285c2dc53fb9d2487da6a3f7a4bbf169492ad63f2a81`
- `openspec/specs/non-cooking-plans/spec.md:140-151` — Persist recipe-free skipped plans without changing week status; block SHA-256 `99cf02c519ba7e39f5dffb386a5eb3ec54d618504dea5e06d1557f17517fa415`, body SHA-256 `8d6fab85b19da1cdc69477e2e59ced7273219078115affec672662f8df84c48c`

Swap exchanges existing stored calendar content; non-cooking save creates/edits a recipe-free entry. Weekly status stays distinct/unchanged in each, while entry movement and entry persistence are separate triggers.

### C0036 — intentional_difference

- `openspec/specs/meal-rescheduling/spec.md:243-254` — Complete defer after affected-week follow-ups; block SHA-256 `2f22b5481212080c832c8712a086d43cee77d73d62a4cd00923f45686992510a`, body SHA-256 `47dbaf076919df12945045a6209f2e81ade734403c06dc783b47c67fa0fe6a71`
- `openspec/specs/planning-lifecycle/spec.md:221-236` — Attempt affected-week snapshots after overdue persistence; block SHA-256 `a89d0d5d73887caa17a736dafc8c75d30b192f62346d034c361d9f14523c6fcf`, body SHA-256 `7b37caf2a622fbaa5bdc9ae3e25f467dcceea95f2ce807cd052cd8b440a14adb`

Defer recomputes affected groceries then publishes with request exclusion; overdue finalization publishes affected weeks without grocery recomputation or exclusion. Different mutation paths and explicit follow-up predicates avoid contradiction.

### C0037 — intentional_overlap

- `openspec/specs/meal-rescheduling/spec.md:255-266` — Remove a recipe-backed Planner assignment optimistically; block SHA-256 `45467bc1564c935f5e9ca5192a0320e233cd1faaee5f6ce60eefdb5229d621cb`, body SHA-256 `958c43179cd6eb2dd1db06aa58b3d2dce22f9579b6a189e01ff0085273fa56dc`
- `openspec/specs/non-cooking-plans/spec.md:212-223` — Offer direct pivot clearing for a recipe-free plan; block SHA-256 `40519042639b8e27a2fe4a063fc2813455d6293aa31d141586fd58b817be02da`, body SHA-256 `da8d7ce4c58b24249a04940c686222b2f1c48f184fad1222850fd79c685cc017`

Highest lexical score: Remove recipe versus Remove supper plan pivots. Same optimistic delete mechanics, distinct recipe-backed/recipe-free triggers and user-cleared detail; date-delete owner remains meal-rescheduling.

### C0038 — intentional_dependency

- `openspec/specs/member-preferences/spec.md:113-128` — Change browse presentation and request member persistence; block SHA-256 `5fdb0c3d44e003ab42a0f44d10a26401e016ea94c2b2bbe5f112e56a47340d60`, body SHA-256 `e256823290e2107ba5e2b5ccea909782c6085f5bcf2b91a616cf590e3218b262`
- `openspec/specs/recipe-library/spec.md:309-320` — Offer and load library stack presentation; block SHA-256 `2a3634b114474470c42bb2ed907024a93b30c36e48b46df048cd745f6f09c503`, body SHA-256 `08578ff66bb99cb790ba5f9ff2bd438548d5d595bbc8e0b33e386152fda6ecd0`

Member preferences owns persistence/reset on presentation switch; library owns default stack and paged data fetch. Different effects on same control.

### C0039 — intentional_difference

- `openspec/specs/non-cooking-plans/spec.md:152-163` — Publish a saved recipe-free slot before returning success; block SHA-256 `6f41f88bb121c562ca8617d01c6e0da3e1a9b7c23266ec954b7652de7a2498a2`, body SHA-256 `50a88c94711acd15eaf8d0f5b4a8051c7faab0bd90080c211d037fe077751d01`
- `openspec/specs/planning-lifecycle/spec.md:173-184` — Publish supported changed-day validation after saving; block SHA-256 `ef4ee448f8a30a7d3afced8df586dafcdb42970bffc6e625772e363d70bf255b`, body SHA-256 `9d37960a21333d58984c4061b7850e8a5a71b9ae146e8b27f670d8d07b93e930`

Recipe-free save and existing recipe-backed validation both publish slots; predicates and response semantics differ, including cooked flag. No conflicting follow-up rule.

### C0040 — intentional_overlap

- `openspec/specs/recipe-capture/spec.md:29-40` — Advisory duplicate warning for existing recipe link; block SHA-256 `f3a53951ddcb5128c687de6ecc32177bbfd1b6898477cafb89f62742143f0107`, body SHA-256 `72c0f8a407f8b9645bf48b94779846f874afcab2ee88fa02f6548e2ad4f969d9`
- `openspec/specs/recipe-sharing/spec.md:121-140` — Display advisory warning for existing library duplicates; block SHA-256 `cb3af2a03ce4456db0d04b1bffad6dd3db8861fc5e1ac765622595b2b6070d9f`, body SHA-256 `90703cfae851a5ccc2524a81b55cf7de905dc7f307d4a8f1fb1990867b28f4df`

URL intake advisory matches source URL; sharing bundle advisory matches recorded recipe ID/name. Both warn nonblocking and offer existing detail, but source identity predicates and entry flows differ.

### C0041 — true_textual_duplication

- `openspec/specs/recipe-capture/spec.md:93-106` — Finalize recipe readiness and broadcast completion; block SHA-256 `a25822815e508cb018860e3693da358098b4c6c7a397ac7b7d8c6508f2522836`, body SHA-256 `e08817178718483d3ba40a6fc22a4186dfd275287265698a99df048d642ad8d6`
- `openspec/specs/recipe-capture/spec.md:263-276` — Finalize photo recipe readiness and broadcast completion; block SHA-256 `fa11df42f1942f5e84701e6097a5c5e804b861db659caecd3ed879f2114da006`, body SHA-256 `e08817178718483d3ba40a6fc22a4186dfd275287265698a99df048d642ad8d6`

Normative bodies are byte-identical, same ready-step trigger and database facts/publication outcome. Both scenarios also have identical WHEN/THEN/AND bodies; only requirement and first scenario titles differ. Source-mode headings suggest intentional historical coverage, but duplicate normative text is proven; consolidation needs explicit approval and source/title/scenario traceability, not automatic deletion.

### C0042 — intentional_difference

- `openspec/specs/recipe-discovery/spec.md:71-84` — Order discovery by likes and cooking recency; block SHA-256 `10d04cb40e435f1bf5c731a90d23dbd207b4d6fca1c4534e1794fd61c3f8fe79`, body SHA-256 `00d4742caa7194fbf8b89ccc45bcc42c7dae98540c73c66f64bffc8f3c3cc242`
- `openspec/specs/recipe-search/spec.md:623-641` — Order browse promotion before ordinary rediscovery; block SHA-256 `29dcd7917a5d8c95a09e5bdfb2755525c0c1558eeb40457c8c05b33252f20197`, body SHA-256 `e8f98aecfcb677203aad0e8cdccd01f12b3ae35daf4a8253f4f4d2f8b6690e57`

Discovery queue ranks by current likes then recency; Browse ranks eligible promotions by affinity/date and ordinary rediscovery by recency/history/creation/identity. Different surfaces deliberately use different ranking priorities.

### C0043 — intentional_overlap

- `openspec/specs/recipe-discovery/spec.md:518-536` — Open the completed round's meal plan on request; block SHA-256 `77ff5e4ba76c5e986f1594628902c3bdfbe62a99ce6dd28794c78a9a6e6b4c6b`, body SHA-256 `2c1cf58afd68b87c3ac3f673bd2e7596e6f57b6f5aad3403c1c9675fe2822f90`
- `openspec/specs/tonight-meal-decisions/spec.md:597-618` — Navigate Home matches to the absolute round week without mutation; block SHA-256 `5bba7a919bb636d75f55d7fb980d219e613aef21081ed60d571815e08a283823`, body SHA-256 `3960c5a43302bec5bfc8b89263401ed2cc197536e39b2b3259fd536769630958`

Discovery card and Home invitation both navigate to absolute round week without mutation; Home additionally guards missing/stale round identity. Distinct activation surfaces and recovery obligations.

### C0044 — intentional_dependency

- `openspec/specs/recipe-editing/spec.md:306-321` — Replace supplied array instructions while retaining other metadata; block SHA-256 `e982e3c8f4e3fcc94b023058db37d02500215d19a4b08b8d107892ddc87a701a`, body SHA-256 `0213cc8d55724481f883aff7bb8b7a2941647696c94d9d48898459bb5d4ef52d`
- `openspec/specs/recipe-library/spec.md:485-496` — Read stored array instructions through recipe detail; block SHA-256 `b7d1b110acbba62a46325f90d598328439438d4165fa9ce41d5535546f78f999`, body SHA-256 `18b7ae6471f6512a05f0b7e3fcf09549e384171d1c702b31c0a5de9cc0220223`

Recipe-editing owns PATCH replacement/preservation of instruction metadata; recipe-library owns GET projection/null handling. Same stored member joins write and read obligations, with distinct triggers and no inline editor promise.

### C0045 — intentional_dependency

- `openspec/specs/recipe-library/spec.md:32-43` — Open the household library and offer list presentation; block SHA-256 `0986b78537e991d2627d0c28ad43834962b71cf1f004e15ca5eee9b987e380d1`, body SHA-256 `839b988381721db28043b2edd8014f7f3e3d604ca376e5d739365c4e1b7b9530`
- `openspec/specs/recipe-quality/spec.md:43-58` — Offer reporting from loaded recipe detail; block SHA-256 `53a401e0d0e1d3c647b7f6154658a69e74540984510ae3f8d5aabaa92998f23d`, body SHA-256 `170d13cae8d29097df36fa477e07591d56b99e14f4ab4b83a09c843c10d178cc`

Library navigation/list selection and quality reporting on already-loaded detail are different actions. Reporting explicitly consumes library loading/access context rather than redefining library navigation.

### C0046 — intentional_dependency

- `openspec/specs/recipe-library/spec.md:143-150` — Retrieve the selected library recipe for detail reading; block SHA-256 `430e795eae15b5baa48b964a3f4a939ade99e34e191895c9265eff6f8632fa5b`, body SHA-256 `48d8a79316b681deb84dd94d8f9453f98f78f42c2cfdf0fb62dff14cc097b86a`
- `openspec/specs/recipe-quality/spec.md:43-58` — Offer reporting from loaded recipe detail; block SHA-256 `53a401e0d0e1d3c647b7f6154658a69e74540984510ae3f8d5aabaa92998f23d`, body SHA-256 `170d13cae8d29097df36fa477e07591d56b99e14f4ab4b83a09c843c10d178cc`

Library fetches detail by selected recipe ID; quality offers reporting only after detail succeeds in viewing mode. Fetching and action availability are successive obligations, not same trigger/outcome.

### C0047 — intentional_dependency

- `openspec/specs/recipe-library/spec.md:143-150` — Retrieve the selected library recipe for detail reading; block SHA-256 `430e795eae15b5baa48b964a3f4a939ade99e34e191895c9265eff6f8632fa5b`, body SHA-256 `48d8a79316b681deb84dd94d8f9453f98f78f42c2cfdf0fb62dff14cc097b86a`
- `openspec/specs/recipe-quality/spec.md:315-330` — Address manual resolution to the loaded recipe with member context; block SHA-256 `5d17c00ef8b82c7c18f0796baceba117a43360a83cd8de8a0d46c722e209a3f5`, body SHA-256 `26807c7a4b8be19be14a95e1876ed6e5a18f8a79bfdd7195093abd18005418a7`

GET recipe detail and DELETE import-report target the same loaded recipe identity but perform distinct read/resolution operations. Resolution imposes its own member-existence guard; detail access transport is a shared dependency.

### C0048 — intentional_difference

- `openspec/specs/recipe-library/spec.md:224-239` — Return eligible library summary counts; block SHA-256 `420bd4461e0ce598fa6bdff432651cf7ede14364644fe39f9d89e804229c4c8f`, body SHA-256 `e32b409fda1159b99bb0dc3090363ad1787e07b6b68e43f6e8d245cf9ca3a60f`
- `openspec/specs/tonight-meal-decisions/spec.md:240-251` — Read and replace the household GOTO list; block SHA-256 `a26ee9d37ac7e951a9af824be803c2bae19d2858c9c784f49feba38b27f4f318`, body SHA-256 `638ffe99d14d5cc4e41026a749e21f09c981be70e28f358d4e02abfa97b0dba9`

Library summary counts ready undeleted recipes; GOTO GET/PUT reads/replaces stored household list. Shared protected API vocabulary generated candidate, but resources, predicates and outcomes differ.

### C0049 — intentional_difference

- `openspec/specs/recipe-media/spec.md:23-42` — Offer View Original control for eligible loaded library recipes; block SHA-256 `e9a9ff54ed4f72f60a1720aca3c473d66199b5eff406fb9581bc34610c98faa1`, body SHA-256 `f315743a474d35309976c082a74f7889396033d8cf94dcc76f44f2a9e817d377`
- `openspec/specs/recipe-recycle-bin/spec.md:23-34` — Offer Move to Bin control for loaded library recipe detail; block SHA-256 `d6d50efce92590085614505a2cd06ae1bb10f96136c7c528b9dfce6791a5f09a`, body SHA-256 `9fab6950d4d835eaec8bcb59981187659e9c8395daee1aff22f8c2d5b9ebfdec`

View Original navigates eligible source content; Move to Bin immediately soft-deletes from gear menu. Both require viewing mode but act on different resources with different eligibility and outcomes.

### C0050 — intentional_difference

- `openspec/specs/recipe-media/spec.md:23-42` — Offer View Original control for eligible loaded library recipes; block SHA-256 `e9a9ff54ed4f72f60a1720aca3c473d66199b5eff406fb9581bc34610c98faa1`, body SHA-256 `f315743a474d35309976c082a74f7889396033d8cf94dcc76f44f2a9e817d377`
- `openspec/specs/recipe-sharing/spec.md:9-28` — Offer Share action on eligible ready recipes in loaded detail; block SHA-256 `d8ac3f3390b5c73ade1c5c9335513caa2631c9643dd298ca87725354a8f78d48`, body SHA-256 `b09ab4ff30e0d06fc9943b00931f68a55c06e0d2f3ece4641447a229cd4df05f`

View Original requires URL provenance or original image count; Share requires ready recipe with nonplaceholder hero. Both hide during editing, but different action eligibility and behavior are explicitly scenario-covered.

### C0051 — intentional_dependency

- `openspec/specs/recipe-quality/spec.md:255-274` — Select saved issue membership for review; block SHA-256 `a39caf75f271270cea095462c26896b6e389baa134a5754801255d01598e948e`, body SHA-256 `299cf6e526b241e7c9d816b28b963f0f3729d6efa7ef3f7a777534702589907c`
- `openspec/specs/recipe-search/spec.md:221-234` — Use report membership without a separate review route; block SHA-256 `795c071f2423b32917b101e4fbdf4d00029b548468e1c408f52c80b5ec12c202`, body SHA-256 `07d0b09a9a43d489d28c77630c3aa4e56015a6262db36ff1d1ccff6dce438905`

Recipe-quality owns report membership/precedence; Search explicitly consumes it while retaining text/hard filters/Focus retrieval. Consistent repeated scenario demonstrates composition, not a second independent policy.

### M001 — intentional_dependency

- `openspec/specs/planning-lifecycle/spec.md:56-67` — Promote displayed pending suggestions before closing voting; block SHA-256 `f9cbe75577ccdcda68143b5da3b357d3fdc36ad10315a6942568ece0c3a242ac`, body SHA-256 `0e3a0544ed85b65895505bb884aa6e0600d2b299804ab7b99bbbd71c6d4afaa4`
- `openspec/specs/planning-lifecycle/spec.md:237-268` — Close atomically with retry-safe round ownership; block SHA-256 `b30a9998dd84eb124187ac8df65dcd49fd2ca5a7c9bb4a7adb85c2b7f8265f03`, body SHA-256 `4e3c96dd3bd45ed36a59c09fda3c1742fda3a6637ff8972dac402c0f669a58b3`

Browser promotion is multiple requests and non-atomic; durable close of persisted plan/history/votes is atomic. The pending-browser-suggestion scenario explicitly preserves that separate boundary. No contradiction.

### M002 — intentional_dependency

- `openspec/specs/meal-planning/spec.md:173-188` — Compose voting suggestions separately from persisted assignments; block SHA-256 `de9b015b775b7e018bca84107eeee11c85b2cda4bfefef89256dd9d19c292fee`, body SHA-256 `513e5efb49795bcecef3b77efaccf15cc5216835e1bf5e772b8a5f66dcb5e2f1`
- `openspec/specs/household-live-updates/spec.md:280-295` — Reconcile received suggestions without replacing occupied slots; block SHA-256 `e7a171e452586f6431c6aa61e88d2b06dc1959f03d17f14733aa6522909daefc`, body SHA-256 `c7651a8e773e7775550f5bfa62971a23fe4cf7db77163e39983357512fe5073d`

Initialization fetch/composition versus received live-default reconciliation. Both preserve occupied slots, while live update additionally clears withdrawn suggestions. Distinct triggers; Discovery retains consensus.

### M003 — intentional_dependency

- `openspec/specs/recipe-library/spec.md:509-524` — Derive represented source provenance and reimport availability; block SHA-256 `39cbef40fe892fa571be23eb9abcad0f53511e61c4ac2232ead2912d990360d6`, body SHA-256 `edc44765a21f34d1789d024f17e955bb15b3e47fa09ae93237e8c68ffe91f253`
- `openspec/specs/recipe-quality/spec.md:451-469` — Use saved provenance for contextual URL repair; block SHA-256 `b8585b234ce5e4556f17abd7cb3002d76ceb8e7e84d22db1c5a51f4359ec76ea`, body SHA-256 `cfc271d3ab4aeee61ab461c55d42a683b777605472393a95cc3cef15e82295e3`

DTO canReimport represents source availability; contextual processing requires eligible feedback, provenance and repeated-feedback policy. Representation is not launch/completion guarantee.

### M004 — intentional_dependency

- `openspec/specs/capture-recovery/spec.md:237-248` — Retain durable recovery for accepted URL captures; block SHA-256 `519ec79aefd319fede9bc41e2b3aec37cbfdafdf592d9715ccbb83c7bae7e62e`, body SHA-256 `9fdcb624a4ab7f6fc716f8ab74dd584946d8a6ec3b1d61a79fd1167906c0b42a`
- `openspec/specs/recipe-quality/spec.md:143-158` — Let the server decide whether feedback requests contextual processing; block SHA-256 `311b4013c7ca1e0cc23cf0b07358c6740e35ec5bc987f612acee5ffd1bbf0cba`, body SHA-256 `046d08228632c99dfc1a352e053b3c20e8546b13b8159cce297dffb1ad933cd1`

Durable accepted intake recovery versus saved-content issue report eligibility. A recoverable failed capture is not a contextual feedback attempt; both preserve acceptance/completion distinction.

## Ownership across priority boundaries

| Boundary | Current normative owners and consequences |
|---|---|
| Planning / assignment / lifecycle | meal-planning reads and presentation; meal-assignment chosen-recipe writes/recovery; meal-rescheduling move/defer/shared deletion; non-cooking-plans recipe-free UI/save; planning-lifecycle voting/lock/day validation/finalization; deployment-calendar date authority. Browser promotion and durable close are separate boundaries. |
| Discovery / live updates | recipe-discovery owns queue eligibility/votes/consensus/suggestion placement; household-live-updates owns connection, publication attempts, received reconciliation; meal-planning owns initialization composition. Receipt is not durable delivery, and suggestion is not assignment. |
| Search / indexing / library | recipe-search owns retrieval/ranking/promotion; search-indexing materializes facts/documents and embeddings; recipe-library owns catalog eligibility/detail representation; recipe-quality supplies review membership; recycle-bin supplies deletion policy. Restore and ordinary indexing use different triggers. |
| Capture / quality / recovery | recipe-capture owns intake/readiness; recipe-quality saved issue/contextual attempts; capture-recovery failed intake/workflow retry/clear; background-processing execution and reset; scheduled-maintenance cleanup; recipe-library provenance/readiness representation. Re-import availability is not automatic eligibility or success. |

Purpose/related-owner introductions were read for the eleven named priority capabilities; their explicit links support these boundaries. Existing split history was a navigation hint only; current files establish conclusions.

## Link check

links.py scans inline relative Markdown links in canonical specs only. 171 links checked; all target files and GitHub-style heading slugs resolved locally. The slug checker appends collision suffixes for duplicate headings within each file, but approximates GitHub Markdown behavior; unusual inline markup, Unicode slug edge cases, reference-style links, code fences and renderer differences are outside this bounded check. This is a syntactic check, not proof of semantic ownership correctness, remote immutable links, runtime guarantees or all possible Markdown syntax. Exact records in links.json.

## Recommendations requiring separate approval

1. Keep v1 audit reporting-only: stable source spans, exact raw evidence/hashes, explicit candidate versus reviewed decisions. Never delete/move requirements automatically.
2. Decide whether the duplicated ready-step requirement should remain explicit per-source coverage or later gain one shared owner plus preserved URL/photo scenarios and provenance mapping. No canonical change is part of this audit.
3. Clarify the owner of GET management/status projection between demo-household and data-backup-and-recovery before considering consolidation. They agree on observed result selection; ownership remains unclear.
4. Treat lexical scoring as a recall-limited review aid. Same-endpoint, policy links and targeted boundary selection caught useful pairs below lexical threshold; no measured semantic recall percentage is justified.
5. All 51 generated candidates have full requirement/scenario review; broader semantic recall remains unmeasured. Validate exact block/scenario conservation, owner links and scenario mappings for any later proposed reorganization.

## Reproduction

Run `python3 candidates.py ../inventory/requirements.json OUTPUT_DIRECTORY` from this directory, then `python3 review.py` to apply this fixed human-reviewed decision record. Run `python3 links.py` from the repository root (its output destination is this audit temp folder). Python stdlib only; no installs. Scripts write only explicit temporary output artifacts. review.py plus remaining_review.json are a reproducible record of human decisions, not an automated semantic oracle.

Memory consulted: MEMORY.md:54-101 (previous capability split navigation); thread 01a14795-5873-73a3-8c9f-01c42cede754. All factual findings verified against current canonical files.
