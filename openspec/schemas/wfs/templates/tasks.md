# Tasks

<!-- Repeat a numbered group for each bounded observable slice, ordered by dependency.
     Replace every placeholder with concrete details. Keep each checkbox executable
     and independently assessable; state completion evidence in its description.
     Do not copy shared engineering policy into this file. -->

## 1. <First observable slice>

**Outcome and scenarios:** <!-- Observable outcome; exact requirement/scenario references. -->
**Owners and boundaries:** <!-- Existing owners and required seams; authorized extent of this slice. -->
**Dependencies and prerequisites:** <!-- Earlier tasks, settled decisions, tools, fixtures/services/data. -->
**Acceptance boundary:** <!-- What must run against real internal seams; where doubles are used;
                             any separate live/model/device qualification and its prerequisites. -->

- [ ] 1.1 <Add/update the smallest meaningful regression or behavior test; run the exact command and observe the intended behavioral failure before implementation.>
- [ ] 1.2 <Implement the bounded behavior through its required layers; run the exact green command and name the expected observable result. Include applicable contract/client/mock synchronization. Refactor only as needed and rerun affected checks.>
- [ ] 1.3 <Run named integration/consumer acceptance for this slice, including relevant failure/recovery cases; state commands and expected outcomes. Include affected documentation here.>

<!-- Documentation-only groups replace the behavior cycle above with concrete artifact,
     consistency and validation tasks. Do not invent red/green or runtime checks.
     For API changes name contract, generated client, consumers, method-sensitive mock
     handlers/builders/state transitions, and their acceptance checks in the relevant
     task descriptions. Use focused task commands where available. Never defer a
     slice's own tests or documentation to a final catch-all phase. -->

## 2. Final Integration and Verification

- [ ] 2.1 <Reconcile scenario acceptance and evidence, run applicable preparation, review the complete task-owned diff, and run task verify with the complete reviewed changed-path set. Report actual statuses and record_path; no completion while required acceptance remains blocked or missing.>

<!-- Add more slice groups before final verification and renumber accordingly.
     Keep evidence concise: actual red/green commands/results and final verification
     record references. Keep source inspection, mocked tests and live qualification
     distinct. Use the harness procedure for evidence/content identity. -->

<!-- OPTIONAL: lifecycle work after implementation belongs below as plain bullets,
     not tracked implementation checkboxes. Omit when outside the authorized scope.
## Workflow follow-up

- <Authorized sync/archive or release follow-up and its prerequisite.>
-->
