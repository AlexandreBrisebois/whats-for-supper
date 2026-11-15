using System.Reflection;
using System.Runtime.ExceptionServices;
using System.Text.Json;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Services;

public sealed class V1AuthoritySuccessorPolicyTests
{
    [Theory]
    [InlineData("valid")]
    [InlineData("old-all221")]
    [InlineData("tracer-selected")]
    [InlineData("retired-selected")]
    [InlineData("missing-recipe")]
    [InlineData("old-operation")]
    [InlineData("duplicate-operation")]
    [InlineData("lost-retired-accounting")]
    public void RemainingSelectionKeepsIndependent197AndComplete221Accounting(string mutation)
    {
        var ids = Enumerable.Range(0, 221).Select(_ => Guid.NewGuid()).ToArray();
        var oldItems = ids.Select(x => new CanonicalMigrationSelection(x, Guid.NewGuid())).ToArray();
        var selected = ids.Skip(1).Take(197).Select(x => new CanonicalMigrationSelection(x, Guid.NewGuid())).ToArray();
        var corpus = ids.Select(x => new CanonicalMigrationSelection(x, Guid.NewGuid())).ToArray();
        var oldPlan = Guid.NewGuid(); var oldAttempt = Guid.NewGuid(); var plan = Guid.NewGuid(); var attempt = Guid.NewGuid();
        if (mutation == "old-all221") selected = corpus;
        if (mutation == "tracer-selected") selected[0] = selected[0] with { RecipeId = ids[0] };
        if (mutation == "retired-selected") selected[0] = selected[0] with { RecipeId = ids[220] };
        if (mutation == "missing-recipe") selected = selected[..^1];
        if (mutation == "old-operation") selected[0] = selected[0] with { OperationId = oldItems[0].OperationId };
        if (mutation == "duplicate-operation") selected[0] = selected[0] with { OperationId = corpus[0].OperationId };
        var recipes = ids.Select((id, i) => new CanonicalMigrationRecipe(id, oldItems[i].OperationId,
            i < 198 ? "requires-forward-assessment" : "defer", i < 198 ? null : "retired-membership-preserved", null, null, null, null, null, null, [])).ToArray();
        if (mutation == "lost-retired-accounting") recipes = recipes[..^1];
        CanonicalMigrationRequest Migration(Guid operation, CanonicalMigrationSelection[] items) => new(operation, "", "", "", Guid.Empty, items);
        var original = new CanonicalMigrationInventory(1, Migration(oldPlan, oldItems), null!, "", null, [], [], [], recipes, [], "");
        var type = typeof(CanonicalRecipeContentStore).Assembly.GetType("RecipeApi.Services.V1TransitionRequest")!;
        object Runtime(Guid operation, Guid attemptId, CanonicalMigrationSelection[] items, CanonicalMigrationSelection[] all) =>
            JsonSerializer.Deserialize(JsonSerializer.Serialize(new { selection = Migration(operation, items), corpus = Migration(Guid.NewGuid(), all), attemptId }, new JsonSerializerOptions(JsonSerializerDefaults.Web)), type, new JsonSerializerOptions(JsonSerializerDefaults.Web))!;
        var old = Runtime(oldPlan, oldAttempt, [oldItems[0]], oldItems);
        var next = Runtime(plan, attempt, selected, corpus);
        void Validate()
        {
            try
            {
                typeof(CanonicalRecipeContentStore).Assembly.GetType("RecipeApi.Services.V1AuthoritySuccessorPolicy")!
                    .GetMethod("RequireRemainingSelection", BindingFlags.Static | BindingFlags.NonPublic)!.Invoke(null, [original, old, next]);
            }
            catch (TargetInvocationException error) { ExceptionDispatchInfo.Capture(error.InnerException!).Throw(); }
        }
        if (mutation == "valid") Validate();
        else Assert.Throws<InvalidDataException>(Validate);
    }
}
