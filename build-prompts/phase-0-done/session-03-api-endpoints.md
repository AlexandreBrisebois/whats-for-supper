# Session 3: API Endpoints & Database Context

**Artifact:** Controllers, Services, DTOs, and DbContext with migrations working

**Context needed:** Sessions 1-2 artifacts + Phase 0 spec

**What to build:**
- `api/src/RecipeApi/Data/RecipeDbContext.cs` — EF Core DbContext
- `api/src/RecipeApi/Models/` — Domain models
- `api/src/RecipeApi/Dto/` — Request/Response DTOs
- `api/src/RecipeApi/Controllers/HealthController.cs`
- `api/src/RecipeApi/Controllers/FamilyController.cs`
- `api/src/RecipeApi/Controllers/RecipeController.cs`
- `api/src/RecipeApi/Services/` — Business logic services

**Success:**
- All endpoints respond with correct status codes
- Database schema creates automatically
- POST /api/family creates family member
- GET /api/recipes returns empty list (no 500 errors)

---

## Prompt

```
Task: Implement Phase 0 API endpoints and database integration

You are implementing the core API endpoints for Phase 0.

Context:
- Database migrations from Session 1 are in database/migrations/
- API project structure from Session 2 is set up
- Reference: specs/phase0-mvp.spec.md sections 1.3-2.5

Implement:

1. api/src/RecipeApi/Data/RecipeDbContext.cs
   - Map Models to tables
   - Configure relationships
   - Configure indexes (fluent API)
   - Auto-run migrations on startup (via Program.cs)

2. api/src/RecipeApi/Models/
   - FamilyMember.cs (id, name, completedTours, createdAt, updatedAt)
   - Recipe.cs (id, rating, addedBy, notes, rawMetadata, ingredients, embedding, createdAt, updatedAt)
   - TourCompletion.cs (internal model for completedTours)

3. api/src/RecipeApi/Dto/
   - FamilyMemberDto.cs
   - CreateFamilyMemberDto.cs (just name)
   - RecipeDto.cs
   - CreateRecipeDto.cs
   - RecipeListResponseDto.cs
   - PaginationDto.cs
   - HealthCheckResponseDto.cs

4. api/src/RecipeApi/Services/
   - FamilyService.cs
     * GetAllFamilyMembers()
     * CreateFamilyMember(name)
     * DeleteFamilyMember(id)
   - RecipeService.cs
     * CreateRecipe(request) — validate images, save to disk, create DB record
     * GetRecipesList(page, limit) — paginated, newest first
     * GetRecipeDetail(id)
     * CompleteTour(familyMemberId, tourId)
   - ValidationService.cs
     * ValidateImage(file) — check size (20MB max), MIME type
     * ValidateImageCount(count) — max 20 images
     * ValidateRating(rating) — 0-3
     * ValidateCookedMealIndex(index, imageCount) — -1 to imageCount-1
   - ImageService.cs
     * SaveImages(recipeId, files) → /data/recipes/{uuid}/original/0.jpg
     * GetImage(recipeId, photoIndex) → binary stream
     * CreateRecipeInfo(metadata) → recipe.info JSON file

5. api/src/RecipeApi/Controllers/
   - HealthController.cs
     * GET /health → checks API, DB, schema, returns { status, checks }
   - FamilyController.cs
     * GET /api/family → list all members
     * POST /api/family → create new member (name in body)
     * DELETE /api/family/{id} → delete member
   - RecipeController.cs
     * POST /api/recipes → create recipe (multipart form data)
       - Files (images)
       - rating (0-3)
       - cookedMealImageIndex (-1 or 0-based index)
       - X-Family-Member-Id header (required)
       - Returns: { recipeId, message }
     * GET /api/recipes → list paginated (page, limit query params)
       - Returns: { updatedAt, recipes[], pagination }
     * GET /api/recipes/{id} → detail with all metadata
       - Returns: { updatedAt, recipe { id, rating, addedBy, images[], createdAt } }
     * GET /recipe/{recipeId}/original/{photoIndex} → image binary
     * GET /recipe/{recipeId}/hero → hero image (Phase 1, return 404 in Phase 0)

6. api/src/RecipeApi/Middleware/ErrorHandlingMiddleware.cs
   - Catch exceptions, return proper HTTP responses
   - Log errors with context

Validation Rules (from Phase 0 spec section 2.1):
- Image size: max 20MB per image
- Image count: min 1, max 20 per recipe
- MIME types: image/jpeg, image/png, image/webp
- Rating: must be 0, 1, 2, or 3
- cookedMealImageIndex: -1 or 0 to imageCount-1
- X-Family-Member-Id header: required, returns 400 if missing

Testing:
- Test endpoints via curl/Postman before moving to next session
- Verify database creates tables automatically on first run
- Verify migrations are idempotent (can run multiple times safely)
```

---

## What to Expect

After this session:
- ✅ All core endpoints implemented
- ✅ Database integration working
- ✅ Services handling business logic
- ✅ Validation in place

## Next Steps

1. Test endpoints with curl/Postman
2. Commit: `git commit -m "session 3: API endpoints and database context"`
3. Move to Session 4
