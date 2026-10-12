namespace RecipeApi.Services;

public class NonCookingPlanConflictException(string message) : Exception(message);
