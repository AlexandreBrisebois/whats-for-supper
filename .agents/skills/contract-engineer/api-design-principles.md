# API Design Principles (OpenAPI)

When defining or updating the OpenAPI specification (`specs/openapi.yaml`), ensure the contract is designed for developer ergonomics and testability.

## 1. Small Surface Area
Keep endpoints highly focused. 
- Fewer endpoints and parameters mean a simpler contract and easier client integration.
- Avoid "god endpoints" that take massive, generic JSON payloads.

## 2. SDK-Style Interface Generation
The OpenAPI spec is used to generate Kiota SDK clients for both the Next.js frontend and .NET backend. 
Design your routes so that the generated SDK functions are intuitive:
- **Avoid Generic Fetchers:** Don't design APIs where the client must construct complex query strings or generic payloads to determine the action.
- **Specific Actions:** Design specific endpoints for specific actions (e.g., `POST /recipes/{id}/veto`) rather than a generic `PATCH /recipes/{id}` with a complex action payload.

The SDK approach guarantees:
- Each mock returns one specific shape
- No conditional logic in test setup
- Easier to see which endpoints a test exercises
- Absolute type safety per endpoint

This ensures the generated mock data and SDK clients are strongly typed and independently mockable by the frontend and backend teams.
