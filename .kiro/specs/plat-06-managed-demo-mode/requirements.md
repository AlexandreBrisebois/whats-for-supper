# Managed Demo Mode — Requirements

## Status

**Implemented capability baseline.**

## Current behavior

- **PLAT-06-R1.** `DemoModeOptions`, `DemoModeChatClient`, demo seeders/processors and management demo routes provide configured demo behavior without normal external model dependency.
- **PLAT-06-R2.** Demo workflow seeding/bypass uses the normal workflow engine, while demo capture/restore is an operator/management path.

## Limits and boundaries

Demo behavior is configuration/operator controlled, not a household preference or production-model quality claim. PLAT-02 owns execution; capture/import packets own resulting recipe and failure states.
