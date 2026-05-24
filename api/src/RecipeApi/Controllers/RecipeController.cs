using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RecipeApi.Dto;
using RecipeApi.Infrastructure;
using RecipeApi.Services;

namespace RecipeApi.Controllers;

[ApiController]
[Route("api/recipes")]
public class RecipeController(
    RecipeService recipeService,
    RecipeSearchService recipeSearchService,
    AgentSearchTranslationService agentSearchTranslationService,
    ImageService imageService,
    RecipeImportService importService,
    RecipeImportBulkService bulkImportService,
    RecipePurgeService recipePurgeService,
    ILogger<RecipeController> logger) : ControllerBase
{
    /// <summary>POST /api/recipes — upload images and create a new recipe.</summary>
    [HttpPost]
    [RequestSizeLimit(500 * 1024 * 1024)] // 500 MB outer limit (20 images × 20 MB)
    public async Task<IActionResult> Create(
        [ModelBinder(BinderType = typeof(FamilyMemberIdModelBinder))] Guid? familyMemberId,
        [FromForm] CreateRecipeDto dto,
        [FromForm] IFormFileCollection files)
    {
        if (familyMemberId is null)
            return BadRequest(new { message = "X-Family-Member-Id header is required." });

        var recipeId = await recipeService.CreateRecipe(familyMemberId.Value, files, dto);
        return Accepted(new { id = recipeId });
    }

    /// <summary>GET /api/recipes — paginated list. Default: newest first. order=explore: lastCookedDate ASC NULLS FIRST.</summary>
    [HttpGet]
    [SkipWrapping]
    public async Task<IActionResult> List(
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20,
        [FromQuery] string? order = null,
        [FromQuery] bool? discoverableOnly = null,
        [FromQuery] Guid? id = null,
        [FromQuery] string? name = null,
        [FromQuery] string? url = null)
    {
        if (order is not null && !string.Equals(order, "explore", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { error = "Invalid order parameter. Allowed values: explore" });

        var result = await recipeService.GetRecipesList(page, limit, order, discoverableOnly, id, name, url);
        return Ok(result);
    }

    /// <summary>GET /api/recipes/library-summary — lightweight library health counts.</summary>
    [HttpGet("library-summary")]
    public async Task<IActionResult> GetLibrarySummary()
    {
        var result = await recipeService.GetLibrarySummary();
        return Ok(new { data = result });
    }

    /// <summary>GET /api/recipes/{id} — full detail for a single recipe.</summary>
    [HttpGet("{id:guid}")]
    [SkipWrapping]
    public async Task<IActionResult> Detail(Guid id)
    {
        var result = await recipeService.GetRecipeDetail(id);
        return Ok(result);
    }

    /// <summary>GET /api/recipes/{id}/share — export a privacy-scrubbed recipe bundle.</summary>
    [HttpGet("{id:guid}/share")]
    public async Task<IActionResult> Share(
        Guid id,
        [ModelBinder(BinderType = typeof(FamilyMemberIdModelBinder))] Guid? familyMemberId = null)
    {
        if (familyMemberId is null)
            return BadRequest(new { message = "X-Family-Member-Id header is required." });

        try
        {
            if (!await imageService.HasHeroImage(id))
            {
                return BadRequest(new { message = "Recipe must have a hero image before it can be shared." });
            }

            var result = await recipeService.ExportRecipeShareBundle(id);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to export recipe share bundle for {Id}", id);
            return StatusCode(500, new { message = "An internal error occurred while generating the share bundle." });
        }
    }

    /// <summary>
    /// PATCH /api/recipes/{id} — partial update for notes and/or rating.
    /// Changes are persisted to both the database and the recipe.info file on disk.
    /// Only fields included in the request body are applied; null fields are ignored.
    /// </summary>
    [HttpPatch("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateRecipeDto dto)
    {
        var result = await recipeService.UpdateRecipe(id, dto);
        return Ok(result);
    }

    /// <summary>
    /// POST /api/recipes/{id}/import — trigger a manual recipe import.
    /// </summary>
    [HttpPost("{id:guid}/import")]
    public async Task<IActionResult> TriggerImport(Guid id)
    {
        try
        {
            var importId = await importService.TriggerImport(id);
            return Accepted(new RecipeImportTriggerResponseDto { ImportId = importId });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    /// <summary>
    /// GET /api/recipes/{id}/import — check the status of a recipe import.
    /// </summary>
    [HttpGet("{id:guid}/import")]
    public async Task<IActionResult> GetImportStatus(Guid id)
    {
        var result = await importService.GetImportStatus(id);
        return result == null
            ? NotFound(new { message = "No import status found for this recipe." })
            : Ok(result);
    }

    /// <summary>
    /// GET /api/recipes/import-status — get a summary of the import pipeline's health.
    /// </summary>
    [HttpGet("import-status")]
    [SkipWrapping]
    public async Task<IActionResult> GetImportSummary()
    {
        var summary = await importService.GetImportSummary();
        return Ok(summary);
    }

    /// <summary>
    /// POST /api/recipes/imports/bulk — queue a recipe-import workflow for every unimported recipe.
    /// </summary>
    [HttpPost("imports/bulk")]
    [SkipWrapping]
    public async Task<IActionResult> BulkTriggerImport()
    {
        var result = await bulkImportService.TriggerAllPendingAsync();
        return Accepted(result);
    }

    /// <summary>
    /// POST /api/recipes/describe — create a stub recipe from a text description.
    /// Triggers the goto-synthesis workflow (added in Phase C).
    /// </summary>
    [HttpPost("describe")]
    public async Task<IActionResult> Describe(
        [FromBody] DescribeRecipeDto dto,
        [ModelBinder(BinderType = typeof(FamilyMemberIdModelBinder))] Guid? familyMemberId = null)
    {
        if (familyMemberId is null)
            return BadRequest(new { message = "X-Family-Member-Id header is required." });

        var result = await recipeService.DescribeRecipe(dto, familyMemberId);
        return Ok(result);
    }

    /// <summary>
    /// GET /api/recipes/{id}/status — synthesis status for a recipe.
    /// Returns "pending" while the goto-synthesis workflow is running; "ready" once complete.
    /// </summary>
    [HttpGet("{id:guid}/status")]
    public async Task<IActionResult> GetStatus(Guid id)
    {
        try
        {
            var result = await recipeService.GetRecipeStatus(id);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// POST /api/recipes/capture-url — capture a recipe from a URL.
    /// Triggers the url-import workflow.
    /// </summary>
    [HttpPost("capture-url")]
    public async Task<IActionResult> CaptureUrl(
        [FromBody] CaptureUrlDto dto,
        [ModelBinder(BinderType = typeof(FamilyMemberIdModelBinder))] Guid? familyMemberId = null)
    {
        if (familyMemberId is null)
            return BadRequest(new { message = "X-Family-Member-Id header is required." });

        var recipeId = await recipeService.CaptureUrl(dto, familyMemberId.Value);
        return Accepted(new { data = new { id = recipeId } });
    }

    /// <summary>POST /api/recipes/import-bundle — import a reviewed recipe bundle.</summary>
    [HttpPost("import-bundle")]
    public async Task<IActionResult> ImportBundle(
        [FromBody] RecipeShareBundleDto dto,
        [ModelBinder(BinderType = typeof(FamilyMemberIdModelBinder))] Guid? familyMemberId = null)
    {
        if (familyMemberId is null)
            return BadRequest(new { message = "X-Family-Member-Id header is required." });

        try
        {
            var result = await recipeService.ImportRecipeShareBundle(dto, familyMemberId.Value);
            return Created($"/api/recipes/{result.Id}", result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (FormatException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>GET /api/recipes/recommendations — mock recommendations (100% mocked data for development).</summary>
    [HttpGet("recommendations")]
    public IActionResult GetRecommendations()
    {
        var response = new RecommendationsDto
        {
            TopPick = new TopPickDto
            {
                Id = Guid.Parse("550e8400-e29b-41d4-a716-446655440010"),
                Name = "Homemade Lasagna",
                Description = "The ultimate comfort food, layered with rich meat sauce and creamy béchamel.",
                ImageUrl = "https://images.unsplash.com/photo-1574894709920-11b28e7367e3",
                TotalTime = "45 mins",
            },
            Results = new List<RecommendationResultDto>
            {
                new RecommendationResultDto
                {
                    Id = Guid.Parse("550e8400-e29b-41d4-a716-446655440011"),
                    Name = "Zesty Lemon Chicken",
                    TotalTime = "30m",
                    Image = "https://images.unsplash.com/photo-1532550907401-a500c9a57435",
                },
                new RecommendationResultDto
                {
                    Id = Guid.Parse("550e8400-e29b-41d4-a716-446655440012"),
                    Name = "Creamy Pesto Pasta",
                    TotalTime = "15m",
                    Image = "https://images.unsplash.com/photo-1473093226795-af9932fe5856",
                },
            },
        };
        return Ok(response);
    }

    /// <summary>POST /api/recipes/search — hybrid recipe search with optional agent translation.</summary>
    [HttpPost("search")]
    [SkipWrapping]
    public async Task<IActionResult> Search([FromBody] RecipeSearchRequestDto dto, CancellationToken ct)
    {
        var originalQuery = dto.Query;
        var effectiveDto = string.Equals(dto.Mode, "agent", StringComparison.OrdinalIgnoreCase)
            ? await agentSearchTranslationService.TranslateAsync(dto, ct)
            : dto;

        effectiveDto.OriginalQuery = originalQuery;

        var result = await recipeSearchService.SearchAsync(effectiveDto, ct);
        return Ok(result);
    }

    /// <summary>GET /api/recipes/{id}/original/{photoIndex} — raw image binary.</summary>
    [HttpGet("{recipeId:guid}/original/{photoIndex:int}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetImage(Guid recipeId, int photoIndex)
    {
        var (stream, contentType) = await imageService.GetImage(recipeId, photoIndex);
        return File(stream, contentType);
    }

    /// <summary>
    /// GET /api/recipes/{id}/hero — AI-generated hero thumbnail (JPEG).
    /// Returns 404 until a recipe import has been completed.
    /// Exempt from auth so Next.js Image Optimization can fetch it server-side.
    /// </summary>
    [HttpGet("{id:guid}/hero")]
    [AllowAnonymous]
    public async Task<IActionResult> GetHero(Guid id)
    {
        var (stream, contentType) = await imageService.GetHeroImage(id);
        Response.Headers["Cache-Control"] = "public, max-age=31536000, immutable";
        return File(stream, contentType);
    }

    /// <summary>POST /api/recipes/{id}/originals — upload a single original photo and trigger regeneration.</summary>
    [HttpPost("{id:guid}/originals")]
    public async Task<IActionResult> UploadOriginal(Guid id, IFormFile file)
    {
        try
        {
            var newIndex = await recipeService.AddOriginalImageAsync(id, file);
            return Created($"/api/recipes/{id}/original/{newIndex}", new { id = newIndex });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>POST /api/recipes/{id}/hero/regenerate — force trigger background hero regeneration.</summary>
    [HttpPost("{id:guid}/hero/regenerate")]
    public async Task<IActionResult> RegenerateHero(Guid id)
    {
        try
        {
            await recipeService.TriggerHeroRegenerationAsync(id);
            return Accepted(new { message = "Hero regeneration triggered." });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>DELETE /api/recipes/{id} — soft-delete a recipe (sets deleted_at). Returns 409 if in an active planner slot.</summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(
        Guid id,
        [ModelBinder(BinderType = typeof(FamilyMemberIdModelBinder))] Guid? familyMemberId)
    {
        try
        {
            var deletedBy = familyMemberId ?? Guid.Empty;
            var (result, assignedDays) = await recipeService.SoftDeleteRecipe(id, deletedBy);

            if (assignedDays.Count > 0)
                return Conflict(new
                {
                    errorCode = "RECIPE_ASSIGNED_TO_PLANNER",
                    message = $"This recipe is scheduled for {assignedDays[0]}. Remove it from the planner first.",
                    assignedDays
                });

            return Ok(new { data = result.Recipe });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>GET /api/recipes/trash — list soft-deleted recipes (Recycle Bin).</summary>
    [HttpGet("trash")]
    public async Task<IActionResult> GetTrash()
    {
        var items = await recipeService.GetTrash();
        return Ok(new { data = new { items } });
    }

    /// <summary>POST /api/recipes/{id}/restore — restore a soft-deleted recipe.</summary>
    [HttpPost("{id:guid}/restore")]
    public async Task<IActionResult> Restore(Guid id)
    {
        try
        {
            var result = await recipeService.RestoreRecipe(id);
            return Ok(new { data = result.Recipe });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>DELETE /api/recipes/{id}/purge — hard-delete a soft-deleted recipe from the Recycle Bin.</summary>
    [HttpDelete("{id:guid}/purge")]
    public async Task<IActionResult> Purge(
        Guid id,
        [FromHeader(Name = "X-Elevated-Pin")] string? elevatedPin)
    {
        var result = await recipePurgeService.PurgeAsync(id, elevatedPin);

        if (result != PurgeResult.Success)
        {
            logger.LogWarning("Recipe purge failed for {RecipeId} with result {PurgeResult}", id, result);
        }
        else
        {
            logger.LogInformation("Recipe {RecipeId} purged successfully.", id);
        }

        return result switch
        {
            PurgeResult.Success => Ok(new { data = new { purged = true } }),
            PurgeResult.PinNotConfigured => StatusCode(503, new
            {
                errorCode = "PIN_NOT_CONFIGURED",
                message = "Permanent delete is not available."
            }),
            PurgeResult.Forbidden => StatusCode(403, new { errorCode = "FORBIDDEN", message = "Missing or incorrect elevated PIN." }),
            PurgeResult.NotInTrash => Conflict(new
            {
                errorCode = "NOT_IN_TRASH",
                message = "This recipe must be in the Recycle Bin before it can be permanently deleted."
            }),
            PurgeResult.NotFound => NotFound(new { message = "Recipe not found." }),
            _ => StatusCode(500)
        };
    }
}
