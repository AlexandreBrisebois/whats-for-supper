using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using RecipeApi.Models;

namespace RecipeApi.Services;

internal static class RecipeReportRepairIntent
{
    internal sealed record Command(int Version, Guid Id, Guid RecipeId, string WorkflowId,
        Dictionary<string, string> Parameters, Prepared? Prepared);
    internal sealed record Prepared(string Capture, DateTimeOffset CreatedAt, TaskInput[] Tasks);
    internal sealed record TaskInput(Guid Id, string Name, string Processor, string? Payload, string[] DependsOn);

    internal static RecipeRepairIntent Create(Guid id, Guid recipeId, string workflowId,
        Dictionary<string, string> parameters, WorkflowInstance? prepared, DateTimeOffset now)
    {
        Prepared? snapshot = null;
        if (prepared is not null)
        {
            RecipeFilePublicationStore.ValidateExecutionLaunch(prepared);
            if (prepared.Id != id || prepared.WorkflowId != workflowId || !SameParameters(prepared.Parameters, parameters))
                throw new InvalidDataException("Prepared repair differs from the requested command.");
            snapshot = new(prepared.RecipePublicationCapture!, prepared.CreatedAt, prepared.Tasks.Select(x =>
                new TaskInput(x.TaskId, x.TaskName, x.ProcessorName, x.Payload, x.DependsOn)).ToArray());
        }
        var payload = JsonSerializer.Serialize(new Command(1, id, recipeId, workflowId, parameters, snapshot));
        return new() { Id = id, RecipeId = recipeId, Payload = payload, InputHash = Hash(payload), CreatedAt = now };
    }

    internal static Command Read(RecipeRepairIntent intent)
    {
        var command = JsonSerializer.Deserialize<Command>(intent.Payload)
            ?? throw new InvalidDataException("Repair command is missing.");
        if (intent.InputHash != Hash(intent.Payload) || command.Version != 1 || command.Id != intent.Id
            || command.RecipeId != intent.RecipeId || command.Id == Guid.Empty
            || command.WorkflowId is not ("url-import" or "recipe-import") || command.Parameters is null
            || !command.Parameters.TryGetValue("recipeId", out var recipe) || !Guid.TryParse(recipe, out var id) || id != intent.RecipeId)
            throw new InvalidDataException("Repair command is inconsistent.");
        return command;
    }

    internal static WorkflowInstance Initialize(RecipeRepairIntent intent, string workflowId, Dictionary<string, string> parameters)
    {
        var command = Read(intent);
        if (command.WorkflowId != workflowId || !SameParameters(JsonSerializer.Serialize(command.Parameters), parameters)
            || command.Prepared is not { } prepared || prepared.Tasks is null || prepared.Tasks.Length == 0)
            throw new InvalidDataException("Repair command has no executable original capture.");
        var instance = new WorkflowInstance
        {
            Id = command.Id,
            WorkflowId = command.WorkflowId,
            Parameters = JsonSerializer.Serialize(command.Parameters),
            RecipePublicationCapture = prepared.Capture,
            Status = WorkflowStatus.Pending,
            CreatedAt = prepared.CreatedAt,
            UpdatedAt = prepared.CreatedAt,
            Tasks = prepared.Tasks.Select(x => new WorkflowTask
            {
                TaskId = x.Id,
                InstanceId = command.Id,
                TaskName = x.Name,
                ProcessorName = x.Processor,
                Payload = x.Payload,
                DependsOn = x.DependsOn,
                Status = x.DependsOn.Length == 0 ? Models.TaskStatus.Pending : Models.TaskStatus.Waiting,
                CreatedAt = prepared.CreatedAt,
                UpdatedAt = prepared.CreatedAt
            }).ToList()
        };
        RecipeFilePublicationStore.ValidateExecutionLaunch(instance);
        return instance;
    }

    internal static void ValidateAccepted(RecipeRepairIntent intent, WorkflowInstance accepted)
    {
        var command = Read(intent);
        var original = Initialize(intent, command.WorkflowId, command.Parameters);
        RecipeFilePublicationStore.ValidateExecutionLaunch(accepted);
        if (accepted.Id != original.Id || accepted.WorkflowId != original.WorkflowId
            || !SameParameters(accepted.Parameters, command.Parameters)
            || CanonicalRecipeContentStore.NormalizeJson(accepted.RecipePublicationCapture)
                != CanonicalRecipeContentStore.NormalizeJson(original.RecipePublicationCapture))
            throw new InvalidDataException("Accepted repair differs from its original saved command.");
    }

    internal static bool SameParameters(string? json, Dictionary<string, string> parameters) =>
        CanonicalRecipeContentStore.NormalizeJson(json) == CanonicalRecipeContentStore.NormalizeJson(JsonSerializer.Serialize(parameters));
    private static string Hash(string payload) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(CanonicalRecipeContentStore.NormalizeJson(payload))));
    internal static FoodVocabularyReference[] VocabularyReferences(RecipeRepairIntent intent)
    {
        var json = new JsonSerializerOptions
        {
            RespectRequiredConstructorParameters = true,
            UnmappedMemberHandling = System.Text.Json.Serialization.JsonUnmappedMemberHandling.Disallow
        };
        var command = WorkflowProcessorHistory.ReadObservation<Command>(intent.Payload, json);
        Read(intent);
        if (intent.CreatedAt == default) throw new InvalidDataException("Retained repair time is absent.");
        return command.Prepared is null ? [] : RecipeFilePublicationStore.VocabularyReferences(
            Initialize(intent, command.WorkflowId, command.Parameters));
    }

}
