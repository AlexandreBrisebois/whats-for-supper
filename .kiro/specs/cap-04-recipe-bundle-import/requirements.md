# CAP-04 — Recipe bundle import requirements

## Status

**Implemented capability baseline.**

## Current behavior

- **CAP-04-R1.** Recipe bundle import accepts a versioned bundle payload through its recipe import API and validates supported bundle structure before persistence.
- **CAP-04-R2.** The import service maps bundle recipes/assets into existing recipe storage and returns the contract-defined import result; imported content remains subject to normal recipe/library ownership.
- **CAP-04-R3.** Malformed or unsupported bundle versions fail at the contract boundary rather than being treated as partially successful recipe creation.

## Limits and boundaries

Bundle import is not a URL/photo/description capture path and does not promise cross-version automatic migration. CAP-01/02/03 own other capture inputs, LIB packets own later recipe display/actions, PLAT-05 owns backup/restore rather than bundle compatibility.
