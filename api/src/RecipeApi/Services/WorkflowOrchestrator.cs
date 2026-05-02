using RecipeApi.Data;
using RecipeApi.Infrastructure;

using TaskStatus = RecipeApi.Models.TaskStatus;
using WorkflowStatus = RecipeApi.Models.WorkflowStatus;
using RecipeApi.Models;
using YamlDotNet.Serialization;
using YamlDotNet.Serialization.NamingConventions;
using System.Text.RegularExpressions;

namespace RecipeApi.Services;

public class InvalidWorkflowException(string message) : Exception(message);

public class WorkflowOrchestrator(WorkflowRepository workflowRepository, RecipeDbContext dbContext) : IWorkflowOrchestrator
{
    private readonly RecipeDbContext _dbContext = dbContext;

    private readonly IDeserializer _deserializer = new DeserializerBuilder()
        .WithNamingConvention(UnderscoredNamingConvention.Instance)
        .Build();

    public async Task<WorkflowDefinition> GetDefinitionAsync(string workflowId)
    {
        var yaml = await workflowRepository.GetWorkflowYamlAsync(workflowId);
        var definition = _deserializer.Deserialize<WorkflowDefinition>(yaml);

        ValidateDefinition(definition);

        return definition;
    }

    public WorkflowDefinition GetDefinition(string workflowId)
    {
        // For synchronous compatibility, though async is preferred
        return GetDefinitionAsync(workflowId).GetAwaiter().GetResult();
    }

    public async Task<WorkflowInstance> TriggerAsync(string workflowId, Dictionary<string, string> parameters)
    {
        var definition = GetDefinition(workflowId);

        // Validate that all required parameters are provided
        foreach (var param in definition.Parameters)
        {
            if (!parameters.ContainsKey(param))
            {
                throw new InvalidWorkflowException($"Missing required parameter: {param}");
            }
        }

        var instance = new WorkflowInstance
        {
            Id = Guid.NewGuid(),
            WorkflowId = workflowId,
            Status = WorkflowStatus.Pending,
            Parameters = System.Text.Json.JsonSerializer.Serialize(parameters),
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        foreach (var taskDef in definition.Tasks)
        {
            var task = new WorkflowTask
            {
                TaskId = Guid.NewGuid(),
                InstanceId = instance.Id,
                TaskName = taskDef.Name,
                ProcessorName = taskDef.Processor,
                Status = taskDef.DependsOn.Any() ? TaskStatus.Waiting : TaskStatus.Pending,
                DependsOn = taskDef.DependsOn.ToArray(),
                Payload = SubstituteVariables(taskDef.Payload, parameters)
            };
            instance.Tasks.Add(task);
        }

        await using var transaction = await _dbContext.Database.BeginTransactionAsync();
        try
        {
            _dbContext.WorkflowInstances.Add(instance);
            await _dbContext.SaveChangesAsync();
            await transaction.CommitAsync();
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }

        return instance;
    }

    private string SubstituteVariables(Dictionary<string, object> payload, Dictionary<string, string> parameters)
    {
        var substitutedPayload = new Dictionary<string, object>();
        var regex = new Regex(@"\{\{(.*?)\}\}");

        foreach (var entry in payload)
        {
            if (entry.Value is string value)
            {
                var substitutedValue = regex.Replace(value, match =>
                {
                    var paramName = match.Groups[1].Value.Trim();
                    return parameters.GetValueOrDefault(paramName, match.Value);
                });
                substitutedPayload[entry.Key] = substitutedValue;
            }
            else
            {
                substitutedPayload[entry.Key] = entry.Value;
            }
        }

        return System.Text.Json.JsonSerializer.Serialize(substitutedPayload);
    }

    private void ValidateDefinition(WorkflowDefinition definition)
    {
        var taskNames = definition.Tasks.Select(t => t.Name).ToHashSet();

        foreach (var task in definition.Tasks)
        {
            // 1. All depends_on IDs exist
            foreach (var dependency in task.DependsOn)
            {
                if (!taskNames.Contains(dependency))
                {
                    throw new InvalidWorkflowException($"Task '{task.Name}' depends on non-existent task '{dependency}'");
                }
            }

            // 2. All parameters used in {{variables}} are defined
            ValidateParameters(task, definition.Parameters);
        }

        // 3. No Circular Dependencies
        DetectCycles(definition);
    }

    private void ValidateParameters(WorkflowTaskDefinition task, List<string> definedParameters)
    {
        var regex = new Regex(@"\{\{(.*?)\}\}");
        var definedParamsSet = definedParameters.ToHashSet();

        foreach (var entry in task.Payload)
        {
            if (entry.Value is string value)
            {
                var matches = regex.Matches(value);
                foreach (Match match in matches)
                {
                    var paramName = match.Groups[1].Value.Trim();
                    if (!definedParamsSet.Contains(paramName))
                    {
                        throw new InvalidWorkflowException($"Task '{task.Name}' uses undefined parameter '{{{{{paramName}}}}}'");
                    }
                }
            }
        }
    }

    private void DetectCycles(WorkflowDefinition definition)
    {
        var adj = definition.Tasks.ToDictionary(t => t.Name, t => t.DependsOn);
        var visited = new HashSet<string>();
        var stack = new HashSet<string>();

        foreach (var taskName in adj.Keys)
        {
            if (HasCycle(taskName, adj, visited, stack))
            {
                throw new InvalidWorkflowException("Circular dependency detected in workflow definition.");
            }
        }
    }

    private bool HasCycle(string current, Dictionary<string, List<string>> adj, HashSet<string> visited, HashSet<string> stack)
    {
        if (stack.Contains(current)) return true;
        if (visited.Contains(current)) return false;

        visited.Add(current);
        stack.Add(current);

        foreach (var neighbor in adj[current])
        {
            if (HasCycle(neighbor, adj, visited, stack)) return true;
        }

        stack.Remove(current);
        return false;
    }
}
