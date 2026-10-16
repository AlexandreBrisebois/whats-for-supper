# Spec Delta

## ADDED Requirements

### Requirement: Keep one token-owned browser PDF handoff

Successful browser staging SHALL retain one pending PDF handoff and return a new opaque token. A later staged PDF SHALL replace the previous pending handoff. Claim and discard SHALL affect only the matching token; a matching successful claim SHALL consume the slot so that the same delivery cannot be claimed again.

#### Scenario: Replace a pending handoff
- **WHEN** a PDF is successfully staged while another pending PDF occupies the browser slot
- **THEN** the newer PDF and token replace the older pending handoff

#### Scenario: Stale token cannot take the replacement
- **WHEN** claim or discard is requested with an older token after replacement
- **THEN** it leaves the newer handoff intact and an older-token claim returns no file

#### Scenario: Claim once
- **WHEN** a valid unexpired matching handoff is successfully claimed
- **THEN** the claim returns its file and consumes the slot
- **AND** another claim with that token returns no file

### Requirement: Bound browser handoff age without draft resumption

A matching claim SHALL return a file only if it still meets PDF transport constraints and is no more than ten minutes old; otherwise it SHALL consume the matching slot without returning a file. Cleanup SHALL attempt removal of pending handoffs older than ten minutes on worker activation, page lifecycle initialization, pageshow and a one-minute page timer. This SHALL NOT promise exact-time deletion or draft resumption.

#### Scenario: Matching handoff has expired
- **WHEN** a matching claim reads a pending handoff older than ten minutes
- **THEN** it removes that handoff without returning its file

#### Scenario: Claim at the age boundary
- **WHEN** a matching claim reads a transport-valid handoff exactly ten minutes old
- **THEN** age alone does not prevent that claim returning and consuming the file

#### Scenario: Cleanup runs with an expired handoff
- **WHEN** cleanup successfully reads a pending handoff older than ten minutes
- **THEN** it removes the expired handoff
- **AND** cleanup triggers do not guarantee storage access or deletion at a precise wall-clock deadline

### Requirement: Discard token delivery away from capture

When a page carrying a share token reaches the application's share lifecycle outside `/capture`, the application SHALL request discard of that token and remove only the share query parameter from the visible URL. It SHALL NOT restore that delivery after household unlock or member selection.

#### Scenario: Household unlock receives a token
- **WHEN** access recovery reaches Welcome with a share query token
- **THEN** share lifecycle requests discard and removes that query token from the visible URL
- **AND** unlocking does not restore the discarded delivery

#### Scenario: Member selection receives a token
- **WHEN** member-context recovery reaches onboarding carrying a share query token
- **THEN** share lifecycle requests discard and removes that query token
- **AND** completing selection requires a fresh delivery for that discarded share

#### Scenario: Another route carries the token
- **WHEN** a page outside capture carries a share query token with other query parameters
- **THEN** share lifecycle removes share while retaining the other query parameters and requests token-matched discard

### Requirement: Hand a claimed PDF to the current foreground capture

Capture SHALL attempt a share token once per mounted panel. Without a selected member or in Family GOTO it SHALL discard instead of claiming. A returned file SHALL reach foreground selection only while the panel, token, delivery attempt and member remain current and the document is visible. Eligibility, explicit Save, interrupted drafts and unavailable-share recovery SHALL follow the existing recipe-capture requirements.

#### Scenario: Current foreground delivery reaches capture
- **WHEN** a selected member outside Family GOTO receives a matching staged PDF while the capture panel and delivery remain current and visible
- **THEN** the file becomes that member's foreground PDF selection
- **AND** recipe-capture requirements `Resolve PDF draft eligibility and discard interrupted drafts` and `Review PDF identity and optional metadata before saving` govern confirmation and Save

#### Scenario: Delivery returns after interruption
- **WHEN** a share claim returns after the panel has departed, the document became hidden, the token changed, or member context changed even if it changed back
- **THEN** that stale result does not restore a PDF selection
- **AND** existing capture interruption rules continue to govern the owned draft

#### Scenario: No eligible recipient or usable claim
- **WHEN** a token reaches capture without selected member context or in Family GOTO, or an attempted claim is unavailable, expired or already consumed
- **THEN** missing context or Family GOTO requests token discard without claim
- **AND** an unusable attempted claim uses recipe-capture requirement `Resolve PDF draft eligibility and discard interrupted drafts` for choose-or-share-again feedback
