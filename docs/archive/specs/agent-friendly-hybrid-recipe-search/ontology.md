> **Archived — historical reference only.** Tasks, status, commands, and instructions below are historical, not an active work queue or current authority. See [archive guidance](../README.md).

# Ontology: Agent-Friendly Hybrid Recipe Search

## Purpose and authority

This document defines the feature's concepts, relationships, ownership, and
boundaries. Read it before requirements, design, or a selected implementation
task. It names domain concepts; it does not require a class or table per term.
[Requirements](requirements.md) define acceptance, [design](design.md) defines
mechanisms, and [tasks](tasks.md) defines execution and evidence. OpenAPI remains
the authority for the public wire contract. Existing code and proposed behavior
are distinguished explicitly below.

The repository's [harness ontology](../../../.agents/core/ontology.md) defines
agent tasks and evidence. A task in this packet is an implementation assignment;
a workflow task is persisted application work. They are not interchangeable.

## Recipe and search representations

| Concept | Meaning and owner | Boundary |
| --- | --- | --- |
| Recipe | The library item identified by recipe ID; owned by recipe persistence and import/update flows. | Source data, not a search result or embedding. |
| Eligible recipe | A ready, non-deleted recipe satisfying applicable access rules and request hard filters. | `IsReady`, `IsDiscoverable`, canonical readiness and embedding readiness have different meanings. Discoverability is not a blanket base requirement. |
| Recipe fact | An explicitly stored source value or documented deterministic projection, such as cuisine or parsed minutes. | A recorded fact is not a guarantee that imported data is correct. Unknown is not false or zero. |
| Canonical builder | One deterministic transformation from indexed recipe inputs to text and normalized metadata. | Does not generate facts through an LLM or maintain bilingual aliases. |
| Search document / sidecar | The derived `recipe_search_documents` row belonging to one recipe via recipe ID. | At most one row per recipe; its existence alone does not mean usable content exists. Rebuildable without re-importing the recipe. |
| Document text | The builder's stable textual representation used for lexical matching and recipe embedding generation. | Not the user's query; not an independently authored recipe description. |
| Search metadata | The builder's normalized JSON facts used in predicates and deterministic explanations. | Not arbitrary `RawMetadata`, an embedding, or inferred taste traits. |
| Normalization | Documented deterministic trimming, case/whitespace normalization, ordering and deduplication. | Does not translate, equate synonyms, remove quantities by guesswork, or map fish to salmon. |
| Metadata schema version | Version of the builder's representation and normalization rules. | Independent of API version and embedding model version; changes can require backfill. |
| Source fingerprint | Hash identifying the indexed source values and builder schema version. | Content identity, not a timestamp, recipe ID, or concurrency lock by itself. |
| Recipe embedding | A numeric vector generated from canonical document text by the embedding provider. | Derived approximate meaning, not verified ingredient facts. |
| Query embedding | A vector generated for the original non-empty query using a compatible embedding model. | Created for retrieval, not persisted as recipe content. |
| Embedding fingerprint | Source fingerprint of the content used to generate the stored recipe vector. | Must equal the current canonical fingerprint for semantic eligibility. |
| Model compatibility | Compatible embedding model/version and vector dimensions for recipe/query comparisons. | Same vector length alone does not prove comparable meaning. |

## Readiness and state transitions

Three independent questions govern availability:

1. Is the recipe itself ready and eligible to appear?
2. Is usable canonical text/metadata published for lexical retrieval?
3. Is a compatible embedding ready for that exact published content?

| State or event | Lexical behavior | Semantic behavior |
| --- | --- | --- |
| Sidecar created, no canonical content yet | Await canonical publication; sidecar presence is insufficient. | Ineligible. |
| Canonical content published, embedding pending/indexing | Searchable if recipe is eligible. | Ineligible until a matching vector is ready. |
| Matching compatible embedding published | Searchable. | Eligible for semantic retrieval. |
| Embedding generation fails | Remains searchable. | Ineligible; retry independently. |
| Changed canonical content published | Search uses new text/metadata. | Old vector is ineligible; queue replacement. |
| Late job completes or fails for superseded content | Cannot overwrite newer canonical state. | Cannot overwrite newer embedding state. |
| Recipe becomes ineligible or is deleted | Excluded regardless of sidecar status. | Excluded regardless of vector status. |

