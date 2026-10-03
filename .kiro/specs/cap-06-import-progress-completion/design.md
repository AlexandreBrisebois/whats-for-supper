# CAP-06 — Import progress and completion design

Capture/import services create recipe/workflow records; `WorkflowWorker` processors persist terminal progress and `SseEventPublisher` publishes ready/failed payloads. `useScheduleStream` maps matching events to capture/library/GOTO stores. API/import DTOs and workflow state remain authoritative; browser pending lists are local projections. Evidence: capture import/workflow processor/integration tests, stream tests, and generated OpenAPI clients.
