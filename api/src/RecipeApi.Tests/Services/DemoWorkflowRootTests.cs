using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Infrastructure;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Services;

public class DemoWorkflowRootTests
{
    [Fact]
    public async Task Demo_workflow_uses_configured_definition_root_without_mutating_it()
    {
        var root = Path.Combine(Path.GetTempPath(), "wfs-demo-root-" + Guid.NewGuid().ToString("N"));
        var definitions = Path.Combine(root, "definitions");
        Directory.CreateDirectory(definitions);
        try
        {
            const string yaml = "name: demo-capture\nparameters: []\ntasks: []\n";
            await File.WriteAllTextAsync(Path.Combine(definitions, "demo-capture.yaml"), yaml);
            var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["DataRoot"] = Path.Combine(root, "data"), ["WorkflowsRoot"] = definitions
            }).Build();
            var services = new ServiceCollection();
            services.AddSingleton<IConfiguration>(config);
            services.AddSingleton<DataRootResolver>();
            services.AddSingleton<RecipesRootResolver>();
            services.AddSingleton<WorkflowRootResolver>();
            services.AddSingleton<IStorageProvider, LocalStorageProvider>();
            using var provider = services.BuildServiceProvider();
            var repository = new WorkflowRepository(provider.GetRequiredService<IStorageProvider>());
            Assert.Equal(yaml, await repository.GetWorkflowYamlAsync("demo-capture"));
            Assert.False(Directory.Exists(Path.Combine(root, "data", "workflows")));
        }
        finally { Directory.Delete(root, true); }
    }
}
