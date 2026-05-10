# Design: Recipe Detail Action Labels Refresh

## UX Implementation Contract

### Visual Hierarchy
The actions in the `RecipeDetailSheet` should follow this visual stack:
1. **Primary Action Zone**:
    - High-contrast button (Terracotta/Sage).
    - If pivot is active, show two buttons: `Cook Tonight` (Terracotta) and `Plan for Later` (Ochre).
2. **Secondary Action Row**:
    - `Find Similar` button: `border-charcoal/10 bg-white`. Icon: `Search` (lucide).
3. **Discovery Toggle Zone**:
    - `DiscoveryToggleCard`: Full-width card with `bg-white/85`, `backdrop-blur`, and a large toggle switch.

### Interaction States
- **Optimistic Toggle**: When "Ask the Family" is toggled, the switch should move immediately while the API call is in flight.
- **Loading**: Use an `opacity-50` and `cursor-wait` state on the `DiscoveryToggleCard` during the PATCH request.

## State Ownership
- **`RecipeDetailSheet`**:
    - `showActionPivot`: Boolean (local component state).
    - `isDiscoverable`: Boolean (from recipe prop/fetch, updated via local optimistic state).
- **`DiscoveryToggleCard`**:
    - `isDiscoverable`: Boolean (prop).
    - `onToggle`: Function (prop).
    - `isLoading`: Boolean (prop).

## Experience Architecture

```mermaid
graph TD
    A[RecipeDetailSheet] --> B{plannerDayLabel?}
    B -- Yes --> C[Plan for {day}]
    B -- No --> D[Cook This]
    D -- Click --> E[Pivot: Cook Tonight / Plan for Later]
    C -- Success --> F[Navigate to Planner]
    E -- Success --> F
    A --> G[Find Similar]
    A --> H[DiscoveryToggleCard]
```

## Mock Contract

### `pwa/e2e/mock-api.ts`
Update the recipe PATCH handler to reflect the discovery toggle behavior:
```typescript
// PATCH /api/recipes/{id}
{
  url: '/api/recipes/*',
  method: 'PATCH',
  handler: (req) => {
    const { isDiscoverable } = req.body;
    return { ...MOCK_RECIPE, isDiscoverable };
  }
}
```

## Testing Strategy
- **Unit (Vitest)**:
    - Verify `DiscoveryToggleCard` renders correct title/subtitle.
    - Verify `RecipeDetailSheet` renders correct labels based on `plannerDayLabel` prop.
- **E2E (Playwright)**:
    - Click "Cook This" -> Verify pivot appears.
    - Click "Ask the Family" -> Verify API call and visual toggle state change.
    - Click "Plan for {day}" -> Verify navigation to `/planner`.

## data-testid Index
| Element | Test ID |
| :--- | :--- |
| Primary Action (no day) | `action-cook-this` |
| Primary Action (with day) | `action-add-to-day` |
| Pivot: Cook Tonight | `action-cook-tonight` |
| Pivot: Plan for Later | `action-plan-later` |
| Find Similar Button | `action-find-similar` |
| Discovery Toggle Card | `action-toggle-discovery` |
| Discovery Toggle Switch | `discovery-switch` |
