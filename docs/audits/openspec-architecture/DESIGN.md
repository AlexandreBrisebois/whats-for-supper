# Proposed deterministic OpenSpec audit tooling

Status: audit design retained for traceability. The user subsequently approved P0 inventory-only tooling; its implementation and acceptance are documented in [INVENTORY_TOOL.md](INVENTORY_TOOL.md). Overlap detection and benchmark mode remain proposals. No canonical requirement or schema-policy change is authorized.

## Context and existing ownership

OpenSpec 1.14.3 owns canonical parsing/validation and already exposes capability lists, requirement overviews and selective requirement reads. `Taskfile.yml` pins that version and owns `spec:check` and `spec:search`. `.agents/core/context-loading.md` owns conditional loading; the WFS schema requires full relevant specs, including scenarios, before coverage/change decisions. The proposed tool supplies reproducible measurements and navigational candidates; it does not become a second normative owner, change parser acceptance or replace those reads.

## First observable slice and scope

Propose `scripts/agent/openspec_audit.py` and `scripts/agent/tests/test_openspec_audit.py`, with one additive `spec:audit` task using the existing `{{.PYTHON}}` interpreter and `-B`. Start with an inventory over the project's local `openspec/specs/**/spec.md`, sorted by repository-relative POSIX path. Archives and in-flight deltas are excluded from canonical totals. No registry, daemon, persistent index, embeddings, LLM calls, network access or dependency installation. The current audit's temporary measurement programs are evidence, not an implementation of this proposal. Recorded source code may be archived as JSON data for reproducibility; it is not installed as a repository command.

## CLI and output contract

- `--format text|json`: text default; JSON is versioned (`schema_version: 1`), UTF-8, sorted stable records with one trailing newline. Stable stdout contains no wall-clock timestamps, absolute workstation paths or duration noise. Runtime diagnostics go to stderr.
- `--capability <exact-relative-id>`: repeatable exact path filter, including future nested capability paths; unknown names fail rather than falling back to all. Reject traversal and absolute capability paths. No substring or fuzzy matching. A nested capability path remains one exact ID.
- `--overlaps`: adds deterministic duplicate groups and lexical candidates with source evidence. Output labels are `exact_title`, `normalized_description`, `lexical_candidate`; none implies semantic duplication. Candidate generation does not rewrite or suppress canonical blocks. Keep generated evidence separate from manually reviewed annotations so reruns cannot silently erase decisions or pretend to reproduce semantic judgments.
- `--benchmark`: run versioned built-in workload definitions tied to requirement title, path and expected source digest. Changed/missing/ambiguous titles or new relevant obligations invalidate the curated reference set and produce a stale-reference diagnostic, not an apparent 100% recall score. Benchmark output includes exact payload definitions, baseline variants, index/source generation I/O, logical reads, UTF-8 bytes, characters, tokenizer availability and final verification cost. Model tokenizer name/version/encoding must be explicit; never silently substitute characters/4.
- `--output <explicit-path>`: only opt-in file output; stdout otherwise. Resolve parent and target, reject paths within canonical specs/config/schema or any tracked repository file. No implicit output directory or cache. Existing output fails rather than overwriting; write a sibling temporary file then rename on success, cleaning only owned temporary files. No directory creation by default. Reject symlink output targets and canonical source symlinks; require an ordinary explicit destination. These are proposed bounded defaults, subject to design approval.
- Exit 0: valid inventory/report, even with duplicate candidates. Exit 1: invalid arguments/unknown capability/output conflict. Exit 2: unreadable/malformed inputs or stale benchmark references; include partial diagnostics but do not claim complete totals. A nonempty warning list does not itself mean semantic failure; structural incompleteness sets `complete: false`.

The first implementation slice accepts `--benchmark` only when its curated workload definitions and stale-reference tests land together; until then, do not advertise an unimplemented flag as available. `--benchmark` is accounting over explicit synthetic references, not automatic discovery or model evaluation.

The additive task would forward CLI arguments to the script, without chaining `spec:check` or mutating the planning environment. `spec:check` remains the structural validation gate.

## Record and parsing design

Read raw UTF-8 bytes once per source, hash SHA-256, decode strictly without Unicode or newline normalization for evidence. Preserve raw text and record Unicode character count, bytes, physical lines (`splitlines()` semantics), final-newline presence, ordered headings, purpose span, full pre-requirement preamble span (ownership, relocation and evidence qualifications), requirement description span, full requirement span and scenario spans. Source lines are one-based inclusive; optional byte offsets are half-open and explicitly distinguished from Unicode character offsets. A requirement identity is capability path + exact title + occurrence ordinal + full-block hash, so duplicate names remain representable. Hash normative description and full scenario-bearing block separately.

Recognize ATX heading levels outside fenced code blocks, supporting backtick/tilde fences and nested Markdown within bodies. Requirement is level 3 and scenario level 4; lower-level headings remain body content. Terminate blocks at next heading of equal/lower level. Warn on missing Purpose, orphan scenarios, empty names, duplicate headings, incorrect heading depth, unterminated fences and missing scenarios. Preserve all unparsed raw material and report coverage gaps. Never repair input silently. Compare parsed counts to pinned OpenSpec output as an integration check, while leaving OpenSpec authoritative for validity.

For normalized description grouping: Unicode NFC plus collapse Unicode whitespace, case preserved; store algorithm version and both original and normalized hashes. Do not strip negation, punctuation, identifiers, dates or numeric thresholds. Empty descriptions are diagnostics, not duplicate groups. Also report full-block equality separately if implemented, because equal descriptions with different scenarios are weaker evidence.

