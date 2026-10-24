using System.Security.Cryptography;
using System.Text;

namespace RecipeApi.Tests.Integration.Fixtures;

/// <summary>
/// Versioned, synthetic relevance judgments for offline search evaluation.
/// This fixture contains no household or production data and has no runtime dependencies.
/// </summary>
public sealed record RecipeSearchEvaluationFixture(
    string Version,
    string CorpusIdentity,
    string QuerySetIdentity,
    string ConfigurationIdentity,
    string RandomSeedIdentity,
    IReadOnlyList<EvaluationRecipe> Corpus,
    IReadOnlyList<RecipeSearchEvaluationCase> Queries)
{
    public static RecipeSearchEvaluationFixture Load() => new(
        Version: "2026.10.23.1",
        CorpusIdentity: "wfs-synthetic-recipes-v1",
        QuerySetIdentity: "wfs-search-judgments-v1",
        ConfigurationIdentity: "strict-search-metrics-v1",
        RandomSeedIdentity: "seed-20261023",
        Corpus: CreateCorpus(),
        Queries: CreateQueries());

    private static IReadOnlyList<EvaluationRecipe> CreateCorpus() =>
    [
        new(RecipeId(1, 1), "Garden Salmon Supper", "en"),
        new(RecipeId(1, 2), "Souper de saumon du jardin", "fr"),
        new(RecipeId(2, 1), "Lemon Chicken and Rice", "en"),
        new(RecipeId(2, 2), "Poulet citronné et riz", "fr"),
        new(RecipeId(3, 1), "Cold Evening Beef Stew", "en"),
        new(RecipeId(3, 2), "Ragoût de bœuf réconfortant", "fr"),
        new(RecipeId(4, 1), "Quick Tomato Pasta", "en"),
        new(RecipeId(4, 2), "Pâtes rapides à la tomate", "fr"),
        new(RecipeId(5, 1), "Oven Turmeric Rice", "en"),
        new(RecipeId(5, 2), "Riz au four au curcuma", "fr"),
        new(RecipeId(6, 1), "Herb Chicken Bowl", "en"),
        new(RecipeId(6, 2), "Bol de poulet aux herbes", "fr"),
        new(RecipeId(7, 1), "Tomato Fish Pasta", "en"),
        new(RecipeId(7, 2), "Pâtes au poisson et à la tomate", "fr")
    ];

    private static IReadOnlyList<RecipeSearchEvaluationCase> CreateQueries()
    {
        var development = new[]
        {
            Seed("dev-01", "salmon", "en", ["english", "short", "ingredient"], 1),
            Seed("dev-02", "saumon", "fr", ["french", "short", "ingredient", "cross-language"], 1),
            Seed("dev-03", "lemon chicken", "en", ["english", "dish"], 2),
            Seed("dev-04", "poulet au citron", "fr", ["french", "dish", "cross-language"], 2),
            Seed("dev-05", "something hearty for a cold evening", "en", ["english", "natural-language", "ambiguous"], 3),
            Seed("dev-06", "quelque chose de réconfortant pour une soirée froide", "fr", ["french", "natural-language", "ambiguous", "cross-language"], 3),
            Seed("dev-07", "quick tomato pasta", "en", ["english", "dish"], 4),
            Seed("dev-08", "pâtes rapides à la tomate", "fr", ["french", "dish", "cross-language"], 4),
            Seed("dev-09", "beef stew", "en", ["english", "dish"], 3),
            Seed("dev-10", "ragoût de bœuf", "fr", ["french", "dish", "cross-language"], 3),
            Seed("dev-11", "rice", "en", ["english", "short", "ingredient", "ambiguous"], 5),
            Seed("dev-12", "riz", "fr", ["french", "short", "ingredient", "ambiguous"], 5),
            Seed("dev-13", "vegetables and fish", "en", ["english", "natural-language", "ingredient"], 1),
            Seed("dev-14", "poisson avec légumes", "fr", ["french", "natural-language", "ingredient", "cross-language"], 1),
            Seed("dev-15", "chicken with rice", "en", ["english", "natural-language", "ingredient"], 2),
            Seed("dev-16", "poulet avec riz", "fr", ["french", "natural-language", "ingredient"], 2),
            Seed("dev-17", "Mediterranean supper", "en", ["english", "natural-language", "ambiguous"], 1),
            Seed("dev-18", "souper méditerranéen", "fr", ["french", "natural-language", "ambiguous", "cross-language"], 1),
            Seed("dev-19", "tomato", "en", ["english", "short", "ingredient", "hard-negative"], 4, hardNegative: true),
            Seed("dev-20", "tomate", "fr", ["french", "short", "ingredient", "hard-negative"], 4, hardNegative: true),
            Seed("dev-21", "fish but not pasta", "en", ["english", "natural-language", "negated", "hard-negative"], 1, hardNegative: true),
            Seed("dev-22", "poisson sans pâtes", "fr", ["french", "natural-language", "negated", "hard-negative", "cross-language"], 1, hardNegative: true),
            Seed("dev-23", "chicken without lemon", "en", ["english", "natural-language", "negated", "hard-negative"], 6, hardNegative: true),
            Seed("dev-24", "poulet sans citron", "fr", ["french", "natural-language", "negated", "hard-negative"], 6, hardNegative: true),
            Seed("dev-25", "a quick main dish", "en", ["english", "natural-language", "ambiguous"], 4),
            Seed("dev-26", "un plat principal rapide", "fr", ["french", "natural-language", "ambiguous"], 4),
            Seed("dev-27", "turmeric rice", "en", ["english", "dish", "cross-language"], 5),
            Seed("dev-28", "riz au curcuma", "fr", ["french", "dish"], 5),
            Seed("dev-29", "zucchini", "en", ["english", "short", "ingredient", "cross-language"], 1),
            Seed("dev-30", "courgette", "fr", ["french", "short", "ingredient"], 1),
            Seed("dev-31", "dragonfruit casserole", "en", ["english", "natural-language", "no-match"], null),
            Seed("dev-32", "casserole au fruit du dragon", "fr", ["french", "natural-language", "no-match"], null),
            Seed("dev-33", "moon cheese soup", "en", ["english", "natural-language", "no-match"], null),
            Seed("dev-34", "soupe au fromage lunaire", "fr", ["french", "natural-language", "no-match"], null),
            Seed("dev-35", "stew", "en", ["english", "short", "dish", "hard-negative"], 3, hardNegative: true),
            Seed("dev-36", "ragoût", "fr", ["french", "short", "dish", "hard-negative"], 3, hardNegative: true),
            Seed("dev-37", "light fish dinner", "en", ["english", "natural-language", "dish"], 1),
            Seed("dev-38", "souper léger au poisson", "fr", ["french", "natural-language", "dish", "cross-language"], 1),
            Seed("dev-39", "pasta not fish", "en", ["english", "short", "negated", "hard-negative"], 4, hardNegative: true),
            Seed("dev-40", "pâtes sans poisson", "fr", ["french", "short", "negated", "hard-negative"], 4, hardNegative: true)
        };

        var heldOut = new[]
        {
            Seed("held-01", "fresh salmon supper", "en", ["english", "natural-language", "dish"], 1),
            Seed("held-02", "souper au saumon frais", "fr", ["french", "natural-language", "dish", "cross-language"], 1),
            Seed("held-03", "citrus poultry", "en", ["english", "short", "ambiguous", "cross-language"], 2),
            Seed("held-04", "volaille aux agrumes", "fr", ["french", "natural-language", "ambiguous"], 2),
            Seed("held-05", "carrot and potato dinner", "en", ["english", "natural-language", "ingredient"], 3),
            Seed("held-06", "souper carotte et pomme de terre", "fr", ["french", "natural-language", "ingredient", "cross-language"], 3),
            Seed("held-07", "tomato noodles", "en", ["english", "short", "dish"], 4),
            Seed("held-08", "nouilles à la tomate", "fr", ["french", "dish", "cross-language"], 4),
            Seed("held-09", "oven rice", "en", ["english", "short", "dish", "cross-language"], 5),
            Seed("held-10", "riz au four", "fr", ["french", "short", "dish"], 5),
            Seed("held-11", "beef but not rice", "en", ["english", "natural-language", "negated", "hard-negative"], 3, hardNegative: true),
            Seed("held-12", "bœuf sans riz", "fr", ["french", "short", "negated", "hard-negative"], 3, hardNegative: true),
            Seed("held-13", "tomato but no pasta", "en", ["english", "natural-language", "negated", "hard-negative"], 7, hardNegative: true),
            Seed("held-14", "tomate sans pâtes", "fr", ["french", "short", "negated", "hard-negative"], 7, hardNegative: true),
            Seed("held-15", "comfort food", "en", ["english", "short", "ambiguous"], 3),
            Seed("held-16", "plat réconfortant", "fr", ["french", "short", "ambiguous", "cross-language"], 3),
            Seed("held-17", "pineapple glacier pie", "en", ["english", "natural-language", "no-match"], null),
            Seed("held-18", "tarte glacière à l'ananas", "fr", ["french", "natural-language", "no-match"], null),
            Seed("held-19", "cocoa lobster noodles", "en", ["english", "natural-language", "no-match"], null),
            Seed("held-20", "nouilles au homard et cacao", "fr", ["french", "natural-language", "no-match"], null)
        };

        return development.Select(seed => ToCase(seed, EvaluationSplit.Development))
            .Concat(heldOut.Select(seed => ToCase(seed, EvaluationSplit.HeldOut)))
            .ToArray();
    }

    private static RecipeSearchEvaluationCase ToCase(QuerySeed seed, EvaluationSplit split)
    {
        if (seed.RelevantGroup is null)
            return new(seed.Id, split, seed.Query, seed.Language, seed.Slices, new Dictionary<Guid, int>(), []);

        var primary = RecipeId(seed.RelevantGroup.Value, 1);
        var secondary = RecipeId(seed.RelevantGroup.Value, 2);
        var grades = new Dictionary<Guid, int> { [primary] = 2, [secondary] = 1 };
        IReadOnlyList<NamedHardNegative> hardNegatives = [];
        if (seed.HardNegative)
        {
            var hardNegative = RecipeId(seed.RelevantGroup.Value == 7 ? 4 : 7, 1);
            grades[hardNegative] = 0;
            hardNegatives = [new(hardNegative, $"synthetic-confounder-{seed.Id}")];
        }

        return new(seed.Id, split, seed.Query, seed.Language, seed.Slices, grades, hardNegatives);
    }

    private static Guid RecipeId(int group, int variant) =>
        Guid.Parse($"00000000-0000-0000-{group:D4}-{variant:D12}");

    private static QuerySeed Seed(
        string id,
        string query,
        string language,
        string[] slices,
        int? relevantGroup,
        bool hardNegative = false) =>
        new(id, query, language, slices, relevantGroup, hardNegative);

    private sealed record QuerySeed(
        string Id,
        string Query,
        string Language,
        IReadOnlyList<string> Slices,
        int? RelevantGroup,
        bool HardNegative);
}