Proposed storage separates canonical readiness (`index_status`) from
`embedding_status`. Canonical publication means an atomic text/metadata/schema/
fingerprint write; embedding publication means a separate conditional vector/
fingerprint/model/status write. "Ready" without naming the representation is
ambiguous and must not be used in implementation evidence. "Stale" means a
representation or queued job no longer matches the current source/schema/model.
Concurrency checks and work ownership enforce this; the fingerprint alone does not.

## Request intent and recipe descriptors

| Concept | Meaning | Example / boundary |
| --- | --- | --- |
| Original query | The caller's sentence, retained as submitted; normalization for matching does not replace it. | "Something fresh with fish." |
| Hard filter | A structured predicate that determines eligibility before ranking. | Maximum 30 minutes rejects unknown time and values over 30. |
| Preference | A soft ranking contribution for already eligible candidates. | A fish preference cannot override the time filter. |
| Semantic concept | Meaning expressed in query/preferences, evaluated approximately through semantic matching. | Fish, fresh, hearty, vegetables; not an exact ingredient fact. |
| Included ingredient | An explicitly supported exact normalized ingredient fact required by a filter. | Does not claim that a broad fish request exactly matches salmon. Source representation is established in task 1. |
| Ingredient exclusion | A future hard or best-effort avoidance feature. | Out of scope; no shellfish exclusion, negation guarantee, or semantic veto ships now. |
| Cuisine | Stored cuisine classification projected into normalized metadata. | Distinct from source language and meal type. |
| Meal type | Recorded occasion such as breakfast, lunch or supper. | Distinct from recipe category even where labels overlap. |
| Category | Recipe-owned category value. | Do not silently replace it with meal type. |
| Dietary profile | Existing structured recipe classification projected through documented rules. | Not a free-form synonym list or an exclusion guarantee. Projection remains task 1 work. |
| Tag | Explicit source-owned label with a verified source/parser. | Source is unresolved; no hard tag filter until verified. |
| Derived trait | Additional inferred characterization such as vegetable-forward. | Deferred enrichment; a semantic match does not create a stored trait. |
| Total time | Documented parsed recipe duration in minutes. | Unknown/malformed is null, not zero; ISO hours must be handled. |
| Contextual signal | Existing planner, pantry, family, rating or schedule input to reranking. | A boost/demotion does not bypass hard filters. |
| Agent | A caller or optional intent adapter supplying a request. | May augment intent; does not replace original query or make final selection through an LLM. |

"No LLM required" means no generative query rewrite or explanation is required
to serve search. Semantic retrieval still uses an embedding model; an unavailable
embedding provider degrades to lexical retrieval. Cross-language relevance is an
embedding capability to evaluate, not a maintained translation dictionary.

## Retrieval, ranking and explanation

| Concept | Definition / owner |
| --- | --- |
| Lexical retrieval | PostgreSQL text matching over canonical documents, returning bounded candidates with text scores. |
| Semantic retrieval | PostgreSQL nearest-vector retrieval over eligible compatible embeddings, returning bounded candidates. |
| Candidate | An internal possible match before final reranking/presentation; not necessarily returned to the caller. |
| Top K | Internal candidate bound per retrieval source, initially 50 each; unrelated to UI page size. |
| Fusion | Application union by recipe ID combining normalized lexical/semantic components, initially at most 100 unique candidates. |
| Reranking | Application ordering using fusion, preferences and contextual components. No new candidate bypasses retrieval or hard filters. |
| Score | Ranking value, not a probability or guarantee of correctness; raw lexical/vector scores are not interchangeable. |
| Match reason | Structured evidence explaining an actual matching/scoring contribution. Semantic similarity cannot assert an ingredient is present or absent. |
| Top pick | At most one promoted recipe selected under existing promotion rules. Report-related suppression can make it null even with alternatives. |
| Alternatives / `results` | Ordered response cards excluding the top pick; the initial default is 12. |
| Result path | How retrieval was served (browse, lexical, semantic, hybrid or fallback). Distinct from caller mode such as agent/pantry/similar; public values change only in task 5. |
| Lexical fallback | Successful search using lexical retrieval after a semantic failure/budget timeout. Can legitimately return zero matches. |

## Search, browse and scrolling

