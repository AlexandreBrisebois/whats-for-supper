namespace RecipeApi.Services;

public class DuplicateFamilyMemberException(string message) : Exception(message);
