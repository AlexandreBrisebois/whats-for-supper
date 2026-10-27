# Context benchmark evidence and limitations

Source identity: HEAD `a3232949b1fd627771ebe9ee68a975170f1798ad`; OpenSpec `1.14.3` on 2026-10-26. This is temporary audit evidence, not an implemented repository tool. No application, spec, schema, Taskfile, dependency or installed package changes were made by this worker. Before/after worker status: `?? docs/audits/` (orchestrator-owned output only).

## Current behavior already supports selective discovery

`.agents/core/context-loading.md` loads selected scope and immediate dependencies, treats links as navigation rather than recursive instruction loading, and narrows context between steps. `openspec/schemas/wfs/schema.yaml` proposal instructions explicitly require `openspec list --specs`, then `openspec show <id> --type spec --json --no-scenarios` for relevant owners. That output includes requirement descriptions and purpose, not only titles. The schema explicitly calls this an overview and requires a full relevant spec read including scenarios BEFORE deciding coverage or change scope. Therefore selective discovery is existing behavior; a new index does not establish a new permission to skip full review.

Captured pinned-version commands: `commands.json`, `cli-*.txt`, and `cli-full-text.txt`.

- `openspec show --help`: `--json`, `--type change|spec`, `--no-interactive`, `--deltas-only`, deprecated change-only `--requirements-only`, `--diff`, `--requirements`, `--no-scenarios`, `-r/--requirement <id>` and `--store <id>`.
- `--requirements` and `--no-scenarios` both returned 11 requirement descriptions and zero scenarios for recipe-sharing: 5,957 stdout bytes each.
- `--requirement 10 --json` returned exactly the pending-Share requirement with both its scenarios: 1,591 stdout bytes. This is a 1-based position, not a stable requirement identity.
- Full JSON returned 11 requirements/37 scenarios: 17,480 bytes. It is not a byte-preserving substitute for canonical Markdown/preambles.
- Full text returned canonical recipe-sharing text plus an extra newline: 14,777 bytes versus source 14,776. The benchmark measures exact source Markdown, not JSON serializations or assumed identical CLI payloads.
- Keep `--type spec` to disambiguate change/spec IDs. Store behavior is documented by help/schema, not exercised against a configured external store.

## Reproduction and payload definition

First run the inventory worker's generator for `inventory.json` and `requirements.json`. Then run:

```sh
python3 /tmp/wfs-openspec-audit.Gst1Xs/benchmark/measure.py --repo /Users/alex/Code/whats-for-supper --inventory /tmp/wfs-openspec-audit.Gst1Xs/inventory --output /tmp/wfs-openspec-audit.Gst1Xs/benchmark
```

The script consumes inventory records rather than reparsing a competing corpus. It independently reads all 34 canonical files, validates file SHA-256 and every requirement block against its exact source line span and hash, and writes only to an explicitly supplied directory outside the repository. Source ordering follows inventory filesystem order; workload capability ordering is sorted. Each workload has `manifest.json` with exact titles, paths, spans, raw requirement/scenario text, hashes, scope, sparse initial choices and explicit misses. `selected.md` includes ALL pre-requirement source preambles, preserving purposes, ownership links and historical qualifications, plus whole selected requirement blocks with EVERY scenario. `full-scope.md` concatenates full files without additional separators. `index.json` contains scoped capability purpose, path, file hash and every requirement's exact title/span/hash/scenario count. `capability-index.json` contains the global index. JSON serialization is stable UTF-8, sorted keys, two-space indentation, and one final newline. This index serialization is an explicit benchmark choice, not an asserted optimum.

Measurements count UTF-8 bytes, Unicode code points (Python string length), SHA-256, and explicit read-protocol operations. They are deterministic payload accounting, not telemetry of this assistant's context use, host token caching, latency, billing, reasoning quality or entire conversation. Tool wrappers, shared governance, request text, source implementation investigation, deliberation, and output writing are excluded equally. Reads mean source files/payloads consumed under the declared protocol; batching multiple payloads into one tool call does not eliminate those payload reads.

No usable model tokenizer was found in system Python, repo `.venv`, installed OpenSpec package roots, or bounded PWA Node package roots. `tiktoken`, `transformers`, `tokenizers` imports were unavailable; found CSS/YAML lexers do not count. No install or network package fetch occurred. Tokenizer name/version/encoding and token counts are null. **No token saving or cost claim is made.** Characters/4 is not used.

## Scope and challenge review

These are concrete synthetic workload requests, not executed product fixes or representative workload-frequency samples:

1. Small UI: retain pending Share disablement through preparation and delivery, eligibility, cancellation, fallback and error outcomes. No API/import change. Full owner review: recipe-sharing. Four requirements/16 scenarios retained. Initial one-title choice missed eligibility, export preservation and delivery settlement: 3 requirements/14 scenarios.
2. Planner cross-capability: correct same-week dated drag/keyboard movement while preserving exact source, optimistic restoration, reference weeks and received snapshots/echoes. Full owners: meal-rescheduling, deployment-calendar, meal-planning, household-live-updates, household-identity. Full-file review added calendar references, auth, schedule projection/initialization, merge/adjunct guards, echo handling and session refresh. Excludes Tomorrow/defer/assignment/recipe-free clearing changes. 33 requirements/100 scenarios retained. Initial drag-preview/keyboard-only selection missed 31 requirements/95 scenarios, including the explicit-date fallback and immediate dependency owners.
3. Background lifecycle: review stale-task cutoff/loop interval adjustment without changing acceptance/reset/pruning/maintenance composition. Full owners: background-processing and application-time. Retain due selection, dispatch, retry distinction, invocation cadence, stale cutoff, retained fields/parent scope, caught failures, backoff, processor slots and supplied clock. Eleven requirements/36 scenarios retained. A cutoff-title-only selection missed 10 requirements/33 scenarios, notably invocation cadence, no retry-limit/parent/liveness gate, caught cancellation effects and injected time.

