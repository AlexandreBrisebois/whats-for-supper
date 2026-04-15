# Session 4: API Testing & Validation

**Artifact:** `api/src/RecipeApi.Tests/` with comprehensive test suite

**Context needed:** Sessions 1-3 artifacts + Phase 0 spec

**What to build:**
- Unit tests for Services (family, recipe, validation, image)
- Integration tests for Controllers
- Test data/fixtures

**Success:**
- `dotnet test` runs all tests and passes
- Coverage of critical paths: create family, create recipe, list recipes
- Image validation tests cover all error cases

---

## Prompt

```
Task: Create Phase 0 API test suite

You are writing tests for the Phase 0 API endpoints and services.

Context:
- API endpoints from Session 3
- Test project: api/src/RecipeApi.Tests/
- Test framework: xUnit
- Use in-memory SQLite for integration tests (easier than postgres)

Create:

1. api/src/RecipeApi.Tests/Services/FamilyServiceTests.cs
   - Test: CreateFamilyMember creates with unique ID
   - Test: GetAllFamilyMembers returns all members
   - Test: DeleteFamilyMember removes member
   - Test: Empty name is rejected

2. api/src/RecipeApi.Tests/Services/ValidationServiceTests.cs
   - Test: ValidateImageCount rejects >20 images
   - Test: ValidateRating rejects invalid ratings
   - Test: ValidateCookedMealIndex rejects out-of-range
   - Test: ValidateImage rejects files >20MB
   - Test: ValidateImage rejects invalid MIME types

3. api/src/RecipeApi.Tests/Controllers/FamilyControllerTests.cs
   - Test: GET /api/family returns list
   - Test: POST /api/family creates member
   - Test: DELETE /api/family/{id} removes member
   - Test: DELETE non-existent returns 404

4. api/src/RecipeApi.Tests/Controllers/RecipeControllerTests.cs
   - Test: POST /api/recipes without images returns 400
   - Test: POST /api/recipes with invalid rating returns 400
   - Test: POST /api/recipes without X-Family-Member-Id returns 400
   - Test: POST /api/recipes succeeds with valid data
   - Test: GET /api/recipes returns paginated list
   - Test: GET /api/recipes/{id} returns recipe detail
   - Test: GET /recipe/{id}/original/{index} returns image binary

5. api/src/RecipeApi.Tests/Controllers/HealthControllerTests.cs
   - Test: GET /health returns healthy status
   - Test: Response includes api, database, schema checks

6. api/RecipeApi.Tests.csproj
   - Dependencies: xUnit, Moq, EF Core in-memory (for tests)

Guidelines:
- Use xUnit for test framework
- Create fixtures/builders for test data
- Test both happy path and error cases
- Keep tests focused and readable
- Group tests by feature (Arrange-Act-Assert)

Target:
- All tests pass
- At least 60% code coverage
- No flaky tests
```

---

## What to Expect

After this session:
- ✅ Comprehensive test suite for all APIs
- ✅ Tests passing with good coverage
- ✅ Ready for backend integration

## Next Steps

1. Run `dotnet test` and verify all pass
2. Commit: `git commit -m "session 4: API testing"`
3. Move to Session 5
