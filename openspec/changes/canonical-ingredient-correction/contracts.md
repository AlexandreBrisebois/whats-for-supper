# Shared proposed contracts — review draft, not OpenAPI

This document is the sole shape proposal for all five changes. `specs/openapi.yaml` remains runtime contract authority and is untouched in this spec-only session. Names below are proposed additions, not claims about current endpoints. Dependent tasks must first approve and transcribe them to OpenAPI, regenerate Kiota and synchronize method-sensitive mocks. Companion designs reference this owner rather than define alternate schemas.

## Recipe content and exact quantities

```json
{
  "contentSchemaVersion": 2,
  "contentRevision": "opaque-token",
  "servings": 4,
  "ingredientLines": [{
    "id": "uuid",
    "description": "pasta",
    "amount": {"kind":"scalar", "value":{"n":"200","d":"1"}},
    "amountText": "200",
    "unit": {"text":"g", "definitionId":"mass:g"},
    "scaling": "proportional",
    "package": null,
    "shopping": {"name":"pasta", "foodId":null, "mappingRevision":null},
    "provenance": {"origin":"human", "sourceRef":null, "protectedFields":["amount"]}
  }],
  "instructionSections": [{"id":"uuid", "name":null, "steps":[{
    "id":"uuid", "text":"Add 200 g pasta.", "textRevision":"opaque-step-token", "bindings":[]
  }]}]
}
```

IDs are server-issued UUIDs; create drafts carry a request-local clientId mapped in the authoritative result, not a claimed saved ID. Lists define order. Sections preserve supported nested source ordering without a general nested recipe engine. A step's textRevision changes only with its text; contentRevision changes on semantic content publication. Source metadata has sourceRevision plus content-addressed evidence references. Keep evidence access behind existing household authorization; shared DTOs need not expose raw private evidence.

`amount` is null, scalar as above, or `{"kind":"range","min":{"n":"2","d":"1"},"max":{"n":"3","d":"1"}}`. Nonnegative normalized numerator strings and positive denominator strings have at most 38 decimal digits each, no leading zeros except zero, gcd=1; endpoints ordered min≤max. Transport uses strings to avoid JS safe-integer loss. Arithmetic uses checked exact intermediates; overflow returns unresolved projection with original evidence, never saturation/NaN. API rejects invalid persisted values with 400. `amountText` retains supported original spelling (including Unicode fractions) only if it parses to the identical amount; generated projections never replace it. Null amount requires null amountText; unparsed imported text remains description/evidence, not a numeric assertion.

Input grammar in the amount field: unsigned integer, dot decimal or locale French comma decimal (no thousands separators), ASCII proper/improper fraction n/d, mixed whole + fraction, listed Unicode fractions ¼ ½ ¾ ⅐ ⅑ ⅒ ⅓ ⅔ ⅕ ⅖ ⅗ ⅘ ⅙ ⅚ ⅛ ⅜ ⅝ ⅞, or two such scalars separated by hyphen/en dash. Normalize spaces, reject exponent, negative sign, denominator zero, multiple separators and ambiguous `1,000` (offer correction, never infer 1000). Range input is explicit; do not parse a hyphen in arbitrary ingredient prose. Original notation survives a round trip; output formatting uses deterministic locale conventions without feeding rounded values back to storage.

Unit is independently null, or `{text, definitionId:null|supported-id}`. Null unit is no declared unit, not an assertion of pieces. Unitless known counts can group together; do not merge them with cloves/cans absent explicit count semantics. Supported exact definitions start with metric mass/volume and explicit count kinds. Cup/tsp/tbsp without a documented standard retain separate raw buckets; current implicit 240/15/5 ml assumptions cannot silently populate new definition IDs. Regional definitions must be explicit and validated. No mass/volume or drained/net conversion without evidence. `package` is null or `{countUnit, capacity:{amount,unit}, basis:"net"|"drained"|"unspecified"}`; capacity stays fixed while the line's count scales. No purchase rounding.

## Recipe read, write and revision contract

