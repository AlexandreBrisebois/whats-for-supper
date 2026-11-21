using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Integration;

public sealed partial class CanonicalIngredientEditPostgresTests
{
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task CookingStepScalingPostgres_ConcurrentWinner_IngredientIsQualifiedDeterministically() => ControlledWinner(false);

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task CookingStepScalingPostgres_ConcurrentWinner_InstructionIsQualifiedDeterministically() => ControlledWinner(true);

    private async Task ControlledWinner(bool instructionWins)
    {
        var losingEntered = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var releaseLosing = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        await WithEditor(async (factory, before) =>
        {
            before = await SeedCookingWholeUse(factory, before);
            using var ingredient = factory.CreateAuthenticatedClient();
            using var instruction = factory.CreateAuthenticatedClient();
            (instructionWins ? ingredient : instruction).DefaultRequestHeaders.Add("X-Test-Controlled-Loser", "1");
            var section = before.InstructionSections[0];
            object IngredientInput() => new { expectedContentRevision = before.ContentRevision, name = "Ingredient winner",
                ingredientLines = new[] { Row(before.IngredientLines[0], "250"), Row(before.IngredientLines[1]) } };
            object InstructionInput() => new { expectedContentRevision = before.ContentRevision, name = "Instruction winner",
                instructionSections = new[] { new { id = section.Id, name = section.Name,
                    steps = section.Steps.Select(step => new { id = step.Id, text = "Stir gently." }).ToArray() } } };
            var losing = (instructionWins ? ingredient : instruction).PatchAsJsonAsync($"/api/recipes/{Id}", instructionWins ? IngredientInput() : InstructionInput());
            await losingEntered.Task.WaitAsync(TimeSpan.FromSeconds(10));
            HttpResponseMessage winning;
            try
            {
                winning = await (instructionWins ? instruction : ingredient).PatchAsJsonAsync($"/api/recipes/{Id}", instructionWins ? InstructionInput() : IngredientInput());
                Assert.Equal(HttpStatusCode.OK, winning.StatusCode);
            }
            finally { releaseLosing.TrySetResult(); }
            using (winning)
            using (var lost = await losing) Assert.Equal(HttpStatusCode.Conflict, lost.StatusCode);
            ingredient.DefaultRequestHeaders.Remove("X-Test-Controlled-Loser");
            instruction.DefaultRequestHeaders.Remove("X-Test-Controlled-Loser");
            using var scope = factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var saved = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == Id);
            var current = CanonicalRecipeContentStore.Read(saved)!;
            Assert.Equal(instructionWins ? "Instruction winner" : "Ingredient winner", saved.Name);
            Assert.Equal(instructionWins ? "200" : "250", current.IngredientLines[0].AmountText);
            Assert.Equal(instructionWins ? "Stir gently." : section.Steps[0].Text, current.InstructionSections[0].Steps[0].Text);
            var projection = CookingStepProjection.Read(current, 6);
            Assert.Equal(instructionWins ? 0 : 1, projection.ValidatedUses);
            Assert.Equal(instructionWins ? 1 : 0, projection.UncertainUses);
            var prior = JsonSerializer.Serialize(saved);
            var count = await db.CanonicalRecipeOperations.CountAsync();
            using var stale = await instruction.PatchAsJsonAsync($"/api/recipes/{Id}", InstructionInput());
            Assert.Equal(HttpStatusCode.Conflict, stale.StatusCode);
            using var unversioned = await instruction.PatchAsJsonAsync($"/api/recipes/{Id}", new
            { name = "Must not save", instructionSections = new[] { new { id = section.Id, name = section.Name, steps = Array.Empty<object>() } } });
            Assert.Equal(HttpStatusCode.Conflict, unversioned.StatusCode);
            Assert.Equal(prior, JsonSerializer.Serialize(await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == Id)));
            Assert.Equal(count, await db.CanonicalRecipeOperations.CountAsync());
        }, configureApplication: app => app.Use(async (context, next) =>
        {
            if (context.Request.Headers.ContainsKey("X-Test-Controlled-Loser"))
            {
                losingEntered.TrySetResult();
                await releaseLosing.Task.WaitAsync(context.RequestAborted);
            }
            await next(context);
        }));
    }
}
