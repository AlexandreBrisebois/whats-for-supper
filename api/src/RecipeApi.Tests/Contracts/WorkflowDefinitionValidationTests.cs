using System.Runtime.CompilerServices;
using System.Text.RegularExpressions;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Services.Agents;
using RecipeApi.Services.Processors;
using RecipeApi.Tests.Infrastructure;
using RecipeApi.Workflow;
using Xunit;

namespace RecipeApi.Tests.Contracts;

/// <summary>
/// Validates every YAML workflow definition in <c>api/src/RecipeApi/Workflows/</c>
/// using the production <see cref="WorkflowOrchestrator"/> deserializer, topological
/// DAG validation, and registered <see cref="IWorkflowProcessor"/> implementations.
/// </summary>
public class WorkflowDefinitionValidationTests
{
    private static readonly string[] ParameterizedRecipeAgentNames =
    [
        "ExtractRecipe",
        "GenerateDescription",
        "SynthesizeRecipe",
    ];

    private static readonly string[] ParameterizedManagementProcessorNames =
    [
        "BackupDatabase",
        "RestoreDatabase",
        "DisasterRecovery",
        "PruneWorkflows",
        "ProcessMaintenanceCommands",
        "PruneMaintenanceCommands",
        "GenerateDreamingReport",
        "CaptureDemoState",
        "RestoreDemoState",
    ];

    [Fact]
    public async Task AllProductionWorkflowYamlFiles_ParseAndSatisfyDagAndProcessorContracts()
    {
        var repoRoot = FindRepoRoot();
        var workflowsDir = Path.Combine(repoRoot, "api", "src", "RecipeApi", "Workflows");
        var workflowFiles = Directory.GetFiles(workflowsDir, "*.yaml")
            .OrderBy(static f => f, StringComparer.Ordinal)
            .ToArray();

        Assert.True(workflowFiles.Length >= 18, $"Expected at least 18 workflow YAML files, found {workflowFiles.Length}.");

        using var db = TestDbContextFactory.Create();
        var storage = new InMemoryStorageProvider();
        var repository = new WorkflowRepository(storage);
        var orchestrator = new WorkflowOrchestrator(new SystemClock(), repository, db);

        var registeredProcessors = DiscoverRegisteredProcessorNames(db, repoRoot);
        var workflowIds = new HashSet<string>(StringComparer.Ordinal);

        foreach (var filePath in workflowFiles)
        {
            var fileName = Path.GetFileName(filePath);
            var workflowId = Path.GetFileNameWithoutExtension(filePath);
            workflowIds.Add(workflowId);
            await storage.SaveAsync("workflows", fileName, await File.ReadAllTextAsync(filePath));
        }

        foreach (var workflowId in workflowIds.OrderBy(static id => id, StringComparer.Ordinal))
        {
            var definition = await orchestrator.GetDefinitionAsync(workflowId);
            Assert.Equal(workflowId, definition.Name);

            ValidateWorkflowGraphAndProcessors(definition, registeredProcessors, workflowIds);
        }
    }

