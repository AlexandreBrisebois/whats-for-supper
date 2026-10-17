# Spec Delta

## MODIFIED Requirements

### Requirement: Initialize recipe-detail ratings and notes controls

The sheet SHALL offer Notes and Dislike=1, Like=2 and Love=3 ratings after successful detail loading. Notes SHALL use returned text (empty for absence) unless a retained unsaved draft or newer edit/acknowledgement takes precedence. Ratings SHALL use the returned value, defaulting to 0 (Unknown, no selection). Each rating choice SHALL expose its label and pressed state.

#### Scenario: Load existing notes and rating
- **WHEN** library detail without a retained unsaved draft loads with notes “Family favorite” and rating 2
- **THEN** Notes contains “Family favorite”, Like is pressed, and Dislike and Love are not pressed

#### Scenario: Load absent notes and rating
- **WHEN** detail without a retained unsaved draft loads without notes or rating values
- **THEN** Notes is empty and none of the three rating choices is pressed

#### Scenario: Offer the three rating meanings
- **WHEN** successfully loaded library detail displays its rating control
- **THEN** it offers Dislike, Like and Love mapped to 1, 2 and 3 respectively, with no separate Unknown button


### Requirement: Submit changed recipe notes after the editing delay

Editing Notes SHALL immediately display the entered text. When it differs from the last acknowledged notes, treating absent notes as empty text, the sheet SHALL schedule submission after 800 ms. A further notes edit before dispatch SHALL replace the pending submission with the latest differing text. Submission SHALL PATCH the loaded recipe ID with exact notes text, without trimming, and omit rating and unrelated recipe fields.

#### Scenario: Submit exact notes text
- **WHEN** Notes changes to “  More sauce  ”, differs from the loaded notes, and remains unchanged until its 800 ms timer fires
- **THEN** PATCH submits notes “  More sauce  ” for the loaded recipe without rating or unrelated recipe fields

#### Scenario: Clear initially nonempty notes
- **WHEN** a person clears nonempty loaded notes and the empty input remains until its submission timer fires
- **THEN** PATCH submits notes as an empty string rather than null

#### Scenario: Replace a pending notes edit
- **WHEN** a person changes Notes to one differing value and then another before the first timer fires, with the final text still differing from the loaded notes
- **THEN** the first pending submission is cancelled and the final text is submitted after its own 800 ms delay if no further change intervenes

## ADDED Requirements

### Requirement: Acknowledge only the latest saved notes

The sheet SHALL show Saved only after the latest exact draft is acknowledged by PATCH. Pending or failed writes SHALL NOT show Saved. Success for older text SHALL NOT replace a newer draft. Writes for one recipe SHALL preserve edit order.

#### Scenario: Restore the original text
- **WHEN** loaded A is edited to B, B is submitted, then the person restores A
- **THEN** A is subsequently submitted and successful rereading returns A

#### Scenario: Late read after a save
- **WHEN** a detail read started before a draft was edited or acknowledged and returns an older notes value
- **THEN** that read does not replace the newer draft or acknowledged text

#### Scenario: Edit during a pending save
- **WHEN** B is pending and the draft changes to C
- **THEN** the draft stays C, B success does not show Saved for C, and C is submitted after B completes

### Requirement: Preserve notes drafts across detail departure and failure

Closing or switching detail SHALL flush pending notes without blocking navigation. Unsaved drafts SHALL remain associated with their recipe within the current browser tab. A failed save SHALL expose a retryable error and retain the exact draft on reopening. This does not promise recovery after browser termination or cross-device conflict resolution.

#### Scenario: Close before debounce
- **WHEN** the person edits notes and closes before 800 ms
- **THEN** that exact draft is submitted for its original recipe

#### Scenario: Switch recipes
- **WHEN** a save for recipe A completes after detail switches to recipe B
- **THEN** B retains its own notes and save feedback, and A's draft is not applied to B

#### Scenario: Failed save and retry
- **WHEN** a notes request fails and the person reopens that recipe
- **THEN** the draft is retained with failure feedback and Retry save resubmits it; successful acknowledgement clears failure