public enum EvaluationSplit
{
    Development,
    HeldOut
}

public sealed record EvaluationRecipe(Guid Id, string Name, string Language);

public sealed record NamedHardNegative(Guid RecipeId, string Name);

public sealed record RecipeSearchEvaluationCase(
    string Id,
    EvaluationSplit Split,
    string Query,
    string Language,
    IReadOnlyList<string> Slices,
    IReadOnlyDictionary<Guid, int> Grades,
    IReadOnlyList<NamedHardNegative> HardNegatives);

public sealed record EvaluationArmResult(
    string QueryId,
    IReadOnlyList<Guid> CandidateRecipeIds,
    Guid? TopPickRecipeId,
    IReadOnlyList<Guid> AlternativeRecipeIds);

public sealed record RecipeSearchEvaluationConfiguration(
    int FusedWindow,
    int PrecisionCutoff,
    int NdcgCutoff,
    string Identity);

public sealed record RecipeSearchEvaluationMetrics(
    double CandidateRecallAtFusedWindow,
    double PrecisionAt5,
    double NdcgAt10,
    double IrrelevantResultRate,
    double NoMatchFalsePositiveRate,
    double HardNegativeAdmissionRate);

public sealed record RecipeSearchQueryEvaluation(
    string QueryId,
    EvaluationSplit Split,
    IReadOnlyList<Guid> RankedRecipeIds,
    RecipeSearchEvaluationMetrics Metrics);

