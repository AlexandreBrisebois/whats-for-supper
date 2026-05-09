using Microsoft.Extensions.Configuration;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Services.Processors;
using RecipeApi.Workflow;
using Xunit;

namespace RecipeApi.Tests.Services;

public class DemoModeBypassProcessorTests
{
    [Fact]
    public async Task ExecuteAsync_Returns_Bypass_Result_Without_Invoking_AI_Processor()
    {
        var inner = new ThrowingProcessor("ExtractRecipe");
        var processor = new DemoModeBypassProcessor(
            inner.ProcessorName,
            new DemoModeOptions(new ConfigurationBuilder()
                .AddInMemoryCollection(new Dictionary<string, string?> { ["DEMO_MODE"] = "true" })
                .Build()));

        var result = await processor.ExecuteAsync(new WorkflowTask { ProcessorName = "ExtractRecipe" }, CancellationToken.None);

        Assert.Equal("ExtractRecipe", processor.ProcessorName);
        Assert.Contains("Demo Mode Bypass", result?.ToString());
        Assert.False(inner.WasInvoked);
    }

    private sealed class ThrowingProcessor(string processorName) : IWorkflowProcessor
    {
        public bool WasInvoked { get; private set; }
        public string ProcessorName => processorName;

        public Task<object?> ExecuteAsync(WorkflowTask task, CancellationToken ct)
        {
            WasInvoked = true;
            throw new InvalidOperationException("AI processor should not run in demo mode.");
        }
    }
}
