using Microsoft.EntityFrameworkCore;
using Npgsql;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Models;

namespace RecipeApi.Services;

/// <summary>Shared eligible-recipe and existing public hard-filter predicates for both retrieval paths.</summary>
internal static class RecipeSearchPredicate
{
    public static IQueryable<Recipe> Apply(IQueryable<Recipe> query, RecipeSearchFiltersDto filters, RecipeDbContext db)
    {
        if (filters.NewRecipes == true)
            query = query.Where(recipe => recipe.CreatedAt >= DateTimeOffset.UtcNow.AddDays(-30));
        if (filters.NeverCooked == true)
            query = query.Where(recipe => recipe.LastCookedDate == null);
        if (filters.FamilyFavorite == true)
            query = query.Where(recipe => (int)recipe.Rating >= 2 && (recipe.IsDiscoverable || recipe.Notes != null));
        if (filters.NotCookedInLongTime == true)
            query = query.Where(recipe => recipe.LastCookedDate != null);
        if (filters.DiscoverableOnly == true)
            query = query.Where(recipe => recipe.IsDiscoverable);
        if (filters.HealthyOnly == true)
            query = query.Where(recipe => recipe.IsHealthyChoice);
        if (filters.ReadyToReviewOnly == true)
            query = query.Where(recipe => db.RecipeImportReports.Any(report => report.RecipeId == recipe.Id && report.Status == RecipeImportReportStatus.ReadyToReview));
        else if (filters.ReportedOnly == true)
            query = query.Where(recipe => db.RecipeImportReports.Any(report => report.RecipeId == recipe.Id));

        return query;
    }

    public static string BuildSql(RecipeSearchFiltersDto filters, List<NpgsqlParameter> parameters)
    {
        var predicates = new List<string>();
        if (filters.NewRecipes == true)
        {
            parameters.Add(new NpgsqlParameter("newerThan", DateTimeOffset.UtcNow.AddDays(-30)));
            predicates.Add("r.created_at >= @newerThan");
        }
        if (filters.NeverCooked == true) predicates.Add("r.last_cooked_date IS NULL");
        if (filters.FamilyFavorite == true) predicates.Add("r.rating >= 2 AND (r.is_discoverable = TRUE OR r.notes IS NOT NULL)");
        if (filters.QuickOnly == true) predicates.Add("NULLIF(d.search_metadata ->> 'totalTimeMinutes', '')::integer <= 30");
        if (filters.NotCookedInLongTime == true) predicates.Add("r.last_cooked_date IS NOT NULL");
        if (filters.DiscoverableOnly == true) predicates.Add("r.is_discoverable = TRUE");
        if (filters.HealthyOnly == true) predicates.Add("r.is_healthy_choice = TRUE");
        if (filters.ReadyToReviewOnly == true)
            predicates.Add("EXISTS (SELECT 1 FROM recipe_import_reports report WHERE report.recipe_id = r.id AND report.status = 'ready_to_review')");
        else if (filters.ReportedOnly == true)
            predicates.Add("EXISTS (SELECT 1 FROM recipe_import_reports report WHERE report.recipe_id = r.id)");

        return predicates.Count == 0 ? string.Empty : "\n  AND " + string.Join("\n  AND ", predicates);
    }
}
