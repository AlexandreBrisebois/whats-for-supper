# Proposal

## Why

[#327](https://github.com/AlexandreBrisebois/whats-for-supper/issues/327) asks how an agent can help install What's for Supper without creating another installer or collecting household credentials. Existing helpers provide interactive configuration and deliberate updates, but their exit codes and prose do not distinguish configuration saved, prerequisites blocked, services started and public HTTPS verification completed.

## Outcome and Scope

First increment: **read-only status plus human handoffs**, selected by the user on 2026-10-24. An agent follows the same verified versioned release, templates and verification reference as a human, obtains bounded prerequisite/status information, and hands secret entry and state-changing operations to the human using existing helpers. This is a proposal, not authorization to implement or deploy it.

The consolidated development branch is based on main `fd659bee3875fa672b2e9ca8dcbede98d657e81c`, carrying forward shared-tunnel source `cf1138e2a9571154fc5782d58697713e122abcdb` and the compatibility safeguards from documentation `41a84b855bea0871b040ede6352566e70897f923`. The user authorized consolidating and publishing that existing work, then retiring the two old branches. This does not implement this agent-status proposal or merge/deploy the installer. Main and existing published ZIPs retain their bundled layout; scenario overlays are unreleased development files. Guidance and status must follow the exact selected release's shipped files.

[#301](https://github.com/AlexandreBrisebois/whats-for-supper/issues/301) continues to own fresh-host/Synology qualification, backup/schema safeguards, migration and interrupted-update recovery. This change neither closes #301 nor promises safe automatic recovery. No new installation executor, downloader, unattended update, agent integration, credential service, privileged setup or API/PWA behavior is proposed.

## What Changes

- Define a release/version/checksum trust handoff before executing bundle code, with explicit failure on mismatched or unavailable evidence.
- Add an opt-in, read-only structured prerequisite/status mode to the existing setup/update entry points, with stable error codes, safe next actions and truthful partial-completion states. Keep interactive behavior and existing exit semantics compatible.
- Specify host/environment and project/storage boundaries, local human secret entry, scoped approvals and safe resumption by reinspection rather than replay.
- Keep one technical reference with short human and agent entry points. Match docs to the selected release's actual contents and supported command surface; never probe legacy helpers with new flags.
- Record local, disposable and live evidence separately, including unknown authentication/SSE and recovery results. A successful setup exit or Compose render is not installation completion.

## Capabilities

### New Capabilities

- `installation-assistance`: agent-mediated preparation, read-only installation status and human handoff for the existing versioned server installation path.

### Modified Capabilities

None. `app-installation` owns browser/PWA identity and share transport, not server deployment. `data-backup-and-recovery` retains its existing export/exact-recovery contracts; this proposal only references its boundaries.

## Impact

Future implementation would touch `release-template/synology/setup.sh`, `update.sh`, a small shared read-only status implementation if needed, `docs/install/`, the release packaging allowlist and focused installation tests. No production dependency pins, application contracts, database schema, Compose topology or image versions change through this proposal.

The actual automation gap is a focused Taskfile entry for installation bundle tests. The consolidated source carries `scripts/agent/tests/test_install_bundle.py`, invoked directly by its CI; main does not yet have that suite. Propose `task test:install` to reuse these fixtures and add contract coverage for both shipped layouts, retaining the legacy bundled handoff; do not add an installer command or a wrapper around full repository verification. See [design](design.md), [spec delta](specs/installation-assistance/spec.md), [tasks](tasks.md) and [validation evidence](evidence.md).
