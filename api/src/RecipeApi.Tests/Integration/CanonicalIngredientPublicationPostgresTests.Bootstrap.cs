using System.Data.Common;
using Microsoft.EntityFrameworkCore.Diagnostics;
using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using RecipeApi.Models;
using RecipeApi.Infrastructure;
using RecipeApi.Tests.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Integration;

public sealed partial class CanonicalIngredientPublicationPostgresTests
{
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task ShareBootstrap_InterruptedDeliveryRetainsMembershipAndResumableExactFiles()
    {
        await WithStore(async (services, repository, store, storage) =>
        {
            var db = services.GetRequiredService<RecipeDbContext>();
            var member = (await db.FamilyMembers.FirstAsync()).Id;
            var id = Guid.NewGuid();
            var service = ActivatorUtilities.CreateInstance<RecipeService>(services, store);
            storage.FailInfo = true;
            await Assert.ThrowsAsync<IOException>(() => service.ImportRecipeShareBundle(Share(id), member));
            var journal = await db.RecipeFilePublications.SingleAsync(x => x.RecipeId == id);
            Assert.False(journal.Delivered);
            Assert.True(await db.Recipes.AnyAsync(x => x.Id == id));
            Assert.True(await db.RecipeSearchDocuments.AnyAsync(x => x.RecipeId == id));
            var committed = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id);
            Assert.Null(committed.Servings); // The incoming share omitted its declared basis.
            var committedContent = CanonicalRecipeContentStore.Read(committed)!;
            Assert.NotNull(committedContent);
            storage.FailInfo = false;
            await store.ResumeAsync(id, journal.OperationId);
            await store.ResumeAsync(id, journal.OperationId);
            Assert.Equal("Shared soup", (await repository.GetInfoAsync(id, default)).Name);
            Assert.Equal(new byte[] { 4, 5, 6 }, await repository.GetOriginalImageAsync(id, 0, default));
            using var json = JsonDocument.Parse(await repository.GetRecipeJsonAsync(id, default));
            var exported = RecipeExportContent.ReadCurrent(json.RootElement, id);
            Assert.Equal(JsonSerializer.Serialize(committedContent), JsonSerializer.Serialize(exported.Content));
            Assert.Equal("salt", Assert.Single(exported.Content.IngredientLines).Description);
            Assert.Null(exported.Content.Servings);
            AssertSharedTextRemainsUnknown(exported.Content);
            Assert.Equal(member, (await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id)).AddedBy);
            Assert.True((await db.RecipeFilePublications.SingleAsync(x => x.RecipeId == id)).Delivered);
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task CaptureBootstrap_IntakesCommitRecoverableMembershipBeforeFileDelivery()
    {
        foreach (var intake in new[] { "photo", "description", "url" })
            await WithStore(async (services, repository, store, storage) =>
            {
                var db = services.GetRequiredService<RecipeDbContext>();
                var before = await db.Recipes.Select(x => x.Id).ToListAsync();
                var member = (await db.FamilyMembers.FirstAsync()).Id;
                var service = ActivatorUtilities.CreateInstance<RecipeService>(services, store);
                storage.FailInfo = true;
                await Assert.ThrowsAsync<IOException>(async () =>
                {
                    if (intake == "photo") await service.CreateRecipe(member, new FormFileCollection { Upload() }, new());
                    else if (intake == "description") await service.DescribeRecipe(new() { Name = "Supper", Description = "Soup" }, member);
                    else await service.CaptureUrl(new() { Url = "https://example.test/soup", Notes = "Private", Rating = 3 }, member);
                });
                var recipe = await db.Recipes.SingleAsync(x => !before.Contains(x.Id));
                var publication = await db.RecipeFilePublications.SingleAsync(x => x.RecipeId == recipe.Id);
                Assert.False(publication.Delivered);
                Assert.True(await db.RecipeSearchDocuments.AnyAsync(x => x.RecipeId == recipe.Id));
                if (intake == "url") Assert.True(await db.WorkflowInstances.AnyAsync(x => x.WorkflowId == "url-import"));
                storage.FailInfo = false;
                await store.ResumeAsync(recipe.Id, publication.OperationId);
                var info = await repository.GetInfoAsync(recipe.Id, default);
                Assert.Equal(member, info.AddedBy);
                if (intake == "url") { Assert.Equal("Private", info.Notes); Assert.Equal(RecipeRating.Love, info.Rating); }
                if (intake == "photo") Assert.Equal(new byte[] { 4, 5, 6 }, await repository.GetOriginalImageAsync(recipe.Id, 0, default));
            });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task ShareBootstrap_DuplicateIdPreservesExistingRecipeAndFiles()
    {
        await WithStore(async (services, repository, store, _) =>
        {
            var db = services.GetRequiredService<RecipeDbContext>();
            var result = await ActivatorUtilities.CreateInstance<RecipeService>(services, store)
                .ImportRecipeShareBundle(Share(Id), (await db.FamilyMembers.FirstAsync()).Id);
            Assert.NotEqual(Id, result.Id);
            Assert.Equal(Original, await repository.GetRecipeJsonAsync(Id, default));
            Assert.Equal(new byte[] { 1, 2, 3 }, await repository.GetOriginalImageAsync(Id, 0, default));
            Assert.Equal("Shared soup", (await repository.GetInfoAsync(result.Id, default)).Name);
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task PdfBootstrap_RetainsExactSourceAndPendingDeliveryAfterInterruption()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            await using var factory = await TestWebApplicationFactory.CreateWithAuthAsync(
                configurationOverrides: new() { ["Tests:PostgresConnectionString"] = settings.ConnectionString,
                    ["Tests:LocalRecipeStore"] = "true" },
                configureServices: services => services.AddSingleton<IStorageProvider>(sp => new FailingStorage(
                    new LocalStorageProvider(sp.GetRequiredService<DataRootResolver>(), sp.GetRequiredService<RecipesRootResolver>(),
                        sp.GetRequiredService<WorkflowRootResolver>()))));
            using var scope = factory.Services.CreateScope();
            var services = scope.ServiceProvider;
            var storage = (FailingStorage)services.GetRequiredService<IStorageProvider>();
            storage.FailInfo = true;
            await Assert.ThrowsAsync<IOException>(() => services.GetRequiredService<PdfCaptureService>()
                .AcceptAsync(factory.DefaultFamilyMemberId, Upload(), 3, "Private PDF note", default));
            var db = services.GetRequiredService<RecipeDbContext>();
            var journal = await db.RecipeFilePublications.SingleAsync();
            Assert.False(journal.Delivered);
            var recipe = await db.Recipes.SingleAsync();
            Assert.False(recipe.IsReady);
            storage.FailInfo = false;
            await services.GetRequiredService<RecipeFilePublicationStore>().ResumeAsync(recipe.Id, journal.OperationId);
            var file = await services.GetRequiredService<IRecipeStore>().ReadSourcePdfAsync(recipe.Id);
            Assert.NotNull(file);
            await using var source = file!;
            using var bytes = new MemoryStream();
            await source.CopyToAsync(bytes);
            Assert.Equal(new byte[] { 4, 5, 6 }, bytes.ToArray());
            var info = await services.GetRequiredService<RecipeRepository>().GetInfoAsync(recipe.Id, default);
            Assert.Equal("Private PDF note", info.Notes);
            Assert.Equal(RecipeRating.Love, info.Rating);
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task ShareBootstrap_IdentityClaimedAfterCaptureCreatesAnotherRecipeWithoutOverwritingWinner()
    {
        await WithStore(async (services, repository, store, storage) =>
        {
            var db = services.GetRequiredService<RecipeDbContext>();
            var member = (await db.FamilyMembers.FirstAsync()).Id;
            var id = Guid.NewGuid();
            Guid? winner = null;
            // The competing writer has its own context. The capture has really
            // committed (releasing its SQL locks) before that writer claims the ID.
            var boundary = new BootstrapRaceBoundary(afterCommit: async () =>
            {
                winner = (await ActivatorUtilities.CreateInstance<RecipeService>(services, store)
                    .ImportRecipeShareBundle(Share(id), member)).Id;
            });
            await using var losingDb = new RecipeDbContext(new DbContextOptionsBuilder<RecipeDbContext>()
                .UseNpgsql(db.Database.GetConnectionString()).AddInterceptors(boundary).Options);
            var invalidation = new SupperProjectionInvalidation(losingDb, services.GetRequiredService<IClock>(), services.GetRequiredService<DeploymentCalendar>());
            var losingStore = new RecipeFilePublicationStore(losingDb, repository, services.GetRequiredService<IClock>(), invalidation, TestPublicationStore.Vocabulary(losingDb, repository.StorageProvider, services.GetRequiredService<IClock>(), services));
            var service = ActivatorUtilities.CreateInstance<RecipeService>(services, losingDb, losingStore, invalidation);
            var imported = await service.ImportRecipeShareBundle(Share(id), member);
            Assert.Equal(id, winner);
            Assert.NotEqual(id, imported.Id);
            Assert.Equal(2, await db.RecipeFilePublications.CountAsync());
            Assert.Equal("Shared soup", (await repository.GetInfoAsync(id, default)).Name);
            Assert.Equal("Shared soup", (await repository.GetInfoAsync(imported.Id, default)).Name);
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task Bootstrap_ConcurrentReplayCommittedBeforeLockDoesNotDuplicateOrOverwriteLaterHumanFields()
    {
        await WithStore(async (services, repository, store, storage) =>
        {
            var db = services.GetRequiredService<RecipeDbContext>();
            var id = Guid.NewGuid();
            var capture = await store.CaptureNewAsync(id);
            var operation = Guid.NewGuid();
            var candidate = new RecipePublicationCandidate(null, new RecipeInfo { Id = id, Name = "Initial" },
                SourceFiles: new Dictionary<string, byte[]?>(), SourceKind: "bootstrap");
            // Independent replay wins after the first call's optimistic journal
            // read, before that call obtains the leading input/recipe locks.
            var boundary = new BootstrapRaceBoundary(beforeLocks: async () =>
            {
                await store.PublishAsync(capture, candidate, operation);
                var recipe = await db.Recipes.SingleAsync(x => x.Id == id);
                recipe.Name = "Later human name";
                await db.SaveChangesAsync();
            });
            await using var replayDb = new RecipeDbContext(new DbContextOptionsBuilder<RecipeDbContext>()
                .UseNpgsql(db.Database.GetConnectionString()).AddInterceptors(boundary).Options);
            var replayStore = new RecipeFilePublicationStore(replayDb, repository, services.GetRequiredService<IClock>(),
                new SupperProjectionInvalidation(replayDb, services.GetRequiredService<IClock>(), services.GetRequiredService<DeploymentCalendar>()), TestPublicationStore.Vocabulary(replayDb, repository.StorageProvider, services.GetRequiredService<IClock>(), services));
            await replayStore.PublishAsync(capture, candidate, operation);
            Assert.Equal("Later human name", (await db.Recipes.SingleAsync(x => x.Id == id)).Name);
            Assert.Equal(1, await db.RecipeFilePublications.CountAsync());
            var writes = storage.AtomicWrites;
            await store.PublishAsync(capture, candidate, operation);
            Assert.Equal(writes, storage.AtomicWrites);
        });
    }

    private sealed class BootstrapRaceBoundary(Func<Task>? afterCommit = null, Func<Task>? beforeLocks = null) : DbTransactionInterceptor
    {
        private bool reached;
        public override async Task TransactionCommittedAsync(DbTransaction transaction, TransactionEndEventData eventData, CancellationToken cancellationToken = default)
        {
            if (!reached && afterCommit is not null) { reached = true; await afterCommit(); }
        }
        public override async ValueTask<DbTransaction> TransactionStartedAsync(DbConnection connection, TransactionEndEventData eventData,
            DbTransaction result, CancellationToken cancellationToken = default)
        {
            if (!reached && beforeLocks is not null) { reached = true; await beforeLocks(); }
            return result;
        }
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task Bootstrap_AbsentMembershipNeverOverwritesRetainedOrNewlyArrivedFiles()
    {
        await WithStore(async (services, repository, store, _) =>
        {
            var db = services.GetRequiredService<RecipeDbContext>();
            foreach (var beforeCapture in new[] { false, true })
            {
                var id = Guid.NewGuid();
                var capture = beforeCapture ? null : await store.CaptureNewAsync(id);
                await repository.SaveOriginalImageAsync(id, 19, "image/png", [9, 8, 7], default);
                if (beforeCapture) await Assert.ThrowsAsync<InvalidDataException>(() => store.CaptureNewAsync(id));
                else await Assert.ThrowsAsync<InvalidDataException>(() => store.PublishAsync(capture!,
                    new(null, new RecipeInfo { Id = id }, SourceFiles: new Dictionary<string, byte[]?>(), SourceKind: "bootstrap"), Guid.NewGuid()));
                Assert.False(await db.Recipes.AnyAsync(x => x.Id == id));
                Assert.False(await repository.ExistsAsync(id, "recipe.info"));
                Assert.Equal(new byte[] { 9, 8, 7 }, await repository.GetOriginalImageAsync(id, 19, default));
            }
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task CaptureBootstrap_TwentyPhotosRetainEverySlotAndFinishedDishSelection()
    {
        await WithStore(async (services, repository, store, _) =>
        {
            var db = services.GetRequiredService<RecipeDbContext>();
            var files = new FormFileCollection();
            for (var index = 0; index < 20; index++) files.Add(Upload());
            var id = await ActivatorUtilities.CreateInstance<RecipeService>(services, store).CreateRecipe(
                (await db.FamilyMembers.FirstAsync()).Id, files, new() { FinishedDishImageIndex = 19 });
            var info = await repository.GetInfoAsync(id, default);
            Assert.Equal(20, info.ImageCount);
            Assert.Equal(19, info.FinishedDishImageIndex);
            for (var index = 0; index < 20; index++)
                Assert.Equal(new byte[] { 4, 5, 6 }, await repository.GetOriginalImageAsync(id, index, default));
            Assert.True((await db.RecipeFilePublications.SingleAsync()).Delivered);
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task ShareBootstrap_HttpImportAndSubsequentMediaAndShareReadsUseCommittedAggregate()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            await using var factory = await TestWebApplicationFactory.CreateWithAuthAsync(configurationOverrides: new()
            {
                ["Tests:PostgresConnectionString"] = settings.ConnectionString, ["Tests:LocalRecipeStore"] = "true"
            });
            using var client = factory.CreateAuthenticatedClient();
            client.DefaultRequestHeaders.Add("X-Family-Member-Id", factory.DefaultFamilyMemberId.ToString());
            var id = Guid.NewGuid();
            var bundle = Share(id);
            bundle.Hero = new() { MimeType = "image/webp", Base64 = "BAUG" };
            bundle.Recipe.Notes = "Private note";
            bundle.Recipe.Rating = 3;
            bundle.Recipe.Servings = 17; // Preserve a declared count without claiming verified original-source facts.
            using var imported = await client.PostAsJsonAsync("/api/recipes/import-bundle", bundle);
            Assert.Equal(HttpStatusCode.Created, imported.StatusCode);
            using var body = JsonDocument.Parse(await imported.Content.ReadAsStringAsync());
            Assert.Equal(id, body.RootElement.GetProperty("data").GetProperty("id").GetGuid());
            Assert.Equal(new byte[] { 4, 5, 6 }, await client.GetByteArrayAsync($"/api/recipes/{id}/original/0"));
            using var shared = await client.GetAsync($"/api/recipes/{id}/share");
            Assert.Equal(HttpStatusCode.OK, shared.StatusCode);
            var exported = await shared.Content.ReadFromJsonAsync<RecipeShareBundleDto>();
            Assert.NotNull(exported);
            Assert.Null(exported.Recipe.Notes);
            Assert.Null(exported.Recipe.Rating);
            Assert.Null(exported.Recipe.Servings); // The existing outgoing share projection omits household fields.
            Assert.Equal(new[] { "salt" }, exported.Recipe.Ingredients);
            Assert.Equal("BAUG", exported.Originals.Single().Base64);
            using var scope = factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var recipe = await db.Recipes.SingleAsync();
            Assert.Equal("Private note", recipe.Notes);
            Assert.Equal(17, recipe.Servings);
            var canonical = CanonicalRecipeContentStore.Read(recipe)!;
            Assert.NotNull(canonical);
            Assert.Equal(17, canonical.Servings);
            AssertSharedTextRemainsUnknown(canonical);
            Assert.True(recipe.IsReady);
            Assert.Equal(factory.DefaultFamilyMemberId, recipe.AddedBy);
            Assert.True((await db.RecipeFilePublications.SingleAsync()).Delivered);
        });
    }

    private static void AssertSharedTextRemainsUnknown(CanonicalRecipeContent content)
    {
        var line = Assert.Single(content.IngredientLines);
        Assert.Equal("salt", line.Description);
        Assert.Null(line.Amount);
        Assert.Null(line.AmountText);
        Assert.Null(line.Unit);
        Assert.Null(line.Package);
        Assert.Null(line.Shopping.FoodId);
        Assert.Null(line.Shopping.MappingRevision);
        Assert.Equal("legacy_unknown", line.Provenance.Origin);
        Assert.Null(line.Provenance.SourceRef);
        Assert.Equal(new[] { "description", "amount", "amountText", "unit", "scaling", "package", "shopping" }, line.Provenance.ProtectedFields);
        Assert.All(content.InstructionSections.SelectMany(section => section.Steps), step => Assert.Empty(step.Bindings));
    }

    private static RecipeShareBundleDto Share(Guid id) => new()
    {
        Version = "1.0",
        Info = new() { RecipeId = id, BundleSource = "wfs-share" },
        Recipe = new() { Name = "Shared soup", Ingredients = ["salt"], Instructions = [new() { ItemListElement = [new() { Text = "Mix." }] }] },
        Originals = [new() { MimeType = "image/png", Base64 = "BAUG" }]
    };
}
