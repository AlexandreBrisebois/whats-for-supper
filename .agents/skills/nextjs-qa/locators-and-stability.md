# Locators and E2E Test Stability

Resilient Playwright tests depend entirely on zero-brittle locators. When diagnosing a test failure, bad locators are the number one culprit.

## The Locator Hierarchy
1.  **MANDATORY:** `page.getByTestId('...')` - Use this for almost everything interactive.
2.  **ACCEPTABLE:** `page.getByRole('...', { name: '...' })` - Use this for core accessibility assertions (e.g., confirming the Main Menu is labeled correctly).
3.  **FORBIDDEN:** `page.locator('css=.some-class > div:nth-child(2)')` - Do not use generated CSS classes or complex DOM paths.

## Anti-Pattern: Flaky Locators
*   **Wrong:** `await page.click('button.submit-btn')`
*   **Why it's bad:** If the design changes and the class is renamed to `primary-btn`, the test breaks even though the functionality works. 
*   **Right:** `await page.getByTestId('submit-btn').click()`

## Diagnosing "Element Not Found" Errors
If Playwright reports that an element could not be found:
1.  **Check the Test ID:** Did the developer forget to add the `data-testid` to the React component?
2.  **Check the Data:** Is the mock API returning the right data? If the mock returns an empty list, the element won't render.
3.  **Check the State:** Did a previous action fail to complete? (e.g., the test clicked "Save", but the API returned a 400, so the next screen never loaded).
