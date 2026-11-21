using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Integration;

public sealed partial class WorkflowLaunchIntentPostgresTests
{
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task VocabularyFirstInstall_RejectsMissingMembershipReferencedOnlyByPreparedLaunch() =>
        new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            var observer = new CommitFailure("prepared", false);
            await using var db = new RecipeDbContext(new DbContextOptionsBuilder<RecipeDbContext>()
                .UseNpgsql(settings.ConnectionString).AddInterceptors(observer).Options);
            var storage = new InMemoryStorageProvider();
            var clock = new SystemClock();
            var vocabulary = TestPublicationStore.Vocabulary(db, storage, clock);
            var bytes = await File.ReadAllBytesAsync(Path.Combine(DeploymentCalendarPostgresTests.RepositoryRoot(),
                "api/src/RecipeApi.Tests/Fixtures/food-vocabulary-three-anchor-v1.json"));
            var installed = await vocabulary.PublishReviewedAsync(bytes, null, Guid.NewGuid(), "launch-only-review");
            var recipe = new Recipe { Id = Guid.NewGuid(), SourceUrl = "https://example.invalid/launch-only" };
            db.Recipes.Add(recipe);
            db.RecipeImportReports.Add(new RecipeImportReport { RecipeId = recipe.Id, Reasons = ["ingredients"] });
            await db.SaveChangesAsync();
            await new RecipeRepository(storage).SaveInfoAsync(new RecipeInfo { Id = recipe.Id, SourceUrl = recipe.SourceUrl }, default);
            await storage.SaveAsync("workflows", "url-import.yaml", """
                name: url-import
                parameters: [recipeId, url]
                tasks:
                  - name: fetch
                    processor: FetchUrlContent
                    payload:
                      recipeId: "{{recipeId}}"
                """);
            var orchestrator = new WorkflowOrchestrator(clock, new WorkflowRepository(storage), db,
                TestPublicationStore.Create(db, storage, clock));
            var id = Guid.NewGuid();
            await Assert.ThrowsAsync<IOException>(() => orchestrator.TriggerImportAsync(id, recipe.Id, "url-import",
                new() { ["recipeId"] = recipe.Id.ToString(), ["url"] = recipe.SourceUrl }));
            Assert.True(observer.Fired);
            var original = await db.WorkflowLaunchIntents.AsNoTracking().SingleAsync();
            Assert.NotNull(original.Prepared);
            Assert.Contains(installed.NewHead.Sha256, original.Prepared);
            Assert.Null(original.AcceptedAt);
            Assert.Empty(await db.WorkflowInstances.ToListAsync());
            Assert.Empty(await db.CanonicalRecipeOperations.ToListAsync());
            Assert.Empty(await db.RecipeFilePublications.ToListAsync());
            var member = await db.FamilySettings.SingleAsync(x => x.Key == "food_vocabulary_publication");
            db.FamilySettings.Remove(member); // Explicit corruption after the real prepared commit.
            await db.SaveChangesAsync();

            var readFailure = await Record.ExceptionAsync(() => vocabulary.CaptureActiveAsync());
            output.WriteLine($"Launch-only absent membership read failure={readFailure?.GetType().Name ?? "none"}");
            Assert.IsType<InvalidDataException>(readFailure);
            await Assert.ThrowsAsync<InvalidDataException>(() => vocabulary.PublishReviewedAsync(bytes, null,
                Guid.NewGuid(), "must-not-reseed"));
            Assert.False(await db.FamilySettings.AnyAsync(x => x.Key == "food_vocabulary_publication"));
            var retained = await db.WorkflowLaunchIntents.AsNoTracking().SingleAsync();
            Assert.Equal((original.Request, original.RequestHash, original.Prepared, original.PreparedHash, original.CreatedAt, original.AcceptedAt),
                (retained.Request, retained.RequestHash, retained.Prepared, retained.PreparedHash, retained.CreatedAt, retained.AcceptedAt));
            Assert.Equal(bytes, (await vocabulary.LoadCapturedAsync(installed.NewHead)).RawBytes);
        });
}
