namespace RecipeApi.Infrastructure;

/// <summary>
/// Single source of truth for resolving the root directory where workflow files are stored.
/// Priority: WORKFLOWS_ROOT env var → appsettings WorkflowsRoot → DataRoot/workflows (default).
/// Register as a singleton so resolution happens once per process lifetime.
/// </summary>
public sealed class WorkflowRootResolver(DataRootResolver dataRoot, IConfiguration configuration)
{
    public string Root =>
        Environment.GetEnvironmentVariable("WORKFLOWS_ROOT")
        ?? configuration["WorkflowsRoot"]
        ?? Path.Combine(dataRoot.Root, "workflows");
}
