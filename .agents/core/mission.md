# Mission

## 1. Purpose
Deliver the "What's For Supper" (WFS) project.

## 2. Product Intent
Build a premium, high-performance Meal Planning Progressive Web App (PWA) using a contract-first, test-driven approach.

## 3. Engineering Posture
- **Contract-First Development (OpenAPI is Law)**: The `specs/openapi.yaml` is the ultimate source of truth.
- **Test-Driven Development**: You must write or update tests before implementing logic.
- **Vertical Slicing**: Features must be built and tested end-to-end (Contract → DB → API → Frontend), one small capability at a time. Do not build in horizontal layers.
- **Core Principle**: Zero-tolerance for "zombie code", schema drift, or untested features.

## 4. Non-Negotiable Values
- **Zero Drift & Schema Integrity**: Backend DTOs and PWA models must match the spec exactly. Parity between the OpenAPI Specification, Mock API, and Backend implementation is mandatory.

## 5. Core Design & UX Patterns
- **Aesthetics First**: Every UI change must feel premium, using the established Solar Earth design tokens.
- **Fire and Forget UX**: For background/asynchronous tasks (e.g., photo imports, AI synthesis, link fetching), the UI should prioritize immediate **auto-navigation** back to the primary context (usually the Home screen). The system provides feedback on the background task's status via the destination screen (e.g., "Processing" indicators in the library or home feed) rather than blocking the user on a transition screen.
