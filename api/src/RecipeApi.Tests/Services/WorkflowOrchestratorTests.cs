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
    public async Task GetDefinitionAsync_ValidYaml_ReturnsDefinition()
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
        await _storage.SaveAsync("workflows", "test_workflow.yaml", yaml);

        // Act
        var definition = await _orchestrator.GetDefinitionAsync("test_workflow");

        // Assert
        Assert.Equal("test_workflow", definition.Name);
        Assert.Single(definition.Parameters);
        Assert.Equal("recipe_id", definition.Parameters[0]);
        Assert.Single(definition.Tasks);
        Assert.Equal("extract", definition.Tasks[0].Name);
    }

    [Fact]
    public async Task GetDefinitionAsync_CircularDependency_ThrowsInvalidWorkflowException()
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
        await _storage.SaveAsync("workflows", "circular.yaml", yaml);

        // Act & Assert
        var ex = await Assert.ThrowsAsync<InvalidWorkflowException>(() => _orchestrator.GetDefinitionAsync("circular"));
        Assert.Contains("Circular dependency", ex.Message);
    }

    [Fact]
    public async Task GetDefinitionAsync_MissingDependency_ThrowsInvalidWorkflowException()
    {
        // Arrange
        var yaml = @"
name: missing_dep
tasks:
  - name: a
    depends_on: [ghost]
    processor: dummy
";
        await _storage.SaveAsync("workflows", "missing_dep.yaml", yaml);

        // Act & Assert
        var ex = await Assert.ThrowsAsync<InvalidWorkflowException>(() => _orchestrator.GetDefinitionAsync("missing_dep"));
        Assert.Contains("depends on non-existent task 'ghost'", ex.Message);
    }

    [Fact]
    public async Task GetDefinitionAsync_UndefinedParameter_ThrowsInvalidWorkflowException()
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
        await _storage.SaveAsync("workflows", "undefined_param.yaml", yaml);

        // Act & Assert
        var ex = await Assert.ThrowsAsync<InvalidWorkflowException>(() => _orchestrator.GetDefinitionAsync("undefined_param"));
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
    public async Task TriggerAsync_OptionalRepairSnapshot_IsImmutableAndOmittedWhenAbsent()
    {
        var yaml = @"
name: contextual_import
parameters: [recipeId, repairReasons?, repairNote?]
tasks:
  - name: extract
    processor: ExtractRecipe
    payload:
      recipeId: ""{{ recipeId }}""
      repairReasons: ""{{ repairReasons }}""
      repairNote: ""{{ repairNote }}""
  - name: hero
    processor: GenerateHero
    payload:
      recipeId: ""{{ recipeId }}""
";
        await _storage.SaveAsync("workflows", "contextual_import.yaml", yaml);
        var recipeId = Guid.NewGuid().ToString();
        var parameters = new Dictionary<string, string>
        {
            ["recipeId"] = recipeId,
            ["repairReasons"] = "ingredients,steps",
            ["repairNote"] = "Check the amount of flour."
        };

        var contextual = await _orchestrator.TriggerAsync("contextual_import", parameters);
        parameters["repairNote"] = "Changed after launch.";

        var contextualExtract = await _dbContext.WorkflowTasks
            .SingleAsync(task => task.InstanceId == contextual.Id && task.ProcessorName == "ExtractRecipe");
        using var contextualPayload = System.Text.Json.JsonDocument.Parse(contextualExtract.Payload!);
        Assert.Equal("ingredients,steps", contextualPayload.RootElement.GetProperty("repairReasons").GetString());
        Assert.Equal("Check the amount of flour.", contextualPayload.RootElement.GetProperty("repairNote").GetString());

        var normal = await _orchestrator.TriggerAsync("contextual_import", new Dictionary<string, string>
        {
            ["recipeId"] = recipeId
        });
        var normalExtract = await _dbContext.WorkflowTasks
            .SingleAsync(task => task.InstanceId == normal.Id && task.ProcessorName == "ExtractRecipe");
        using var normalPayload = System.Text.Json.JsonDocument.Parse(normalExtract.Payload!);
        Assert.False(normalPayload.RootElement.TryGetProperty("repairReasons", out _));
        Assert.False(normalPayload.RootElement.TryGetProperty("repairNote", out _));
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

    [Fact]
    public async Task TriggerAsync_WithScheduledAt_AssignsScheduleToRootPendingTasksOnly()
    {
        // Arrange
        var yaml = @"
name: scheduled_test
parameters: []
tasks:
  - name: root_a
    processor: RootA
  - name: root_b
    processor: RootB
  - name: dependent
    processor: Dependent
    depends_on: [root_a, root_b]
";
        await _storage.SaveAsync("workflows", "scheduled_test.yaml", yaml);
        var scheduledAt = new DateTimeOffset(2026, 5, 10, 3, 0, 0, TimeSpan.Zero);

        // Act
        var instance = await _orchestrator.TriggerAsync("scheduled_test", [], scheduledAt);

        // Assert
        var tasks = await _dbContext.WorkflowTasks
            .Where(t => t.InstanceId == instance.Id)
            .ToListAsync();

        var rootTasks = tasks.Where(t => t.TaskName.StartsWith("root_")).ToList();
        Assert.Equal(2, rootTasks.Count);
        Assert.All(rootTasks, task =>
        {
            Assert.Equal(TaskStatus.Pending, task.Status);
            Assert.Equal(scheduledAt, task.ScheduledAt);
        });

        var dependent = Assert.Single(tasks, t => t.TaskName == "dependent");
        Assert.Equal(TaskStatus.Waiting, dependent.Status);
        Assert.Null(dependent.ScheduledAt);
    }

    [Fact]
    public async Task TriggerAsync_WithoutScheduledAt_LeavesRootTaskScheduleEmpty()
    {
        // Arrange
        var yaml = @"
name: unscheduled_test
parameters: []
tasks:
  - name: root
    processor: Root
";
        await _storage.SaveAsync("workflows", "unscheduled_test.yaml", yaml);

        // Act
        var instance = await _orchestrator.TriggerAsync("unscheduled_test", []);

        // Assert
        var task = await _dbContext.WorkflowTasks.SingleAsync(t => t.InstanceId == instance.Id);
        Assert.Equal(TaskStatus.Pending, task.Status);
        Assert.Null(task.ScheduledAt);
    }
}
