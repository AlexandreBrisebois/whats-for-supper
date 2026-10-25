# Installation assistance Spec Delta

## Purpose

Let a human or agent assess the existing versioned server installation path, hand off privileged or secret-bearing work safely, and report observed progress without creating another installer or implying unperformed qualification.

## ADDED Requirements

### Requirement: Verify the selected release before executing bundle code

Installation guidance SHALL identify the official repository, exact release tag, channel, versioned ZIP and SHA-256 checksum asset before bundle code runs. Missing, ambiguous or mismatched evidence SHALL block execution. A checksum from the same release SHALL be described as integrity evidence under that origin's trust, not independent publisher authentication.

#### Scenario: Select a stable release
- **WHEN** a human or agent starts from the stable download entry point
- **THEN** it resolves one exact release and matching ZIP/checksum pair and records that identity before proceeding
- **AND** later latest-release changes cannot silently substitute another version

#### Scenario: Missing or mismatched checksum
- **WHEN** the checksum is missing, malformed, ambiguous or does not match the selected ZIP bytes
- **THEN** no script from that ZIP is executed and the handoff identifies the failed integrity check and a safe retry action

#### Scenario: Checksum includes a path
- **WHEN** a checksum record carries the publisher's build-directory prefix
- **THEN** verification binds the expected digest to the selected local ZIP without trusting that record to choose arbitrary filesystem paths

#### Scenario: Unapproved origin or channel
- **WHEN** the proposed bundle comes from another repository, an arbitrary download URL or an unselected prerelease
- **THEN** the agent stops for an explicit release selection instead of treating the bundle as the supported stable installation

### Requirement: Use only commands and files shipped for the selected release

Human and agent paths SHALL use the same versioned templates and existing setup/update helpers. Guidance SHALL distinguish current-release behavior from unreleased mechanics and SHALL establish command support from trusted matching release documentation before invoking new flags. A missing contract SHALL require a human handoff, not probing legacy scripts or fabricating a stack.

#### Scenario: Legacy bundled release
- **WHEN** a verified release includes cloudflared in its base Compose file but lacks read-only status flags and scenario overlays
- **THEN** its bundled golden path remains valid and the agent reports structured status unavailable without passing new flags to setup or update

#### Scenario: Matching shared-template release
- **WHEN** a verified release actually includes the shared overlay and matching setup/update behavior
- **THEN** shared-mode guidance uses those shipped files, the selected external network and a unique proxy alias without an app-local connector token

#### Scenario: Packaged agent-guide link
- **WHEN** packaged documentation links to an agent guide absent from its ZIP
- **THEN** it uses an absolute GitHub URL and identifies preview guidance as unreleased

### Requirement: Inspect prerequisites without changing the installation

Supported helpers SHALL expose an explicit read-only inspection mode for setup and update. It SHALL assess applicable prerequisites, selected files and configuration without collecting secrets, creating configuration/data, pulling images, starting services or changing networks. Missing prerequisites SHALL produce an actionable result instead of automatic installation or privilege escalation.

#### Scenario: Fresh unconfigured project
- **WHEN** read-only setup inspection runs in a verified bundle with no private configuration
- **THEN** it reports prerequisites and the local human configuration handoff without creating .env, generating secrets or creating data directories

#### Scenario: Temporary archive inspection
- **WHEN** update inspection requires scratch files
- **THEN** it uses private disposable space, removes it on exit and leaves installation files unchanged

#### Scenario: Required tool or Docker access unavailable
- **WHEN** Bash/runtime tools, the Compose plugin or authorized Docker access are unavailable
- **THEN** the available inspection or agent handoff identifies the missing prerequisite and human action without sudo, package installation or daemon changes

#### Scenario: Inspect update prerequisites
- **WHEN** read-only update inspection receives a target bundle and backup-evidence path
- **THEN** it reports existing version/configuration compatibility and evidence availability without changing WFS_VERSION or treating that file as proof of recoverability

### Requirement: State supported and unqualified environment boundaries

Installation assistance SHALL identify the target host, architecture and Docker/Compose method and distinguish the documented Linux Compose path from tested qualification. An unsupported environment or unestablished DSM import behavior SHALL produce a bounded human handoff. It SHALL NOT replace HTTPS requirements or change host security/network configuration to make a check pass.

#### Scenario: Synology project import is unqualified
- **WHEN** a shared-template deployment relies on a DSM import honoring COMPOSE_FILE but that behavior is not established
- **THEN** assistance reports the limitation and requests review of the complete project file selection instead of deploying the base alone

#### Scenario: Host platform outside the documented path
- **WHEN** the host is macOS, Windows or an unqualified host configuration
- **THEN** assistance distinguishes source/disposable tests from target-host support and does not claim an install is qualified there

### Requirement: Keep secret entry in a local human session

The agent SHALL hand credential generation/entry to the human through existing interactive helpers or a private local editor. It SHALL NOT request secrets in chat, accept secret command-line arguments in inspection mode, source dotenv as code or reproduce secrets in output. Agent handoffs SHALL NOT construct secret-bearing commands.

#### Scenario: Human configures a new deployment
- **WHEN** a verified bundle is ready for configuration
- **THEN** the human enters credentials locally with agent capture/transcription disabled and the agent receives only a non-secret completion/status result