- Existing GET `/api/recipes/{id}` keeps its unwrapped `{updatedAt,recipe}` response, adds original fields above and derived compatible ingredient/instruction strings. No provider or storage writes on read.
- Existing ingredient-preview and ingredient-projection operations retain context validation and add `contentRevision`, `instructionProjection`, target/basis and binding coverage. Both ingredients and instructions come from one captured revision. `contextKey` includes recipe ID, contentRevision, target, original/preview/dated mode and existing absolute-date/occurrence/plan/serving versions. No projection grants completion authority.
- PATCH `/api/recipes/{id}` accepts `expectedContentRevision` for any supplied ingredientLines, servings, instructionSections, legacy ingredients/recipeInstructions, shopping correction or scaling policy. Legacy/current arrays cannot coexist. Omission preserves; complete rows require all nullable properties so nested null clears intentionally. Empty array clears. Existing other-field null behavior stays unchanged; servings remains a positive integer when supplied, omission preserves unknown. Do not introduce basis clearing silently; a future explicit clear operation needs contract review.
- Stale/missing content guard, including apparently name-only full old editor payload carrying ingredients, returns 409 `{code:"recipe_content_conflict",currentContentRevision,upgradeRequired}` and applies no field in that request. Invalid structure returns 400; unavailable recipe 404; access/demo/recovery guards remain applicable. Do not include private source material in errors. A successful 200 returns authoritative detail plus new revision; no submitted-snapshot reconstruction.
- Instruction compatibility adapters preserve IDs only for demonstrably unchanged entries. Ambiguous replacements invalidate affected bindings and retain text. Notes/rating-only writes need no content guard and cannot publish stale content. Name/description updates invalidate search by existing rules, but do not advance contentRevision unless original semantic recipe content changes.
- Delayed imports/repairs carry captured contentRevision and sourceRevision. Stage before publishing files/DB; protected fields and unknown authorship survive; conflicts leave current recipe usable and report retry/reconciliation truthfully. Matching successful replay is a no-op by operation ID + input hash; identical revision with different canonical content is corrupt, not a newer update.

## Revision-bound ingredient uses

Binding: `{id, ingredientLineId, stepId, validatedContentRevision, validatedTextRevision, span:{start,end,expectedText}, role, payload, status}`. Offsets are UTF-16 code units, half-open, against exact unnormalized stored text; validate surrogate boundaries, expectedText, limits, no overlap. Immutable original text is escaped as text, never evaluated as markup. A renderer substitutes verified spans from right to left or builds equivalent segments. It never scans arbitrary numbers at read time.

Roles/payload:

| Role | Payload and projection |
| --- | --- |
| mention | No quantity substitution or demand |
| whole | Canonical total and scaling policy; confirmed exhaustive use only |
| absolute | Exact original-basis quantity and unit; proportional with target/basis unless explicitly fixed |
| fraction | Exact rational in [0,1] of projected total; retain “half” wording; optional numeric rendering must agree |
| remainder | allocationGroupId and predecessor binding IDs in an acyclic ordered same-row sequence; numeric result only if all compatible and exhaustive |
| fixed | Explicit evidence-backed original amount unchanged with portions |
| perItem | Fixed per-item quantity plus separately bound item-count span/ingredient; scale count only; do not multiply dose too |

Bindings identify original ingredient rows, never food IDs/grocery rows. Multiple uses do not add demand. Validate sums only in explicit exhaustive same-row allocation groups; conditional alternatives and repeated mentions are not summed as independent allocations. Exact sums above total or incompatible units invalidate numeric remainder, preserve text and require quiet correction. Correlated range remainders must not be fabricated by subtracting independent endpoints: only a proven algebraic relationship yields a range; otherwise unresolved. A whole-use and partial-use double declaration in one exhaustive group is contradictory.

All semantic edits advance contentRevision. Unrelated bindings may be revalidated/carried to the new revision only when their ingredient facts, textRevision, source evidence and dependency graph are unchanged. Deleted rows/steps or changed text invalidate affected bindings and downstream remainders. Do not silently relink a duplicated word or ID. Ingredient-total edit policy is still a review hold: proposed default preserves absolute allocations, retains fractions and updates proven whole uses, marking contradictions uncertain.

## Grocery rows and check mutations

Recipe grocery row: `{rowId, rowVersion, weekStartDate, source:"recipe", demandIdentity, quantity, unitText, quantityComplete, recipeIds, displayName, section}`. `quantity` uses the exact scalar/range union; known incomplete subtotal is explicit. Names are labels. demandIdentity binds saved food ID or conservative fallback identity, purchase qualifiers and compatible unit bucket. Stable server rowId persists for proven continuing demand; no rowId comes from localized text. Exact demand-identity matches continue directly. For an unmatched unit-bucket change, a unique one-to-one contributor lineage (same saved ingredient rows and scheduled occurrence IDs, same food/purchase meaning, no competing split/merge) can prove row continuity even when quantity comparison is impossible. This preserves the check for an incompatible-unit change without claiming equivalence. Ambiguous lineage does not establish continuation. Retired identities never revive a stale checked row. New split/merge/semantically changed groups get new IDs and start unchecked (no inference of shopping acknowledgement); continuing rows follow proven increase policy. This structural policy is distinct from a one-time legacy transition and needs explicit approval with row-identity design.

