# Next.js Vertical Slicing

**DO NOT write an entire Next.js page or feature at once.** This is the "horizontal slicing" anti-pattern. Instead, implement one capability at a time end-to-end (from the contract down to the UI).

## One bounded capability

1.  **Investigate:** Use [shared investigation](../../core/context-loading.md#investigation). Establish approved intent and the affected contract before tests.
2.  **Regression test:** Write *one* Playwright test that clicks a button or loads a component that exercises the selected behavior, including an API call if involved.
3.  **Minimal implementation:** Write the bare minimum Server Component or Client Component to satisfy that single test and hit the mock API when involved.
4.  **Repeat:** Repeat only for requirements within the selected task; stop before its successor.

## Anti-Pattern: Horizontal Slicing
*   **Wrong:** Creating all React components, writing all CSS, wiring up the layout, and then writing tests.
*   **Why it's bad:** You over-engineer components before knowing if the API contract fits, and your tests end up testing your implementation, not the behavior.

## Working with Contracts (The Seams)
*   **Sync Types First:** After an approved contract edit run `task gen:client` and `task typecheck`; use the generated SDK types.
*   **Mock Verification:** Verify that the Playwright mock API matches your expected behavior. Run `task agent:reconcile` if you suspect the mock is misaligned.
*   **RSC Data Fetching:** Prefer fetching data in Server Components and passing plain data props down to interactive Client Components.
