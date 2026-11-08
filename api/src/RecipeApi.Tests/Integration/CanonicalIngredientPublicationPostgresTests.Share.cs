using System.Net;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Npgsql;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Integration;

public sealed partial class CanonicalIngredientPublicationPostgresTests
{
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task ShareExport_HttpCanonicalEmptyAndCurrentTextUseRealSelectedFilesWithoutMutation()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            await using var factory = await TestWebApplicationFactory.CreateWithAuthAsync(configurationOverrides: new() {
                ["Tests:PostgresConnectionString"] = settings.ConnectionString, ["Tests:LocalRecipeStore"] = "true" });
            using var scope = factory.Services.CreateScope();
            var services = scope.ServiceProvider;
            var db = services.GetRequiredService<RecipeDbContext>();
            var media = services.GetRequiredService<IRecipeStore>();
            using var client = factory.CreateAuthenticatedClient();
            client.DefaultRequestHeaders.Add("X-Family-Member-Id", factory.DefaultFamilyMemberId.ToString());
            foreach (var empty in new[] { false, true })
            {
                var id = Guid.NewGuid();
                var line = new RecipeIngredientLineDto {
                    Id = Guid.NewGuid(), Description = "flour", Amount = LegacyGroceryQuantity.Parse("⅓"), AmountText = "⅓",
                    Unit = new("cup", null), Scaling = "proportional", Package = null, Shopping = new("private shopping alias", null, null),
                    Provenance = new("human", "private-evidence-ref", ["amount"]) };
                db.Recipes.Add(new Recipe { Id = id, Name = "Current recipe", Notes = "private note", Rating = RecipeRating.Love,
                    ImageCount = 6, Ingredients = "[\"stale salt\"]", RawMetadata = Original,
                    CanonicalContent = JsonSerializer.Serialize(new CanonicalRecipeContent(2, "private-content", "private-source", null,
                        empty ? [] : [line], empty ? [] : [new(Guid.NewGuid(), "Mix", [new(Guid.NewGuid(), "Current step", "private-step", [])])])) });
                await db.SaveChangesAsync();
                await media.SaveHeroImageAsync(id, new MemoryStream([7, 8]));
                for (var i = 0; i < 6; i++) await media.SaveOriginalImageAsync(id, i, "image/png", new MemoryStream([(byte)i]));
                var root = Path.Combine(services.GetRequiredService<RecipesRootResolver>().Root, id.ToString());
                string Files() => JsonSerializer.Serialize(Directory.EnumerateFiles(root, "*", SearchOption.AllDirectories).Order()
                    .ToDictionary(p => p, p => Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(File.ReadAllBytes(p)))));
                var before = Files();
                var response = await client.GetAsync($"/api/recipes/{id}/share");
                response.EnsureSuccessStatusCode();
                var json = await response.Content.ReadAsStringAsync();
                var bundle = JsonSerializer.Deserialize<RecipeShareBundleDto>(json)!;
                Assert.Equal(empty ? Array.Empty<string>() : new[] { "⅓ cup flour" }, bundle.Recipe.Ingredients);
                if (empty) Assert.Empty(bundle.Recipe.Instructions);
                else Assert.Equal("Current step", Assert.Single(Assert.Single(bundle.Recipe.Instructions).ItemListElement).Text);
                Assert.Null(bundle.Recipe.Notes); Assert.Null(bundle.Recipe.Rating); Assert.Null(bundle.Recipe.Servings);
                Assert.DoesNotContain("private", json); Assert.DoesNotContain(line.Id.ToString(), json);
                Assert.Equal(new byte[] { 7, 8 }, Convert.FromBase64String(bundle.Hero!.Base64));
                Assert.Equal(5, bundle.Originals.Count);
                for (var i = 0; i < 5; i++) {
                    Assert.Equal("image/png", bundle.Originals[i].MimeType);
                    Assert.Equal(new[] { (byte)i }, Convert.FromBase64String(bundle.Originals[i].Base64));
                }
                Assert.Equal(before, Files());
            }
            Assert.False(await db.CanonicalRecipeOperations.AnyAsync());
            Assert.False(await db.RecipeFilePublications.AnyAsync());
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task ShareExport_UsesCurrentCanonicalTextAndOmitsPrivateIdentityAndEvidenceWithoutWrites()
    {
        await WithStore(async (services, _, _, _) =>
        {
            var db = services.GetRequiredService<RecipeDbContext>();
            var recipe = await db.Recipes.SingleAsync(x => x.Id == Id);
            var line = new RecipeIngredientLineDto {
                Id = Guid.NewGuid(), Description = "flour", Amount = LegacyGroceryQuantity.Parse("⅓"), AmountText = "⅓",
                Unit = new("cup", null), Scaling = "proportional", Package = null, Shopping = new("private shopping alias", null, null),
                Provenance = new("human", "private-evidence-ref", ["amount"]) };
            var stepId = Guid.NewGuid();
            recipe.CanonicalContent = JsonSerializer.Serialize(new CanonicalRecipeContent(2, "private-content-token", "private-source-token", null,
                [line, line with { Id = Guid.NewGuid(), Description = "oil", Amount = null, AmountText = null, Unit = null }],
                [new(Guid.NewGuid(), "Current section", [new(stepId, "Current corrected step", "private-step-token", [])])]));
            recipe.Notes = "private household note";
            recipe.Rating = RecipeRating.Love;
            recipe.ImageCount = 6;
            await db.SaveChangesAsync();
            // A tracked older entity must not override the committed DB snapshot.
            await db.Recipes.Where(x => x.Id == Id).ExecuteUpdateAsync(s => s.SetProperty(x => x.Name, "Current saved name"));
            var before = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == Id);
            var media = ShareMedia();
            var result = await ShareService(services, media.Object).ExportRecipeShareBundle(Id);
            Assert.Equal("Current saved name", result.Recipe.Name);
            Assert.Equal(new[] { "⅓ cup flour", "oil" }, result.Recipe.Ingredients);
            Assert.Equal("Current section", Assert.Single(result.Recipe.Instructions).Name);
            Assert.Equal("Current corrected step", Assert.Single(result.Recipe.Instructions[0].ItemListElement).Text);
            Assert.Null(result.Recipe.Notes); Assert.Null(result.Recipe.Rating); Assert.Null(result.Recipe.Servings);
            Assert.Equal("1.0", result.Version); Assert.Equal("wfs-share", result.Info.BundleSource);
            Assert.Equal(new byte[] { 7, 8 }, Convert.FromBase64String(result.Hero!.Base64));
            Assert.Equal(5, result.Originals.Count);
            for (var i = 0; i < 5; i++) Assert.Equal(new[] { (byte)i }, Convert.FromBase64String(result.Originals[i].Base64));
            var json = JsonSerializer.Serialize(result);
            Assert.DoesNotContain("private-", json);
            Assert.DoesNotContain("private household", json);
            Assert.DoesNotContain("private shopping", json);
            Assert.DoesNotContain(line.Id.ToString(), json); Assert.DoesNotContain(stepId.ToString(), json);
            Assert.Equal(JsonSerializer.Serialize(before), JsonSerializer.Serialize(await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == Id)));
            Assert.False(await db.CanonicalRecipeOperations.AnyAsync());
            Assert.False(await db.RecipeFilePublications.AnyAsync());
            media.Verify(x => x.ReadOriginalImageAsync(Id, 5, It.IsAny<CancellationToken>()), Times.Never);
            media.Verify(x => x.WriteInfoAsync(It.IsAny<RecipeInfo>(), It.IsAny<CancellationToken>()), Times.Never);
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task ShareExport_HoldsRecipeCoordinationThroughSelectedMediaRead()
    {
        await WithStore(async (services, _, _, _) =>
        {
            var db = services.GetRequiredService<RecipeDbContext>();
            var media = ShareMedia();
            media.Setup(x => x.ReadHeroImageAsync(Id, It.IsAny<CancellationToken>())).Returns(async () =>
            {
                await using var connection = new NpgsqlConnection(db.Database.GetConnectionString());
                await connection.OpenAsync();
                var failure = await Assert.ThrowsAsync<PostgresException>(async () =>
                {
                    await using var command = new NpgsqlCommand("SELECT id FROM recipes WHERE id = @id FOR UPDATE NOWAIT", connection);
                    command.Parameters.AddWithValue("id", Id);
                    await command.ExecuteNonQueryAsync();
                });
                Assert.Equal(PostgresErrorCodes.LockNotAvailable, failure.SqlState);
                return ((Stream)new MemoryStream([7, 8]), "image/webp");
            });
            await ShareService(services, media.Object).ExportRecipeShareBundle(Id);
            // The export releases its coordination after copying media.
            await using var connection = new NpgsqlConnection(db.Database.GetConnectionString());
            await connection.OpenAsync();
            await using var command = new NpgsqlCommand("SELECT id FROM recipes WHERE id = @id FOR UPDATE NOWAIT", connection);
            command.Parameters.AddWithValue("id", Id);
            await command.ExecuteNonQueryAsync();
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task ShareExport_PendingPublicationReturnsAtomicConflictWithoutReadingOrRepairingMedia()
    {
        await WithStore(async (services, repository, store, storage) =>
        {
            storage.FailInfo = true;
            await Assert.ThrowsAsync<IOException>(async () => await store.PublishAsync(await store.CaptureAsync(Id), Candidate(), Guid.NewGuid()));
            var before = await repository.GetRecipeJsonAsync(Id, default);
            var media = ShareMedia();
            await Assert.ThrowsAsync<RecipeContentConflictException>(() => ShareService(services, media.Object).ExportRecipeShareBundle(Id));
            media.Verify(x => x.ReadHeroImageAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
            Assert.Equal(before, await repository.GetRecipeJsonAsync(Id, default));
            Assert.False((await services.GetRequiredService<RecipeDbContext>().RecipeFilePublications.SingleAsync()).Delivered);
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task ShareExport_HttpRefusesPendingDeliveryAndMissingHeroAndFindsMissingRecipeFirst()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            await using var factory = await TestWebApplicationFactory.CreateWithAuthAsync(configurationOverrides: new() {
                ["Tests:PostgresConnectionString"] = settings.ConnectionString, ["Tests:LocalRecipeStore"] = "true" });
            using var scope = factory.Services.CreateScope();
            var services = scope.ServiceProvider;
            var db = services.GetRequiredService<RecipeDbContext>();
            var id = Guid.NewGuid();
            db.Recipes.Add(new Recipe { Id = id, Name = "Shared recipe" });
            await db.SaveChangesAsync();
            using var client = factory.CreateAuthenticatedClient();
            client.DefaultRequestHeaders.Add("X-Family-Member-Id", factory.DefaultFamilyMemberId.ToString());
            Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync($"/api/recipes/{Guid.NewGuid()}/share")).StatusCode);
            Assert.Equal(HttpStatusCode.BadRequest, (await client.GetAsync($"/api/recipes/{id}/share")).StatusCode);
            db.RecipeFilePublications.Add(new RecipeFilePublication { RecipeId = id, OperationId = Guid.NewGuid(), Payload = """{"private":"retained payload"}""", InputHash = "pending", ResultHash = "pending" });
            await db.SaveChangesAsync();
            var response = await client.GetAsync($"/api/recipes/{id}/share");
            Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
            var json = await response.Content.ReadAsStringAsync();
            Assert.Contains("recipe_content_conflict", json); Assert.DoesNotContain("private", json);
            Assert.False((await db.RecipeFilePublications.AsNoTracking().SingleAsync()).Delivered);
        });
    }

    private static Mock<IRecipeStore> ShareMedia()
    {
        var media = new Mock<IRecipeStore>();
        media.Setup(x => x.ReadHeroImageAsync(Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(() => ((Stream)new MemoryStream([7, 8]), "image/webp"));
        media.Setup(x => x.ReadOriginalImageAsync(Id, It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .Returns((Guid _, int index, CancellationToken _) => Task.FromResult<(Stream, string)?>((new MemoryStream([(byte)index]), "image/png")));
        return media;
    }

    private static RecipeService ShareService(IServiceProvider services, IRecipeStore media) =>
        ActivatorUtilities.CreateInstance<RecipeService>(services, new ImageService(media, NullLogger<ImageService>.Instance));
}