Existing PATCH `/api/schedule/{weekOffset}/grocery/item` is proposed to require `{rowId,weekStartDate,expectedRowVersion,checked,clientMutationId}`. Preserve captured reference Monday and verify offset resolves the same absolute week. Success becomes 200 `{updatedAt,weekStartDate,rowId,rowVersion,checked}`; 409 stale/missing row/version returns current row or absent marker without applying the stale intention. Unknown row never creates a phantom. Repeat clientMutationId+identical body returns its saved outcome without applying again; changed body under same ID conflicts. Serialise same-row optimistic intents; apply only matching equal/newer version responses. A lost reply requires reread before replay. Extras keep existing occurrence endpoint/version and actual occurrence week even when presented in future shopping views.

Existing bulk grocery PATCH remains an explicit guarded replacement: proposed `{weekStartDate,expectedListVersion,checks:{rowId:boolean}}`, response 200 `{data:{weekStartDate,listVersion,checks}}`. Missing keys clear only in the matching list version, not from stale name dictionaries. Name-only writes return 409 upgrade_required after cutover. Item changes on unrelated rows need not conflict from unrelated checks; recompute changes affected rowVersion when comparison/check state changes. Existing `grocery_updated` and schedule DTOs must carry absolute week/list/row versions and row checks together; late old snapshots cannot restore newer state. Proposed recipe rowVersion/listVersion are monotonically increasing unsigned-64 decimal strings (initial 1, compared exactly, never JS floating-point). Every committed check mutation, guarded bulk replacement or changed recompute advances listVersion; affected rows advance rowVersion. Unchanged retries are no-ops and return saved versions. Thus a stale bulk baseline cannot erase an intervening item check, while item writes on different current rows need not conflict. Locale-only label changes do not reset identities/checks. ContentRevision remains opaque: recipe clients reject stale reads using request/context generation and captured token, not lexical ordering. Demo generation/recovery gates remain, and the initially supported single application instance must remain explicit; multi-replica durability is not established by in-process locks.

For a continuing comparable row, convert exactly before comparison. Complete scalar increase is new>old. For ranges, proposed conservative proof is new.min>old.max; equivalent intervals preserve; overlap, unknown contribution, changed incompatible unit and unknown→known are unprovable and preserve checks without warning. Keep completeness truth distinct from check intent. This range policy is a design proposal needing acceptance with the shared contract. Proven increase atomically unchecks the affected row once and increments its version; subsequent check survives unchanged recompute. No `checkReviewReason`, prior-unknown acknowledgement or replacement badge. Existing one brief list-level increase explanation may remain once per actual reset, never on mere read or uncertainty.

## Food identity and category correction

`FoodIdentity {id,revision,labels:{en,fr},aliases:[{locale,text,matchKey,relation:"exact",sourceRef,reviewedAt}],qualifiers,status}`; only validated labels publish, otherwise retain source shopping name. External IDs remain provenance, never primary key. A saved mapping records dictionary version, evidence, origin and human-protected fields. Household correction affects that household/recipe association, never automatically a global alias. Conflicting exact aliases are unresolved; broad/related/nutrient group relationships cannot merge foods.

Before bilingual cutover normal category PATCH `/api/ingredients/{key}/category` retains its normalized-key scope. Afterward propose explicit `/api/foods/{foodId}/category` for validated household food overrides; unresolved rows keep their fallback-key scope. Required `{grocerySection,expectedCategoryRevision}` → 204 only after existing persistence/recompute contract; 409 stale correction; no mutation of extra occurrences. Category migration conflicts retain each prior human choice and unresolved rows instead of selecting the last write. Extras retain their occurrence PATCH. UI control parity never implies endpoint/scope parity.

## Formats

Proposed recipe envelope `format:"wfs-recipe",version:2,recipeId,contentSchemaVersion:2,contentRevision,content,...`; full snapshot manifest `format:"wfs-snapshot",version:2,schemaFingerprint,householdId,artifacts,hashes`. Include identities/dictionary references and household overrides required to reproduce meaning, exact quantities/notation, units/packages, source/protection, sections/bindings, prepared/serving state, row/check versions, media and durable obligations. Reject unsupported old formats in ordinary restore before any mutation. One-time forward importer has explicit accepted source formats and a separate manifest; it is not routine restore. Current-format ordinary merge uses an explicitly captured destination contentRevision/content hash in its reviewed import manifest, plus field protection. Identical content is a no-op; absent destination IDs can be staged under that operation’s membership rules. Nonidentical existing content requires a matching captured destination baseline and approved field selection; stale, missing or divergent baselines defer. No full historical revision ledger or timestamp ordering is assumed. Exact restore is an explicitly selected replacement with complete relationship/media preflight. Opaque tokens cannot be ordered by timestamps.
