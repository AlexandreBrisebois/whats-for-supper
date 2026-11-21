using System.Reflection;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Services;

public sealed class RecipePublicationHistoryTests
{
    [Fact]
    public async Task OriginalPublicationRetainsIndependentBeforeAndResultProtectionAfterCurrentChanges()
    {
        await using var db = TestDbContextFactory.Create();
        var repository = new RecipeRepository(new InMemoryStorageProvider());
        var owner = RecipeServingsTests.PublicationStore(db, repository);
        var recipe = new Recipe { Id = Guid.NewGuid(), Name = "Before", Notes = "human private", RotationHumanOff = true,
            RotationSource = "Human", Ingredients = "[]", RawMetadata = "{\"unknownEvidence\":null}" };
        db.Recipes.Add(recipe); await db.SaveChangesAsync();
        await repository.SaveInfoAsync(new RecipeInfo { Id = recipe.Id, Name = recipe.Name }, default);
        var capture = await owner.CaptureAsync(recipe.Id);
        await owner.PublishAsync(capture, new RecipePublicationCandidate("{\"ingredients\":[\"salt\"]}",
            new RecipeInfo { Id = recipe.Id, Name = "After" }), Guid.NewGuid());
        var journal = await db.RecipeFilePublications.SingleAsync();
        var original = journal.Payload;
        var wire = JsonNode.Parse(original)!;
        Assert.NotNull(wire["capture"]!["fields"]);
        Assert.NotNull(wire["result"]);
        Assert.Equal("human private", wire["capture"]!["fields"]!["notes"]!.GetValue<string>());
        Assert.Equal("Before", wire["capture"]!["fields"]!["name"]!.GetValue<string>());
        Assert.Equal("After", wire["result"]!["name"]!.GetValue<string>());
        Assert.True(wire["result"]!["rotationHumanOff"]!.GetValue<bool>());
        recipe.Name = "Newer human"; recipe.Notes = null; await db.SaveChangesAsync();
        Validate(journal); // Historical verification has no destination read.
        await owner.PublishAsync(capture, new RecipePublicationCandidate("{\"ingredients\":[\"salt\"]}",
            new RecipeInfo { Id = recipe.Id, Name = "After" }), journal.OperationId);
        Assert.Equal(original, journal.Payload);
        Assert.Equal("Newer human", recipe.Name);
        wire["result"]!["notes"] = "corrupt";
        journal.Payload = wire.ToJsonString();
        Assert.Throws<InvalidDataException>(() => Validate(journal));
    }

    [Theory]
    [InlineData("result")]
    [InlineData("captured-field")]
    [InlineData("omitted-protection")]
    public async Task PendingDeliveryRejectsMissingOrAlteredOriginalAuthority(string corruption)
    {
        await using var db = TestDbContextFactory.Create();
        var repository = new RecipeRepository(new InMemoryStorageProvider());
        var owner = RecipeServingsTests.PublicationStore(db, repository);
        var recipe = new Recipe { Id = Guid.NewGuid(), Name = "Original", RotationHumanOff = true };
        db.Recipes.Add(recipe); await db.SaveChangesAsync();
        await repository.SaveInfoAsync(new RecipeInfo { Id = recipe.Id }, default);
        var capture = await owner.CaptureAsync(recipe.Id);
        await owner.PublishAsync(capture, new RecipePublicationCandidate("{}", new RecipeInfo { Id = recipe.Id }), Guid.NewGuid());
        var journal = await db.RecipeFilePublications.SingleAsync();
        var wire = JsonNode.Parse(journal.Payload)!;
        if (corruption == "result") wire.AsObject().Remove("result");
        else if (corruption == "captured-field")
        {
            Assert.NotNull(wire["capture"]!["fields"]);
            wire["capture"]!["fields"]!["name"] = "rewritten";
        }
        else
        {
            Assert.NotNull(wire["result"]);
            wire["result"]!.AsObject().Remove("rotationHumanOff");
        }
        journal.Payload = wire.ToJsonString(); journal.Delivered = false;
        await db.SaveChangesAsync();
        await Assert.ThrowsAsync<InvalidDataException>(() => owner.ResumeAsync(recipe.Id, journal.OperationId));
        Assert.False(journal.Delivered);
    }

    [Fact]
    public async Task CapturedHumanRotationChangeDefersBeforePublication()
    {
        await using var db = TestDbContextFactory.Create();
        var repository = new RecipeRepository(new InMemoryStorageProvider());
        var owner = RecipeServingsTests.PublicationStore(db, repository);
        var recipe = new Recipe { Id = Guid.NewGuid(), Name = "Original" };
        db.Recipes.Add(recipe); await db.SaveChangesAsync();
        await repository.SaveInfoAsync(new RecipeInfo { Id = recipe.Id }, default);
        var capture = await owner.CaptureAsync(recipe.Id);
        recipe.RotationHumanOff = true; recipe.RotationSource = "Human"; await db.SaveChangesAsync();
        await Assert.ThrowsAsync<RecipeContentConflictException>(() => owner.PublishAsync(capture,
            new RecipePublicationCandidate("{}", new RecipeInfo { Id = recipe.Id }), Guid.NewGuid()));
        Assert.Empty(db.RecipeFilePublications);
        Assert.True(recipe.RotationHumanOff);
        await Assert.ThrowsAsync<FileNotFoundException>(() => repository.GetRecipeJsonAsync(recipe.Id, default));
    }

