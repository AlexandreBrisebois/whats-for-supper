# Telemetry journey inventory retired

WFS has removed its application-owned Sentrame/OpenTelemetry integration and its dedicated observation logging. There is no current opt-in, receiver setup or telemetry roadmap to apply. Ordinary application logging and independent search diagnostics remain.

See the [removal change](../../openspec/changes/archive/2026-10-31-remove-sentrame-otel-integration/proposal.md) for scope and implementation acceptance, and the [remaining logging inventory](../../openspec/changes/archive/2026-10-31-remove-sentrame-otel-integration/logging-inventory.md) for the retained sinks and privacy/noise choices.

The [pre-removal document](https://github.com/AlexandreBrisebois/whats-for-supper/blob/e4cd725dfbd0092667d04ddaa4062dea3846b843/docs/telemetry/journey-inventory.md) and archived OpenSpec changes retain historical plans and qualification evidence. Those results describe their original source/runtime identities; they do not establish current telemetry coverage.

Removing source export does not delete retained Sentrame records, revoke credentials or change an older running deployment. Those actions require separate authorization.
