using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services.Recipes;

namespace RecipeApi.Services;

public class RecipeService(
    IClock clock,
    HistoricalInterestService historicalInterest,
    RecipeDbContext db,
    GoToService goToService,
    IValidationService validation,
    ImageService images,
    IRecipeStore recipeStore,
    IWorkflowOrchestrator orchestrator,
    ILogger<RecipeService> logger,
    SupperProjectionInvalidation projectionInvalidation,
    ISupperProjectionPublisher projectionPublisher,
    RecipesRootResolver recipesRoot,
    IScheduleEventPublisher? publisher = null,
    StructuredRecipeContentStore? structuredEditor = null,
    FoodVocabularyStore? vocabulary = null)
{
    private readonly RecipeQueryService _queries = new(clock, historicalInterest, db, goToService);
    private readonly RecipeMutationService _mutations = new(
        clock,
        db,
        validation,
        images,
        recipeStore,
        orchestrator,
        logger,
        projectionInvalidation,
        projectionPublisher,
        publisher,
        structuredEditor);
    private readonly RecipeImportAndStatusService _importAndStatus = new(
        clock,
        db,
        validation,
        recipeStore,
        orchestrator,
        logger);
    private readonly RecipeLifecycleService _lifecycle = new(
        clock,
        db,
        images,
        orchestrator,
        logger,
        recipesRoot);
    private readonly RecipeMediaService _media = new(
        clock,
        db,
        validation,
        recipeStore,
        orchestrator,
        logger);
    private readonly RecipeShareBundleService _shareBundles = new(
        clock,
        db,
        images,
        recipeStore,
        vocabulary);

    /// <summary>
    /// Creates a new recipe from a multipart upload.
    /// Validates images and form fields, saves to disk and DB, writes recipe.info.
    /// </summary>
    public Task<Guid> CreateRecipe(
        Guid familyMemberId,
        IFormFileCollection files,
        CreateRecipeDto request) =>
        _importAndStatus.CreateRecipe(familyMemberId, files, request);

    /// <summary>Returns a paginated list of recipes, newest first (default) or oldest-cooked first (order=explore).</summary>
    public Task<RecipeListResponseDto> GetRecipesList(
        int page,
        int limit,
        string? order = null,
        bool? discoverableOnly = null,
        Guid? id = null,
        string? name = null,
        string? url = null,
        string? historyGeneration = null,
        bool? gotoOnly = null) =>
        _queries.GetRecipesList(page, limit, order, discoverableOnly, id, name, url, historyGeneration, gotoOnly);

    /// <summary>
    /// Returns a lightweight summary of the recipe library:
    /// total count, never-cooked count, and per-rating counts.
    /// All counts exclude soft-deleted recipes.
    /// </summary>
    public Task<RecipeLibrarySummaryDto> GetLibrarySummary() =>
        _queries.GetLibrarySummary();

    /// <summary>Returns the full detail for a single recipe.</summary>
    public Task<RecipeDetailResponseDto> GetRecipeDetail(Guid id) =>
        _queries.GetRecipeDetail(id);

    public Task<RecipeShareBundleDto> ExportRecipeShareBundle(Guid id) =>
        _shareBundles.ExportRecipeShareBundle(id);

    public Task<RecipeDto> ImportRecipeShareBundle(RecipeShareBundleDto bundle, Guid familyMemberId) =>
        _shareBundles.ImportRecipeShareBundle(bundle, familyMemberId);

    /// <summary>
    /// Applies a partial update to a recipe's user-editable fields.
    /// Persists changes to both the database and the recipe.info file on disk.
    /// </summary>
    public Task<RecipeDetailResponseDto> UpdateRecipe(Guid id, UpdateRecipeDto dto) =>
        _mutations.UpdateRecipe(id, dto);

    internal static void ApplyEditableDetailFields(Recipe recipe, UpdateRecipeDto dto, IValidationService validation) =>
        RecipeMutationService.ApplyEditableDetailFields(recipe, dto, validation);

    /// <summary>
    /// Creates a stub recipe from a text description.
    /// Sets ImageCount = 0, IsDiscoverable = false.
    /// Triggers the goto-synthesis workflow to synthesise the full recipe via AI.
    /// </summary>
    public Task<RecipeDto> DescribeRecipe(DescribeRecipeDto dto, Guid? familyMemberId = null) =>
        _importAndStatus.DescribeRecipe(dto, familyMemberId);

    /// <summary>
    /// Enqueues a URL for background acquisition and extraction.
    /// Triggers the url-import workflow.
    /// </summary>
    public Task<Guid> CaptureUrl(CaptureUrlDto dto, Guid familyMemberId) =>
        _importAndStatus.CaptureUrl(dto, familyMemberId);

    /// <summary>
    /// Returns the synthesis status of a recipe.
    /// "ready" when Name is set and ImageCount > 0; "pending" otherwise.
    /// </summary>
    public Task<RecipeStatusDto> GetRecipeStatus(Guid id) =>
        _importAndStatus.GetRecipeStatus(id);

    /// <summary>Deletes a recipe from disk and database.</summary>
    public Task DeleteRecipe(Guid id) =>
        _lifecycle.DeleteRecipe(id);

    /// <summary>Soft-deletes a recipe. Returns the updated recipe with DeletedAt set.</summary>
    public Task<(RecipeDetailResponseDto Recipe, List<string> AssignedDays)> SoftDeleteRecipe(Guid id, Guid deletedBy) =>
        _lifecycle.SoftDeleteRecipe(id, deletedBy);

    /// <summary>Returns all soft-deleted recipes for the Recycle Bin.</summary>
    public Task<List<RecipeTrashItemDto>> GetTrash() =>
        _lifecycle.GetTrash();

    /// <summary>Restores a soft-deleted recipe and re-includes it in all active surfaces.</summary>
    public Task<RecipeDetailResponseDto> RestoreRecipe(Guid id) =>
        _lifecycle.RestoreRecipe(id);

    public static RecipeDto MapToDto(Recipe r) =>
        RecipeMapper.MapToDto(r);

    public static bool CanReimport(Recipe recipe) =>
        RecipeMapper.CanReimport(recipe);

    /// <summary>
    /// Deserializes the ingredients JSON column, tolerating both string arrays
    /// (["flour", "eggs"]) and object arrays ([{"name":"flour",...}]) from legacy data.
    /// </summary>
    public static List<string> DeserializeIngredients(string? json) =>
        RecipeMapper.DeserializeIngredients(json);

    /// <summary>
    /// Adds a single original image to an existing recipe.
    /// Updates both the database and the physical storage, then triggers hero regeneration.
    /// </summary>
    public Task<int> AddOriginalImageAsync(Guid recipeId, IFormFile file) =>
        _media.AddOriginalImageAsync(recipeId, file);

    /// <summary>Triggers the background hero regeneration workflow for a recipe.</summary>
    public Task TriggerHeroRegenerationAsync(Guid recipeId) =>
        _media.TriggerHeroRegenerationAsync(recipeId);
}
