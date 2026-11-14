using System.Text.Json;
using RecipeApi.Models;
using TaskStatus = RecipeApi.Models.TaskStatus;

namespace RecipeApi.Services;

public sealed partial class CurrentRecoveryHouseholdState
{
    // Read associations from frozen processor facts, never from today's workflow
    // definitions, recipe defaults, providers or destination state. Raw payloads
    // and results remain untouched, including extensions we do not interpret.
    private static void ValidateRecoveryProcessorLinks(IReadOnlyDictionary<Guid, CurrentRecoveryWorkflow> workflows,
        HashSet<Guid> recipeIds, CancellationToken ct)
    {
        static void Check(bool condition) { if (!condition) throw new InvalidDataException(); }
        static JsonElement? Property(JsonElement? element, string name)
        {
            if (element is null || element.Value.ValueKind == JsonValueKind.Null) return null;
            Check(element.Value.ValueKind == JsonValueKind.Object);
            var matches = element.Value.EnumerateObject().Where(x => x.Name.Equals(name, StringComparison.OrdinalIgnoreCase)).ToArray();
            Check(matches.Length <= 1);
            return matches.Length == 0 ? null : matches[0].Value;
        }
        static string? Text(JsonElement? element) => element is null || element.Value.ValueKind == JsonValueKind.Null
            ? null : element.Value.GetString();
        static Guid Id(JsonElement? element)
        {
            Check(Guid.TryParse(Text(element), out var id) && id != Guid.Empty); return id;
        }
        static Dictionary<string, string> Parameters(JsonElement? element)
        {
            if (element is null || element.Value.ValueKind == JsonValueKind.Null) return new(StringComparer.Ordinal);
            Check(element.Value.ValueKind == JsonValueKind.Object);
            var values = new Dictionary<string, string>(StringComparer.Ordinal);
            foreach (var property in element.Value.EnumerateObject())
            {
                var value = Text(property.Value);
                Check(!string.IsNullOrWhiteSpace(property.Name) && value is not null && values.TryAdd(property.Name, value));
            }
            return values;
        }
        static bool SameParameters(Dictionary<string, string> expected, Dictionary<string, string>? actual) =>
            expected.Count == (actual?.Count ?? 0) && expected.All(x => actual?.TryGetValue(x.Key, out var value) == true && value == x.Value);
        var children = workflows.Keys.ToDictionary(x => x, _ => new HashSet<Guid>());
        CurrentRecoveryWorkflow Child(CurrentRecoveryWorkflow parent, Guid id, string workflowId)
        {
            Check(id != parent.Id && workflows.ContainsKey(id));
            var child = workflows[id]; Check(child.WorkflowId == workflowId);
            children[parent.Id].Add(id); return child;
        }
        Guid Recipe(CurrentRecoveryWorkflow workflow, JsonElement? payload)
        {
            var id = Id(Property(payload, "recipeId"));
            Check(recipeIds.Contains(id) && workflow.Parameters is not null
                && workflow.Parameters.TryGetValue("recipeId", out var recipe) && Guid.TryParse(recipe, out var declared) && declared == id);
            return id;
        }
        foreach (var workflow in workflows.Values)
            foreach (var task in workflow.Tasks)
            {
                ct.ThrowIfCancellationRequested();
                // Failed/interrupted historical work can contain the very invalid
                // input that caused failure. Without a saved result it asserts no
                // child association. Retain it only as explicitly nonexecuting facts.
                if (workflow.LaunchDisposition != "captured" && task.Status != TaskStatus.Completed && task.Result is null) continue;
                if (task.ProcessorName is "RecipeReady" or "SyncRecipe" or "ExtractRecipe" or "GenerateDescription"
                    or "SynthesizeRecipe" or "GenerateHero" or "FetchUrlContent" or "ConvertPdf"
                    or "CategorizeIngredients" or "CategorizeRecipe" or "ClassifyRecipeVegetarian" or "IndexRecipeSearch")
                {
                    var recipe = Recipe(workflow, task.Payload);
                    if (Property(task.Result, "recipeId") is { } resultRecipe) Check(Id(resultRecipe) == recipe);
                    if (task.ProcessorName == "IndexRecipeSearch")
                    {
                        var fingerprint = Text(Property(task.Payload, "fingerprint"));
                        var declared = workflow.Parameters!.GetValueOrDefault("fingerprint");
                        // Retain old unguarded indexing as such; never supply a
                        // fingerprint from today's recipe to complete its intent.
                        Check(fingerprint == declared);
                    }
                }
                if (task.ProcessorName == "StartWorkflow")
                {
                    var workflowId = Text(Property(task.Payload, "workflowId"));
                    Check(!string.IsNullOrWhiteSpace(workflowId));
                    var parameters = Parameters(Property(task.Payload, "parameters"));
                    var cron = Text(Property(Property(task.Payload, "schedule"), "cron"));
                    if (task.Result is null) { Check(task.Status != TaskStatus.Completed); continue; }
                    if (workflowId == "demo-restore")
                    {
                        // This processor delegates to the demo scheduling owner,
                        // whose result can confirm an existing successor or no child.
                        var state = Text(Property(task.Result, "state"));
                        var error = Text(Property(task.Result, "errorCode"));
                        if (state is "disabled" or "unhealthy")
                        {
                            Check(error == (state == "disabled" ? "DEMO_DISABLED" : "INVALID_CRON")
                                && Text(Property(task.Result, "instanceId")) is null && Text(Property(task.Result, "scheduledAt")) is null);
                            continue;
                        }
                        Check(state is "scheduled" or "running" && error is null);
                        var child = Child(workflow, Id(Property(task.Result, "instanceId")), workflowId);
                        Check(child.Parameters?.GetValueOrDefault(DemoWorkflowSeeder.AutomaticParameter) == "true");
                        var scheduled = Property(task.Result, "scheduledAt");
                        if (scheduled is { ValueKind: not JsonValueKind.Null }) Check(scheduled.Value.GetDateTimeOffset() != default);
                    }
                    else
                    {
                        Check(Text(Property(task.Result, "workflowId")) == workflowId);
                        var child = Child(workflow, Id(Property(task.Result, "instanceId")), workflowId!);
                        Check(SameParameters(parameters, child.Parameters));
                        var scheduled = Property(task.Result, "scheduledAt");
                        Check(scheduled is not null && (scheduled.Value.ValueKind == JsonValueKind.Null) == string.IsNullOrWhiteSpace(cron));
                        if (scheduled is { ValueKind: not JsonValueKind.Null }) Check(scheduled.Value.GetDateTimeOffset() != default);
                        // Root schedules are mutable retry facts; do not replace
                        // this original dispatch receipt with their current values.
                    }
                }
                else if (task.ProcessorName is "CompleteRecipeImportReport" or "QueueRecipeSearchIndex")
                {
                    var recipe = Recipe(workflow, task.Payload);
                    if (task.Result is null) { Check(task.Status != TaskStatus.Completed); continue; }
                    Check(Id(Property(task.Result, "recipeId")) == recipe);
                    if (task.ProcessorName == "CompleteRecipeImportReport")
                        Check(Id(Property(task.Result, "workflowInstanceId")) == workflow.Id);
                    else if (Text(Property(task.Result, "status")) == "Skipped")
                        Check(Property(task.Result, "workflowInstanceId") is null);
                    else
                    {
                        Check(Property(task.Result, "status") is null);
                        var child = Child(workflow, Id(Property(task.Result, "workflowInstanceId")), "index-recipe-search");
                        Check(child.Parameters is not null && child.Parameters.TryGetValue("recipeId", out var childRecipe)
                            && Guid.TryParse(childRecipe, out var id) && id == recipe
                            && !string.IsNullOrWhiteSpace(child.Parameters.GetValueOrDefault("fingerprint")));
                        // This captured fingerprint may be historical. Today's
                        // recipe cannot certify or replace the indexed source.
                    }
                }
            }
        var incoming = workflows.Keys.ToDictionary(x => x, _ => 0);
        foreach (var links in children.Values) foreach (var child in links) incoming[child]++;
        var ready = new Queue<Guid>(incoming.Where(x => x.Value == 0).Select(x => x.Key));
        var visited = 0;
        while (ready.TryDequeue(out var id))
        {
            ct.ThrowIfCancellationRequested(); visited++;
            foreach (var child in children[id]) if (--incoming[child] == 0) ready.Enqueue(child);
        }
        Check(visited == workflows.Count);
    }
}
