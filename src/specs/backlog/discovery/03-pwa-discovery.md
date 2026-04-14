# Discovery Prompt: PWA Tech Stack & UX Persistence

## Background
You are a Lead Frontend Architect and UI/UX Specialist. You are in the "Discovery & Design" phase for the **"What's For Supper" PWA**. Your goal is to lock in the technology stack and core UX state management.

## Objective
Review the following documents and define the missing technical details:
- [recipe-pwa.spec.md](file:///Users/alex/Code/whats-for-supper/src/specs/recipe-pwa.spec.md)
- [003-pwa-ux-and-identity-strategy.md](file:///Users/alex/Code/whats-for-supper/src/specs/decisions/003-pwa-ux-and-identity-strategy.md)

## Missing Definitions to Resolve
1. **Tech Stack Selection**: Finalize the choice between **Next.js (App Router)** or **Vite + React**. Consider the PWA requirement for offline support and the NAS self-hosting environment.
2. **State & Theme Persistence**: Define exactly how the "Selected Profile" and "Theme Choice" (Earth vs Modern) are persisted and shared across the application.
3. **Camera Integration**: Specify the browser API strategy for the custom camera capture (Phase 1) to ensure it works across both iOS (Safari) and Android (Chrome).

## Deliverable
Do NOT write code. Instead, produce:
1. An **Update** to `recipe-pwa.spec.md` with the finalized tech stack and persistence logic.
2. A **New ADR** (`010-pwa-framework-and-state-strategy.md`) justifying the framework choice for PWA performance.
