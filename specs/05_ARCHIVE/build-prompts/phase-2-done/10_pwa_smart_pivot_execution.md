# Prompt 10: Smart Pivot Execution & Discovery Pulse Sync

**Context:** The "Smart Pivot" visuals are implemented on the Home page, but the "One-Tap Fix" chips are currently non-functional. Additionally, the Discover button pulse signal needs to be synced with a real backend status.

**Goal:** Turn the Smart Pivot into a functional "crisis-resolver" and stabilize the navigation pulse signal.

**Instructions:**

1. **Smart Pivot Backend Support:**
   - In `DiscoveryController.cs` or a new `SmartPivotController.cs`, add an endpoint `GET /api/discovery/quick-fix`.
   - This endpoint should return 3 random/agent-selected recipes that are "Quick" (PrepTime < 20 mins) or "Familiar" (High family rating).

2. **Smart Pivot Frontend Integration:**
   - Update `pwa/src/components/home/HomeSections.tsx`:
     - Fetch real "Quick Fix" data from `/api/discovery/quick-fix` when the `SmartPivotCard` mounts.
     - When a chip is tapped:
       - Call `PUT /api/schedule/today` to assign that recipe to tonight's supper.
       - Use an optimistic UI update to immediately swap the `SmartPivotCard` for the `TonightMenuCard`.
       - Show a "Success" toast: *"Dinner is saved! [Recipe Name] added to tonight."*

3. **Global Discovery Pulse Sync:**
   - Update `pwa/src/components/common/Navigation.tsx`:
     - Instead of just checking categories on mount, implement a **Background Polling** or **SWR Revalidation** strategy for the `hasPendingCards` signal.
     - Use the new `GET /api/discovery/status` endpoint (from Prompt 08).
     - Ensure the pulse starts/stops correctly when the user finishes a discovery session.

4. **Visual Refinement:**
   - Ensure the "Solar Ochre" gradient on the Smart Pivot card feels vibrant and "emergency-ready."
   - Verify the "Thumb Zone" safety on the Discovery page one last time with the larger `h-20` Discover button.

5. **Verification:**
   - Verify that tapping a "Quick Fix" chip correctly updates the backend schedule and refreshes the Home page state.