    [Fact]
    public void ValidateWorkflowGraph_RejectsEmptyDuplicateDanglingCyclicAndUnknownProcessorDefinitions()
    {
        var knownProcessors = new HashSet<string>(StringComparer.Ordinal) { "ExtractRecipe", "SyncRecipe" };
        var knownWorkflows = new HashSet<string>(StringComparer.Ordinal) { "sample" };

        var empty = new WorkflowDefinition { Name = "sample", Tasks = [] };
        var emptyEx = Assert.Throws<InvalidWorkflowException>(() =>
            ValidateWorkflowGraphAndProcessors(empty, knownProcessors, knownWorkflows));
        Assert.Contains("no tasks", emptyEx.Message, StringComparison.OrdinalIgnoreCase);

        var duplicateSteps = new WorkflowDefinition
        {
            Name = "sample",
            Tasks =
            [
                new WorkflowTaskDefinition { Name = "step_a", Processor = "ExtractRecipe" },
                new WorkflowTaskDefinition { Name = "step_a", Processor = "SyncRecipe" },
            ],
        };
        var dupEx = Assert.Throws<InvalidWorkflowException>(() =>
            ValidateWorkflowGraphAndProcessors(duplicateSteps, knownProcessors, knownWorkflows));
        Assert.Contains("Duplicate task", dupEx.Message, StringComparison.OrdinalIgnoreCase);

        var dangling = new WorkflowDefinition
        {
            Name = "sample",
            Tasks =
            [
                new WorkflowTaskDefinition
                {
                    Name = "step_a",
                    Processor = "ExtractRecipe",
                    DependsOn = ["missing_step"],
                },
            ],
        };
        var danglingEx = Assert.Throws<InvalidWorkflowException>(() =>
            ValidateWorkflowGraphAndProcessors(dangling, knownProcessors, knownWorkflows));
        Assert.Contains("missing_step", danglingEx.Message, StringComparison.Ordinal);

        var cyclic = new WorkflowDefinition
        {
            Name = "sample",
            Tasks =
            [
                new WorkflowTaskDefinition { Name = "a", Processor = "ExtractRecipe", DependsOn = ["c"] },
                new WorkflowTaskDefinition { Name = "b", Processor = "SyncRecipe", DependsOn = ["a"] },
                new WorkflowTaskDefinition { Name = "c", Processor = "SyncRecipe", DependsOn = ["b"] },
            ],
        };
        var cycleEx = Assert.Throws<InvalidWorkflowException>(() =>
            ValidateWorkflowGraphAndProcessors(cyclic, knownProcessors, knownWorkflows));
        Assert.Contains("cycle", cycleEx.Message, StringComparison.OrdinalIgnoreCase);

        var unknownProcessor = new WorkflowDefinition
        {
            Name = "sample",
            Tasks =
            [
                new WorkflowTaskDefinition { Name = "step_a", Processor = "NonExistentProcessor" },
            ],
        };
        var procEx = Assert.Throws<InvalidWorkflowException>(() =>
            ValidateWorkflowGraphAndProcessors(unknownProcessor, knownProcessors, knownWorkflows));
        Assert.Contains("NonExistentProcessor", procEx.Message, StringComparison.Ordinal);
    }

    private static void ValidateWorkflowGraphAndProcessors(
        WorkflowDefinition definition,
        IReadOnlySet<string> registeredProcessors,
        IReadOnlySet<string> knownWorkflowIds)
    {
        if (string.IsNullOrWhiteSpace(definition.Name))
        {
            throw new InvalidWorkflowException("Workflow definition name cannot be empty.");
        }

        if (definition.Tasks.Count == 0)
        {
            throw new InvalidWorkflowException($"Workflow '{definition.Name}' contains no tasks.");
        }

        var declaredParameters = new HashSet<string>(StringComparer.Ordinal);
        foreach (var rawParam in definition.Parameters)
        {
            var normalized = rawParam.TrimEnd('?');
            if (string.IsNullOrWhiteSpace(normalized) || !declaredParameters.Add(normalized))
            {
                throw new InvalidWorkflowException($"Workflow '{definition.Name}' has invalid or duplicate parameter '{rawParam}'.");
            }
        }

        var taskNames = new HashSet<string>(StringComparer.Ordinal);
        foreach (var task in definition.Tasks)
        {
            if (string.IsNullOrWhiteSpace(task.Name))
            {
                throw new InvalidWorkflowException($"Workflow '{definition.Name}' contains a task with an empty name.");
            }

            if (!taskNames.Add(task.Name))
            {
                throw new InvalidWorkflowException($"Duplicate task name '{task.Name}' in workflow '{definition.Name}'.");
            }

            if (string.IsNullOrWhiteSpace(task.Processor) || !registeredProcessors.Contains(task.Processor))
            {
                throw new InvalidWorkflowException(
                    $"Workflow '{definition.Name}' task '{task.Name}' references unregistered processor '{task.Processor}'.");
            }

            if (task.Processor == "StartWorkflow"
                && task.Payload.TryGetValue("workflowId", out var rawTarget)
                && rawTarget is string targetWorkflowId
                && !targetWorkflowId.Contains("{{", StringComparison.Ordinal)
                && !knownWorkflowIds.Contains(targetWorkflowId))
            {
                throw new InvalidWorkflowException(
                    $"Workflow '{definition.Name}' task '{task.Name}' dispatches unknown child workflow '{targetWorkflowId}'.");
            }
        }

        var inDegree = taskNames.ToDictionary(static n => n, static _ => 0, StringComparer.Ordinal);
        var dependents = taskNames.ToDictionary(static n => n, static _ => new List<string>(), StringComparer.Ordinal);

        foreach (var task in definition.Tasks)
        {
            var seenDeps = new HashSet<string>(StringComparer.Ordinal);
            foreach (var dep in task.DependsOn)
            {
                if (string.IsNullOrWhiteSpace(dep) || !taskNames.Contains(dep))
                {
                    throw new InvalidWorkflowException(
                        $"Workflow '{definition.Name}' task '{task.Name}' depends on non-existent task '{dep}'.");
                }

                if (dep == task.Name)
                {
                    throw new InvalidWorkflowException(
                        $"Workflow '{definition.Name}' task '{task.Name}' has a self-dependency cycle.");
                }

                if (seenDeps.Add(dep))
                {
                    inDegree[task.Name]++;
                    dependents[dep].Add(task.Name);
                }
            }
        }

        var ready = new Queue<string>(inDegree.Where(static kv => kv.Value == 0).Select(static kv => kv.Key));
        var visitedCount = 0;

        while (ready.Count > 0)
        {
            var current = ready.Dequeue();
            visitedCount++;

            foreach (var next in dependents[current])
            {
                inDegree[next]--;
                if (inDegree[next] == 0)
                {
                    ready.Enqueue(next);
                }
            }
        }

        if (visitedCount != definition.Tasks.Count)
        {
            throw new InvalidWorkflowException($"Workflow '{definition.Name}' contains a dependency cycle.");
        }
    }