public sealed record RecipeSearchEvaluationManifest(
    string FixtureVersion,
    string CorpusIdentity,
    string ConfigurationIdentity,
    string QuerySetIdentity,
    string RandomSeedIdentity,
    IReadOnlyList<EvaluationSplit> Splits,
    string MetricsIdentity);

public sealed record RecipeSearchEvaluationReport(
    RecipeSearchEvaluationManifest Manifest,
    IReadOnlyList<RecipeSearchQueryEvaluation> Queries,
    RecipeSearchEvaluationMetrics Macro,
    IReadOnlyDictionary<string, RecipeSearchEvaluationMetrics> Slices);

/// <summary>A side-effect-free scorer over precomputed ranked recipe identities.</summary>
public static class RecipeSearchEvaluationScorer
{
    public static RecipeSearchEvaluationReport Score(
        RecipeSearchEvaluationFixture fixture,
        IReadOnlyList<EvaluationArmResult> results,
        RecipeSearchEvaluationConfiguration configuration,
        EvaluationSplit? split = null)
    {
        var cases = split is null
            ? fixture.Queries
            : fixture.Queries.Where(item => item.Split == split).ToArray();
        return Score(
            cases,
            results,
            configuration,
            fixture.Version,
            fixture.CorpusIdentity,
            fixture.QuerySetIdentity,
            fixture.RandomSeedIdentity);
    }

