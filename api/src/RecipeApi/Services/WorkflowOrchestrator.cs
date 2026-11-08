using RecipeApi.Data;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using RecipeApi.Infrastructure;

using TaskStatus = RecipeApi.Models.TaskStatus;
using WorkflowStatus = RecipeApi.Models.WorkflowStatus;
using RecipeApi.Models;
using YamlDotNet.Serialization;
using YamlDotNet.Serialization.NamingConventions;
using System.Text.RegularExpressions;

namespace RecipeApi.Services;

public class InvalidWorkflowException(string message) : Exception(message);

public partial class WorkflowOrchestrator(IClock clock, WorkflowRepository workflowRepository, RecipeDbContext dbContext, RecipeFilePublicationStore publications) : IWorkflowOrchestrator
{
    private readonly RecipeDbContext _dbContext = dbContext;

    private readonly IDeserializer _deserializer = new DeserializerBuilder()
        .WithNamingConvention(UnderscoredNamingConvention.Instance)
        .Build();

    public async Task<WorkflowDefinition> GetDefinitionAsync(string workflowId)
    {
        var yaml = await workflowRepository.GetWorkflowYamlAsync(workflowId);
        var definition = _deserializer.Deserialize<WorkflowDefinition>(yaml);

        if (definition == null)
        {
            throw new InvalidWorkflowException($"Workflow definition {workflowId}.yaml is empty or invalid.");
        }

        ValidateDefinition(definition);

        return definition;
    }


    public async Task<WorkflowInstance> TriggerAsync(
        string workflowId,
        Dictionary<string, string> parameters,
        DateTimeOffset? scheduledAt = null)
        => await AcceptAsync(workflowId, parameters, scheduledAt);

    public async Task<WorkflowInstance> TriggerImportAsync(Guid instanceId, Guid recipeId,
        string workflowId, Dictionary<string, string> parameters)
    {
        if (instanceId == Guid.Empty || recipeId == Guid.Empty
            || workflowId is not ("url-import" or "recipe-import")
            || !parameters.TryGetValue("recipeId", out var recipe) || !Guid.TryParse(recipe, out var id) || id != recipeId)
            throw new ArgumentException("Import acceptance requires matching recipe and workflow identities.");
        return await AcceptAsync(workflowId, parameters, null, instanceId, recipeId, requireReportFeedback: false);
    }

    public async Task<WorkflowInstance> PrepareReportAsync(Guid instanceId, string workflowId, Dictionary<string, string> parameters)
    {
        var definition = await GetDefinitionAsync(workflowId);
        var instance = ConstructInstance(workflowId, definition, parameters, clock.UtcNow);
        instance.Id = instanceId;
        foreach (var task in instance.Tasks) task.InstanceId = instanceId;
        await publications.CaptureLaunchAsync(instance, requireSourceMatch: true);
        return instance;
    }

    public async Task<WorkflowInstance> TriggerReportAsync(Guid instanceId, Guid recipeId,
        string workflowId, Dictionary<string, string> parameters)
    {
        if (instanceId == Guid.Empty || recipeId == Guid.Empty)
            throw new ArgumentException("Report acceptance requires recipe and workflow identities.");
        return await AcceptAsync(workflowId, parameters, null, instanceId, recipeId);
    }

    private async Task<WorkflowInstance> AcceptAsync(string workflowId, Dictionary<string, string> parameters,
        DateTimeOffset? scheduledAt, Guid? instanceId = null, Guid? reportRecipeId = null, bool requireReportFeedback = true)
    {
        parameters = new(parameters);
        if (instanceId is { } savedId)
            await WorkflowLifecycle.RequireActiveIdentityAsync(_dbContext, savedId);
        if (reportRecipeId is not null && requireReportFeedback)
        {
            var intent = await _dbContext.RecipeRepairIntents.AsNoTracking().SingleOrDefaultAsync(x => x.Id == instanceId)
                ?? throw new InvalidDataException("Original repair intent is missing.");
            if (intent.RecipeId != reportRecipeId) throw new InvalidDataException("Repair recipe differs.");
            var original = RecipeReportRepairIntent.Initialize(intent, workflowId, parameters);
            return await CommitAsync(original, reportRecipeId, requireReportFeedback);
        }
        return await AcceptOriginalLaunchAsync(instanceId ?? Guid.NewGuid(), workflowId, parameters,
            scheduledAt, reportRecipeId);
    }

