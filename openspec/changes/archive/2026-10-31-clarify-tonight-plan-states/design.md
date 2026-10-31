# Design

## Context and Existing Ownership

Review checkpoint: `review/solar-earth-continuation`, HEAD `e4cd725dfbd0092667d04ddaa4062dea3846b843`, 2026-10-31; index empty. Large existing OTel removal and the completed 4/4 unarchived Mystery hero edits are present. No application or existing planning files were changed during this proposal.

Source-backed review, not a rendered/device audit:

- `pwa/src/components/home/HomeCommandCenter.tsx` owns precedence: loading → saved recipe-free Skipped non-Mystery summary, or empty/Mystery pivot; separate planned/cooked states remain. The actual saved-plan summary is a button with a 48px icon container and 24px icon, two-line title/note clamps. Non-Mystery examples passed directly to `TonightPivotCard` tests are not the real Home render path.
- `TonightPivotCard.tsx` gives settled ordinary empty nights `h-28 sm:h-40`, cream, sage-700 and a 104px Utensils illustration. Mystery with no proposal uses the shared 64px image fallback and 28px Sparkles; it suppresses the ordinary star helper and gives no settled-unavailable explanation. A represented pending/checking identity gets feedback. Before active read settlement without an identity it gives no checking text.
- `TonightCardBase` in `TonightMenuCard.tsx` owns the warm white rounded cookbook shell. Home caps width at 27rem (sm:max-w-sm). `TonightRecipeImage.tsx` owns 5:4 images and modest absent/failed-image fallbacks keyed by recipe/source. Do not enlarge these shared recipe fallbacks.
- `api/src/RecipeApi/Services/GoToService.cs` chooses a random nondeleted persisted-ready configured recipe. Empty list, all pending, deleted or missing recipes return null; `GoToController` maps null to 404. The endpoint never returns pending despite the client supporting it.
- `pwa/src/store/familyStore.ts::loadActiveGoTo` maps every read exception to null. Home marks the initial read settled for null as well as success. Consequently the current UI cannot distinguish no memberships, temporarily ineligible memberships, network failure or authorization/server failure. Do not label all nulls “no GOTO recipes”. `hasCheckedActive` is settlement, not proof of successful retrieval.
- `nonCooking.ts` owns localized titles and preset notes; customLabel is the custom title, and is an optional note for order_in/eating_out. Legacy null-kind skipped plans fall back to order_in. The DTO does not contain separate custom title and details fields: preserve available content, do not invent one or duplicate the title as details. Browser acceptance exposed newline stripping by the single-line editor; use a textarea with the existing validation/focus behavior so saved multiline content survives editing.
- Saved-plan editing already navigates to Planner with weekOffset, reference week and planDate. Planner opens the date pivot once, then Edit supper plan opens the draft. Retain this handoff; adding a direct editor or spontaneous assignment is outside scope.

## Decisions and Tradeoffs

Use one composition language, not a new card size or a 5:4 decorative empty slab. Reuse the ordinary empty illustration's generous 104px icon / 112px phone and 160px larger-screen area, 1.5rem radius, warm cream/sage treatment, normal 24px padding and cookbook shell. Saved plan cards show a quiet Tonight header, icon area, prominent title, optional note and one clear Edit supper plan action. The illustration is decorative; the text carries meaning. Do not make the whole card a button enclosing other controls. Reuse `NonCookingIcon` meanings: ShoppingBag = Take Out; UtensilsCrossed = Eating out; CalendarDays = custom/Other plans; Sparkles = Mystery. Scale the existing icon, keeping its established stroke unless rendered inspection supports a local adjustment. Do not introduce new icon libraries, badges or animation.

Other plans is a Planner entry/category, not the saved custom title. A saved “Emma’s birthday supper” stays “Emma’s birthday supper”, with CalendarDays; replacing it with Other plans would lose useful household context. Display full title/notes in flow instead of two-line truncation. Do not add redundant explanatory paragraphs for self-explanatory saved plans. Edit supper plan is useful and leaving the page is also a complete outcome.

Keep generic unavailable-suggestion copy because current data cannot distinguish transport failure from no eligible GOTO. Changing the store/API error contract, adding a second membership read, or introducing retries would expand state behavior beyond this presentation slice. Quick Find and Take Out remain useful exits. There is no claim that saving/star selection will immediately produce a suggestion. No extra recipe acquisition or scheduling runs on render.

Take Out remains a household non-cooking intention; the app places no order. English Take Out can suggest collection more strongly than Order In. Keep “Takeout or delivery” explanatory copy and French “À emporter ou en livraison” so delivery remains supported. Proposed French label “À emporter” is shorter and consistent with current vocabulary; it is a reversible copy decision, not a new fulfillment constraint. Do not alter input entered by users even when it contains Order In.

### State matrix and proposed copy

