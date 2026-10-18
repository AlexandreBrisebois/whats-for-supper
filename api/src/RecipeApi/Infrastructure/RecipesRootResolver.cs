namespace RecipeApi.Infrastructure;

/// <summary>
/// Single source of truth for resolving the root directory where recipe files are stored.
/// Priority: RECIPES_ROOT env var → appsettings RecipesRoot → DataRoot/recipes (default).
/// Register as a singleton so resolution happens once per process lifetime.
/// </summary>
public sealed class RecipesRootResolver(DataRootResolver dataRoot, IConfiguration configuration)
{
    public string BaseRoot =>
        Environment.GetEnvironmentVariable("RECIPES_ROOT")
        ?? configuration["RecipesRoot"]
        ?? Path.Combine(dataRoot.Root, "recipes");
    public string? Generation => File.Exists(Path.Combine(BaseRoot, ".recovery-active"))
        ? File.ReadAllText(Path.Combine(BaseRoot, ".recovery-active")).Trim() : null;
    public string Root
    {
        get
        {
            var generation = Generation;
            if (generation is null) return BaseRoot;
            if (!Guid.TryParseExact(generation, "N", out _)) throw new InvalidDataException("Invalid recovery generation pointer.");
            return Path.Combine(BaseRoot, ".recovery-generations", generation);
        }
    }
}