Selection recall is measured against manually declared reference sets AFTER reviewing full scoped canonical files. Initial requirement recall is 25%, 6.06%, 9.09%; initial scenario recall is 12.5%, 5%, 8.33%. Expanded selection retains 100% of these reference sets with no missing whole blocks/scenarios. This is not exhaustive semantic recall, an automatic discovery success rate, or proof that no other obligation would matter to a real implementation. Expanded recall is intentionally a preservation check; the sparse experiment shows why discovery cannot certify completeness. `verification.json` validates preservation and two subsequent full-scope hash reads.

## Results

| Workload | Full phase bytes / chars / reads | Index bytes / chars | Selected bytes / chars | Index+selected exploratory bytes | Exploratory reduction |
|---|---:|---:|---:|---:|---:|
| Small UI | 14,776 / 14,776 / 1 | 3,676 / 3,676 | 6,191 / 6,191 | 9,867 | 33.22% |
| Planner | 130,762 / 130,718 / 5 | 30,230 / 30,226 | 54,838 / 54,802 | 85,068 | 34.94% |
| Background | 38,423 / 38,413 / 2 | 9,621 / 9,621 | 14,223 / 14,215 | 23,844 | 37.94% |

The exploratory comparison uses one full pass versus one scoped-index payload plus one selected payload. It is not a compliant end-to-end coverage/design decision by itself.

To preserve both the existing mandatory full review before a coverage/design decision and the audit plan's final full-scope verification, compare identical full phases:

| Workload | Baseline initial+final full bytes / reads | Add scoped discovery then both full phases bytes / reads | Byte overhead |
|---|---:|---:|---:|
| Small UI | 29,552 / 2 | 39,419 / 4 | +33.39% |
| Planner | 261,524 / 10 | 346,592 / 12 | +32.53% |
| Background | 76,846 / 4 | 100,690 / 6 | +31.03% |

Thus this experiment **does not establish end-to-end context savings** under current full-review rules. If existing overview discovery is already used, compare its real selected-capability payloads directly before claiming any additional benefit from a replacement. Do not contrast selective discovery with loading the whole corpus for every task: current repository instructions do not require that baseline.

The complete 808-requirement index is 230,046 bytes / 230,026 characters. Injecting that global index on every workload is worse than scoped discovery: exploratory totals become 236,237 / 284,884 / 244,269 bytes; compliant totals become 265,789 / 546,408 / 321,115 bytes. Discover capability IDs with existing list/show first, then filter metadata server-side. Machine-readable rich inventory should remain an artifact, not automatically become prompt context.

## Generation, amortization and limits

Index generation requires reading all 34 canonical inputs, 873,568 bytes, plus parsing and serialization. This evidence builder also reads two precomputed inventory metadata files and validates every source hash/span; its elapsed time is in `results.json` but excludes the inventory parser's prior run, so it is not an end-to-end parser performance result. Canonical input bytes and 34 reads are reported separately from model context because deterministic local generation does not require sending full source to a model. If generation DOES use a model, add that actual model payload; do not count it as zero. Generation is shared once across the three source-identical workload experiments, not charged three times and not silently omitted. Different source hashes require fresh generation or validation. This audit proposes no persistent index.

Repeated exploratory passes can amortize a generation run's CPU/I/O, but cannot turn the measured additive initial+final-full protocol into savings. Frequency, cache retention, actual future passes and LLM token costs were not observed; no break-even workload frequency is claimed. A fresh-session read policy and source-identity checks remain necessary before interpreting reused payloads.

Recommendation: v1 should prioritize complete deterministic inventory, stable evidence spans, qualification/ownership navigation and non-authoritative overlap candidates. Retain existing OpenSpec selective show and mandatory full relevant review. Offer scoped indexes/payloads only as optional discovery artifacts, explicitly label absent tokens, and keep initial/full/final phases separate in benchmark output. Do not justify capability splitting or workflow rule changes using this experiment's exploratory byte reduction.

## Lead verification additions

The lead reran the exact archived experiments and compared all canonical source hashes, inventory, generated/reviewed candidates, local links and benchmark payloads. Reproduction protocol and outcome are in REPRODUCE.md and evidence/lead-final-reproduction.json.

The lead measured existing OpenSpec overview output for every scoped owner (not just recipe-sharing). Including the same initial/final full-review phases, the current overview path totals 35,509 / 314,896 / 92,231 bytes; scoped index+selected totals 39,419 / 346,592 / 100,690 bytes, or 11.01% / 10.07% / 9.17% more. Exact stdout, command arguments and hashes are in evidence/existing-overview-comparison.json. This compares declared protocols, not an optimal selector or actual model evaluation.

A separately observed full local inventory-plus-index/benchmark construction pipeline took 0.173 seconds including subprocess startup, parsing, canonical hash validation and serialization. Its defined protocol reads canonical source twice: 68 file reads / 1,747,136 bytes, plus two metadata reads / 3,141,982 bytes. These are application-level input counts, not filesystem syscall tracing. This pipeline is shared once across the three source-identical workloads; no model generation is performed. See evidence/generation-pipeline.json. No production performance guarantee follows from one observation.
