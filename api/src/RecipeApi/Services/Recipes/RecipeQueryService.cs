using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Models;

namespace RecipeApi.Services.Recipes;

public sealed class RecipeQueryService(
    IClock clock,
    HistoricalInterestService historicalInterest,
    RecipeDbContext db,
    GoToService goToService)
{
    /// <summary>Returns a paginated list of recipes, newest first (default) or oldest-cooked first (order=explore).</summary>
    public async Task<RecipeListResponseDto> GetRecipesList(
        int page,
        int limit,
        string? order = null,
        bool? discoverableOnly = null,
        Guid? id = null,
        string? name = null,
        string? url = null,
        string? historyGeneration = null,
        bool? gotoOnly = null)
    {
        page = Math.Max(1, page);
        limit = Math.Clamp(limit, 1, 100);

        var query = db.Recipes.Where(r =>
            r.DeletedAt == null &&
            r.IsReady);

        if (id.HasValue)
        {
            query = query.Where(r => r.Id == id.Value);
        }
        if (!string.IsNullOrWhiteSpace(name))
        {
            query = query.Where(r => r.Name != null && r.Name.ToLower() == name.Trim().ToLower());
        }
        if (!string.IsNullOrWhiteSpace(url))
        {
            query = query.Where(r => r.SourceUrl != null && r.SourceUrl.ToLower() == url.Trim().ToLower());
        }

        if (discoverableOnly == true)
        {
            query = query.Where(r => r.IsDiscoverable);
        }

        if (gotoOnly == true)
        {
            var recipeIds = await goToService.GetConfiguredRecipeIdsAsync();
            query = query.Where(recipe => recipeIds.Contains(recipe.Id));
        }

        var total = await query.CountAsync();

        HistoricalInterestSnapshot? history = null;
        await using var rankingBoundary = order == "explore" ? await VotingBoundary.BeginAsync(db) : null;
        if (order == "explore")
        {
            history = await historicalInterest.CaptureAsync();
            if ((page > 1 && historyGeneration is null) ||
                (historyGeneration is not null && historyGeneration != history.Generation))
                throw new RecipeSearchContinuationExpiredException();
            query = query.OrderBy(r => r.LastCookedDate == null ? 0 : 1)
                         .ThenBy(r => r.LastCookedDate)
                         .ThenByDescending(history.OrderKey<Recipe>())
                         .ThenByDescending(r => r.CreatedAt)
                         .ThenBy(r => r.Id);
        }
        else
        {
            query = query.OrderByDescending(r => r.CreatedAt);
        }

        var entities = await query
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToListAsync();

        var recipes = entities.Select(RecipeMapper.MapToDto).ToList();

        return new RecipeListResponseDto
        {
            HistoryGeneration = history?.Generation,
            UpdatedAt = clock.UtcNow,
            Recipes = recipes,
            Pagination = new PaginationDto
            {
                Page = page,
                Limit = limit,
                Total = total
            }
        };
    }

    /// <summary>
    /// Returns a lightweight summary of the recipe library:
    /// total count, never-cooked count, and per-rating counts.
    /// All counts exclude soft-deleted recipes.
    /// </summary>
    public async Task<RecipeLibrarySummaryDto> GetLibrarySummary()
    {
        var recipes = await db.Recipes
            .Where(r => r.DeletedAt == null && r.IsReady)
            .GroupBy(_ => 1)
            .Select(g => new RecipeLibrarySummaryDto
            {
                Total = g.Count(),
                NeverCooked = g.Count(r => r.LastCookedDate == null),
                Ratings = new RecipeLibraryRatingsDto
                {
                    Love = g.Count(r => r.Rating == RecipeRating.Love),
                    Like = g.Count(r => r.Rating == RecipeRating.Like),
                    Dislike = g.Count(r => r.Rating == RecipeRating.Dislike),
                    Unrated = g.Count(r => r.Rating == RecipeRating.Unknown),
                }
            })
            .FirstOrDefaultAsync();

        // If no recipes exist, return zeroed-out summary
        return recipes ?? new RecipeLibrarySummaryDto
        {
            Total = 0,
            NeverCooked = 0,
            Ratings = new RecipeLibraryRatingsDto()
        };
    }

    /// <summary>Returns the full detail for a single recipe.</summary>
    public async Task<RecipeDetailResponseDto> GetRecipeDetail(Guid id)
    {
        var recipe = await db.Recipes.FindAsync(id)
            ?? throw new KeyNotFoundException($"Recipe {id} not found.");

        return new RecipeDetailResponseDto
        {
            UpdatedAt = clock.UtcNow,
            Recipe = await RecipeMapper.MapDetailDtoAsync(db, recipe)
        };
    }
}
