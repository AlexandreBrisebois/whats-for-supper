# Spec Delta

## ADDED Requirements

### Requirement: Present Profile language as a readable preference choice

Profile SHALL group English and French under a readable sentence-case Language heading. The resolved choice SHALL use a restrained tonal selected treatment, a visible non-colour cue and a programmatically exposed pressed state. The other choice SHALL remain visibly enabled. Language choices SHALL remain subordinate to member identity in the page hierarchy and follow Profile contrast, target-size, reflow and motion requirements.

#### Scenario: English is the resolved language
- **WHEN** Profile resolves English as its language
- **THEN** English has a tonal selected surface, a visible check cue and pressed state true
- **AND** French has pressed state false and remains visibly available

#### Scenario: French is the resolved language
- **WHEN** Profile resolves French as its language
- **THEN** French has the selected surface, check cue and pressed state true
- **AND** English has pressed state false and remains visibly available
- **AND** the Language heading and both complete labels remain readable without tracked uppercase styling

### Requirement: Preserve language consequences during Profile presentation changes

Profile's language presentation SHALL retain existing browser choice, member preference update and locale resolution behaviour. A selected cue SHALL mean the resolved language, not confirmation that a preference was saved remotely. Changing language SHALL neither select another member nor request Home navigation.

#### Scenario: Choose another language with a selected member
- **WHEN** a person chooses French from English with a selected member
- **THEN** the browser-local choice and member update request follow Choose English or French on Profile
- **AND** the selected cue follows the resolved language without adding a remote-save success claim or navigating away

#### Scenario: Choose language without a selected member
- **WHEN** a person chooses English without a selected member
- **THEN** only the existing browser-local choice is changed without requesting a member preference save
- **AND** no member is selected and Profile does not request Home navigation

#### Scenario: Member preference save rejects
- **WHEN** a language preference update is rejected
- **THEN** existing preference reconciliation and local-language resolution still apply
- **AND** the presentation does not announce remote-save success or replace the existing recovery policy