    private async Task<WorkflowInstance> CommitAsync(WorkflowInstance instance, Guid? reportRecipeId, bool requireReportFeedback,
        WorkflowLaunchIntent? launch = null)
    {
        await using var transaction = await _dbContext.Database.BeginTransactionAsync();
        try
        {
            await WorkflowLifecycle.LockIdentityAsync(_dbContext, instance.Id);
            await WorkflowLifecycle.RequireActiveIdentityAsync(_dbContext, instance.Id);
            if (launch is not null)
            {
                await _dbContext.Entry(launch).ReloadAsync();
                await RequireLaunchRecoveryOperationAsync(launch);
                ValidateOriginalLaunch(launch, instance);
                var actual = await _dbContext.WorkflowInstances.AsNoTracking().Include(x => x.Tasks)
                    .SingleOrDefaultAsync(x => x.Id == instance.Id);
                if (actual is not null)
                {
                    await RequireLaunchRecoveryOperationAsync(launch);
                    ValidateOriginalLaunch(launch, actual);
                    if (launch.AcceptedAt is null) throw new InvalidDataException("Launch has no acceptance receipt.");
                    await transaction.CommitAsync();
                    return actual;
                }
                if (launch.AcceptedAt is not null) throw new InvalidDataException("Accepted launch history is absent; it cannot execute again.");
                launch.AcceptedAt = clock.UtcNow;
            }
            if (reportRecipeId is { } recipeId)
            {
                // Link the exact persisted feedback before the child can become
                // visible to a worker. Reload after the lock, never a stale tracked report.
                if (_dbContext.Database.IsNpgsql())
                    await _dbContext.Database.ExecuteSqlAsync($"SELECT recipe_id FROM recipe_import_reports WHERE recipe_id = {recipeId} FOR UPDATE");
                var report = await _dbContext.RecipeImportReports.SingleOrDefaultAsync(x => x.RecipeId == recipeId);
                if (report is not null) await _dbContext.Entry(report).ReloadAsync();
                if (requireReportFeedback)
                {
                    if (report?.RepairIntentId != instance.Id) throw new InvalidDataException("Repair intent is no longer selected by this report.");
                    RecipeImportReportService.AssociateLaunch(report, instance, clock.UtcNow);
                }
                else if (report is not null)
                    RecipeImportReportService.AssociateManualImport(report, instance.Id, clock.UtcNow);
            }
            _dbContext.WorkflowInstances.Add(instance);
            await _dbContext.SaveChangesAsync();
            await transaction.CommitAsync();
        }
        catch
        {
            // Dispose before independent readback, including a lost commit reply.
            await transaction.DisposeAsync();
            if (launch is not null)
            {
                await ReloadLaunchAttemptAsync(instance, launch, reportRecipeId);
                var actual = await _dbContext.WorkflowInstances.AsNoTracking().Include(x => x.Tasks)
                    .SingleOrDefaultAsync(x => x.Id == instance.Id);
                if (actual is not null)
                {
                    ValidateOriginalLaunch(launch, actual);
                    if (launch.AcceptedAt is not null) return actual;
                }
            }
            throw;
        }

        return instance;
    }

