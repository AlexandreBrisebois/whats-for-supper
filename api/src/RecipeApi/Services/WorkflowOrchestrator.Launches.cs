using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Models;

namespace RecipeApi.Services;

public partial class WorkflowOrchestrator
{
    private sealed record LaunchRequest(int Version, Guid Id, string WorkflowId,
        Dictionary<string, string> Parameters, DateTimeOffset? ScheduledAt, Guid? ReportRecipeId, Guid? RecoveryOperationId);
    private sealed record LaunchTask(Guid Id, string Name, string Processor, string? Payload,
        string[] DependsOn, DateTimeOffset? ScheduledAt);
    private sealed record LaunchPrepared(DateTimeOffset CreatedAt, string Capture, LaunchTask[] Tasks);

    private static readonly JsonSerializerOptions LaunchHistoryJson = new()
    {
        RespectRequiredConstructorParameters = true,
        UnmappedMemberHandling = JsonUnmappedMemberHandling.Disallow
    };

    // Retained preparation precedes runtime membership. Read its own original
    // command and graph without accepting work or consulting today's definition.
    public static FoodVocabularyReference[] VocabularyReferences(WorkflowLaunchIntent intent)
    {
        var request = WorkflowProcessorHistory.ReadObservation<LaunchRequest>(intent.Request, LaunchHistoryJson);
        ReadLaunchRequest(intent);
        if (intent.CreatedAt == default || request.Parameters.Any(x => string.IsNullOrWhiteSpace(x.Key) || x.Value is null))
            throw new InvalidDataException("Original launch observation is inconsistent.");
        if (intent.Prepared is null)
        {
            if (intent.PreparedHash is not null || intent.AcceptedAt is not null)
                throw new InvalidDataException("Unprepared launch has a later receipt.");
            return [];
        }
        var prepared = WorkflowProcessorHistory.ReadObservation<LaunchPrepared>(intent.Prepared, LaunchHistoryJson);
        if (prepared.CreatedAt == default || string.IsNullOrWhiteSpace(prepared.Capture)
            || prepared.Tasks is null || prepared.Tasks.Length == 0
            || prepared.Tasks.Any(x => x is null || x.Id == Guid.Empty || x.DependsOn is null)
            || prepared.Tasks.Select(x => x.Id).Distinct().Count() != prepared.Tasks.Length)
            throw new InvalidDataException("Original prepared launch is inconsistent.");
        return RecipeFilePublicationStore.VocabularyReferences(InitializeOriginalLaunch(intent));
    }

    private static string LaunchHash(string value) => Convert.ToHexString(SHA256.HashData(
        Encoding.UTF8.GetBytes(CanonicalRecipeContentStore.NormalizeJson(value))));

