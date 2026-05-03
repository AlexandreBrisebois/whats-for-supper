# Next.js Vertical Slicing

**DO NOT write an entire Next.js page or feature at once.** This is the "horizontal slicing" anti-pattern. Instead, implement one capability at a time end-to-end (from the contract down to the UI).

## The Tracer Bullet Approach

1.  **Understand the Contract:** Find the specific endpoint in `specs/openapi.yaml` you need.
2.  **Tracer Test:** Write *one* Playwright test that clicks a button or loads a component that triggers this API call.
3.  **Tracer Implementation:** Write the bare minimum Server Component or Client Component to satisfy that single test and hit the mock API.
4.  **Repeat:** Once the tracer bullet is complete, add the next requirement.

## Anti-Pattern: Horizontal Slicing
*   **Wrong:** Creating all React components, writing all CSS, wiring up the layout, and then writing tests.
*   **Why it's bad:** You over-engineer components before knowing if the API contract fits, and your tests end up testing your implementation, not the behavior.

## Working with Contracts (The Seams)
*   **Sync Types First:** Always run `task types:sync` so your UI components are typed with the exact schema generated from the OpenAPI spec.
*   **Mock Verification:** Verify that the Playwright mock API matches your expected behavior. Run `task agent:reconcile` if you suspect the mock is misaligned.
*   **RSC Data Fetching:** Prefer fetching data in Server Components and passing plain data props down to interactive Client Components.