| Starting state | Current source behavior | Proposed composition / words | Available next action and invariant |
| --- | --- | --- | --- |
| Schedule synchronization loading | Aligning your day loader replaces content | Retain loader; do not flash a completed plan/empty claim | Existing calendar recovery retained |
| Ordinary empty, initial active read pending | Small fallback; helper absent | Preserve existing ordinary state for this bounded change | Search, Take Out; no Make this tonight |
| Ordinary empty, settled null (404 or failure) | Large Utensils; star helper | Preserve large illustration/helper, rename secondary copy only | Search, Take Out; no empty-membership claim |
| Mystery, active read pending and no identity | Small Sparkles, saved title, no checking line | Large Sparkles, “Mystery night” / “Souper mystère”; “Checking your GOTO…” / “Vérification de votre GOTO…” | Quick Find, Take Out; saved plan stays |
| Mystery, settled null: zero GOTO, all pending, deleted/missing or failed read | Small Sparkles and title only | Large Sparkles; “No GOTO suggestion available right now.” / “Aucune suggestion GOTO disponible pour le moment.” | Quick Find primary, Take Out secondary; no acceptance or fabricated food |
| Mystery, represented pending/checking identity | Preparing/checking text, no acceptance | Large Sparkles plus existing preparing/checking text; do not duplicate unavailable copy | Existing alternatives; no false ready claim; defensive state not currently emitted by active service |
| Mystery, ready suggestion | Implemented quiet Mystery header above normal 5:4 photo, recipe body/actions | Preserve exactly; public Take Out label is the only action-copy change | Make this tonight explicit acceptance; Quick Find/cancel keeps Mystery |
| Ready proposal, missing/failed photo | Shared modest fallback, recipe/actions retained | Preserve modest image fallback (including ready Mystery) | Actions remain; no switch to no-suggestion state; new recipe/source retries image |
| Recipe-free Take Out | Compact Home summary with optional note | Normal card, large ShoppingBag, “Take Out” / “À emporter”, note when present | Edit supper plan through dated Planner handoff; no save on viewing |
| Recipe-free Eating out | Compact Home summary | Normal card, large UtensilsCrossed, existing “Eating out” / “Manger à l’extérieur”, optional note | Same existing edit handoff |
| Custom/Other plans | Compact summary, two-line title | Normal card, large CalendarDays, exact saved custom title; no fabricated details | Same existing edit handoff; long text preserved |
| Legacy recipe-free Skipped with null metadata | Default Order In summary | Same card with Take Out fallback | No migration; existing edit handoff |
| Planned recipe / cooked / recipe-backed legacy skip | Separate existing branches | Preserve their precedence, layout and recovery | Existing cooking/disposition semantics; no new scheduling |
| Schedule read fails with prior content | Retains prior Tonight content; no dedicated read retry | Preserve retained state and existing calendar notice behavior | No new synchronization or mutation semantics |

Use the locale's existing Eating out / Mystery / edit strings from dictionaries as authoritative at implementation; French examples above are meaningful proposals, not claims about a newly selected user translation.

### Complete rename inventory

Source search covers application src, e2e, public service worker, backend services and current guidance. Update application-owned copy and assertions at these owners; keep internal symbol names and stable test IDs.

| Surface | Owners / exact copy keys | Work |
| --- | --- | --- |
| Home pivot primary/secondary alternatives | `TonightPivotCard.tsx`; `home.orderingIn` in EN/FR common.json | Take Out / À emporter; keep `onOrderIn`, `order-in-btn` |
| Saved Home title and accessible card name; Planner badges/headings | `lib/planner/nonCooking.ts`, `HomeCommandCenter.tsx`, `app/(app)/planner/page.tsx` | Shared localized label propagates to visible/accessibility summaries; verify fallback and notes |
| Non-cooking choice dialog | `NonCookingDaySheet.tsx` | Same shared key; preserve kind `order_in`, choice order and draft behavior |
| Changed-plan recovery dialog | `SkipRecoveryDialog.tsx`; `home.orderingIn`, `home.takeoutOrDelivery` | Label Take Out; normalize explanatory EN “Takeout or delivery”, FR “À emporter ou en livraison”; no ordering claim |
| Planner Other plans entry | `PlanningPivotSheet.tsx`; `planner.otherPlansSubtitle` | “Take out, eat out, or add your own” / “À emporter, au restaurant ou votre propre plan” |
| Accessibility | Labels generated by nonCookingLabel, semantic button text and dialog options above | Localized accessible names match visible choice; preserve icon aria-hidden and keyboard focus |
| Notifications / service worker | `pwa/public/sw.js`; no matching application-owned Order In notification template found in current service sources | No identified copy replacement; notifications passed through from user data must not be globally rewritten |
| Focused unit assertions | `TonightPivotCard.test.tsx`, `HomeCommandCenter.test.tsx`, `NonCookingDaySheet.test.tsx`, `lib/planner/nonCooking.test.ts`, `app/(app)/planner/page.test.tsx`; inspect `SkipRecoveryDialog.test.tsx` | Update public labels and add both locales; keep internal test IDs/callback names |
| Browser assertions and readable test descriptions | `home-goto.spec.ts`, `home-recipe.spec.ts`, `planner-non-cooking-days.spec.ts`, `planner-full-cycle.spec.ts`, `deployment-calendar-live.spec.ts`, `tomorrow-push-live.spec.ts`, `tomorrow-push.spec.ts`; inspect `deployment-calendar.spec.ts`, `planner.spec.ts`, `goto-layout.spec.ts`, `mock-api.ts` | Update user-facing expected strings and scenario descriptions when touched; retain internal fixtures/selectors. Live/real-data suites are not authorized to run here |
| Current guidance | `docs/user-guide.md`, `docs/flows/user-flows/goto-lifecycle.md`, `order-in-flow.md`, `no-menu-goto-home-state.md`, `recipe-selection-to-home.md`, current-copy portions of `docs/visual-language-reference.md` | Update current public-copy examples with Take Out while retaining file URLs and historical screenshot/problem quotations. Preserve the original schematic SVG boards as design-checkpoint evidence, with an explicit current-copy note in the reference. Do not repair unrelated historical behavior claims |
| Stable contract/implementation vocabulary | `order_in` enum, sourceDisposition, status 3, generated SDK, `markOrderedIn`, DTOs, SQL checks, routes/filenames, test IDs; internal server validation diagnostic in ScheduleService | Preserve compatibility. No generated-client/schema rewrite or data migration |
| Historical specs and evidence | `openspec/changes/archive`, `docs/openspec-baseline`, decision/history documents and older design briefs | Preserve. Active change deltas document new public mapping; canonical spec sync/archive is separate work |

