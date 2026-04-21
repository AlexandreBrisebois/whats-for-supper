# API Design & Response Standards

**Status**: FROZEN (2026-04-21)  
**Owner**: Alexandre Brisebois  
**Last Updated**: 2026-04-21  

---

## 1. API Response Wrapping Policy

### The Rule: ✅ WRAP ALL SUCCESSFUL RESPONSES

All successful (2xx) API responses **MUST be automatically wrapped** in a `{ data: ... }` object by the `SuccessWrappingFilter`.

**Example Request:**
```http
GET /api/family
```

**Response (Auto-Wrapped):**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Alice",
      "createdAt": "2026-04-21T18:00:00Z",
      "updatedAt": "2026-04-21T18:00:00Z"
    }
  ]
}
```

---

## 2. Implementation Details

### Controller Layer: Return Plain DTOs

Controllers return DTOs directly. **Do not manually wrap them in `{ data: ... }`**.

✅ **CORRECT** — [api/src/RecipeApi/Controllers/FamilyController.cs](../api/src/RecipeApi/Controllers/FamilyController.cs:20-23)
```csharp
[HttpGet]
public async Task<IActionResult> GetAll()
{
    var members = await familyService.GetAllFamilyMembers();
    var dtos = members.Select(m => new FamilyMemberDto { ... }).ToList();
    return Ok(dtos);  // Returns array directly
}
```

❌ **WRONG** — Do NOT do this:
```csharp
return Ok(new { data = dtos });  // REDUNDANT — Filter will wrap again
```

### Automatic Wrapping: The Filter

The `SuccessWrappingFilter` ([api/src/RecipeApi/Infrastructure/SuccessWrappingFilter.cs](../api/src/RecipeApi/Infrastructure/SuccessWrappingFilter.cs)) intercepts all `ObjectResult` with 2xx status codes and wraps them **once**.

**Smart Detection Logic:**
- Skips wrapping if the response is already wrapped (checks for existing `data` property).
- Skips `FileResult`, `EmptyResult`, and other non-object results.
- Safe to apply globally — idempotent.

### Registration: Program.cs

The filter is registered in `Program.cs`:
```csharp
services.AddControllers(options =>
{
    options.Filters.Add<SuccessWrappingFilter>();
});
```

---

## 3. Special Cases

### 204 No Content
- **Status**: `204 No Content`
- **No wrapping needed** — empty body is correct.
- **Example**: `DELETE /api/family/{id}`

### Error Responses (4xx, 5xx)
- **NOT wrapped by SuccessWrappingFilter** (only wraps 2xx).
- **Handled by ASP.NET Core default** problem details.
- **Client responsibility**: Handle both wrapped (2xx) and unwrapped (4xx/5xx) responses.

### Already-Wrapped Responses
If a response already has a `data` property, the filter detects it and skips re-wrapping.

**Why?** Future-proofing — if we ever manually wrap a response, the filter won't double-wrap.

---

## 4. Client Integration (PWA/Next.js)

### Fetch Pattern
All successful API calls will have a `data` field:

✅ **CORRECT**
```typescript
const response = await fetch(`${apiBase}/api/family`);
const json = await response.json();
const members = json.data;  // Unwrap here
```

❌ **WRONG**
```typescript
const response = await fetch(`${apiBase}/api/family`);
const json = await response.json();
const members = json;  // Missing .data access
```

### Mock API Consistency
The mock API ([pwa/mock-api.js](../pwa/mock-api.js)) **MUST also wrap responses** to match production behavior.

✅ **VERIFIED** — All mock endpoints wrap responses in `{ data: ... }`:
- `GET /api/family` → `{ data: [...] }`
- `POST /api/family` → `{ data: {...} }`
- `GET /api/discovery/categories` → `{ data: [...] }`
- `GET /api/discovery` → `{ data: [...] }`
- `POST /api/recipes` → `{ data: {...} }`

When updating mock API, ensure every response includes the `data` wrapper.

---

## 5. Why This Design?

### Problem We Solved
- **Inconsistency**: Some endpoints return `{ data: ... }`, others don't → client confusion.
- **Agent Regression**: A previous agent re-wrapped all responses, breaking the design.

### Solution Benefits
1. **Single Responsibility**: Controllers focus on business logic, filter handles API contract.
2. **Consistency**: Every 2xx response has the same shape.
3. **Idempotency**: The filter detects and prevents double-wrapping.
4. **Testability**: Controllers return DTOs; filter behavior is tested independently.

---

## 6. Enforcement Rules for Future Agents

### DO NOT
- ❌ Manually wrap responses in controllers (`return Ok(new { data = ... })`)
- ❌ Skip the filter by returning `Content()` or other raw types
- ❌ Re-wrap already-wrapped responses in middleware
- ❌ Create alternative wrapping patterns

### DO
- ✅ Return plain DTOs from controllers
- ✅ Assume `SuccessWrappingFilter` is active in `Program.cs`
- ✅ Keep the filter logic in [api/src/RecipeApi/Infrastructure/SuccessWrappingFilter.cs](../api/src/RecipeApi/Infrastructure/SuccessWrappingFilter.cs)
- ✅ Update the mock API to match production wrapping
- ✅ Document any API changes in this file

---

## 7. Testing Strategy

### API (xUnit)
Tests should verify:
- DTOs are returned correctly from the service.
- The filter wraps them in integration tests.

Example pattern:
```csharp
var response = await client.GetAsync("/api/family");
var json = await response.Content.ReadAsStringAsync();
var wrapped = JsonSerializer.Deserialize<JsonElement>(json);
var data = wrapped.GetProperty("data");  // Verify wrapping happened
```

### PWA (Playwright)
Mock API responses must include the `data` wrapper so tests pass locally before being deployed.

---

## 8. Version History

| Date | Author | Change |
|------|--------|--------|
| 2026-04-21 | Alexandre Brisebois | Initial design doc; locked API wrapping pattern to prevent agent regressions. |

---

## 9. Changelog / Future Changes

If you need to change this design (e.g., to NOT wrap responses):
1. **Update this document** with the new rule and rationale.
2. **Update Program.cs** to register/unregister the filter.
3. **Update the mock API** to match.
4. **Update this Version History** with the date and reason.
5. **Add a note to HANDOVER.md** so the next agent knows the change.

**Do not make silent changes to the API contract.**

---

