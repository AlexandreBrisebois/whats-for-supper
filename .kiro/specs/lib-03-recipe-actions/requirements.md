# LIB-03 — Recipe actions: requirements

## Status

**Implemented capability baseline.** Canonical owner of actions initiated from recipe detail.

## Current behavior

- **LIB-03-AC1.** Detail exposes Cook/Plan callbacks, Find Similar context, Discoverable toggle, edit, GOTO toggle, import-issue controls, Move to Bin, imagery controls, and share. Parent surfaces own scheduling/navigation callbacks.
- **LIB-03-AC2.** Action flags prevent repeated Cook/Plan, discovery toggle, GOTO, and bin requests while their own request is active. Import-issue submission can begin background re-import polling.
- **LIB-03-AC3.** Discovery and GOTO show/revert or toast failures; bin failure logs only; action availability is mostly derived from detail state and UI conditions, not a shared policy object.
- **LIB-03-AC4.** Import issue reporting uses its own contract and background status polling; it belongs to recipe-import reporting, not generic recipe action persistence.

## Boundaries

HOME/planner owns schedule assignment/recovery; HOME-04 owns GOTO policy; LIB-04/05/06 own imagery, lifecycle, and sharing. Detailed visibility/eligibility is source-conditional and must not be inferred as a server guarantee.
