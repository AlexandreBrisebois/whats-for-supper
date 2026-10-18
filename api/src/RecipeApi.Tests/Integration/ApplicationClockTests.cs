using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Controllers;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Services.Ai;
using RecipeApi.Services.Processors;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Integration;

public class ApplicationClockTests
{
    private static DeploymentCalendarIntegrationTests.CalendarClock FixedClock() => new()
    { UtcNow = new DateTimeOffset(2001, 2, 5, 12, 34, 56, TimeSpan.Zero) };

    [Fact]
    public async Task Health_UsesSuppliedInstant()
    {
        var clock = FixedClock();
        await using var app = await TestWebApplicationFactory.CreateAsync(clock);
        using var client = app.CreateClient();
        var response = await client.GetFromJsonAsync<JsonElement>("/api/health");
        Assert.Equal(clock.UtcNow, response.GetProperty("timestamp").GetDateTimeOffset());
    }

    [Theory]
    [InlineData("family-create")]
    [InlineData("family-update")]
    [InlineData("settings")]
    [InlineData("goto")]
    [InlineData("ingredient")]
    [InlineData("discovery-create")]
    [InlineData("discovery-update")]
    [InlineData("recipe-create")]
    [InlineData("recipe-ready")]
    [InlineData("workflow-reset")]
    [InlineData("ai-error")]
    public async Task Mutations_UseSuppliedInstant(string operation)
    {
        var clock = FixedClock();
        await using var app = await TestWebApplicationFactory.CreateAsync(clock);
        using var scope = app.Services.CreateScope();
        var services = scope.ServiceProvider;
        var db = services.GetRequiredService<RecipeDbContext>();
        var member = new FamilyMember { Name = "Clock member" };
        var recipe = new Recipe { Name = "Clock supper", Category = "Supper" };
        db.AddRange(member, recipe);
        await db.SaveChangesAsync();
        DateTimeOffset actual;
        switch (operation)
        {
            case "family-create":
                actual = (await services.GetRequiredService<FamilyService>().CreateFamilyMember("New clock member")).CreatedAt;
                break;
            case "family-update":
                actual = (await services.GetRequiredService<FamilyService>().UpdateFamilyMember(member.Id, "Updated")).UpdatedAt;
                break;
            case "settings":
                actual = (await services.GetRequiredService<SettingsService>().UpsertSettingAsync("clock", JsonSerializer.SerializeToElement("value"))).UpdatedAt;
                break;
            case "goto":
                await services.GetRequiredService<GoToService>().SaveGoToListAsync(new GoToListDto());
                actual = (await db.FamilySettings.SingleAsync(x => x.Key == "family_goto")).UpdatedAt;
                break;
            case "ingredient":
                await services.GetRequiredService<IngredientCategoryService>().ReclassifyAsync("clock ingredient", "produce", default);
                actual = (await db.IngredientCategories.SingleAsync(x => x.NormalizedKey == "clock ingredient")).CreatedAt;
                break;
            case "discovery-create":
            case "discovery-update":
                if (operation == "discovery-update")
                {
                    db.RecipeVotes.Add(new RecipeVote { RecipeId = recipe.Id, FamilyMemberId = member.Id, Vote = VoteType.Like });
                    await db.SaveChangesAsync();
                }
                await services.GetRequiredService<DiscoveryService>().SubmitVoteAsync(recipe.Id, member.Id, VoteType.Dislike);
                actual = (await db.RecipeVotes.SingleAsync(x => x.RecipeId == recipe.Id)).VotedAt;
                break;
            case "recipe-create":
                var created = await services.GetRequiredService<RecipeService>().DescribeRecipe(new DescribeRecipeDto { Name = "Clock supper", Description = "Clock supper" }, member.Id);
                actual = (await db.Recipes.SingleAsync(x => x.Id == created.Id)).CreatedAt;
                break;
            case "recipe-ready":
                await ActivatorUtilities.CreateInstance<RecipeReadyProcessor>(services).ExecuteAsync(new WorkflowTask
                { Payload = JsonSerializer.Serialize(new { recipeId = recipe.Id }) }, default);
                actual = recipe.UpdatedAt;
                break;
            case "workflow-reset":
                var instance = new WorkflowInstance { WorkflowId = "clock" };
                var task = new WorkflowTask { Instance = instance, InstanceId = instance.Id, TaskName = "clock", ProcessorName = "clock", Status = RecipeApi.Models.TaskStatus.Failed };
                db.AddRange(instance, task);
                await db.SaveChangesAsync();
                await ActivatorUtilities.CreateInstance<WorkflowController>(services).ResetTask(task.TaskId);
                actual = task.ScheduledAt!.Value;
                break;
            default:
                actual = ActivatorUtilities.CreateInstance<AiExceptionHandler>(services).MapException(new Exception("clock")).Timestamp;
                break;
        }
        Assert.Equal(clock.UtcNow, actual);
    }

    [Fact]
    public async Task NewRecipeFilter_UsesInclusiveSuppliedCutoff()
    {
        var clock = FixedClock();
        await using var app = await TestWebApplicationFactory.CreateAsync(clock);
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var cutoff = clock.UtcNow.AddDays(-30);
        var before = new Recipe { Name = "Before", IsReady = true, CreatedAt = cutoff.AddTicks(-1) };
        var exact = new Recipe { Name = "Exact", IsReady = true, CreatedAt = cutoff };
        var after = new Recipe { Name = "After", IsReady = true, CreatedAt = cutoff.AddTicks(1) };
        db.Recipes.AddRange(before, exact, after);
        await db.SaveChangesAsync();
        var response = await scope.ServiceProvider.GetRequiredService<RecipeSearchService>().SearchAsync(
            new RecipeSearchRequestDto { Query = "", Filters = new() { NewRecipes = true } });
        Assert.Equal(new[] { exact.Id, after.Id }.Order(), response.Results.Select(x => x.Id).Order());
    }

    [Fact]
    public async Task Continuation_ExpiresAtSuppliedTenMinuteBoundary()
    {
        var clock = FixedClock();
        await using var app = await TestWebApplicationFactory.CreateAsync(clock);
        var store = app.Services.GetRequiredService<RecipeSearchContinuationStore>();
        var token = store.StoreRanked("clock", [], new RecipeSearchResponseDto());
        clock.UtcNow = clock.UtcNow.AddMinutes(10).AddTicks(-1);
        Assert.NotNull(store.Get(token, "clock"));
        clock.UtcNow = clock.UtcNow.AddTicks(1);
        Assert.Throws<RecipeSearchContinuationExpiredException>(() => store.Get(token, "clock"));
    }
}