    public static RecipeSearchEvaluationReport Score(
        IReadOnlyList<RecipeSearchEvaluationCase> cases,
        IReadOnlyList<EvaluationArmResult> results,
        RecipeSearchEvaluationConfiguration configuration) =>
        Score(
            cases,
            results,
            configuration,
            fixtureVersion: "ad-hoc",
            corpusIdentity: "ad-hoc",
            querySetIdentity: ComputeQuerySetIdentity(cases),
            randomSeedIdentity: "none");

    private static RecipeSearchEvaluationReport Score(
        IReadOnlyList<RecipeSearchEvaluationCase> cases,
        IReadOnlyList<EvaluationArmResult> results,
        RecipeSearchEvaluationConfiguration configuration,
        string fixtureVersion,
        string corpusIdentity,
        string querySetIdentity,
        string randomSeedIdentity)
    {
        ArgumentOutOfRangeException.ThrowIfLessThan(configuration.FusedWindow, 1);
        ArgumentOutOfRangeException.ThrowIfLessThan(configuration.PrecisionCutoff, 1);
        ArgumentOutOfRangeException.ThrowIfLessThan(configuration.NdcgCutoff, 1);

        var duplicateCase = cases.GroupBy(item => item.Id, StringComparer.Ordinal).FirstOrDefault(group => group.Count() > 1);
        if (duplicateCase is not null)
            throw new ArgumentException($"Duplicate evaluation case '{duplicateCase.Key}'.", nameof(cases));

        var resultsByQuery = results.ToDictionary(item => item.QueryId, StringComparer.Ordinal);
        var scored = cases.Select(evaluationCase =>
        {
            resultsByQuery.TryGetValue(evaluationCase.Id, out var result);
            result ??= new EvaluationArmResult(evaluationCase.Id, [], null, []);
            return ScoreQuery(evaluationCase, result, configuration);
        }).ToArray();

        var manifest = new RecipeSearchEvaluationManifest(
            fixtureVersion,
            corpusIdentity,
            configuration.Identity,
            querySetIdentity,
            randomSeedIdentity,
            cases.Select(item => item.Split).Distinct().Order().ToArray(),
            "macro-recall-fused_precision-5_graded-ndcg-10_irrelevant_no-match_hard-negative-v1");

        var slices = cases.SelectMany(item => item.Slices).Distinct(StringComparer.Ordinal).Order(StringComparer.Ordinal)
            .ToDictionary(
                slice => slice,
                slice => Aggregate(scored.Where(query => cases.Single(item => item.Id == query.QueryId).Slices.Contains(slice, StringComparer.Ordinal))),
                StringComparer.Ordinal);

        return new(manifest, scored, Aggregate(scored), slices);
    }

