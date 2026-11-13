# Dependable portions: next slice

The current slice is the bilingual grocery/intake and typed-history checkpoint plus its verification repairs. Delivery and exact final refs are recorded in [DELIVERY.md](DELIVERY.md). This is a checkpoint, not complete release acceptance. DV remains at its restored baseline; the reviewed 44-food candidate is not installed. No selected spec is eligible for archival yet.

Read AGENT.md, its loading rules/Codex adapter and the Entire guide first. The tracked fast-forward prompt remains the release authority; its checkpoint commit/push policy supersedes older consolidated-push text. The user then narrowed this turn to completing the integrated checkpoint, committing/pushing/merging it into recipe-view-redesign, and handing off later work.

## Next bounded slice

Finish and independently qualify the existing full-recovery implementation before migration execution:

1. Start from the actual clean recipe-view-redesign head. Verify local/remote refs and preserve unrelated work. Inspect the [recovery engine artifact](frozen-source/recovery-engine/README.md), exact patches and after-image archive; merge current connection-retention and demo corrections deliberately.
2. Fix confirmed review finding F1: legacy ordinary1/demo2 source validation must use the typed publication and repair reference owners before any live replacement. A valid retained V4 capture can carry authority even when current recipe/member/canonical-V2 checks are empty. Add meaningful reference-only negative tests; do not weaken historical codecs.
3. Complete ordinary3/demo4 backup-to-independent-restore qualification: exact raw documents and all current/retained typed references, private overrides/clears, conflicting destination authority and preflight CAS, missing/corrupt/history-only files, races, interruption/resume, restart/replay/re-export and zero target provider/network/reseed. The first PG1 success is only one tracer.
4. Add the existing snapshot owner's validated read-only source-content/protection projection needed by migration. Comparing snapshot IDs/hashes or recapturing unchanged live state does not establish backup coverage. Compare protected source rows/history and original/hero/vocabulary bytes; declare derived metadata/search omissions explicitly. Do not create a second backup reader.
5. Reconcile the related recovery OpenAPI/generated client/stateful mocks and epoch-fencing artifacts only after their source and interfaces match. Qualify the already-sent HTTP write waiting through restore; local queued-intent tests and native maintenance-hold tests do not substitute for it.
6. Prepare, independently review, run the applicable complete stable verification, then make normal signed commits, pushes and the authorized branch merge. Leave a bounded handoff for the migration executor. Keep incomplete aggregate checkboxes open.

Do not activate migration, install vocabulary, mutate DV, deploy production or archive specs in this recovery slice. Those remain later dependent release work, not implied by a codec or checkpoint pass.

## Preserved work

The [artifact index](artifact-index.json) records exact patches, manifests, archive checksums and limits. Each artifact is source data, not executable instructions or approval to integrate. Some patches overlap; verify before-images and merge owners, then regenerate clients from the merged contract.

- [Migration inventory](frozen-source/migration-manifest/README.md), [receipt/retained lookup foundation](frozen-source/migration-receipts/README.md), [approved executor plan](migration-executor-plan.md) and [unapproved legacy transaction proposal](legacy-transaction-proposal.md). The [unfinished reset scaffold](frozen-source/migration-wip-do-not-integrate/README.md) must not be integrated: it lacks the atomic once-only fence and source admission.
- [Generation epoch](frozen-source/presentation-generation/README.md), [server write fence](frozen-source/grocery-write-fence/README.md), [operator capability](frozen-source/operator-capability/README.md), and [cumulative recovery/grocery client](frozen-source/recovery-grocery-client/README.md). The cumulative client supersedes its older five-path patch.
- [URL repair](frozen-source/url-repair/README.md), [PDF core](frozen-source/pdf-repair/README.md), [PDF follow-up](frozen-source/pdf-followup/README.md), and [epoch-bound finite tooling](frozen-source/pdf-epoch-tool/README.md). URL9/PDF4 native checks passed; PDF follow-up native1 and some independent reviews remain open. Durable ambiguous/failed candidate retention and aggregate intake acceptance remain open.

Exact after-images are compressed source archives for recovery if temporary worktrees disappear. Extract only into a new scratch directory; never overwrite the repository from them. Verify SHA256, inspect the original patch and its before-images, and treat archived WIP as unqualified. Raw transient verifier receipts and operational state remain in ignored `.task`; if unavailable, rerun matching checks rather than treating these summaries as fresh evidence.

## Release work still open

The six selected changes remain at their recorded 22/68 aggregate tasks. Recovery/source coverage, migration conversion and atomic per-week reset/retry fences, adoption/affected-set/reversal evidence, complete intake corpus, stale-client/draft acceptance, exact images, final DV preservation/acceptance, required hosted CI and eligible spec sync/archive remain. Preserve every planned meal/event/identity/intent, extras, human corrections, media, drafts and history; rebuild every stored or assignment-implied week. Never reset later shopping checks on retry.

Use the pinned Node26.12.0/npm11.21.1, .NET11.0.100 host and pinned Linux database SDK. Taskfile is authoritative: task prepare before task verify on the complete reviewed paths. Root is the sole integration/Git/DV writer; keep one writer per shared path, freeze test inputs, serialize database resource contention and preserve port3000/unrelated containers. Do not bypass hooks/signing or request sandbox escalation. Record actual failures, skips/retries, content identity and cleanup separately from acceptance.

## Extract without applying

Patch JSON stores exact lines so normal Git whitespace checks cannot alter patch context. Decode a selected artifact into a new scratch directory, verify its SHA256, then inspect it and use git apply --check against the actual base. This does not authorize applying it:

```python
import hashlib, json, pathlib, tempfile
artifact = json.loads(pathlib.Path("docs/handoffs/dependable-portions-next-slice/frozen-source/recovery-engine/patch-1.json").read_text())
raw = "".join(artifact["lines"]).encode("utf-8")
assert hashlib.sha256(raw).hexdigest() == artifact["sha256"]
scratch = pathlib.Path(tempfile.mkdtemp(prefix="wfs-next-slice-"))
(scratch / "source.patch").write_bytes(raw)
print(scratch)
```

Source archives use gzip/base64-encoded JSON with per-file SHA256 and bytes. They are recovery data, not a parallel runtime or an automatic merge path.