    internal static WorkflowInstance ConstructInstance(string workflowId, WorkflowDefinition definition,
        Dictionary<string, string> parameters, DateTimeOffset now, DateTimeOffset? scheduledAt = null)
    {
        // Validate that all required parameters are provided.
        foreach (var param in definition.Parameters)
        {
            if (!IsOptionalParameter(param) && !parameters.ContainsKey(ParameterName(param)))
            {
                throw new InvalidWorkflowException($"Missing required parameter: {ParameterName(param)}");
            }
        }

        var instance = new WorkflowInstance
        {
            Id = Guid.NewGuid(),
            WorkflowId = workflowId,
            Status = WorkflowStatus.Pending,
            Parameters = System.Text.Json.JsonSerializer.Serialize(parameters),
            CreatedAt = now,
            UpdatedAt = now
        };

        AddTasks(instance, definition, parameters, now, scheduledAt);

        return instance;
    }

    public async Task<WorkflowInstance?> InitializeUrlCaptureAsync(Guid instanceId, CancellationToken ct = default)
    {
        var pending = await _dbContext.WorkflowInstances.AsNoTracking().Include(x => x.Tasks)
            .SingleOrDefaultAsync(x => x.Id == instanceId, ct);
        WorkflowInstance? prepared = null;
        if (pending is not null && UrlCaptureInitialization.IsPending(pending))
        {
            await publications.ValidateBootstrapInitializationAsync(pending, ct);
            var definition = await GetDefinitionAsync(pending.WorkflowId);
            var parameters = JsonSerializer.Deserialize<Dictionary<string, string>>(pending.Parameters!)!;
            prepared = ConstructInstance(pending.WorkflowId, definition, parameters, clock.UtcNow);
            prepared.Id = instanceId;
            foreach (var task in prepared.Tasks) task.InstanceId = instanceId;
            await publications.CaptureLaunchAsync(prepared, ct);
        }
        await using var transaction = await _dbContext.Database.BeginTransactionAsync(ct);
        var instance = await UrlCaptureInitialization.LoadLockedAsync(_dbContext, instanceId, ct);
        if (instance is null || !UrlCaptureInitialization.IsPending(instance))
        {
            await transaction.CommitAsync(ct);
            return instance;
        }

        await publications.ValidateBootstrapInitializationAsync(instance, ct);
        if (prepared is null) throw new InvalidWorkflowException("URL initialization is unavailable.");
        if (prepared.Tasks.Count == 0)
            throw new InvalidWorkflowException("URL import must contain acquisition work.");
        _dbContext.WorkflowTasks.RemoveRange(instance.Tasks);
        instance.Tasks.Clear();
        var now = clock.UtcNow;
        if (CanonicalRecipeContentStore.NormalizeJson(instance.Parameters) != CanonicalRecipeContentStore.NormalizeJson(pending!.Parameters))
            throw new InvalidWorkflowException("URL initialization inputs changed during capture.");
        instance.RecipePublicationCapture = prepared.RecipePublicationCapture;
        foreach (var task in prepared.Tasks) instance.Tasks.Add(task);
        _dbContext.WorkflowTasks.AddRange(instance.Tasks);
        instance.Status = WorkflowStatus.Pending;
        instance.UpdatedAt = now;
        await _dbContext.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return instance;
    }

