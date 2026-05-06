namespace RecipeApi.Models;

public record RecipeDietaryProfile(
    string PrimaryFoodGroup,
    string[] SecondaryFoodGroups,
    string ProteinSource,
    string CuisineType,
    string[] MealTypes,
    string PrimaryMealType,
    bool WholeGrainConfident,
    double Confidence,
    string Source,
    FopFlags? FopFlags
);
