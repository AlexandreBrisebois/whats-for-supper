using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Moq;
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
    public async Task Submit_Creates_ManualReviewReport_With_Ingredients_And_PublicProjection()
    {
        var recipeId = await SeedRecipeAsync(imageCount: 1);

        var response = await SubmitAsync(recipeId, new { reasons = new[] { "ingredients" } });

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
    public async Task Submit_UnchangedTerminalFeedback_RemainsManualReview()
    {
        var recipeId = await SeedRecipeAsync(sourceUrl: "https://example.com/recipe");
        var initial = await SubmitAsync(recipeId, new { reasons = new[] { "ingredients" }, note = "Check quantities" });
        using var initialJson = JsonDocument.Parse(await initial.Content.ReadAsStringAsync());
        var workflowId = initialJson.RootElement.GetProperty("importId").GetGuid();

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var report = await db.RecipeImportReports.SingleAsync(r => r.RecipeId == recipeId);
            report.Status = RecipeImportReportStatus.ReadyToReview;
            report.LastAttemptAt = DateTimeOffset.UtcNow.AddMinutes(-1);
            report.ReimportedAt = DateTimeOffset.UtcNow;
            report.LastError = "private";
            (await db.WorkflowInstances.SingleAsync(workflow => workflow.Id == workflowId)).Status = WorkflowStatus.Completed;
            await db.SaveChangesAsync();
        }

        var identical = await SubmitAsync(recipeId, new { reasons = new[] { "ingredients" }, note = "  Check quantities " });
        Assert.Equal(HttpStatusCode.OK, identical.StatusCode);
        Assert.Equal("readyToReview", await ReadStatusAsync(identical));

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            Assert.Equal(workflowId, (await db.RecipeImportReports.SingleAsync(r => r.RecipeId == recipeId)).LastWorkflowInstanceId);
        }

        using var responseJson = JsonDocument.Parse(await identical.Content.ReadAsStringAsync());
        Assert.False(responseJson.RootElement.GetProperty("reimportStarted").GetBoolean());
        Assert.Equal(JsonValueKind.Null, responseJson.RootElement.GetProperty("importId").ValueKind);
    }

    [Theory]
    [MemberData(nameof(InvalidRequests))]
    public async Task Submit_Rejects_InvalidReasonsAndNote(object body)
    {
        var recipeId = await SeedRecipeAsync(imageCount: 1);
        var response = await SubmitAsync(recipeId, body);
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
    public async Task Submit_ReimportableRecipe_AcceptsEveryValidReasonSubset(string[] reasons)
    {
        var recipeId = await SeedRecipeAsync(imageCount: 1);

        var response = await SubmitAsync(recipeId, new { reasons });

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
    public async Task Submit_NonReimportableRecipe_AcceptsDuplicateOnly()
    {
        var recipeId = await SeedRecipeAsync();

        var response = await SubmitAsync(recipeId, new { reasons = new[] { "duplicate" } });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal("duplicate", json.RootElement.GetProperty("recipe").GetProperty("importIssue")
            .GetProperty("reasons")[0].GetString());
    }

    [Theory]
    [MemberData(nameof(IneligibleContentReasonSets))]
    public async Task Submit_NonReimportableRecipe_RejectsAnyContentReason(string[] reasons)
    {
        var recipeId = await SeedRecipeAsync();

        var response = await SubmitAsync(recipeId, new { reasons });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    public static TheoryData<string[]> IneligibleContentReasonSets => new()
    {
        { new[] { "ingredients" } },
        { new[] { "steps" } },
        { new[] { "ingredients", "steps" } }
    };

    [Fact]
    public async Task Submit_ConcurrentSaves_KeepOneActiveRow()
    {
        var recipeId = await SeedRecipeAsync(imageCount: 1);

        var responses = await Task.WhenAll(
            SubmitAsync(recipeId, new { reasons = new[] { "ingredients" } }),
            SubmitAsync(recipeId, new { reasons = new[] { "steps" } }));

        Assert.All(responses, response => Assert.Equal(HttpStatusCode.OK, response.StatusCode));
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        Assert.Equal(1, await db.RecipeImportReports.CountAsync(r => r.RecipeId == recipeId));
    }

    [Fact]
    public async Task Submit_EligibleFeedback_StartsContextualWorkflow_AndReturnsItsId()
    {
        var recipeId = await SeedRecipeAsync(imageCount: 1);

        var response = await SubmitAsync(recipeId, new
        {
            reasons = new[] { "steps", "ingredients" },
            note = "  Check the final steps.  "
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.True(json.RootElement.GetProperty("reimportStarted").GetBoolean());
        var importId = json.RootElement.GetProperty("importId").GetGuid();
        Assert.NotEqual(Guid.Empty, importId);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var report = await db.RecipeImportReports.SingleAsync(r => r.RecipeId == recipeId);
        Assert.Equal(RecipeImportReportStatus.Reimporting, report.Status);
        Assert.Equal(importId, report.LastWorkflowInstanceId);
        var workflow = await db.WorkflowInstances.SingleAsync(w => w.Id == importId);
        Assert.Contains("\"repairReasons\":\"ingredients,steps\"", workflow.Parameters);
        Assert.Contains("\"repairNote\":\"Check the final steps.\"", workflow.Parameters);
    }

    [Fact]
    public async Task Submit_MatchingActiveFeedback_ReusesWorkflow_WhileChangedFeedbackAndResolveAreRejected()
    {
        var recipeId = await SeedRecipeAsync(imageCount: 1);
        var first = await SubmitAsync(recipeId, new { reasons = new[] { "ingredients" }, note = "Check quantities" });
        using var firstJson = JsonDocument.Parse(await first.Content.ReadAsStringAsync());
        var importId = firstJson.RootElement.GetProperty("importId").GetGuid();

        var repeated = await SubmitAsync(recipeId, new { reasons = new[] { "ingredients" }, note = "  Check quantities  " });
        Assert.Equal(HttpStatusCode.OK, repeated.StatusCode);
        using var repeatedJson = JsonDocument.Parse(await repeated.Content.ReadAsStringAsync());
        Assert.True(repeatedJson.RootElement.GetProperty("reimportStarted").GetBoolean());
        Assert.Equal(importId, repeatedJson.RootElement.GetProperty("importId").GetGuid());

        var changed = await SubmitAsync(recipeId, new { reasons = new[] { "steps" }, note = "Check the ending" });
        Assert.Equal(HttpStatusCode.Conflict, changed.StatusCode);

        var resolve = new HttpRequestMessage(HttpMethod.Delete, $"/api/recipes/{recipeId}/import-report");
        resolve.Headers.Add("X-Family-Member-Id", _factory.DefaultFamilyMemberId.ToString());
        Assert.Equal(HttpStatusCode.Conflict, (await _client.SendAsync(resolve)).StatusCode);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var report = await db.RecipeImportReports.SingleAsync(r => r.RecipeId == recipeId);
        Assert.Equal(["ingredients"], report.Reasons);
        Assert.Equal("Check quantities", report.Note);
        Assert.Equal(importId, report.LastWorkflowInstanceId);
        Assert.Equal(1, await db.WorkflowInstances.CountAsync(w => w.WorkflowId == "recipe-import"));
    }

    [Fact]
    public async Task Submit_LaunchFailure_PersistsReportWithoutAttemptOrOrphanedWorkflow()
    {
        var recipeId = await SeedRecipeAsync(imageCount: 1);
        _factory.WorkflowOrchestratorMock
            .Setup(orchestrator => orchestrator.TriggerAsync(
                It.IsAny<string>(), It.IsAny<Dictionary<string, string>>(), It.IsAny<DateTimeOffset?>()))
            .ThrowsAsync(new InvalidOperationException("workflow unavailable"));

        var response = await SubmitAsync(recipeId, new { reasons = new[] { "ingredients" }, note = "Check quantities" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.True(json.RootElement.GetProperty("reimportLaunchFailed").GetBoolean());
        Assert.False(json.RootElement.GetProperty("reimportStarted").GetBoolean());
        Assert.Equal(JsonValueKind.Null, json.RootElement.GetProperty("importId").ValueKind);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var report = await db.RecipeImportReports.SingleAsync(r => r.RecipeId == recipeId);
        Assert.Equal(RecipeImportReportStatus.Reported, report.Status);
        Assert.Null(report.LastWorkflowInstanceId);
        Assert.Empty(await db.WorkflowInstances.ToListAsync());
    }

    [Fact]
    public async Task GetImportById_RequiresFamilyAccessToItsRecipe()
    {
        var recipeId = await SeedRecipeAsync(imageCount: 1);
        var submitted = await SubmitAsync(recipeId, new { reasons = new[] { "ingredients" }, note = "Check quantities" });
        using var submittedJson = JsonDocument.Parse(await submitted.Content.ReadAsStringAsync());
        var importId = submittedJson.RootElement.GetProperty("importId").GetGuid();

        var permitted = new HttpRequestMessage(HttpMethod.Get, $"/api/recipe-imports/{importId}");
        permitted.Headers.Add("X-Family-Member-Id", _factory.DefaultFamilyMemberId.ToString());
        Assert.Equal(HttpStatusCode.OK, (await _client.SendAsync(permitted)).StatusCode);

        var stranger = Guid.NewGuid();
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            db.FamilyMembers.Add(new FamilyMember { Id = stranger, Name = "Not the recipe parent" });
            await db.SaveChangesAsync();
        }
        var forbidden = new HttpRequestMessage(HttpMethod.Get, $"/api/recipe-imports/{importId}");
        forbidden.Headers.Add("X-Family-Member-Id", stranger.ToString());
        Assert.Equal(HttpStatusCode.NotFound, (await _client.SendAsync(forbidden)).StatusCode);
    }

    [Fact]
    public async Task RetiredRecipeScopedImportRoutes_AreNotAvailable()
    {
        var recipeId = await SeedRecipeAsync(imageCount: 1);

        var post = await _client.PostAsync($"/api/recipes/{recipeId}/import", null);
        var get = await _client.GetAsync($"/api/recipes/{recipeId}/import");

        Assert.Equal(HttpStatusCode.NotFound, post.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, get.StatusCode);
    }

    [Fact]
    public async Task Submit_RequiresKnownFamilyMember_AndEligibleRecipe()
    {
        var recipeId = await SeedRecipeAsync();

        var missingIdentity = await _client.PostAsJsonAsync(
            $"/api/recipes/{recipeId}/import-report",
            new { reasons = new[] { "ingredients" } });
        Assert.Equal(HttpStatusCode.BadRequest, missingIdentity.StatusCode);

        var unknownMember = await SubmitAsync(
            recipeId,
            new { reasons = new[] { "ingredients" } },
            Guid.NewGuid());
        Assert.Equal(HttpStatusCode.NotFound, unknownMember.StatusCode);

        var ineligible = await SubmitAsync(recipeId, new { reasons = new[] { "ingredients" } });
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
        await SubmitAsync(recipeId, new { reasons = new[] { "duplicate" }, note = "Duplicate recipe" });

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

    private async Task<HttpResponseMessage> SubmitAsync(Guid recipeId, object body, Guid? memberId = null)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, $"/api/recipes/{recipeId}/import-report")
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
