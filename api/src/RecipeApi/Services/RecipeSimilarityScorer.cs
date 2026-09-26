namespace RecipeApi.Services;

public sealed record RecipeSimilarityInput(
    string? Ingredients,
    string? Category,
    string? CuisineType,
    IReadOnlyCollection<string>? MealTypes,
    bool? IsVegetarian,
    string? TotalTime);

public sealed record RecipeSimilarityScore(
    double Total,
    double Semantic,
    double Ingredients,
    double Cuisine,
    double Category,
    double MealTypes,
    double VegetarianCompatibility,
    double PreparationTime);

public sealed record RecipeSimilarityWeights(
    double Semantic,
    double Ingredients,
    double Cuisine,
    double Category,
    double MealTypes,
    double VegetarianCompatibility,
    double PreparationTime)
{
    public static RecipeSimilarityWeights Default { get; } = new(0.40d, 0.25d, 0.10d, 0.10d, 0.05d, 0.05d, 0.05d);
}

/// <summary>Pure, deterministic structural scoring for recipe-to-recipe search candidates.</summary>
public sealed class RecipeSimilarityScorer(RecipeSimilarityWeights? weights = null)
{
    private readonly RecipeSimilarityWeights weights = ValidateWeights(weights ?? RecipeSimilarityWeights.Default);

    public RecipeSimilarityScore Score(RecipeSimilarityInput source, RecipeSimilarityInput candidate, double rawSemanticCosine)
    {
        ArgumentNullException.ThrowIfNull(source);
        ArgumentNullException.ThrowIfNull(candidate);

        var semantic = NormalizeSemanticScore(rawSemanticCosine);
        var ingredients = Jaccard(ReadIngredientSet(source.Ingredients), ReadIngredientSet(candidate.Ingredients));
        var cuisine = EqualKnown(source.CuisineType, candidate.CuisineType);
        var category = EqualKnown(source.Category, candidate.Category);
        var mealTypes = Jaccard(NormalizeSet(source.MealTypes), NormalizeSet(candidate.MealTypes));
        var vegetarianCompatibility = source.IsVegetarian is bool sourceVegetarian
            && candidate.IsVegetarian is bool candidateVegetarian
            && sourceVegetarian == candidateVegetarian ? 1d : 0d;
        var preparationTime = PreparationTimeSimilarity(source.TotalTime, candidate.TotalTime);
        var total = semantic * weights.Semantic
            + ingredients * weights.Ingredients
            + cuisine * weights.Cuisine
            + category * weights.Category
            + mealTypes * weights.MealTypes
            + vegetarianCompatibility * weights.VegetarianCompatibility
            + preparationTime * weights.PreparationTime;

        return new RecipeSimilarityScore(total, semantic, ingredients, cuisine, category, mealTypes, vegetarianCompatibility, preparationTime);
    }

    private static double NormalizeSemanticScore(double rawSemanticCosine) =>
        double.IsNaN(rawSemanticCosine) ? 0d : Math.Clamp((rawSemanticCosine + 1d) / 2d, 0d, 1d);

    private static HashSet<string> ReadIngredientSet(string? ingredients) =>
        RecipeSearchDocumentBuilder.ReadIngredients(ingredients)
            .Select(RecipeSearchDocumentBuilder.Normalize)
            .Where(value => value is not null)
            .Cast<string>()
            .ToHashSet(StringComparer.Ordinal);

    private static HashSet<string> NormalizeSet(IEnumerable<string>? values) =>
        (values ?? [])
            .Select(RecipeSearchDocumentBuilder.Normalize)
            .Where(value => value is not null)
            .Cast<string>()
            .ToHashSet(StringComparer.Ordinal);

    private static double EqualKnown(string? source, string? candidate)
    {
        var normalizedSource = RecipeSearchDocumentBuilder.Normalize(source);
        var normalizedCandidate = RecipeSearchDocumentBuilder.Normalize(candidate);
        return normalizedSource is not null && normalizedSource == normalizedCandidate ? 1d : 0d;
    }

    private static double Jaccard(IReadOnlySet<string> source, IReadOnlySet<string> candidate)
    {
        if (source.Count == 0 || candidate.Count == 0) return 0d;
        var intersection = source.Count(candidate.Contains);
        return intersection / (double)(source.Count + candidate.Count - intersection);
    }

    private static double PreparationTimeSimilarity(string? source, string? candidate)
    {
        var sourceMinutes = RecipeSearchDocumentBuilder.ParseTotalMinutes(source);
        var candidateMinutes = RecipeSearchDocumentBuilder.ParseTotalMinutes(candidate);
        if (sourceMinutes is null || candidateMinutes is null) return 0d;

        var difference = Math.Abs(sourceMinutes.Value - candidateMinutes.Value);
        return difference switch
        {
            <= 10 => 1d,
            <= 20 => 0.7d,
            <= 30 => 0.4d,
            _ => 0d
        };
    }

    private static RecipeSimilarityWeights ValidateWeights(RecipeSimilarityWeights weights)
    {
        var values = new[]
        {
            weights.Semantic, weights.Ingredients, weights.Cuisine, weights.Category,
            weights.MealTypes, weights.VegetarianCompatibility, weights.PreparationTime
        };
        if (values.Any(value => double.IsNaN(value) || value is < 0d or > 1d)
            || Math.Abs(values.Sum() - 1d) > 0.0000001d)
            throw new ArgumentOutOfRangeException(nameof(weights), "Similarity weights must be within [0, 1] and total 1.");

        return weights;
    }
}