#### Scenario: Inherited interactive confidentiality limitation
- **WHEN** the human helper uses secret values in subprocess arguments
- **THEN** guidance records the process-list exposure limitation and does not claim hidden prompts eliminate it

#### Scenario: Command or dotenv diagnostics contain credentials
- **WHEN** a prerequisite or configuration check fails
- **THEN** status uses allowlisted diagnostics and a local inspection instruction rather than raw child output, resolved Compose configuration, tokens, cookies or secret-derived values

### Requirement: Preserve project and storage identity on every handoff

Assistance SHALL retain existing project names, directories, private configuration, selected Compose files, volumes and database/file mount identities. Existing configuration, unknown customizations or ambiguous identity SHALL stop automatic progression for review. Reinspection SHALL never regenerate credentials, adopt a new project name or replace data as a resumption shortcut.

#### Scenario: Existing private configuration
- **WHEN** setup inspection finds .env or existing installation data
- **THEN** it reports existing-state review and preserves all bytes instead of rerunning configuration as a fresh install

#### Scenario: Unknown or conflicting Compose selection
- **WHEN** file selection, shell overrides or project identity differ from the reviewed installation
- **THEN** inspection reports the conflict without choosing an alternative layout or suggesting broad orphan/volume cleanup

#### Scenario: Shared network invariants
- **WHEN** a matching shared-template installation is reviewed
- **THEN** only its entry proxy is attached to the external bridge, supporting services retain private networks, and cross-deployment alias uniqueness is explicitly reviewed

### Requirement: Bind approvals to concrete human actions

The first increment SHALL keep configuration, deployment, updates and infrastructure changes human-operated. Handoffs SHALL identify the target, release, project, selected mode, intended writes and verification/rollback boundary before action. Existing authorization SHALL be honored within scope; changed targets or effects SHALL require renewed review. Read-only readiness SHALL never authorize deployment.

#### Scenario: Approve configuration without deployment
- **WHEN** the user authorizes local configuration only
- **THEN** the handoff separates secret entry from the helper's start offer and the human declines startup until deployment is authorized

#### Scenario: Resume after target changes
- **WHEN** the release, directory, project, mode or proposed effects change since approval
- **THEN** the agent presents the changed concrete action for review rather than replaying the prior approved command

#### Scenario: External route configuration
- **WHEN** the next step needs Cloudflare route/DNS or shared-network changes
- **THEN** the handoff names those external actions separately and performs none from read-only inspection

### Requirement: Emit bounded machine-readable inspection results

Opt-in JSON inspection SHALL emit one versioned object containing operation, observed target identity, check statuses, stable codes, safe next actions and public-verification disposition. Missing observations SHALL remain unknown or not-run. Exit status SHALL distinguish readiness, known blocks, inspection failure and invalid invocation without changing legacy interactive exit semantics.

#### Scenario: Ready inspection result
- **WHEN** every applicable local prerequisite passes
- **THEN** JSON reports readiness only, with public verification not-run and installation completion false

#### Scenario: Failed dependency inspection
- **WHEN** a bounded check times out or its result cannot be established
- **THEN** JSON reports that check as blocked or failed, later dependent checks as not-run and a safe human next action

#### Scenario: Machine output discipline
- **WHEN** JSON mode is requested
- **THEN** stdout contains exactly one parseable object with no prompts, secret values or child-process progress mixed into it

### Requirement: Resume by reinspection instead of replay

A resumed agent session SHALL establish current release, configuration and target identity again, distinguish completed human steps from unknown outcomes and select the next safe handoff. It SHALL NOT automatically repeat setup, deployment, migration or rollback. A changed input during inspection SHALL invalidate readiness rather than attach success to mixed observations.

#### Scenario: Configuration saved but startup skipped
- **WHEN** a prior human session saved configuration and declined or could not perform startup
- **THEN** reinspection preserves that configuration and reports startup/public verification incomplete instead of treating setup exit zero as installation success

#### Scenario: Interrupted update outcome unknown
- **WHEN** a prior update may have reached migration or recreation before interruption
- **THEN** assistance stops at operator diagnosis under the existing update/recovery guidance and does not retry or change image tags automatically

#### Scenario: Inputs change during inspection
- **WHEN** relevant project/configuration inputs change before inspection finishes
- **THEN** the result reports changed inputs and requires reinspection without claiming a consistent readiness result

### Requirement: Report installation evidence without upgrading its meaning

The final handoff SHALL distinguish prepared configuration, static validation, disposable runtime tests and observed target-host behavior. Public HTTPS health, login, assets, API routing, authenticated SSE and persistence after recreation SHALL retain individual observed or unrun outcomes. Backup/schema/recovery qualification SHALL remain separate; Compose success or administrative issue closure SHALL NOT certify it.

#### Scenario: Only local validation completed
- **WHEN** checks cover rendered Compose and disposable helper tests but no public host
- **THEN** the report states local checks passed and public behavior not-run, with no installed-and-working claim

#### Scenario: Partial public verification
- **WHEN** health succeeds but login, SSE or recreation has not been observed
- **THEN** the handoff records the individual outcomes and overall partial completion

#### Scenario: Backup evidence acknowledged
- **WHEN** the updater accepts a nonempty backup report file
- **THEN** assistance reports only that acknowledgement and leaves recoverability unverified; administrative issue closure does not change that evidence
