## MODIFIED Requirements

### Requirement: Configure deployment timezone through shipped deployment templates

The shipped Synology and repository environment templates SHALL expose `Calendar__TimeZone=America/Toronto`. Supported API Compose templates and local API dev tasks SHALL pass `Calendar__TimeZone` with `America/Toronto` when omitted or empty, while CI `smoke.env` and unconfigured `DeploymentCalendar` C# fallback retain `UTC`. The PWA SHALL consume the API calendar without requiring a separate timezone setting.

#### Scenario: Existing Synology environment omits the new setting

- **WHEN** the Synology or repository Compose template is resolved against an existing environment without `Calendar__TimeZone`
- **THEN** the API receives `America/Toronto` without requiring replacement of the existing environment file

#### Scenario: Administrator overrides the deployment timezone

- **WHEN** an administrator sets an explicit IANA timezone such as `Europe/Paris` or `UTC` in `.env` and recreates the API container
- **THEN** the API uses that explicit timezone for its deployment calendar and the PWA obtains that calendar from the API

#### Scenario: Empty template setting

- **WHEN** `Calendar__TimeZone` is empty during supported Compose template resolution
- **THEN** the API receives `America/Toronto`

#### Scenario: CI smoke and unit fallback preserve deterministic UTC

- **WHEN** CI runs against `docker/compose/smoke.env` or unit tests instantiate `DeploymentCalendar` without configuration
- **THEN** `smoke.env` supplies `UTC` and unconfigured code defaults to `UTC`
