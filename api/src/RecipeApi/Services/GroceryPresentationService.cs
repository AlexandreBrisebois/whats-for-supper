using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Models;
using RecipeApi.Utils;

namespace RecipeApi.Services;

/// <summary>Decorates response copies. Saved demand and immutable outcomes remain undecorated.</summary>
public sealed class GroceryPresentationService(RecipeDbContext db, FoodVocabularyStore vocabulary, IClock clock,
    DeploymentCalendar calendar, ILogger<GroceryPresentationService> logger)
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    public async Task<GroceryMutationResult> DecorateAsync(GroceryMutationResult response, CancellationToken ct = default)
    {
        await using var readConnection = await DatabaseReadConnection.RetainAsync(db, ct);
        var plan = await db.WeeklyPlans.AsNoTracking().SingleOrDefaultAsync(x => x.WeekStartDate == response.WeekStartDate, ct);
        var inputs = await SupperProjectionInputs.ReadWeekAsync(db, response.WeekStartDate, calendar.Capture(clock.UtcNow).Today, ct);
        var recipes = inputs.Select(x => x.Event.Recipe!).DistinctBy(x => x.Id).ToArray();
        var capture = await vocabulary.CapturePresentationAsync(recipes.Select(x => x.FoodMappingEvidence), ct);
        var contents = new Dictionary<Guid, CanonicalRecipeContent>();
        foreach (var recipe in recipes)
        {
            if (CanonicalRecipeContentStore.Read(recipe) is not { } content) continue;
            FoodMappingQualification.Validate(content, recipe.FoodMappingEvidence, capture.Authority, recipe.Id);
            contents.Add(recipe.Id, content);
        }
        var active = capture.Authority.ActiveRef is { } reference
            ? JsonSerializer.Deserialize<FoodVocabularyDocument>(capture.Authority.Find(reference).RawBytes, Json)!
                .Releases.Single(x => x.Revision == reference.Revision).Foods.Where(x => x.Status == "validated").ToDictionary(x => x.Id)
            : new Dictionary<Guid, CurrentRecoveryFood>();
        var evidence = plan is null ? [] : GroceryDemandEvidence.Read(plan, logger);
        var currentRows = plan is null ? [] : GroceryRowState.Rows(plan);
        var fresh = plan is not null && plan.ServingInputVersion == SupperProjectionInputs.WeekVersion(inputs);
        var keys = inputs.SelectMany(x => x.Lines).SelectMany(x => GroceryRecomputeService.CategoryKeys(x.Name)).Distinct().ToArray();
        var categories = await db.IngredientCategories.AsNoTracking().Where(x => keys.Contains(x.NormalizedKey)).ToListAsync(ct);
        var rows = new List<GroceryLineItemDto>();
        foreach (var row in response.Rows)
        {
            var fall = Fallback(row);
            var current = currentRows.SingleOrDefault(x => x.RowId == row.RowId);
            if (!fresh || current is null || current.RowVersion != row.RowVersion || current.DemandIdentity != row.DemandIdentity
                || !evidence.TryGetValue(row.RowId, out var proof) || !proof.HasLineage)
            { rows.Add(row with { Presentation = fall }); continue; }
            var effective = new List<(GroceryDisplayContributor Contributor, string En, string Fr, bool Resolved, string[] AliasKeys)>();
            var valid = true;
            foreach (var contributor in proof.Contributors!)
            {
                var input = inputs.SingleOrDefault(x => x.Event.Id == contributor.OccurrenceId && x.Event.RecipeId == contributor.RecipeId);
                var projected = input?.Lines.SingleOrDefault(x => x.SavedIngredientLineId == contributor.IngredientLineId);
                var line = contents.GetValueOrDefault(contributor.RecipeId)?.IngredientLines.SingleOrDefault(x => x.Id == contributor.IngredientLineId);
                if (line is null || projected?.GroceryPurchaseIdentity != contributor.PurchaseIdentity || line.Shopping.FoodId != row.FoodId)
                { valid = false; break; }
                var recipe = recipes.Single(x => x.Id == contributor.RecipeId);
                var decision = recipe.FoodMappingEvidence is null ? null
                    : JsonSerializer.Deserialize<RecipeFoodMappingEvidence>(recipe.FoodMappingEvidence, Json)!.NameDecisions.Single(x => x.IngredientLineId == line.Id);
                var privateName = decision?.Kind is "explicit_private" or "legacy_ambiguous" or "protected_clear";
                var food = row.FoodId is { } foodId ? active.GetValueOrDefault(foodId) : null;
                var correction = capture.Overrides.SingleOrDefault(rowOverride => rowOverride.FoodId is not null
                    ? rowOverride.FoodId == row.FoodId : row.FoodId is null && rowOverride.FallbackKey == IngredientNormalizer.Normalize(line.Shopping.Name));
                var householdName = correction?.ProtectedFields.Contains("shoppingName") == true;
                var en = !privateName && !householdName ? food?.Labels.En ?? line.Shopping.Name : householdName && !privateName
                    ? string.IsNullOrEmpty(correction!.ShoppingName) ? line.Shopping.Name : correction.ShoppingName : line.Shopping.Name;
                var fr = !privateName && !householdName ? food?.Labels.Fr ?? line.Shopping.Name : en;
                effective.Add((new(contributor.OccurrenceId, contributor.RecipeId, contributor.IngredientLineId),
                    DeclaredPackagePresentation.Append(en, line.Package), DeclaredPackagePresentation.Append(fr, line.Package),
                    !privateName && !householdName && food?.Labels.En is not null && food.Labels.Fr is not null, GroceryRecomputeService.CategoryKeys(line.Shopping.Name)));
            }
            if (!valid) { rows.Add(row with { Presentation = fall }); continue; }
            IReadOnlyList<GroceryDisplayNameVariant> Variants(bool en) => effective.GroupBy(x => en ? x.En : x.Fr, StringComparer.Ordinal)
                .Select(group => new GroceryDisplayNameVariant(group.Key, group.Select(x => x.Contributor).ToArray())).ToArray();
            var enVariants = Variants(true); var frVariants = Variants(false);
            var choices = categories.Where(x => effective.Any(item => item.AliasKeys.Contains(x.NormalizedKey, StringComparer.Ordinal)))
                .OrderBy(x => x.NormalizedKey, StringComparer.Ordinal)
                .Select(x => new GroceryCategoryChoice(x.NormalizedKey, x.GrocerySection, x.Source)).ToArray();
            var conflict = row.FoodId is not null && choices.Where(x => x.Source == "manual").Select(x => x.GrocerySection).Distinct().Count() > 1;
            var overrideCategory = capture.Overrides.SingleOrDefault(rowOverride => rowOverride.FoodId is not null
                ? rowOverride.FoodId == row.FoodId : row.FoodId is null && rowOverride.FallbackKey == row.NormalizedKey);
            if (overrideCategory?.ProtectedFields.Contains("grocerySection") == true) conflict = false;
            var presentation = new GroceryPresentationDto(new(string.Join(" / ", enVariants.Select(x => x.Text)), string.Join(" / ", frVariants.Select(x => x.Text))),
                enVariants.Count > 1 || frVariants.Count > 1 ? "conflict" : effective.All(x => x.Resolved) ? "resolved" : "fallback",
                new(enVariants, frVariants), row.FoodId is null ? "fallback" : "food", conflict ? "conflict" : "resolved", overrideCategory?.Revision, choices);
            rows.Add(row with
            {
                Presentation = presentation,
                Section = overrideCategory?.ProtectedFields.Contains("grocerySection") == true ? overrideCategory.GrocerySection ?? "Grocery" : row.Section
            });
        }
        return response with { Rows = rows, PresentationVersion = capture.Version, PresentationEpoch = capture.Epoch };
    }

    private static GroceryPresentationDto Fallback(GroceryLineItemDto row) => GroceryPresentationDto.Fallback(row);
}
