# Proposal

## Why
Cook's Mode substitutes four generic invented instructions when detail fetching fails or stored instructions cannot be parsed. Families need an honest state and useful recovery while retaining completion and original source access.

## What Changes
- Remove fabricated fallback instructions; distinguish failed reads from absent usable instructions.
- Offer Retry, existing contextual Report steps/reimport flow when eligible, and existing Mark cooked recovery.
- Preserve both reading views and hero detail/original source access. Apply authoritative report content and allow explicit read retry after background work.

## Capabilities
### New Capabilities
None.
### Modified Capabilities
- `cooking`: honest missing instruction feedback and recovery.

## Impact
CooksMode, English/French recovery copy and focused component/browser tests only. Existing recipe detail, import-report and completion APIs and shared quality form stay authoritative. No polling, generated client, server policy or contract changes.
