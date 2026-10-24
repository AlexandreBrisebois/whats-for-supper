using System.Text.Json;
using RecipeApi.Tests.Integration.Fixtures;
using Xunit;
using Xunit.Abstractions;

namespace RecipeApi.Tests.Integration;

/// <summary>
/// Contract tests for the deterministic, test-owned relevance evaluation harness.
/// The fixture and scorer are implemented by task 4.2; these tests intentionally
/// establish their required API and behavior first.
/// </summary>
public class RecipeSearchEvaluationTests
{
    private static readonly Guid GradeTwo = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    private static readonly Guid GradeOne = Guid.Parse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");
    private static readonly Guid GradeZero = Guid.Parse("cccccccc-cccc-cccc-cccc-cccccccccccc");
    private static readonly Guid NoMatchResult = Guid.Parse("dddddddd-dddd-dddd-dddd-dddddddddddd");
    private readonly ITestOutputHelper _output;

    public RecipeSearchEvaluationTests(ITestOutputHelper output)
    {
        _output = output;
    }

    [Fact]
    public void Fixture_HasFrozenSplitsAndStableIdentity()
    {
        var first = RecipeSearchEvaluationFixture.Load();
        var second = RecipeSearchEvaluationFixture.Load();

        Assert.Equal("2026.10.23.1", first.Version);
        Assert.Equal("wfs-synthetic-recipes-v1", first.CorpusIdentity);
        Assert.Equal("wfs-search-judgments-v1", first.QuerySetIdentity);
        Assert.Equal("strict-search-metrics-v1", first.ConfigurationIdentity);
        Assert.Equal("seed-20261023", first.RandomSeedIdentity);
        Assert.Equal(first.CorpusIdentity, second.CorpusIdentity);
        Assert.Equal(first.QuerySetIdentity, second.QuerySetIdentity);
        Assert.Equal(first.ConfigurationIdentity, second.ConfigurationIdentity);
        Assert.Equal(first.RandomSeedIdentity, second.RandomSeedIdentity);
        Assert.True(first.Queries.Count(query => query.Split == EvaluationSplit.Development) >= 40);
        Assert.True(first.Queries.Count(query => query.Split == EvaluationSplit.HeldOut) >= 20);
        Assert.Equal(first.Queries.Count, first.Queries.Select(query => query.Id).Distinct(StringComparer.Ordinal).Count());
    }

    [Fact]
    public void Fixture_CoversEveryFrozenLanguageAndIntentSlice()
    {
        var fixture = RecipeSearchEvaluationFixture.Load();
        var coveredSlices = fixture.Queries
            .SelectMany(query => query.Slices)
            .ToHashSet(StringComparer.Ordinal);

        Assert.Subset(
            new HashSet<string>(
                [
                    "english",
                    "french",
                    "cross-language",
                    "short",
                    "natural-language",
                    "dish",
                    "ingredient",
                    "ambiguous",
                    "negated",
                    "hard-negative",
                    "no-match"
                ],
                StringComparer.Ordinal),
            coveredSlices);
        Assert.All(fixture.Queries, query => Assert.NotEmpty(query.Slices));
        Assert.All([EvaluationSplit.Development, EvaluationSplit.HeldOut], split =>
        {
            var splitCases = fixture.Queries.Where(query => query.Split == split).ToArray();
            Assert.Contains(splitCases, query => query.Slices.Contains("english", StringComparer.Ordinal));
            Assert.Contains(splitCases, query => query.Slices.Contains("french", StringComparer.Ordinal));
            Assert.Contains(splitCases, query => query.Slices.Contains("no-match", StringComparer.Ordinal));
            Assert.Contains(splitCases, query => query.Slices.Contains("hard-negative", StringComparer.Ordinal));
        });
    }