    private async Task<WorkflowInstance> AcceptOriginalLaunchAsync(Guid id, string workflowId,
        Dictionary<string, string> parameters, DateTimeOffset? scheduledAt, Guid? reportRecipeId)
    {
        // Copy caller-owned inputs before any await. Only the first creator may
        // capture. A retained request without a prepared graph stays unqualified.
        var originalParameters = new Dictionary<string, string>(parameters);
        var recoveryOperation = await CurrentLaunchRecoveryOperationAsync();
        var request = JsonSerializer.Serialize(new LaunchRequest(1, id, workflowId,
            originalParameters, scheduledAt, reportRecipeId, recoveryOperation));
        WorkflowLaunchIntent intent;
        bool created;
        await using (var transaction = await _dbContext.Database.BeginTransactionAsync())
        {
            try
            {
                await WorkflowLifecycle.LockIdentityAsync(_dbContext, id);
                await WorkflowLifecycle.RequireActiveIdentityAsync(_dbContext, id);
                intent = (await _dbContext.WorkflowLaunchIntents.SingleOrDefaultAsync(x => x.Id == id))!;
                created = intent is null;
                if (created)
                {
                    if (await _dbContext.WorkflowInstances.AnyAsync(x => x.Id == id))
                        throw new InvalidDataException("Existing work lacks its original launch command.");
                    intent = new() { Id = id, Request = request, RequestHash = LaunchHash(request), CreatedAt = clock.UtcNow };
                    _dbContext.WorkflowLaunchIntents.Add(intent);
                    await RequireLaunchRecoveryOperationAsync(intent);
                    await _dbContext.SaveChangesAsync();
                }
                else
                {
                    await _dbContext.Entry(intent!).ReloadAsync();
                    ReadLaunchRequest(intent!);
                    if (intent!.RequestHash != LaunchHash(request))
                        throw new InvalidDataException("Launch differs from the original saved command.");
                }
                await transaction.CommitAsync();
            }
            catch
            {
                await transaction.DisposeAsync();
                await ReloadLaunchIntentAsync(id);
                throw;
            }
        }
        if (created)
        {
            var original = ReadLaunchRequest(intent);
            var definition = await GetDefinitionAsync(original.WorkflowId);
            var instance = ConstructInstance(original.WorkflowId, definition, original.Parameters, clock.UtcNow, original.ScheduledAt);
            instance.Id = id;
            foreach (var task in instance.Tasks) task.InstanceId = id;
            await publications.CaptureLaunchAsync(instance);
            var prepared = JsonSerializer.Serialize(new LaunchPrepared(instance.CreatedAt, instance.RecipePublicationCapture!,
                instance.Tasks.Select(x => new LaunchTask(x.TaskId, x.TaskName, x.ProcessorName,
                    x.Payload, x.DependsOn, x.ScheduledAt)).ToArray()));
            await using var transaction = await _dbContext.Database.BeginTransactionAsync();
            try
            {
                await WorkflowLifecycle.LockIdentityAsync(_dbContext, id);
                await WorkflowLifecycle.RequireActiveIdentityAsync(_dbContext, id);
                await _dbContext.Entry(intent).ReloadAsync();
                ReadLaunchRequest(intent);
                await RequireLaunchRecoveryOperationAsync(intent);
                if (intent.RequestHash != LaunchHash(request) || intent.Prepared is not null || intent.AcceptedAt is not null)
                    throw new InvalidDataException("Launch changed during original capture.");
                intent.Prepared = prepared;
                intent.PreparedHash = LaunchHash(prepared);
                await _dbContext.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch
            {
                await transaction.DisposeAsync();
                await ReloadLaunchIntentAsync(id);
                throw;
            }
        }
        var command = ReadLaunchRequest(intent);
        return await CommitAsync(InitializeOriginalLaunch(intent), command.ReportRecipeId, false, intent);
    }

    private static LaunchRequest ReadLaunchRequest(WorkflowLaunchIntent intent)
    {
        using var document = JsonDocument.Parse(intent.Request);
        if (!document.RootElement.TryGetProperty(nameof(LaunchRequest.RecoveryOperationId), out _))
            throw new InvalidDataException("Original launch has no captured recovery publication observation.");
        var request = JsonSerializer.Deserialize<LaunchRequest>(intent.Request)
            ?? throw new InvalidDataException("Original launch request is missing.");
        if (request.Version != 1 || request.Id != intent.Id || request.Id == Guid.Empty
            || string.IsNullOrWhiteSpace(request.WorkflowId) || request.Parameters is null
            || intent.RequestHash != LaunchHash(intent.Request))
            throw new InvalidDataException("Original launch request is inconsistent.");
        if (request.ReportRecipeId is { } recipeId && (request.WorkflowId is not ("url-import" or "recipe-import")
            || !request.Parameters.TryGetValue("recipeId", out var recipe) || !Guid.TryParse(recipe, out var parsed) || parsed != recipeId))
            throw new InvalidDataException("Original manual recipe association is inconsistent.");
        return request;
    }

    private async Task ReloadLaunchIntentAsync(Guid id)
    {
        foreach (var entry in _dbContext.ChangeTracker.Entries<WorkflowLaunchIntent>().Where(x => x.Entity.Id == id).ToArray())
        {
            if (entry.State == EntityState.Added) entry.State = EntityState.Detached;
            else await entry.ReloadAsync();
        }
    }

    private Task<Guid?> CurrentLaunchRecoveryOperationAsync() => _dbContext.RecoveryPublications.AsNoTracking()
        .Where(x => x.Id == 1).Select(x => (Guid?)x.OperationId).SingleOrDefaultAsync();

    private async Task RequireLaunchRecoveryOperationAsync(WorkflowLaunchIntent intent)
    {
        if (ReadLaunchRequest(intent).RecoveryOperationId != await CurrentLaunchRecoveryOperationAsync())
            throw new InvalidDataException("Original launch belongs to another household recovery publication.");
    }

    private static WorkflowInstance InitializeOriginalLaunch(WorkflowLaunchIntent intent)
    {
        var request = ReadLaunchRequest(intent);
        if (intent.Prepared is null || intent.PreparedHash != LaunchHash(intent.Prepared))
            throw new InvalidDataException("Original launch has no executable capture.");
        var prepared = JsonSerializer.Deserialize<LaunchPrepared>(intent.Prepared)
            ?? throw new InvalidDataException("Original launch graph is missing.");
        if (prepared.Tasks is null || prepared.Capture is null)
            throw new InvalidDataException("Original launch graph is incomplete.");
        var instance = new WorkflowInstance
        {
            Id = intent.Id,
            WorkflowId = request.WorkflowId,
            Parameters = JsonSerializer.Serialize(request.Parameters),
            RecipePublicationCapture = prepared.Capture,
            Status = WorkflowStatus.Pending,
            CreatedAt = prepared.CreatedAt,
            UpdatedAt = prepared.CreatedAt,
            Tasks = prepared.Tasks.Select(x => new WorkflowTask
            {
                TaskId = x.Id,
                InstanceId = intent.Id,
                TaskName = x.Name,
                ProcessorName = x.Processor,
                Payload = x.Payload,
                DependsOn = x.DependsOn,
                ScheduledAt = x.ScheduledAt,
                Status = x.DependsOn.Length == 0 ? Models.TaskStatus.Pending : Models.TaskStatus.Waiting,
                CreatedAt = prepared.CreatedAt,
                UpdatedAt = prepared.CreatedAt
            }).ToList()
        };
        RecipeFilePublicationStore.ValidateExecutionLaunch(instance);
        return instance;
    }

    private static void ValidateOriginalLaunch(WorkflowLaunchIntent intent, WorkflowInstance actual)
    {
        var original = InitializeOriginalLaunch(intent);
        RecipeFilePublicationStore.ValidateExecutionLaunch(actual);
        if (original.Id != actual.Id || original.WorkflowId != actual.WorkflowId
            || CanonicalRecipeContentStore.NormalizeJson(original.Parameters) != CanonicalRecipeContentStore.NormalizeJson(actual.Parameters)
            || CanonicalRecipeContentStore.NormalizeJson(original.RecipePublicationCapture) != CanonicalRecipeContentStore.NormalizeJson(actual.RecipePublicationCapture))
            throw new InvalidDataException("Accepted work differs from its original launch.");
    }

    private async Task ReloadLaunchAttemptAsync(WorkflowInstance instance, WorkflowLaunchIntent intent, Guid? reportRecipeId)
    {
        foreach (var entry in _dbContext.ChangeTracker.Entries<WorkflowTask>().Where(x => x.Entity.InstanceId == instance.Id).ToArray())
        {
            if (entry.State == EntityState.Added) entry.State = EntityState.Detached;
            else await entry.ReloadAsync();
        }
        foreach (var entry in _dbContext.ChangeTracker.Entries<WorkflowInstance>().Where(x => x.Entity.Id == instance.Id).ToArray())
        {
            if (entry.State == EntityState.Added) entry.State = EntityState.Detached;
            else await entry.ReloadAsync();
        }
        await _dbContext.Entry(intent).ReloadAsync();
        foreach (var entry in _dbContext.ChangeTracker.Entries<RecipeImportReport>()
            .Where(x => x.Entity.RecipeId == reportRecipeId).ToList()) await entry.ReloadAsync();
    }

    public async Task<int> ReconcileLaunchesAsync(CancellationToken ct = default)
    {
        var accepted = 0;
        var offset = 0;
        while (accepted < 10)
        {
            var batch = await _dbContext.WorkflowLaunchIntents.AsNoTracking()
                .Where(x => x.AcceptedAt == null && x.Prepared != null
                    && !_dbContext.WorkflowLifecycleRecords.Any(history => history.Id == x.Id))
                .OrderBy(x => x.CreatedAt).ThenBy(x => x.Id).Skip(offset).Take(10).ToArrayAsync(ct);
            if (batch.Length == 0) break;
            foreach (var snapshot in batch)
            {
                ct.ThrowIfCancellationRequested();
                try
                {
                    var request = ReadLaunchRequest(snapshot);
                    var intent = await _dbContext.WorkflowLaunchIntents.SingleAsync(x => x.Id == snapshot.Id, ct);
                    await _dbContext.Entry(intent).ReloadAsync(ct);
                    await CommitAsync(InitializeOriginalLaunch(intent), request.ReportRecipeId, false, intent);
                    accepted++;
                }
                catch (Exception ex) when (ex is InvalidDataException or InvalidWorkflowException or JsonException)
                {
                    // Retain absent/divergent authority. Never recapture, mark a
                    // historical task completed, or discard it to free the queue.
                    offset++;
                }
                if (accepted == 10) break;
            }
            if (batch.Length < 10) break;
        }
        return accepted;
    }
}