    public async Task<WorkflowInstance?> InitializeRecipeFollowupAsync(Guid instanceId, CancellationToken ct = default)
    {
        var pending = await _dbContext.WorkflowInstances.AsNoTracking().Include(x => x.Tasks)
            .SingleOrDefaultAsync(x => x.Id == instanceId, ct);
        WorkflowInstance? prepared = null;
        if (pending is not null && RecipeFollowupInitialization.IsPending(pending))
        {
            await publications.ValidateFollowupInitializationAsync(pending, ct);
            var definition = await GetDefinitionAsync(pending.WorkflowId);
            var parameters = JsonSerializer.Deserialize<Dictionary<string, string>>(pending.Parameters!)!;
            prepared = ConstructInstance(pending.WorkflowId, definition, parameters, clock.UtcNow);
            prepared.Id = instanceId;
            foreach (var task in prepared.Tasks) task.InstanceId = instanceId;
            await publications.CaptureLaunchAsync(prepared, ct);
        }
        await using var transaction = await _dbContext.Database.BeginTransactionAsync(ct);
        var instance = await UrlCaptureInitialization.LoadLockedAsync(_dbContext, instanceId, ct);
        if (instance is null || !RecipeFollowupInitialization.IsPending(instance))
        {
            await transaction.CommitAsync(ct);
            return instance;
        }

        await publications.ValidateFollowupInitializationAsync(instance, ct);
        if (prepared is null) throw new InvalidWorkflowException("Recipe follow-up initialization is unavailable.");
        if (prepared.Tasks.Count == 0)
            throw new InvalidWorkflowException("Recipe follow-up must contain work.");
        _dbContext.WorkflowTasks.RemoveRange(instance.Tasks);
        instance.Tasks.Clear();
        var now = clock.UtcNow;
        if (CanonicalRecipeContentStore.NormalizeJson(instance.Parameters) != CanonicalRecipeContentStore.NormalizeJson(pending!.Parameters))
            throw new InvalidWorkflowException("Recipe follow-up initialization inputs changed during capture.");
        instance.RecipePublicationCapture = prepared.RecipePublicationCapture;
        foreach (var task in prepared.Tasks) instance.Tasks.Add(task);
        _dbContext.WorkflowTasks.AddRange(instance.Tasks);
        instance.Status = WorkflowStatus.Pending;
        instance.UpdatedAt = now;
        await _dbContext.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return instance;
    }

    private static void AddTasks(WorkflowInstance instance, WorkflowDefinition definition,
        Dictionary<string, string> parameters, DateTimeOffset now, DateTimeOffset? scheduledAt)
    {
        foreach (var taskDef in definition.Tasks)
        {
            var task = new WorkflowTask
            {
                CreatedAt = now,
                UpdatedAt = now,
                TaskId = Guid.NewGuid(),
                InstanceId = instance.Id,
                TaskName = taskDef.Name,
                ProcessorName = taskDef.Processor,
                Status = taskDef.DependsOn.Any() ? TaskStatus.Waiting : TaskStatus.Pending,
                ScheduledAt = !taskDef.DependsOn.Any() ? scheduledAt : null,
                DependsOn = taskDef.DependsOn.ToArray(),
                Payload = SubstituteVariables(taskDef.Payload, parameters, definition.Parameters)
            };
            instance.Tasks.Add(task);
        }

    }

    private static string SubstituteVariables(
        Dictionary<string, object> payload,
        Dictionary<string, string> parameters,
        List<string> definitionParameters)
    {
        var substitutedPayload = new Dictionary<string, object>();
        var regex = new Regex(@"\{\{(.*?)\}\}");
        var optionalParameters = definitionParameters
            .Where(IsOptionalParameter)
            .Select(ParameterName)
            .ToHashSet(StringComparer.Ordinal);

        foreach (var entry in payload)
        {
            if (entry.Value is string value)
            {
                var matches = regex.Matches(value);
                if (matches.Any(match =>
                    optionalParameters.Contains(match.Groups[1].Value.Trim())
                    && !parameters.ContainsKey(match.Groups[1].Value.Trim())))
                {
                    continue;
                }

                var substitutedValue = regex.Replace(value, match =>
                {
                    var paramName = match.Groups[1].Value.Trim();
                    return parameters.GetValueOrDefault(paramName, match.Value);
                });

                if (bool.TryParse(substitutedValue, out var b))
                    substitutedPayload[entry.Key] = b;
                else if (long.TryParse(substitutedValue, out var n))
                    substitutedPayload[entry.Key] = n;
                else
                    substitutedPayload[entry.Key] = substitutedValue;
            }
            else
            {
                substitutedPayload[entry.Key] = entry.Value;
            }
        }

        return System.Text.Json.JsonSerializer.Serialize(substitutedPayload);
    }

    private static bool IsOptionalParameter(string parameter) => parameter.EndsWith('?', StringComparison.Ordinal);

    private static string ParameterName(string parameter) => parameter.TrimEnd('?');

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
        var definedParamsSet = definedParameters.Select(ParameterName).ToHashSet();

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