    [Fact]
    public void Fixture_UsesArmIndependentGradesAndNamedGradeZeroHardNegatives()
    {
        var fixture = RecipeSearchEvaluationFixture.Load();
        var hardNegatives = fixture.Queries.SelectMany(query => query.HardNegatives.Select(item => (query, item))).ToArray();

        Assert.All(fixture.Queries.SelectMany(query => query.Grades.Values), grade => Assert.InRange(grade, 0, 2));
        Assert.NotEmpty(hardNegatives);
        Assert.All(hardNegatives, pair =>
        {
            Assert.False(string.IsNullOrWhiteSpace(pair.item.Name));
            Assert.True(pair.query.Grades.TryGetValue(pair.item.RecipeId, out var grade));
            Assert.Equal(0, grade);
        });
        Assert.DoesNotContain(
            fixture.Queries.SelectMany(query => query.GetType().GetProperties()),
            property => property.Name.Contains("Arm", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void Scorer_CountsTopPickAsRankOneExactlyOnce()
    {
        var evaluationCase = RelevantCase("top-pick-deduplication", ["english", "dish"]);
        var response = new EvaluationArmResult(
            evaluationCase.Id,
            CandidateRecipeIds: [GradeTwo, GradeOne, GradeZero],
            TopPickRecipeId: GradeTwo,
            AlternativeRecipeIds: [GradeTwo, GradeOne, GradeZero]);

        var scored = RecipeSearchEvaluationScorer.Score([evaluationCase], [response], FrozenConfiguration);
        var query = Assert.Single(scored.Queries);

        Assert.Equal([GradeTwo, GradeOne, GradeZero], query.RankedRecipeIds);
        Assert.Equal(3, query.RankedRecipeIds.Distinct().Count());
        Assert.Equal(0.4d, query.Metrics.PrecisionAt5, 10);
        Assert.Equal(1d, query.Metrics.NdcgAt10, 10);
    }

    [Fact]
    public void Scorer_ReportsFrozenPerQueryMacroMetrics()
    {
        var relevant = RelevantCase("relevant", ["english", "ingredient", "hard-negative"]);
        var noMatch = new RecipeSearchEvaluationCase(
            "no-match",
            EvaluationSplit.Development,
            "dragonfruit casserole",
            "en",
            ["english", "natural-language", "no-match"],
            new Dictionary<Guid, int>(),
            []);
        var results = new[]
        {
            new EvaluationArmResult(
                relevant.Id,
                CandidateRecipeIds: [GradeTwo, GradeZero],
                TopPickRecipeId: GradeTwo,
                AlternativeRecipeIds: [GradeZero]),
            new EvaluationArmResult(
                noMatch.Id,
                CandidateRecipeIds: [NoMatchResult],
                TopPickRecipeId: null,
                AlternativeRecipeIds: [NoMatchResult])
        };

        var scored = RecipeSearchEvaluationScorer.Score([relevant, noMatch], results, FrozenConfiguration);

        Assert.Equal(0.5d, scored.Macro.CandidateRecallAtFusedWindow, 10);
        Assert.Equal(0.1d, scored.Macro.PrecisionAt5, 10);
        Assert.Equal(0.5d, scored.Macro.NdcgAt10, 10);
        Assert.Equal(0.75d, scored.Macro.IrrelevantResultRate, 10);
        Assert.Equal(1d, scored.Macro.NoMatchFalsePositiveRate, 10);
        Assert.Equal(1d, scored.Macro.HardNegativeAdmissionRate, 10);
    }

    [Fact]
    public void Scorer_ReportsCriticalSlicesSeparately()
    {
        var english = RelevantCase("english", ["english", "short", "dish"]);
        var french = RelevantCase("french", ["french", "cross-language", "ingredient"]);
        var results = new[]
        {
            new EvaluationArmResult(english.Id, [GradeTwo, GradeOne], GradeTwo, [GradeOne]),
            new EvaluationArmResult(french.Id, [GradeZero], null, [GradeZero])
        };

        var scored = RecipeSearchEvaluationScorer.Score([english, french], results, FrozenConfiguration);

        Assert.Equal(1d, scored.Slices["english"].CandidateRecallAtFusedWindow, 10);
        Assert.Equal(0d, scored.Slices["french"].CandidateRecallAtFusedWindow, 10);
        Assert.Equal(1d, scored.Slices["cross-language"].HardNegativeAdmissionRate, 10);
        Assert.Contains("ingredient", scored.Slices.Keys);
        Assert.Contains("short", scored.Slices.Keys);
    }

    [Fact]
    public void Harness_EmitsReproducibleManifestAndMetrics()
    {
        var fixture = RecipeSearchEvaluationFixture.Load();
        var results = fixture.Queries.Select(evaluationCase =>
        {
            var ranked = evaluationCase.Grades
                .OrderByDescending(pair => pair.Value)
                .ThenBy(pair => pair.Key)
                .Select(pair => pair.Key)
                .ToArray();
            var topPick = ranked.Length == 0 ? (Guid?)null : ranked[0];
            return new EvaluationArmResult(evaluationCase.Id, ranked, topPick, ranked.Skip(1).ToArray());
        }).ToArray();

        var report = RecipeSearchEvaluationScorer.Score(fixture, results, FrozenConfiguration);
        var emitted = JsonSerializer.Serialize(new
        {
            report.Manifest,
            report.Macro,
            report.Slices
        });
        var repeated = RecipeSearchEvaluationScorer.Score(fixture, results, FrozenConfiguration);
        var repeatedEmission = JsonSerializer.Serialize(new
        {
            repeated.Manifest,
            repeated.Macro,
            repeated.Slices
        });

        Assert.Equal(emitted, repeatedEmission);
        _output.WriteLine("RECIPE_SEARCH_EVALUATION=" + emitted);
    }

    private static readonly RecipeSearchEvaluationConfiguration FrozenConfiguration = new(
        FusedWindow: 3,
        PrecisionCutoff: 5,
        NdcgCutoff: 10,
        Identity: "strict-search-metrics-v1");

    private static RecipeSearchEvaluationCase RelevantCase(string id, IReadOnlyList<string> slices) => new(
        id,
        EvaluationSplit.Development,
        id,
        "en",
        slices,
        new Dictionary<Guid, int>
        {
            [GradeTwo] = 2,
            [GradeOne] = 1,
            [GradeZero] = 0
        },
        [new NamedHardNegative(GradeZero, "plausible-but-wrong")]);
}
