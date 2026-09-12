# Mission

## 1. Purpose
Deliver the "What's For Supper" (WFS) project.

## 2. Product Intent
Build a premium, high-performance Meal Planning Progressive Web App (PWA) using a contract-first, test-driven approach.

## 3. Engineering posture
Build reliable, maintainable capabilities. Avoid zombie code and speculative
abstractions. Shared correctness policy lives in [contract/testing](contract-testing.md),
and change boundaries live in [context loading](context-loading.md).

## 4. Core Design & UX Patterns
- **Aesthetics First**: Every UI change must feel premium, using the established Solar Earth design tokens.
- **Fire and Forget UX**: For background/asynchronous tasks (e.g., photo imports, AI synthesis, link fetching), the UI should prioritize immediate **auto-navigation** back to the primary context (usually the Home screen). The system provides feedback on the background task's status via the destination screen (e.g., "Processing" indicators in the library or home feed) rather than blocking the user on a transition screen.