    private static RecipeSearchQueryEvaluation ScoreQuery(
        RecipeSearchEvaluationCase evaluationCase,
        EvaluationArmResult result,
        RecipeSearchEvaluationConfiguration configuration)
    {
        var candidates = result.CandidateRecipeIds.Distinct().Take(configuration.FusedWindow).ToArray();
        var ranked = Rank(result).ToArray();
        var relevant = evaluationCase.Grades.Where(pair => pair.Value > 0).Select(pair => pair.Key).ToHashSet();
        var hardNegatives = evaluationCase.HardNegatives.Select(item => item.RecipeId).ToHashSet();

        var recall = relevant.Count == 0 ? double.NaN : candidates.Count(relevant.Contains) / (double)relevant.Count;
        var precision = ranked.Take(configuration.PrecisionCutoff).Count(relevant.Contains) / (double)configuration.PrecisionCutoff;
        var irrelevant = ranked.Length == 0
            ? 0d
            : ranked.Count(id => !evaluationCase.Grades.TryGetValue(id, out var grade) || grade == 0) / (double)ranked.Length;
        var noMatch = relevant.Count == 0 ? (ranked.Length == 0 ? 0d : 1d) : double.NaN;
        var hardNegative = hardNegatives.Count == 0
            ? double.NaN
            : candidates.Count(hardNegatives.Contains) / (double)hardNegatives.Count;

        return new(
            evaluationCase.Id,
            evaluationCase.Split,
            ranked,
            new(recall, precision, Ndcg(ranked.Take(configuration.NdcgCutoff).ToArray(), evaluationCase.Grades), irrelevant, noMatch, hardNegative));
    }

    private static IReadOnlyList<Guid> Rank(EvaluationArmResult result)
    {
        IEnumerable<Guid> source = result.TopPickRecipeId is { } topPick
            ? new[] { topPick }.Concat(result.AlternativeRecipeIds)
            : result.AlternativeRecipeIds.Count > 0 ? result.AlternativeRecipeIds : result.CandidateRecipeIds;
        return source.Distinct().ToArray();
    }

    private static double Ndcg(IReadOnlyList<Guid> ranked, IReadOnlyDictionary<Guid, int> grades)
    {
        if (ranked.Count == 0) return 0d;
        var rankedGrades = ranked.Select(id => grades.TryGetValue(id, out var grade) ? grade : 0).ToArray();
        var ideal = rankedGrades.OrderDescending().ToArray();
        var idealDcg = Dcg(ideal);
        return idealDcg == 0d ? 0d : Dcg(rankedGrades) / idealDcg;
    }

    private static double Dcg(IReadOnlyList<int> grades) => grades
        .Select((grade, index) => (Math.Pow(2d, grade) - 1d) / Math.Log2(index + 2d))
        .Sum();

    private static RecipeSearchEvaluationMetrics Aggregate(IEnumerable<RecipeSearchQueryEvaluation> source)
    {
        var queries = source.ToArray();
        return new(
            MeanDefined(queries.Select(item => item.Metrics.CandidateRecallAtFusedWindow)),
            MeanDefined(queries.Select(item => item.Metrics.PrecisionAt5)),
            MeanDefined(queries.Select(item => item.Metrics.NdcgAt10)),
            MeanDefined(queries.Select(item => item.Metrics.IrrelevantResultRate)),
            MeanDefined(queries.Select(item => item.Metrics.NoMatchFalsePositiveRate)),
            MeanDefined(queries.Select(item => item.Metrics.HardNegativeAdmissionRate)));
    }

    private static double MeanDefined(IEnumerable<double> values)
    {
        var defined = values.Where(value => !double.IsNaN(value)).ToArray();
        return defined.Length == 0 ? 0d : defined.Average();
    }

    private static string ComputeQuerySetIdentity(IReadOnlyList<RecipeSearchEvaluationCase> cases)
    {
        var canonical = string.Join('\n', cases.OrderBy(item => item.Id, StringComparer.Ordinal).Select(item =>
            $"{item.Id}|{item.Split}|{item.Language}|{item.Query}|{string.Join(',', item.Slices.Order(StringComparer.Ordinal))}|{string.Join(',', item.Grades.OrderBy(pair => pair.Key).Select(pair => $"{pair.Key}:{pair.Value}"))}"));
        return Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(canonical)));
    }
}
