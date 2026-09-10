using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Integration;

public class RecipeImportReportIntegrationTests : IAsyncLifetime
{
    private TestWebApplicationFactory _factory = null!;
    private HttpClient _client = null!;

    public async Task InitializeAsync()
    {
        _factory = await TestWebApplicationFactory.CreateAsync();
        _client = _factory.CreateClient();
    }

    public async Task DisposeAsync()
    {
        _client.Dispose();
        await _factory.DisposeAsync();
    }

    [Fact]
    public async Task Put_Creates_Report_With_Ingredients_And_PublicProjection()
    {
        var recipeId = await SeedRecipeAsync(imageCount: 1);

        var response = await PutAsync(recipeId, new { reasons = new[] { "ingredients" } });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var issue = json.RootElement.GetProperty("recipe").GetProperty("importIssue");
        Assert.Equal("ingredients", issue.GetProperty("reasons")[0].GetString());
        Assert.Equal("reported", issue.GetProperty("status").GetString());
        Assert.Equal(JsonValueKind.Null, issue.GetProperty("note").ValueKind);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var report = await db.RecipeImportReports.SingleAsync(r => r.RecipeId == recipeId);
        Assert.Equal(_factory.DefaultFamilyMemberId, report.ReportedBy);
        Assert.Equal(_factory.DefaultFamilyMemberId, report.UpdatedBy);
    }

    [Fact]
    public async Task Put_MaterialChange_ResetsLifecycle_WhileIdenticalSavePreservesIt()
    {
        var recipeId = await SeedRecipeAsync(sourceUrl: "https://example.com/recipe");
        await PutAsync(recipeId, new { reasons = new[] { "ingredients" } });
        var workflowId = Guid.NewGuid();

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var report = await db.RecipeImportReports.SingleAsync(r => r.RecipeId == recipeId);
            report.Status = RecipeImportReportStatus.ReadyToReview;
            report.LastWorkflowInstanceId = workflowId;
            report.LastAttemptAt = DateTimeOffset.UtcNow.AddMinutes(-1);
            report.ReimportedAt = DateTimeOffset.UtcNow;
            report.LastError = "private";
            await db.SaveChangesAsync();
        }

