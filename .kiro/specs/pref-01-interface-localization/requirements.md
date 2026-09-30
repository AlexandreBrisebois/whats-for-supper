# Interface Localization — Requirements

## Status

**Implemented capability baseline.**

## Current behavior

- **PREF-01-R1.** Locale infrastructure supplies English/French lookup through `t`/`tWithVars`; profile language controls and `LocaleProvider` select locale using member preference with local fallback.
- **PREF-01-R2.** Dictionaries and locale-integrity tests own key parity; browser mismatch guidance is a dismissible enhancement.
- **PREF-01-R3.** Interface locale does not translate stored recipe/source instructions or alter import processing language.

## Limits and boundaries

Not every visible string is localized (Cook's Mode and issue-sheet examples remain hard-coded). Member preference and identity belong to profile/family APIs; recipe processing language belongs to QUAL-03/CAP-06. Locale changes have no SSE synchronization policy.
