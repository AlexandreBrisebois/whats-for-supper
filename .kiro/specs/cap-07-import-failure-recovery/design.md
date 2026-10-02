# CAP-07 — Import failure recovery design

`FailedCapturesSection` calls the failed-captures client; `CapturesController` delegates to `CaptureFailureService`, which reads failed state and triggers retry/cleanup workflow actions. API routes define list/retry/delete shapes and conflicts; UI keeps pending/error state locally then reloads authoritative rows. Evidence: `FailedCapturesSection.test.tsx`, failed-capture contract tests, `CaptureFailureIntegrationTests`, service/workflow tests and generated clients.
