using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;
using Xunit.Abstractions;
using PostgresTheory = RecipeApi.Tests.Integration.RecipeImportReportPostgresTests.PostgresTheoryAttribute;

namespace RecipeApi.Tests.Integration;

public sealed class SettingsVocabularyPostgresTests(ITestOutputHelper output)
{
    private const string MembershipKey = "food_vocabulary_publication";
    private const string Document = ".household/food-vocabulary/fixture-three-anchor-v1-0514bc6808b84c00a08cf96a104156c424f34391a431d4d1d6e0f8037ebc3a36.json";
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    private async Task WithMembership(bool existing, Func<TestWebApplicationFactory, Task> check)
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            await using var factory = await TestWebApplicationFactory.CreateWithAuthAsync(configurationOverrides: new()
            {
                ["Tests:PostgresConnectionString"] = settings.ConnectionString,
                ["Tests:LocalRecipeStore"] = "true"
            });
            if (existing)
            {
                using var setup = factory.Services.CreateScope();
                var bytes = await File.ReadAllBytesAsync(Path.Combine(DeploymentCalendarPostgresTests.RepositoryRoot(),
                    "api/src/RecipeApi.Tests/Fixtures/food-vocabulary-three-anchor-v1.json"));
                await setup.ServiceProvider.GetRequiredService<FoodVocabularyStore>()
                    .PublishReviewedAsync(bytes, null, Guid.NewGuid(), "test-review:reserved-settings-input");
                Assert.Equal(bytes, await setup.ServiceProvider.GetRequiredService<IStorageProvider>().LoadAsync("recipes", Document));
            }
            await check(factory);
        });
    }

    private static async Task<(string Rows, string? File)> State(TestWebApplicationFactory factory)
    {
        using var scope = factory.Services.CreateScope();
        var rows = await scope.ServiceProvider.GetRequiredService<RecipeDbContext>().FamilySettings.AsNoTracking()
            .OrderBy(x => x.Key).ThenBy(x => x.Id).ToArrayAsync();
        var bytes = await scope.ServiceProvider.GetRequiredService<IStorageProvider>().LoadAsync("recipes", Document);
        return (JsonSerializer.Serialize(rows, Json), bytes is null ? null : Convert.ToBase64String(bytes));
    }

    [PostgresTheory]
    [InlineData(false)]
    [InlineData(true)]
    public Task ReservedVocabularyMembership_HttpPostRejectsAbsentAndExistingWithoutChangingReadsOrOtherSettings(bool existing) =>
        WithMembership(existing, async factory =>
        {
            using var client = factory.CreateAuthenticatedClient();
            var other = MembershipKey + "_unrelated";
            using var ordinary = await client.PostAsJsonAsync("/api/settings/" + other, new { key = other, value = new { keep = "ordinary" } });
            Assert.Equal(HttpStatusCode.OK, ordinary.StatusCode);
            using var getOther = JsonDocument.Parse(await client.GetStringAsync("/api/settings/" + other));
            Assert.Equal("ordinary", getOther.RootElement.GetProperty("data").GetProperty("value").GetProperty("keep").GetString());
            using var beforeRead = await client.GetAsync("/api/settings/" + MembershipKey);
            Assert.Equal(existing ? HttpStatusCode.OK : HttpStatusCode.NotFound, beforeRead.StatusCode);
            var readBefore = await beforeRead.Content.ReadAsStringAsync();
            var before = await State(factory);
            using var response = await client.PostAsJsonAsync("/api/settings/" + MembershipKey,
                new { key = MembershipKey, value = new { attempted = "generic-authority-overwrite" } });
            var after = await State(factory);
            output.WriteLine($"Reserved HTTP POST existing={existing} returned={(int)response.StatusCode}; stateUnchanged={before == after}");
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode); // RED: current generic route returns200 and writes.
            Assert.Equal(before, after);
            using var afterRead = await client.GetAsync("/api/settings/" + MembershipKey);
            Assert.Equal(beforeRead.StatusCode, afterRead.StatusCode);
            var readAfter = await afterRead.Content.ReadAsStringAsync();
            if (existing)
                Assert.Equal(readBefore, readAfter);
            else
            {
                using var beforeProblem = JsonDocument.Parse(readBefore);
                using var afterProblem = JsonDocument.Parse(readAfter);
                Assert.Equal(
                    beforeProblem.RootElement.EnumerateObject().Where(x => x.Name != "traceId").Select(x => (x.Name, x.Value.GetRawText())),
                    afterProblem.RootElement.EnumerateObject().Where(x => x.Name != "traceId").Select(x => (x.Name, x.Value.GetRawText())));
            }
            using var serving = await client.PostAsJsonAsync("/api/settings/supper_servings_default",
                new { key = "supper_servings_default", value = new { servings = 4 } });
            Assert.Equal(HttpStatusCode.BadRequest, serving.StatusCode);
        });

    [PostgresTheory]
    [InlineData(false)]
    [InlineData(true)]
    public Task ReservedVocabularyMembership_ServiceUpsertRejectsAbsentAndExistingWithoutChangingOtherPendingFacts(bool existing) =>
        WithMembership(existing, async factory =>
        {
            using var scope = factory.Services.CreateScope();
            var services = scope.ServiceProvider;
            var service = services.GetRequiredService<SettingsService>();
            var other = MembershipKey + "_service_control";
            var unrelated = JsonSerializer.SerializeToElement(new { keep = "service" });
            await service.UpsertSettingAsync(other, unrelated);
            Assert.Equal("service", (await service.GetSettingAsync(other))!.Value.GetProperty("keep").GetString());
            var db = services.GetRequiredService<RecipeDbContext>();
            var pending = new FamilySetting { Key = "reserved-key-pending-control", Value = unrelated,
                UpdatedAt = services.GetRequiredService<IClock>().UtcNow };
            db.FamilySettings.Add(pending);
            var before = await State(factory);
            var error = await Record.ExceptionAsync(() => service.UpsertSettingAsync(MembershipKey,
                JsonSerializer.SerializeToElement(new { attempted = "direct-service-overwrite" })));
            var after = await State(factory);
            output.WriteLine($"Reserved service Upsert existing={existing} exception={error?.GetType().Name ?? "none"}; stateUnchanged={before == after}");
            Assert.IsType<ArgumentException>(error); // RED: current service accepts the reserved authority key.
            Assert.Equal(before, after);
            Assert.Equal(EntityState.Added, db.Entry(pending).State);
            await Assert.ThrowsAsync<ArgumentException>(() => service.UpsertSettingAsync(SupperServingsService.DefaultKey, unrelated));
        });
}
