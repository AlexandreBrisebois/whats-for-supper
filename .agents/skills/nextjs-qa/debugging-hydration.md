# Diagnosing Next.js Hydration Errors

Hydration and state synchronization are possible causes; inspect the failing trace and network evidence.

## What is a Hydration Error?
A hydration error occurs when the initial HTML rendered by the Next.js server does not match the React virtual DOM rendered on the client on the first pass.

## The "Race Condition" Anti-Pattern
Playwright is extremely fast. If your test clicks a button immediately upon page load, Playwright might click the plain HTML button *before* React has fully hydrated the page and attached the `onClick` event listener. 
*   **Result:** The click does nothing, the test times out waiting for the next screen, and the run fails.

## How to Diagnose & Fix
1.  **Check for Visibility/Interactivity First:** Visibility is necessary but does not prove React handlers are attached. Use an application readiness signal where required.
    ```typescript
    // Visibility check; add the application readiness condition when needed
    const button = page.getByTestId('submit-btn');
    await expect(button).toBeVisible();
    await button.click();
    ```
2.  **Wait for Hydration Markers:** If the app has global state or complex hydration, wait for a specific piece of data to appear on screen before interacting.
3.  **Investigate Server vs. Client Output:** If there's a literal React Hydration Mismatch error in the console logs, ensure that components using browser-only APIs (`window`, `localStorage`, `Date.now()`) are wrapped in `useEffect` or dynamically imported with `ssr: false`.
