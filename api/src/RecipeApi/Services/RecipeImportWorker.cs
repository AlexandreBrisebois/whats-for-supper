using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Services.Agents;

namespace RecipeApi.Services;

public class RecipeImportWorker(
    IServiceScopeFactory scopeFactory,
    IConfiguration configuration,
    ILogger<RecipeImportWorker> logger) : BackgroundService
{
    private string RecipesRoot =>
        Environment.GetEnvironmentVariable("RECIPES_ROOT")
        ?? configuration["RecipesRoot"]
        ?? "/data/recipes";

    private readonly TimeSpan _pollingInterval = TimeSpan.FromSeconds(10);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("RecipeImportWorker is starting.");

        using var timer = new PeriodicTimer(_pollingInterval);

        while (!stoppingToken.IsCancellationRequested && await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                await ProcessPendingImports(stoppingToken);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error occurred while processing recipe imports.");
            }
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
                await SyncDiskToDb(import.RecipeId, db, stoppingToken);

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

    private async Task SyncDiskToDb(Guid recipeId, RecipeDbContext db, CancellationToken stoppingToken)
    {
        var recipeJsonPath = Path.Combine(RecipesRoot, recipeId.ToString(), "recipe.json");
        if (!File.Exists(recipeJsonPath))
        {
            throw new FileNotFoundException($"Recipe JSON not found for sync: {recipeJsonPath}");
        }

        var recipeJsonContent = await File.ReadAllTextAsync(recipeJsonPath, stoppingToken);

        // Deserializing to extract specific parts (like ingredients)
        var recipeData = JsonSerializer.Deserialize<SchemaOrgRecipe>(recipeJsonContent, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        if (recipeData == null)
        {
            throw new InvalidOperationException($"Failed to deserialize recipe JSON for recipe {recipeId}.");
        }

        var recipe = await db.Recipes.FirstOrDefaultAsync(r => r.Id == recipeId, stoppingToken);
        if (recipe == null)
        {
            throw new KeyNotFoundException($"Recipe {recipeId} not found in database during sync.");
        }

        // Update database record
        recipe.RawMetadata = recipeJsonContent;
        recipe.Ingredients = JsonSerializer.Serialize(recipeData.RecipeIngredient ?? new List<string>());
        recipe.UpdatedAt = DateTimeOffset.UtcNow;

        await db.SaveChangesAsync(stoppingToken);
        logger.LogInformation("Synchronized Phase 1 results to database for recipe {RecipeId}.", recipeId);
    }
}
