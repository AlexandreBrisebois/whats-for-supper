# Proposal

## Why

A household needs reusable GOTO choices before Home can offer a ready backup meal. Extract existing setup, pending registration and active selection without treating stored pending labels as live readiness.

## What Changes

- Draft ready-only active selection, missing/error fallback, settings entry and full-list replacement.
- Draft capture-to-GOTO registration and recipe-detail add/remove behavior as separate requests.
- Withhold automatic pending-list readiness transition: executable processing does not update that stored status.

## Capabilities

### New Capabilities

- `tonight-meal-decisions`: Additional nonoverlapping GOTO requirements for the same approved capability introduced by baseline-tonight-meal-decisions-home-states. Review the three drafts together; no main spec exists yet.

### Modified Capabilities

None.

## Impact

Documentation only. Read FamilyGOTOSettings, MinimalCapture, RecipeDetailSheet, familyStore, generated GOTO/capture SDK and approved OpenAPI, GoToController/Service, RecipeService and RecipeReadyProcessor. Evidence BSL-tonight-meal-decisions-005–008; TM-U03–TM-U06 retain uncertainty. Capture acquisition, readiness, workflow processing and live delivery remain shared-owner behavior. No implementation, runtime qualification, promotion or archive.