Lexical v1: lowercased alphanumeric terms, fixed versioned stop-word list and formula, stable score then path/line tie-breaking; explicitly emit threshold/top-K and unreviewed candidate counts. Publish shared terms and both normative source spans; scenarios remain linked. Prefer a small explainable bag-of-terms comparison to embeddings. Semantic classification remains a reviewed record with rationale, trigger/outcome and unresolved state; reports generated without review must say so. Ownership links are navigation: explicit references support dependency, not automatic duplicate dismissal or source-code parity.

## Acceptance and meaningful tests

Implement test-first after approval. Inventory fixture tests must cover Unicode byte/character differences, CRLF/final-newline conventions, fenced fake headings, nested headings, exact span/source round trips, duplicate titles and purpose, orphan/malformed headings and invalid UTF-8. Golden determinism tests compare byte-identical JSON across independent processes, differing filesystem enumeration order and working directories. Duplicate fixtures include equal titles with different outcomes, equal descriptions with divergent scenarios, explicit dependency links and negation/threshold differences. Lexical results must never be serialized as proven semantic duplication.

Read-only tests snapshot fixture trees, tracked files and mtimes before/after default/text/JSON/capability/overlap/benchmark commands; forbid network/subprocess mutation and assert no bytecode/cache creation under the script's execution contract. Output tests exercise explicit-only writes, preexisting destinations, symlinks, prohibited tracked/canonical targets, failed atomic writes and cleanup. Benchmark tests exercise stale hashes, unavailable tokenizer, discovery costs and final full-read costs with expected arithmetic, rather than asserting a desired positive saving. Integration: run against the current corpus, reconcile all canonical counts and source hashes, compare selected requirement titles/scenarios with pinned `openspec show`, run `task spec:check`, harness tests and the applicable final `task verify` scope. Tests establish static/report behavior, not application behavior or model reasoning recall.

## Performance and integration budget

Proposed acceptance budget, not a current measured guarantee: at least five warm runs on this Mac, report median and maximum; inventory under 1 second median, overlap under 3 seconds median at the observed corpus, peak RSS under 100 MiB. Store environment/corpus digest in opt-in measurement evidence, not deterministic stdout. Standard-library implementation; no tokenizer required in v1. Pairwise overlap at 808 requirements has 326,028 unordered pairs; bound emitted candidates with a documented threshold/top-K and keep exact groups exhaustive. If the budget fails, measure before adding acceleration or dependencies.

A future OpenSpec tooling change can use `skip_specs: true` because no product requirement changes; this proposal does not create that change now. Tool/script/test/Taskfile changes are harness scope, requiring existing harness checks and full `spec:check` under repository rules. Documentation-only audit acceptance uses artifact reconciliation and scope review; API/database/browser checks are not applicable.

## Risks, rollout and reversal

Parser drift is the primary maintenance risk. Pin integration comparisons to OpenSpec 1.14.3 and require explicit fixture review when upgrading. Indexes can become stale between reads: source hashes must be rechecked before using spans. Similarity ranking can miss paraphrases and rank intentional overlap highly; it cannot support an exhaustive duplication/contradiction claim. Selective context can omit scenarios or cross-capability obligations; preserve whole selected blocks, reviewed dependency references and the mandatory full-file gate. Byte savings are not token or accuracy savings.

Roll out inventory first, then optional candidate output, then benchmark mode only after its selection contract is approved. No CI gate for lexical scores. Rollback removes the additive task/script/tests only; no data migration, canonical rewrite or application rollout. Reports remain historical evidence with explicit source hashes.

## Approval decisions

1. Approve a bounded implementation of inventory + exact duplicate reporting first, with lexical candidates advisory and benchmark mode separately acceptance-gated; or approve the full proposed CLI in one change.
2. Approve retaining the schema's full relevant-file review obligation. Any replacement with requirement-only reads requires a separate policy decision and stronger independent recall evidence than this static benchmark.
3. Approve no canonical consolidation now. Any actual ownership/requirement edits require a separately scoped OpenSpec change with exact requirement/scenario conservation, dependency-link review and traceability.

## Current audit evidence shaping this design

The canonical corpus is 873,568 bytes across 34 capabilities; extraction was observed at roughly 0.08 seconds for a worker run, which is not the proposed production performance acceptance. The title/span/hash-rich global index measured 230,046 bytes. Scoped index+selected payloads added 9.17–11.01% bytes compared with current OpenSpec overviews plus the same initial/final full-read phases. Therefore do not implement a persistent index, mandatory prompt injection or automatic capability splitting as a presumed optimization. Benchmark values are exact byte accounting; tokenizer unavailable.

There is one byte-identical normative description pair (URL/photo readiness), no exact requirement-title duplicate, and an unresolved management-status owner question. Similar-looking ordering and access rules often deliberately differ by surface or endpoint. Lexical output must remain advisory and display the exact scope of semantic review.

## Settled review decisions

- P0 inventory-only tooling approved; overlap detection and benchmark mode deferred.
- Shared management-status contract direction: data-backup-and-recovery owns it, with demo-household retaining demo-specific rules and references; actual canonical edits require a separate scoped change.
- Keep both URL/photo finalization requirements and their explicit path traceability.
- Retain full relevant-spec review; no selective-read policy replacement.

P0 output publication uses a no-clobber hard link instead of overwrite-capable rename. The CLI exposes only format, exact capability selection and explicit output flags; no deferred flag is advertised. Full design features above remain future scope where they exceed P0.