        var identical = await PutAsync(recipeId, new { reasons = new[] { "ingredients" } });
        Assert.Equal(HttpStatusCode.OK, identical.StatusCode);
        Assert.Equal("readyToReview", await ReadStatusAsync(identical));

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            Assert.Equal(workflowId, (await db.RecipeImportReports.SingleAsync(r => r.RecipeId == recipeId)).LastWorkflowInstanceId);
        }

        var changed = await PutAsync(recipeId, new
        {
            reasons = new[] { "ingredients", "steps" },
            note = "  The steps are incomplete.  "
        });
        Assert.Equal(HttpStatusCode.OK, changed.StatusCode);
        Assert.Equal("reported", await ReadStatusAsync(changed));

        using var finalScope = _factory.Services.CreateScope();
        var finalDb = finalScope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var updated = await finalDb.RecipeImportReports.SingleAsync(r => r.RecipeId == recipeId);
        Assert.Equal(["ingredients", "steps"], updated.Reasons);
        Assert.Equal("The steps are incomplete.", updated.Note);
        Assert.Null(updated.LastWorkflowInstanceId);
        Assert.Null(updated.LastAttemptAt);
        Assert.Null(updated.ReimportedAt);
        Assert.Null(updated.LastError);
    }

    [Theory]
    [MemberData(nameof(InvalidRequests))]
    public async Task Put_Rejects_InvalidReasonsAndNote(object body)
    {
        var recipeId = await SeedRecipeAsync(imageCount: 1);
        var response = await PutAsync(recipeId, body);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    public static TheoryData<object> InvalidRequests => new()
    {
        { new { reasons = Array.Empty<string>() } },
        { new { reasons = new[] { "ingredients", "ingredients" } } },
        { new { reasons = new[] { "duplicate", "duplicate" } } },
        { new { reasons = new[] { "photos" } } },
        { new { reasons = new[] { "steps" }, note = new string('x', 501) } }
    };

    [Theory]
    [MemberData(nameof(ReimportableReasonSets))]
    public async Task Put_ReimportableRecipe_AcceptsEveryValidReasonSubset(string[] reasons)
    {
        var recipeId = await SeedRecipeAsync(imageCount: 1);

        var response = await PutAsync(recipeId, new { reasons });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    public static TheoryData<string[]> ReimportableReasonSets => new()
    {
        { new[] { "ingredients" } },
        { new[] { "steps" } },
        { new[] { "duplicate" } },
        { new[] { "ingredients", "steps" } },
        { new[] { "ingredients", "duplicate" } },
        { new[] { "steps", "duplicate" } },
        { new[] { "ingredients", "steps", "duplicate" } }
    };

    [Fact]
    public async Task Put_NonReimportableRecipe_AcceptsDuplicateOnly()
    {
        var recipeId = await SeedRecipeAsync();

        var response = await PutAsync(recipeId, new { reasons = new[] { "duplicate" } });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal("duplicate", json.RootElement.GetProperty("recipe").GetProperty("importIssue")
            .GetProperty("reasons")[0].GetString());
    }

    [Theory]
    [MemberData(nameof(IneligibleContentReasonSets))]
    public async Task Put_NonReimportableRecipe_RejectsAnyContentReason(string[] reasons)
    {
        var recipeId = await SeedRecipeAsync();

        var response = await PutAsync(recipeId, new { reasons });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    public static TheoryData<string[]> IneligibleContentReasonSets => new()
    {
        { new[] { "ingredients" } },
        { new[] { "steps" } },
        { new[] { "ingredients", "steps" } },
        { new[] { "ingredients", "duplicate" } },
        { new[] { "steps", "duplicate" } },
        { new[] { "ingredients", "steps", "duplicate" } }
    };

    [Fact]
    public async Task Put_ConcurrentSaves_KeepOneActiveRow()
    {
        var recipeId = await SeedRecipeAsync(imageCount: 1);

        var responses = await Task.WhenAll(
            PutAsync(recipeId, new { reasons = new[] { "ingredients" } }),
            PutAsync(recipeId, new { reasons = new[] { "steps" } }));

        Assert.All(responses, response => Assert.Equal(HttpStatusCode.OK, response.StatusCode));
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        Assert.Equal(1, await db.RecipeImportReports.CountAsync(r => r.RecipeId == recipeId));
    }

    [Fact]
    public async Task Put_RequiresKnownFamilyMember_AndEligibleRecipe()
    {
        var recipeId = await SeedRecipeAsync();

        var missingIdentity = await _client.PutAsJsonAsync(
            $"/api/recipes/{recipeId}/import-report",
            new { reasons = new[] { "ingredients" } });
        Assert.Equal(HttpStatusCode.BadRequest, missingIdentity.StatusCode);

        var unknownMember = await PutAsync(
            recipeId,
            new { reasons = new[] { "ingredients" } },
            Guid.NewGuid());
        Assert.Equal(HttpStatusCode.NotFound, unknownMember.StatusCode);

        var ineligible = await PutAsync(recipeId, new { reasons = new[] { "ingredients" } });
        Assert.Equal(HttpStatusCode.Conflict, ineligible.StatusCode);
    }

    [Theory]
    [InlineData(RecipeImportReportStatus.Reported, "reported")]
    [InlineData(RecipeImportReportStatus.Reimporting, "reported")]
    [InlineData(RecipeImportReportStatus.ReimportFailed, "reported")]
    [InlineData(RecipeImportReportStatus.ReadyToReview, "readyToReview")]
    public async Task Detail_MapsPublicStatus_AndOmitsPrivateFields(
        RecipeImportReportStatus internalStatus,
        string expectedStatus)
    {
        var recipeId = await SeedRecipeAsync(imageCount: 1);
        await SeedReportAsync(recipeId, internalStatus);

        var response = await _client.GetAsync($"/api/recipes/{recipeId}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var issue = json.RootElement.GetProperty("recipe").GetProperty("importIssue");
        Assert.Equal(expectedStatus, issue.GetProperty("status").GetString());
        foreach (var privateName in new[]
                 {
                     "reportedBy", "updatedBy", "lastWorkflowInstanceId", "lastAttemptAt",
                     "reimportedAt", "lastError", "createdAt", "updatedAt"
                 })
        {
            Assert.False(issue.TryGetProperty(privateName, out _), $"Public issue leaked {privateName}");
        }
    }

    [Fact]
    public async Task Delete_IsIdempotent_AndReturnsNullIssue()
    {
        var recipeId = await SeedRecipeAsync(imageCount: 1);
        await PutAsync(recipeId, new { reasons = new[] { "steps" }, note = "Missing details" });

        foreach (var _ in Enumerable.Range(0, 2))
        {
            var request = new HttpRequestMessage(HttpMethod.Delete, $"/api/recipes/{recipeId}/import-report");
            request.Headers.Add("X-Family-Member-Id", _factory.DefaultFamilyMemberId.ToString());
            var response = await _client.SendAsync(request);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            Assert.Equal(JsonValueKind.Null,
                json.RootElement.GetProperty("recipe").GetProperty("importIssue").ValueKind);
        }
    }

    [Fact]
    public async Task DeletingRecipe_CascadesActiveReport()
    {
        var recipeId = await SeedRecipeAsync(imageCount: 1);
        await SeedReportAsync(recipeId, RecipeImportReportStatus.Reported);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        await db.RecipeImportReports.SingleAsync(r => r.RecipeId == recipeId);
        db.Recipes.Remove(await db.Recipes.SingleAsync(r => r.Id == recipeId));
        await db.SaveChangesAsync();

        Assert.False(await db.RecipeImportReports.AnyAsync(r => r.RecipeId == recipeId));
    }

    private async Task<Guid> SeedRecipeAsync(int imageCount = 0, string? sourceUrl = null)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var recipe = new Recipe
        {
            Id = Guid.NewGuid(),
            Name = "Import report test",
            AddedBy = _factory.DefaultFamilyMemberId,
            ImageCount = imageCount,
            SourceUrl = sourceUrl,
            IsReady = true
        };
        db.Recipes.Add(recipe);
        await db.SaveChangesAsync();
        return recipe.Id;
    }

    private async Task SeedReportAsync(Guid recipeId, RecipeImportReportStatus status)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        db.RecipeImportReports.Add(new RecipeImportReport
        {
            RecipeId = recipeId,
            Reasons = ["ingredients"],
            Note = "Check quantities",
            Status = status,
            ReportedBy = _factory.DefaultFamilyMemberId,
            UpdatedBy = _factory.DefaultFamilyMemberId,
            LastWorkflowInstanceId = Guid.NewGuid(),
            LastAttemptAt = DateTimeOffset.UtcNow,
            ReimportedAt = status == RecipeImportReportStatus.ReadyToReview ? DateTimeOffset.UtcNow : null,
            LastError = "internal-only"
        });
        await db.SaveChangesAsync();
    }

    private async Task<HttpResponseMessage> PutAsync(Guid recipeId, object body, Guid? memberId = null)
    {
        var request = new HttpRequestMessage(HttpMethod.Put, $"/api/recipes/{recipeId}/import-report")
        {
            Content = JsonContent.Create(body)
        };
        request.Headers.Add("X-Family-Member-Id", (memberId ?? _factory.DefaultFamilyMemberId).ToString());
        return await _client.SendAsync(request);
    }

    private static async Task<string?> ReadStatusAsync(HttpResponseMessage response)
    {
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return json.RootElement.GetProperty("recipe").GetProperty("importIssue").GetProperty("status").GetString();
    }
}
