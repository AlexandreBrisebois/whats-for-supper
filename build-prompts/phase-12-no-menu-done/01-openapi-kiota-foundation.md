# Build Prompt 01-openapi-kiota-foundation.md
**Persona**: Sr. API Architect & Contract Engineer.

## Strict Scope
- **TARGET**: 
    - `specs/openapi.yaml`
- **FORBIDDEN**: 
    - Do not modify any existing endpoints or schemas unrelated to settings.
    - Do not modify frontend components.

## The Seams (Contract)
You are adding a new vertical slice for **Settings**.
- **Endpoint**: `/api/settings/{key}`
- **Methods**: `GET` (returns value), `POST` (updates value).
- **Schema**:
    ```yaml
    SettingsDto:
      type: object
      properties:
        key: { type: string }
        value: { type: object, additionalProperties: true }
    ```

## Technical Skeleton
1.  **OpenAPI**: 
    - Add the `/api/settings/{key}` path.
    - Add security requirement `FamilyMemberId`.
    - Ensure `GET` returns a wrapped `SettingsDto`.
    - Ensure `POST` accepts a `SettingsDto`.
2.  **Kiota**: 
    - After updating the spec, you MUST regenerate the Kiota client.

## Execution Limit
Implement ONLY the OpenAPI definitions and trigger client regeneration. Do not implement the backend logic or frontend store yet.

## TDD Protocol
- **Verification**: Run `task agent:reconcile` (if available) or visually verify the `specs/openapi.yaml` passes linting.
- **Client Check**: Verify that `pwa/src/lib/api/api-client.ts` (or equivalent) now contains the `settings` property.

## Verification Command
```bash
# Verify OpenAPI syntax
npx @redocly/cli lint specs/openapi.yaml
# Regenerate Kiota (Assumes task or script exists)
npm run generate:api
```

## Handover Requirement
- Summary of changes to `openapi.yaml`.
- Confirmation of successful Kiota regeneration.
- Pass/Fail of linting.