    [Fact]
    public async Task NewMembershipRetainsCapturedAbsenceAndVerifiableOriginalResult()
    {
        await using var db = TestDbContextFactory.Create();
        var repository = new RecipeRepository(new InMemoryStorageProvider());
        var owner = RecipeServingsTests.PublicationStore(db, repository);
        var id = Guid.NewGuid();
        var capture = await owner.CaptureNewAsync(id);
        await owner.PublishAsync(capture, new RecipePublicationCandidate(null,
            new RecipeInfo { Id = id, Name = "New", Notes = "private", IsReady = false },
            SourceFiles: new Dictionary<string, byte[]?>(), SourceKind: "bootstrap"), Guid.NewGuid());
        var journal = await db.RecipeFilePublications.SingleAsync();
        var wire = JsonNode.Parse(journal.Payload)!;
        Assert.Equal("absent", wire["capture"]!["contentRevision"]!.GetValue<string>());
        Assert.Null(wire["capture"]!["fields"]);
        Assert.Equal("private", wire["result"]!["notes"]!.GetValue<string>());
        Validate(journal);
    }

    [Fact]
    public async Task MalformedLaunchFieldObservationRefusesBeforeProducerCapture()
    {
        await using var db = TestDbContextFactory.Create();
        var repository = new RecipeRepository(new InMemoryStorageProvider());
        var owner = RecipeServingsTests.PublicationStore(db, repository);
        var id = Guid.NewGuid();
        db.Recipes.Add(new Recipe { Id = id, Name = "Original" }); await db.SaveChangesAsync();
        await repository.SaveInfoAsync(new RecipeInfo { Id = id }, default);
        var task = await RecipeServingsTests.ProducerTask(db, repository, id);
        var instance = await db.WorkflowInstances.SingleAsync();
        var wire = JsonNode.Parse(instance.RecipePublicationCapture!)!;
        wire["capture"]!["fields"]!["notes"] = "fabricated original";
        instance.RecipePublicationCapture = wire.ToJsonString();
        // Keep the generic launch hash internally consistent so the regression
        // specifically tests the independently captured field fingerprint.
        var hashMethod = typeof(RecipeFilePublicationStore).GetMethod("Hash", BindingFlags.Static | BindingFlags.NonPublic)!;
        var launch = new { version = 2, capture = wire["capture"], tasks = wire["tasks"],
            workflowId = wire["workflowId"], parameters = wire["parameters"] };
        wire["inputHash"] = (string)hashMethod.Invoke(null, [launch])!;
        instance.RecipePublicationCapture = wire.ToJsonString(); await db.SaveChangesAsync();
        await Assert.ThrowsAsync<InvalidDataException>(() => owner.CaptureForTaskAsync(task, id));
        Assert.Empty(db.RecipeFilePublications);
    }

    [Fact]
    public async Task OmittedCapturedNullCannotBecomeAnOriginalObservation()
    {
        await using var db = TestDbContextFactory.Create();
        var repository = new RecipeRepository(new InMemoryStorageProvider());
        var owner = RecipeServingsTests.PublicationStore(db, repository);
        var id = Guid.NewGuid();
        db.Recipes.Add(new Recipe { Id = id, Name = "Original", Notes = null }); await db.SaveChangesAsync();
        await repository.SaveInfoAsync(new RecipeInfo { Id = id }, default);
        var task = await RecipeServingsTests.ProducerTask(db, repository, id);
        var instance = await db.WorkflowInstances.SingleAsync();
        var wire = JsonNode.Parse(instance.RecipePublicationCapture!)!;
        wire["capture"]!["fields"]!.AsObject().Remove("notes");
        instance.RecipePublicationCapture = wire.ToJsonString(); await db.SaveChangesAsync();
        await Assert.ThrowsAsync<InvalidDataException>(() => owner.CaptureForTaskAsync(task, id));
        Assert.Empty(db.RecipeFilePublications);
    }

    internal static void ValidateOriginalJournal(RecipeFilePublication journal) => Validate(journal);

    private static void Validate(RecipeFilePublication journal)
    {
        try { typeof(RecipeFilePublicationStore).GetMethod("ValidateRecoveryJournal", BindingFlags.Static | BindingFlags.NonPublic)!.Invoke(null, [journal]); }
        catch (TargetInvocationException ex) when (ex.InnerException is InvalidDataException invalid) { throw invalid; }
    }
}
