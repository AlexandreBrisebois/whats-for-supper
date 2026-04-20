namespace RecipeApi.Infrastructure;

/// <summary>
/// Single source of truth for resolving the root directory where recipe files are stored.
/// Priority: RECIPES_ROOT env var → appsettings RecipesRoot → /data/recipes (production default).
/// Register as a singleton so resolution happens once per process lifetime.
/// </summary>
public sealed class RecipesRootResolver(IConfiguration configuration)
{
    public string Root =>
        Environment.GetEnvironmentVariable("RECIPES_ROOT")
        ?? configuration["RecipesRoot"]
        ?? "/data/recipes";
}
