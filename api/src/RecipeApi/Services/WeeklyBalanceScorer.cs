using RecipeApi.Models;

namespace RecipeApi.Services;

/// <summary>
/// Pure, deterministic scorer for weekly meal balance against Canada's Food Guide.
/// Zero DB access. Zero LLM calls. All logic is in-memory computation.
/// </summary>
public static class WeeklyBalanceScorer
{
    // Phase 1 CFG targets (all must be met for isBalanced: true)
    private const int ProteinDaysTarget = 3;
    private const int VeggieDaysTarget = 4;
    private const int GrainDaysTarget = 2;
    private const int PlantProteinDaysTarget = 1;
    private const int MaxConsecutiveSameTarget = 3;

    /// <summary>
    /// Compute a weekly balance summary from dietary profiles of 7 dinner slots.
    /// Null profiles are treated as Mixed and contribute no credits to any specific group.
    /// </summary>
    /// <param name="profiles">Enumerable of 7 RecipeDietaryProfile? (one per dinner slot)</param>
    /// <returns>WeeklyBalanceSummary with all counts, balance status, and recommendations</returns>
    public static WeeklyBalanceSummary Compute(IEnumerable<RecipeDietaryProfile?> profiles)
    {
        var profileList = profiles.ToList();

        // Count food group days
        var proteinDays = CountProteinDays(profileList);
        var veggieDays = CountVeggieDays(profileList);
        var grainDays = CountGrainDays(profileList);
        var plantProteinDays = CountPlantProteinDays(profileList);
        var redMeatDays = CountRedMeatDays(profileList);

        // Detect consecutive same primary food groups
        var maxConsecutiveSame = FindMaxConsecutiveSame(profileList);

        // Compute FOP aggregation
        var fopWeekSummary = ComputeFopWeekSummary(profileList);

        // Determine if balanced
        var isBalanced = proteinDays >= ProteinDaysTarget
            && veggieDays >= VeggieDaysTarget
            && grainDays >= GrainDaysTarget
            && plantProteinDays >= PlantProteinDaysTarget
            && maxConsecutiveSame <= MaxConsecutiveSameTarget;

        // Generate recommendations for unmet targets
        var recommendations = GenerateRecommendations(
            proteinDays, veggieDays, grainDays, plantProteinDays, maxConsecutiveSame);

        return new WeeklyBalanceSummary(
            ProteinDays: proteinDays,
            VeggieDays: veggieDays,
            GrainDays: grainDays,
            PlantProteinDays: plantProteinDays,
            RedMeatDays: redMeatDays,
            MaxConsecutiveSame: maxConsecutiveSame,
            IsBalanced: isBalanced,
            Recommendations: recommendations,
            FopWeekSummary: fopWeekSummary
        );
    }

    /// <summary>
    /// Count days where ProteinFoods is primary or secondary.
    /// </summary>
    private static int CountProteinDays(List<RecipeDietaryProfile?> profiles)
    {
        return profiles.Count(p =>
            p != null && (
                p.PrimaryFoodGroup == "ProteinFoods" ||
                p.SecondaryFoodGroups.Contains("ProteinFoods")
            )
        );
    }

    /// <summary>
    /// Count days where VegetablesAndFruits is primary or secondary.
    /// </summary>
    private static int CountVeggieDays(List<RecipeDietaryProfile?> profiles)
    {
        return profiles.Count(p =>
            p != null && (
                p.PrimaryFoodGroup == "VegetablesAndFruits" ||
                p.SecondaryFoodGroups.Contains("VegetablesAndFruits")
            )
        );
    }

    /// <summary>
    /// Count days where WholeGrains is primary or secondary AND wholeGrainConfident = true.
    /// </summary>
    private static int CountGrainDays(List<RecipeDietaryProfile?> profiles)
    {
        return profiles.Count(p =>
            p != null && p.WholeGrainConfident && (
                p.PrimaryFoodGroup == "WholeGrains" ||
                p.SecondaryFoodGroups.Contains("WholeGrains")
            )
        );
    }

    /// <summary>
    /// Count days where proteinSource is PlantProtein or Mixed.
    /// </summary>
    private static int CountPlantProteinDays(List<RecipeDietaryProfile?> profiles)
    {
        return profiles.Count(p =>
            p != null && (p.ProteinSource == "PlantProtein" || p.ProteinSource == "Mixed")
        );
    }

    /// <summary>
    /// Count days where proteinSource is RedMeat.
    /// </summary>
    private static int CountRedMeatDays(List<RecipeDietaryProfile?> profiles)
    {
        return profiles.Count(p =>
            p != null && p.ProteinSource == "RedMeat"
        );
    }

    /// <summary>
    /// Find the longest run of identical primaryFoodGroup values.
    /// Null profiles break the sequence.
    /// </summary>
    private static int FindMaxConsecutiveSame(List<RecipeDietaryProfile?> profiles)
    {
        if (profiles.Count == 0)
            return 0;

        int maxRun = 0;
        int currentRun = 0;
        string? currentGroup = null;

        foreach (var profile in profiles)
        {
            if (profile == null)
            {
                // Null breaks the sequence
                currentRun = 0;
                currentGroup = null;
            }
            else if (profile.PrimaryFoodGroup == currentGroup)
            {
                // Same group continues
                currentRun++;
            }
            else
            {
                // Different group starts new sequence
                currentGroup = profile.PrimaryFoodGroup;
                currentRun = 1;
            }

            maxRun = Math.Max(maxRun, currentRun);
        }

        return maxRun;
    }

    /// <summary>
    /// Compute FOP week summary by aggregating FopFlags from all profiles.
    /// Null FopFlags contribute 0 to all counts.
    /// </summary>
    private static FopWeekSummary ComputeFopWeekSummary(List<RecipeDietaryProfile?> profiles)
    {
        var highInSaturatedFatDays = profiles.Count(p =>
            p?.FopFlags?.HighInSaturatedFat == true
        );

        var highInSugarsDays = profiles.Count(p =>
            p?.FopFlags?.HighInSugars == true
        );

        var highInSodiumDays = profiles.Count(p =>
            p?.FopFlags?.HighInSodium == true
        );

        return new FopWeekSummary(
            HighInSaturatedFatDays: highInSaturatedFatDays,
            HighInSugarsDays: highInSugarsDays,
            HighInSodiumDays: highInSodiumDays
        );
    }

    /// <summary>
    /// Generate recommendation strings for unmet targets, in fixed priority order.
    /// Returns empty array when all targets are met.
    /// </summary>
    private static string[] GenerateRecommendations(
        int proteinDays, int veggieDays, int grainDays, int plantProteinDays, int maxConsecutiveSame)
    {
        var recommendations = new List<string>();

        if (proteinDays < ProteinDaysTarget)
            recommendations.Add("Add more protein-rich meals this week (meat, fish, legumes, eggs).");

        if (veggieDays < VeggieDaysTarget)
            recommendations.Add("Try to include vegetables or fruit in at least 4 dinners.");

        if (grainDays < GrainDaysTarget)
            recommendations.Add("Add whole grains (brown rice, quinoa, oats) to at least 2 dinners.");

        if (plantProteinDays < PlantProteinDaysTarget)
            recommendations.Add("Include one plant-based protein dinner this week (beans, lentils, tofu).");

        if (maxConsecutiveSame > MaxConsecutiveSameTarget)
            recommendations.Add("You have several similar meals in a row — mix in a different food group.");

        return recommendations.ToArray();
    }
}
