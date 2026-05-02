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
    private readonly RecipeDbContext _dbContext;
    private readonly InMemoryStorageProvider _storage;
    private readonly WorkflowRepository _workflowRepository;
    private readonly WorkflowOrchestrator _orchestrator;

    public WorkflowOrchestratorTests()
    {
        _dbContext = TestDbContextFactory.Create();
        _storage = new InMemoryStorageProvider();
        _workflowRepository = new WorkflowRepository(_storage);
        _orchestrator = new WorkflowOrchestrator(_workflowRepository, _dbContext);
    }

    public void Dispose()
    {
        _dbContext.Dispose();
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
        _storage.SaveAsync("workflows", "test_workflow.yaml", yaml).GetAwaiter().GetResult();

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
        _storage.SaveAsync("workflows", "circular.yaml", yaml).GetAwaiter().GetResult();

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
        _storage.SaveAsync("workflows", "missing_dep.yaml", yaml).GetAwaiter().GetResult();

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
        _storage.SaveAsync("workflows", "undefined_param.yaml", yaml).GetAwaiter().GetResult();

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
        await _storage.SaveAsync("workflows", "trigger_test.yaml", yaml);
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
        await _storage.SaveAsync("workflows", "recipe_import.yaml", yaml);
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