Current guides include stale behavior narratives (for example, order-in-flow describes a pivot after Skipped where actual Home renders a separate summary). Rename relevant current copy and explain this change, without claiming those older narratives were behavior-verified or expanding into a general docs rewrite. Existing active Mystery hero change mentions old labels: this successor deliberately changes only the public Take Out name and no-proposal treatment; when later syncing specs, reconcile it after the hero delta. Do not edit completed hero evidence to claim it tested these new states.

## First Observable Slice

Home with a saved recipe-free order_in plan and optional note → HomeCommandCenter → localized label → normal Tonight shell and large ShoppingBag → explicit Edit supper plan → existing dated Planner pivot. Verify text and icon plus no POST/DELETE on display/navigation. API responses are doubles at existing Playwright mock-api.ts boundary; GET /api/schedule and GET /api/goto/active shapes/methods remain unchanged. This presentation slice needs no backend or persisted-data changes. Then extend the same seam to Eating out/custom, and separately Mystery no-proposal.

## State, Concurrency and Recovery

Presentation classification uses currentRecipe/status/kind and active settlement/readiness. The approved Mystery replacement uses the existing explicit dated non-cooking writer, with a guarded pending callback; no new store or backend contract. Preserve Home content precedence and the completed ready-Mystery hero composition. Viewing, loading, null settlement, opening/cancelling Quick Find and edit navigation submit no plan mutation. Existing choice/acceptance/disposition flows retain their optimistic and partial-success limitations. Alex explicitly approved replacing saved Mystery entirely when Take Out is chosen. Use existing saveNonCookingDay(date, {kind: order_in, customLabel: null}) and await persistence before showing Take Out. Guard repeated submission and disable choices while pending. Capture the authoritative date and original plan; recheck after calendar acquisition and never apply an old completion over a changed date, recipe or different local plan. On save failure retain/reconcile the saved plan and show localized retry feedback; do not send a status-only fallback. Successful saved metadata must replace Mystery, with no Mystery custom label retained. Existing explicit non-cooking server conflict handling and publication/read semantics remain unchanged. Same-kind competing remote edits have no revision/CAS guarantee in the existing contract; this change does not invent one.

## Compatibility, Rollout and Reversal

UI composition/copy and an existing explicit non-cooking save; no migration or deployment flag. Existing `order_in` payloads/read fallback remain compatible, and server selection/error policy is unchanged. Reversal restores presentation/copy without data repair. New generic unavailable text intentionally cannot diagnose a network error; a dedicated distinction/retry can be designed later if requested.

## User Experience

Reuse cream `#fdfcf0`, sage-700 `#525b37`, charcoal `#1f2937`, Outfit heading/Inter body and current terracotta action tokens. The icon alone never conveys state. Preserve visible keyboard focus, >=48px buttons and readable actual-composite contrast; do not claim AA conformance from source inspection. Keep normal width cap/padding, flexible height and intentional page scrolling. Check 320×568, 390×844, 412×915, 820×1180 and 1180×820, EN/FR, 80-code-point multiline custom titles/notes, 200% text, reduced motion and no-image/error cases. No new disclosure is needed for a short saved note; never use title attributes as the sole route to its content.

## Risks and Deferrable Questions

Source inspection establishes branch logic, not rendered quality, device behavior, screen-reader announcements or measured contrast. Later implementation must inspect rendered local EN/FR phone/iPad results and report emulation limits. Take Out/À emporter is an approved rename with preserved delivery meaning; the user can refine French copy without a migration. The reviewed Mystery→Take Out limitation is explicitly approved for correction through the existing dated save; no backend contract expansion is needed.
