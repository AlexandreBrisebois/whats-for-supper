using Microsoft.EntityFrameworkCore;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Services;

public sealed class DuplicateRecipeDetectionTests
{
    [Fact]
    public async Task SubmitDuplicateReport_ProjectsLiveSuspectedDuplicateRecipeIdByNormalizedUrl()
    {
        await using var db = TestDbContextFactory.Create();
        var member = new FamilyMember { Id = Guid.NewGuid(), Name = "Alex" };
        var existing = new Recipe
        {
            Id = Guid.NewGuid(),
            Name = "Grandma Lasagna",
            SourceUrl = "https://example.com/lasagna/",
            IsReady = true,
            CreatedAt = DateTimeOffset.UtcNow.AddDays(-2)
        };
        var incoming = new Recipe
        {
            Id = Guid.NewGuid(),
            Name = "Weeknight Lasagna",
            SourceUrl = "https://EXAMPLE.COM/lasagna?utm_source=newsletter&fbclid=123#ingredients",
            IsReady = true,
            CreatedAt = DateTimeOffset.UtcNow
        };
        db.FamilyMembers.Add(member);
        db.Recipes.AddRange(existing, incoming);
        await db.SaveChangesAsync();

        var service = new RecipeImportReportService(new SystemClock(), db);
        var response = await service.SubmitAsync(incoming.Id, member.Id, new() { Reasons = ["duplicate"] });

        Assert.NotNull(response.Recipe.ImportIssue);
        Assert.Equal(existing.Id, response.Recipe.ImportIssue!.SuspectedDuplicateRecipeId);
    }

    [Fact]
    public async Task SubmitDuplicateReport_ProjectsLiveSuspectedDuplicateByTitleAndIngredientOverlap()
    {
        await using var db = TestDbContextFactory.Create();
        var member = new FamilyMember { Id = Guid.NewGuid(), Name = "Alex" };
        var existing = new Recipe
        {
            Id = Guid.NewGuid(),
            Name = "Crispy Lemon Garlic Chicken",
            Ingredients = """["2 chicken breasts","3 cloves garlic","1 lemon","2 tbsp olive oil"]""",
            IsReady = true,
            CreatedAt = DateTimeOffset.UtcNow.AddDays(-1)
        };
        var incoming = new Recipe
        {
            Id = Guid.NewGuid(),
            Name = "Lemon Garlic Chicken",
            Ingredients = """["2 chicken breasts","3 cloves garlic","1 lemon","1 tbsp butter"]""",
            IsReady = true,
            CreatedAt = DateTimeOffset.UtcNow
        };
        db.FamilyMembers.Add(member);
        db.Recipes.AddRange(existing, incoming);
        await db.SaveChangesAsync();

        var service = new RecipeImportReportService(new SystemClock(), db);
        var response = await service.SubmitAsync(incoming.Id, member.Id, new() { Reasons = ["duplicate"] });

        Assert.NotNull(response.Recipe.ImportIssue);
        Assert.Equal(existing.Id, response.Recipe.ImportIssue!.SuspectedDuplicateRecipeId);
    }

    [Fact]
    public async Task SubmitDuplicateReport_IgnoresDeletedAndUnreadyCandidates()
    {
        await using var db = TestDbContextFactory.Create();
        var member = new FamilyMember { Id = Guid.NewGuid(), Name = "Alex" };
        var deleted = new Recipe
        {
            Id = Guid.NewGuid(),
            Name = "Tomato Soup",
            SourceUrl = "https://example.com/soup",
            IsReady = true,
            DeletedAt = DateTimeOffset.UtcNow.AddHours(-1)
        };
        var unready = new Recipe
        {
            Id = Guid.NewGuid(),
            Name = "Tomato Soup",
            SourceUrl = "https://example.com/soup",
            IsReady = false
        };
        var incoming = new Recipe
        {
            Id = Guid.NewGuid(),
            Name = "Tomato Soup",
            SourceUrl = "https://example.com/soup",
            IsReady = true
        };
        db.FamilyMembers.Add(member);
        db.Recipes.AddRange(deleted, unready, incoming);
        await db.SaveChangesAsync();

        var service = new RecipeImportReportService(new SystemClock(), db);
        var response = await service.SubmitAsync(incoming.Id, member.Id, new() { Reasons = ["duplicate"] });

        Assert.NotNull(response.Recipe.ImportIssue);
        Assert.Null(response.Recipe.ImportIssue!.SuspectedDuplicateRecipeId);
    }
}