| Concept | Ranked search | Empty-query browse |
| --- | --- | --- |
| Purpose | Find relevant candidates for expressed intent; similar-recipe requests retain their separate vector behavior. | Explore without naming a meal; filters alone may narrow the eligible library. |
| Candidate universe | Bounded retrieval union, initially at most 100. | Entire eligible recipe library; no fixed total cap. |
| Ordering | Frozen ranked candidate ordering for continuation. | Database explore ordering: never cooked first, oldest last-cooked date, newest creation date, then unique recipe ID. |
| First page | One response: optional top pick plus up to 12 alternatives. | Same presentation count; no query embedding required. |
| Later pages | Next 12 alternatives from ranked snapshot. | Next 12 alternatives via database keyset pagination. |
| Exhaustion | No remaining eligible ranked candidates. | Actual end of eligible library, including beyond 100 recipes. |

`limit` counts alternatives only, excludes top pick, defaults to 12, and has a
per-request maximum of 50. A request is an HTTP exchange; it may contain multiple
database queries. One initial request does not mean one SQL statement.

A **continuation token/cursor** identifies the next position in the same request
context. Ranked continuation refers to bounded expiring candidate state; browse
continuation identifies a database ordering position, not a full-library snapshot.
`nextCursor = null` means no further page. **Infinite scrolling** automatically
requests the next page near the bottom; it means no artificial browse limit, not
repeated recipes or loading the whole library into memory. **Duplicate suppression**
prevents repeated recipe IDs and is not ingredient exclusion.

The PWA owns rendered cards, request-generation guards, scroll restoration and
retry UI. A new query/filter invalidates old continuation. Failure retains cards
and offers retry; expiration offers explicit restart. Concurrent library edits
can affect later browse pages, but must not reorder cards already displayed.

## Maintenance, rollout and completion

| Concept | Meaning / boundary |
| --- | --- |
| Indexing | Publishing canonical content, then independently generating its vector. |
| Backfill | Initial rebuilding of derived search state for existing recipes; not re-importing recipe sources. |
| Reconciliation | Resumable comparison of eligible recipes against derived state, repairing missing/outdated documents or embeddings. |
| Dreaming | Existing scheduled maintenance workflow dispatching recurring reconciliation. Heavy work belongs to its child workflow; normal recipe updates still index promptly. |
| Migration | In-place database schema/extension/index upgrade, separate from backfill. Does not reset the library. |
| Shadow retrieval | Runs a proposed path for comparison while the established path serves the response. |
| Rollout flag | Temporary control selecting a serving/comparison path; retired with displaced code. |
| Permanent fallback control | Supported semantic-disable control retaining database lexical search after legacy removal. |
| Dead code | Code with no supported caller or operational purpose. Disabled but still required rollout code has an explicit retirement task, not permanent exemption. |
| Semantic budget | 300 ms for query embedding and vector retrieval combined; caller cancellation is separate. |
| API latency target | p95 below 250 ms lexical-only and below 600 ms hybrid/failure fallback, including time spent on the failed attempt. A target is not measured evidence. |
| Task completed | Implementation, required cleanup and acceptance evidence finished. A resolved design finding does not mark implementation complete. |

## Worked examples

- "Fresh vegetables and fish": original query produces lexical/semantic
  candidates; it creates no hard ingredient requirement or inferred stored trait.
  One response returns an eligible top pick and up to 12 alternatives.
- The same query with `maxTotalTimeMinutes` as a conceptual 30-minute filter:
  unknown/over-limit times fail eligibility before ranking. The exact wire field
  name is established by task 5's OpenAPI change.
- Empty search with no filters: browse all eligible recipes in batches of 12,
  without the 100-candidate limit. A library of 500 eligible recipes is not cut
  down to 100.
- Embedding provider unavailable after a recipe update: current canonical text
  remains searchable; the previous vector cannot match the changed document.
- Dreaming finds an eligible recipe without a sidecar: reconciliation creates
  missing derived state and queues indexing; it does not re-import the recipe.

## Explicit unresolved representation details

Task 1 must establish the supported exact ingredient representation, dietary
projection, legacy time formats, and whether a trustworthy tag source exists.
This ontology does not invent those mappings. Any definition change must be
reflected in affected acceptance criteria, design, task checks and OpenAPI where
public; do not silently use one term for different representations.