    private static HashSet<string> DiscoverRegisteredProcessorNames(RecipeDbContext db, string repoRoot)
    {
        var programCs = File.ReadAllText(Path.Combine(repoRoot, "api", "src", "RecipeApi", "Program.cs"));
        var processorTypes = typeof(IWorkflowProcessor).Assembly.GetTypes()
            .Where(static t => typeof(IWorkflowProcessor).IsAssignableFrom(t) && t is { IsClass: true, IsAbstract: false })
            .ToArray();

        var names = new HashSet<string>(StringComparer.Ordinal);
        var parameterizedTypes = new HashSet<Type>
        {
            typeof(RecipeAgent),
            typeof(ManagementProcessor),
            typeof(DemoModeBypassProcessor),
        };

        foreach (var type in processorTypes)
        {
            if (parameterizedTypes.Contains(type))
            {
                continue;
            }

            var instance = (IWorkflowProcessor)RuntimeHelpers.GetUninitializedObject(type);
            Assert.False(
                string.IsNullOrWhiteSpace(instance.ProcessorName),
                $"IWorkflowProcessor implementation '{type.Name}' requires explicit parameterized registration handling.");
            Assert.True(
                Regex.IsMatch(programCs, $@"\b{Regex.Escape(type.Name)}\b"),
                $"IWorkflowProcessor implementation '{type.Name}' is not registered in Program.cs.");
            names.Add(instance.ProcessorName);
        }

        var chatClient = new Mock<IChatClient>().Object;
        var prompts = new EmbeddedPromptRepository();
        var config = new ConfigurationManager();

        foreach (var agentProcessorName in ParameterizedRecipeAgentNames)
        {
            Assert.Contains($"\"{agentProcessorName}\"", programCs, StringComparison.Ordinal);
            var agent = new RecipeAgent(chatClient, prompts, config, NullLogger<RecipeAgent>.Instance, agentProcessorName);
            names.Add(agent.ProcessorName);
        }

        foreach (var managementProcessorName in ParameterizedManagementProcessorNames)
        {
            Assert.Contains($"\"{managementProcessorName}\"", programCs, StringComparison.Ordinal);
            var processor = new ManagementProcessor(null!, db, managementProcessorName);
            names.Add(processor.ProcessorName);
        }

        return names;
    }

    private static string FindRepoRoot()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null)
        {
            if (File.Exists(Path.Combine(dir.FullName, "specs", "openapi.yaml")))
            {
                return dir.FullName;
            }

            dir = dir.Parent;
        }

        throw new FileNotFoundException("Could not locate repository root containing specs/openapi.yaml.");
    }
}
