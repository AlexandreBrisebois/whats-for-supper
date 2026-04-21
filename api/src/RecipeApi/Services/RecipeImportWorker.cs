using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services.Agents;

namespace RecipeApi.Services;

public class RecipeImportWorker(
    IServiceScopeFactory scopeFactory,
    RecipesRootResolver recipesRoot,
    ILogger<RecipeImportWorker> logger) : BackgroundService
{
    // 30-second poll: long enough not to hammer the DB, tight enough to feel responsive.
    private readonly TimeSpan _pollingInterval = TimeSpan.FromSeconds(30);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("RecipeImportWorker is starting. Poll interval: {Interval}s.", _pollingInterval.TotalSeconds);

        using var timer = new PeriodicTimer(_pollingInterval);

        // ProcessPendingImports has its own per-import try/catch and handles all errors internally.
        // We let OperationCanceledException propagate naturally to stop the timer loop on shutdown.
        while (!stoppingToken.IsCancellationRequested && await timer.WaitForNextTickAsync(stoppingToken))
        {
            await ProcessPendingImports(stoppingToken);
        }

        logger.LogInformation("RecipeImportWorker is stopping.");
    }

    private async Task ProcessPendingImports(CancellationToken stoppingToken)
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var extractionAgent = scope.ServiceProvider.GetRequiredService<RecipeExtractionAgent>();
        var heroAgent = scope.ServiceProvider.GetRequiredService<RecipeHeroAgent>();

        var pendingImports = await db.RecipeImports
            .Where(ri => ri.Status == RecipeImportStatus.Pending)
            .ToListAsync(stoppingToken);

        if (pendingImports.Count == 0)
        {
            return;
        }

        logger.LogInformation("Found {Count} pending recipe imports.", pendingImports.Count);

        foreach (var import in pendingImports)
        {
            if (stoppingToken.IsCancellationRequested) break;

            try
            {
                // Mark as Processing
                import.Status = RecipeImportStatus.Processing;
                import.UpdatedAt = DateTimeOffset.UtcNow;
                await db.SaveChangesAsync(stoppingToken);

                logger.LogInformation("Processing recipe import {ImportId} for recipe {RecipeId}.", import.Id, import.RecipeId);

                // Run Agents
                await extractionAgent.ExtractRecipe(import.RecipeId);
                await heroAgent.CreateHeroImageAsync(import.RecipeId);

                // Phase 2 Sync: Sync from Disk to DB
                await SyncDiskToDb(import.RecipeId, db, scope, stoppingToken);

                // Cleanup: Delete the import record on success
                db.RecipeImports.Remove(import);
                await db.SaveChangesAsync(stoppingToken);

                logger.LogInformation("Successfully processed recipe import {ImportId}.", import.Id);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to process recipe import {ImportId}.", import.Id);

                // Update status to Failed
                import.Status = RecipeImportStatus.Failed;
                import.ErrorMessage = ex.Message;
                import.UpdatedAt = DateTimeOffset.UtcNow;

                try
                {
                    await db.SaveChangesAsync(stoppingToken);
                }
                catch (Exception saveEx)
                {
                    logger.LogError(saveEx, "Failed to save failure status for import {ImportId}.", import.Id);
                }
            }
        }
    }

    private async Task SyncDiskToDb(Guid recipeId, RecipeDbContext db, IServiceScope scope, CancellationToken stoppingToken)
    {
        var recipeJsonPath = Path.Combine(recipesRoot.Root, recipeId.ToString(), "recipe.json");
        if (!File.Exists(recipeJsonPath))
        {
            throw new FileNotFoundException($"Recipe JSON not found for sync: {recipeJsonPath}");
        }

        var recipeJsonContent = await File.ReadAllTextAsync(recipeJsonPath, stoppingToken);

        using var doc = JsonDocument.Parse(recipeJsonContent);
        var root = doc.RootElement;

        var recipe = await db.Recipes.FirstOrDefaultAsync(r => r.Id == recipeId, stoppingToken);
        if (recipe == null)
        {
            throw new KeyNotFoundException($"Recipe {recipeId} not found in database during sync.");
        }

        // Update database record
        recipe.RawMetadata = recipeJsonContent;

        // Try to get ingredients from multiple possible locations (Schema.org vs legacy)
        if (root.TryGetProperty("recipeIngredient", out var ingProp) && ingProp.ValueKind == JsonValueKind.Array)
        {
            recipe.Ingredients = ingProp.GetRawText();
        }
        else if (root.TryGetProperty("ingredients", out var legacyIngProp) && legacyIngProp.ValueKind == JsonValueKind.Array)
        {
            recipe.Ingredients = legacyIngProp.GetRawText();
        }
        else
        {
            recipe.Ingredients = "[]";
        }

        // We still deserialize to SchemaOrgRecipe to use for Difficulty inference, but we fall back gracefully
        var recipeData = JsonSerializer.Deserialize<SchemaOrgRecipe>(recipeJsonContent, JsonDefaults.CaseInsensitive) ?? new();

        // Synchronize from recipe.json (AI metadata)
        if (!string.IsNullOrWhiteSpace(recipeData.Name))
        {
            recipe.Name = recipeData.Name;
        }
        if (!string.IsNullOrWhiteSpace(recipeData.TotalTime))
        {
            recipe.TotalTime = recipeData.TotalTime;
        }

        // Synchronize from recipe.info (Manual edits or AI-generated description) if present
        var recipeInfoPath = Path.Combine(recipesRoot.Root, recipeId.ToString(), "recipe.info");
        if (File.Exists(recipeInfoPath))
        {
            try
            {
                var recipeInfoJson = await File.ReadAllTextAsync(recipeInfoPath, stoppingToken);
                var recipeInfo = JsonSerializer.Deserialize<RecipeInfo>(recipeInfoJson, JsonDefaults.CamelCase);

                if (!string.IsNullOrWhiteSpace(recipeInfo?.Description))
                {
                    recipe.Description = recipeInfo.Description;
                }

                // Name in recipe.info takes precedence if present
                if (!string.IsNullOrWhiteSpace(recipeInfo?.Name))
                {
                    recipe.Name = recipeInfo.Name;
                }
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Failed to read recipe.info during sync for recipe {RecipeId}. Metadata sync from info file skipped.", recipeId);
            }
        }

        var discoveryService = scope.ServiceProvider.GetRequiredService<DiscoveryService>();
        recipe.Difficulty = discoveryService.InferDifficulty(recipeData);

        recipe.UpdatedAt = DateTimeOffset.UtcNow;

        await db.SaveChangesAsync(stoppingToken);
        logger.LogInformation("Synchronized Phase 1 results to database for recipe {RecipeId}.", recipeId);
    }
}
