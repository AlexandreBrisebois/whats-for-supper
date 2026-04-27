using Microsoft.EntityFrameworkCore;
using Moq;

using RecipeApi.Data;
using TaskStatus = RecipeApi.Models.TaskStatus;

using WorkflowStatus = RecipeApi.Models.WorkflowStatus;
using RecipeApi.Models;
using RecipeApi.Infrastructure;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace RecipeApi.Tests.Services;

[Collection("WorkflowRootResolver")]
public class WorkflowOrchestratorTests : IDisposable
{
    private readonly string _testRoot;
    private readonly RecipeDbContext _dbContext;
    private readonly WorkflowOrchestrator _orchestrator;

    public WorkflowOrchestratorTests()
    {
        _testRoot = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());
        Directory.CreateDirectory(_testRoot);

        var mockConfig = new Mock<IConfiguration>();
        
        // Override environment variable for testing
        Environment.SetEnvironmentVariable("WORKFLOWS_ROOT", _testRoot);
        
        var dataRootResolver = new DataRootResolver(mockConfig.Object);
        var rootResolver = new WorkflowRootResolver(dataRootResolver, mockConfig.Object);
        _dbContext = TestDbContextFactory.Create();
        _orchestrator = new WorkflowOrchestrator(rootResolver, _dbContext);
    }

    public void Dispose()
    {
        if (Directory.Exists(_testRoot))
        {
            Directory.Delete(_testRoot, true);
        }
        Environment.SetEnvironmentVariable("WORKFLOWS_ROOT", null);
    }

    [Fact]
    public void GetDefinition_ValidYaml_ReturnsDefinition()
    {
        // Arrange
        var yaml = @"
name: test_workflow
parameters: [recipe_id]
tasks:
  - name: extract
    processor: ExtractRecipe
    payload: { recipe_id: ""{{recipe_id}}"" }
";
        File.WriteAllText(Path.Combine(_testRoot, "test_workflow.yaml"), yaml);

        // Act
        var definition = _orchestrator.GetDefinition("test_workflow");

        // Assert
        Assert.Equal("test_workflow", definition.Name);
        Assert.Single(definition.Parameters);
        Assert.Equal("recipe_id", definition.Parameters[0]);
        Assert.Single(definition.Tasks);
        Assert.Equal("extract", definition.Tasks[0].Name);
    }

    [Fact]
    public void GetDefinition_CircularDependency_ThrowsInvalidWorkflowException()
    {
        // Arrange
        var yaml = @"
name: circular
tasks:
  - name: a
    depends_on: [b]
    processor: dummy
  - name: b
    depends_on: [a]
    processor: dummy
";
        File.WriteAllText(Path.Combine(_testRoot, "circular.yaml"), yaml);

        // Act & Assert
        var ex = Assert.Throws<InvalidWorkflowException>(() => _orchestrator.GetDefinition("circular"));
        Assert.Contains("Circular dependency", ex.Message);
    }

    [Fact]
    public void GetDefinition_MissingDependency_ThrowsInvalidWorkflowException()
    {
        // Arrange
        var yaml = @"
name: missing_dep
tasks:
  - name: a
    depends_on: [ghost]
    processor: dummy
";
        File.WriteAllText(Path.Combine(_testRoot, "missing_dep.yaml"), yaml);

        // Act & Assert
        var ex = Assert.Throws<InvalidWorkflowException>(() => _orchestrator.GetDefinition("missing_dep"));
        Assert.Contains("depends on non-existent task 'ghost'", ex.Message);
    }

    [Fact]
    public void GetDefinition_UndefinedParameter_ThrowsInvalidWorkflowException()
    {
        // Arrange
        var yaml = @"
name: undefined_param
parameters: []
tasks:
  - name: a
    processor: dummy
    payload: { val: ""{{ghost}}"" }
";
        File.WriteAllText(Path.Combine(_testRoot, "undefined_param.yaml"), yaml);

        // Act & Assert
        var ex = Assert.Throws<InvalidWorkflowException>(() => _orchestrator.GetDefinition("undefined_param"));
        Assert.Contains("uses undefined parameter '{{ghost}}'", ex.Message);
    }

    [Fact]
    public async Task TriggerAsync_MissingRequiredParameter_ThrowsInvalidWorkflowException()
    {
        // Arrange
        var yaml = @"
name: trigger_test
parameters: [required_param]
tasks:
  - name: a
    processor: dummy
";
        File.WriteAllText(Path.Combine(_testRoot, "trigger_test.yaml"), yaml);
        var parameters = new Dictionary<string, string>();

        // Act & Assert
        await Assert.ThrowsAsync<InvalidWorkflowException>(() => _orchestrator.TriggerAsync("trigger_test", parameters));
    }

    [Fact]
    public async Task TriggerAsync_SnapshotAtTrigger_CreatesInstanceAndTasks()
    {
        // Arrange
        var yaml = @"
name: recipe_import
parameters: [recipe_id]
tasks:
  - name: extract
    processor: ExtractRecipe
    payload: { recipe_id: ""{{recipe_id}}"" }
  - name: hero
    processor: GenerateHeroImage
    depends_on: [extract]
    payload: { recipe_id: ""{{recipe_id}}"" }
";
        File.WriteAllText(Path.Combine(_testRoot, "recipe_import.yaml"), yaml);
        var recipeId = Guid.NewGuid().ToString();
        var parameters = new Dictionary<string, string> { { "recipe_id", recipeId } };

        // Act
        var instance = await _orchestrator.TriggerAsync("recipe_import", parameters);

        // Assert
        Assert.NotNull(instance);
        Assert.Equal("recipe_import", instance.WorkflowId);
        Assert.Equal(WorkflowStatus.Pending, instance.Status);

        // Verify DB
        var dbInstance = await _dbContext.WorkflowInstances
            .Include(i => i.Tasks)
            .FirstOrDefaultAsync(i => i.Id == instance.Id);

        Assert.NotNull(dbInstance);
        Assert.Equal(2, dbInstance.Tasks.Count);

        var extractTask = dbInstance.Tasks.First(t => t.ProcessorName == "ExtractRecipe");
        Assert.Equal(TaskStatus.Pending, extractTask.Status);
        Assert.Contains(recipeId, extractTask.Payload!);

        var heroTask = dbInstance.Tasks.First(t => t.ProcessorName == "GenerateHeroImage");
        Assert.Equal(TaskStatus.Waiting, heroTask.Status);
        Assert.Contains(recipeId, heroTask.Payload!);
    }
}
