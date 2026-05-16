# Prompt 03: PWA Discovery UI Integration (TDD)

**Context:** The API now serves discoverable recipes and handles voting. We need to connect the PWA Discovery Page to these real endpoints, implement category-based variety, and handle empty states gracefully.

**Goal:** Connect `DiscoveryPage` to the API, implement category rotation, and handle the "Out of Invitations" state.

**Instructions:**

1. **Test First (TDD):**
   - Update `pwa/mock-api.js` to include the new Discovery endpoints:
     - `GET /api/discovery/categories` (returns list of categories)
     - `GET /api/discovery?category=...`
     - `POST /api/discovery/:id/vote`
   - Update Playwright tests in `pwa/e2e/discovery.spec.ts`:
     - **Discovery Flow:** Verify that the page fetches categories first, then fetches the first category's stack.
     - **Empty State:** Mock the API to return no categories and verify that the UI displays: *"You've seen all the inspirations for today! Come back soon to vote on new recipes."*
     - **Voting:** Verify that swiping right sends a `Like` vote to the API and updates the local stack.

2. **API Client Update:**
   - Update `pwa/src/lib/api/discovery.ts` with methods for `getCategories`, `getDiscoveryStack(category)`, and `submitVote(id, vote)`.

3. **UI Integration:**
   - Modify `pwa/src/app/(app)/discovery/page.tsx`:
     - Use a stateful approach to manage the `currentCategory` and `availableCategories`.
     - Fetch `availableCategories` on mount.
     - If categories are available, fetch the first stack.
     - If no categories are available, show the empty state message.
     - Use `/api/recipes/{id}/hero` for the `imageUrl`.

4. **Category Rotation & Variety (UX):**
   - When the current category stack is exhausted (last recipe swiped), automatically check if there are more `availableCategories`.
   - If yes, fetch the next category stack to maintain a varied diet.
   - If no more categories/recipes, show the empty state message.

5. **Verification:**
   - Run `npm run test:e2e` in the `pwa/` directory.
   - Verify visually that the transition between categories is smooth and the empty state is polished (respecting "Solar Earth" aesthetic).
