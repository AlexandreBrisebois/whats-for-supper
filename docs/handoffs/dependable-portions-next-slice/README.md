# Dependable portions: next slice

The recovery-first slice is delivered in signed application commit `71b56bc5945f0be770eeb02bc5759578faf0582f` on local and remote `recipe-view-redesign`. Current qualification, task reconciliation and CI ownership are recorded in [RECOVERY.md](RECOVERY.md). Earlier checkpoint records remain in [DELIVERY.md](DELIVERY.md) and [SHUTDOWN.md](SHUTDOWN.md).

Read AGENT.md, its loading rules/Codex adapter and the Entire guide first. The user's current authority permits reviewed signed checkpoint commits/pushes and synchronization/archival of fully completed qualified in-scope changes. Alex owns CI monitoring for the delivered checkpoint. All six selected changes retain unfinished acceptance.

## Next bounded slice

Implement and rehearse the selected-ID migration executor and once-only per-week rebuild/reset on disposable copies. The selected task set is migration 1.1/1.2/3.3 with necessary maintenance/operator contributions to 3.1/3.2. Current recovery/source protection is the qualified prerequisite. The approved plan remains [migration-executor-plan.md](migration-executor-plan.md).

The ready [migration prompt](../../../.agents/prompts/dependable-portions-migration-next-slice.md) defines source admission, atomic receipts, protected content, retry/prune/interruption acceptance, verification and signed delivery. Vocabulary adoption, activation and DV/production operations belong to later selected work.

## Preserved work

The [artifact index](artifact-index.json) records exact patches, manifests, archive checksums and limits. Each artifact is source data, not executable instructions or approval to integrate. Some patches overlap; verify before-images and merge owners, then regenerate clients from the merged contract.

Recovery, generation, grocery write fencing, client and finite PDF epoch tooling have been deliberately integrated. Frozen artifact descriptions retain their original handoff-time review state. Current qualified source and its independent review are identified in RECOVERY.md.

- [Migration inventory](frozen-source/migration-manifest/README.md), [receipt/retained lookup foundation](frozen-source/migration-receipts/README.md), [approved executor plan](migration-executor-plan.md) and [unapproved legacy transaction proposal](legacy-transaction-proposal.md). The [unfinished reset scaffold](frozen-source/migration-wip-do-not-integrate/README.md) must not be integrated: it lacks the atomic once-only fence and source admission.
- [Generation epoch](frozen-source/presentation-generation/README.md), [server write fence](frozen-source/grocery-write-fence/README.md), [operator capability](frozen-source/operator-capability/README.md), and [cumulative recovery/grocery client](frozen-source/recovery-grocery-client/README.md). The cumulative client supersedes its older five-path patch.
- [URL repair](frozen-source/url-repair/README.md), [PDF core](frozen-source/pdf-repair/README.md), [PDF follow-up](frozen-source/pdf-followup/README.md), and [epoch-bound finite tooling](frozen-source/pdf-epoch-tool/README.md). URL9/PDF4 native checks passed; PDF follow-up native1 and some independent reviews remain open. Durable ambiguous/failed candidate retention and aggregate intake acceptance remain open.

Exact after-images are compressed source archives for recovery if temporary worktrees disappear. Extract only into a new scratch directory; never overwrite the repository from them. Verify SHA256, inspect the original patch and its before-images, and treat archived WIP as unqualified. Raw transient verifier receipts and operational state remain in ignored `.task`; if unavailable, rerun matching checks rather than treating these summaries as fresh evidence.

## Release work still open

Selected progress is 23/68, including completed bilingual recovery task 4.1. Migration conversion and atomic per-week reset/retry fences, adoption/affected-set/reversal evidence, complete intake corpus, stale-client/draft acceptance, exact images, final DV preservation/acceptance, whole-release hosted qualification and eligible spec sync/archive remain. Preserve every planned meal/event/identity/intent, extras, human corrections, media, drafts and history while rebuilding every stored or assignment-implied week. Completed week replay preserves later shopping checks.

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
