# Background Workflow Engine — Design

Workflow definition/root resolution and seeders establish durable `WorkflowInstance`/`WorkflowTask` state. `WorkflowOrchestrator` triggers instances; `WorkflowWorker` dispatches processor names, records retries/status, and invokes processor services. Controllers expose workflow inspection/trigger APIs; processor-specific routes/events remain domain-owned. Evidence includes `WorkflowWorkerTests`, processor tests, workflow integration tests, YAML definitions, and generated OpenAPI workflow clients.
