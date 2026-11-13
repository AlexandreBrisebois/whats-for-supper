using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Workflow;
using Xunit;

namespace RecipeApi.Tests.Integration;

public sealed partial class CanonicalIngredientPublicationPostgresTests
{
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task HumanImage_AppendPreservesOccupiedUndeclaredSlotsAndRefusesCountDivergence()
    {
        foreach (var occupied in new[] { false, true })
            await WithStore(async (services, repository, store, _) =>
            {
                var db = services.GetRequiredService<RecipeDbContext>();
                var recipe = await db.Recipes.SingleAsync(x => x.Id == Id);
                recipe.ImageCount = occupied ? 1 : 2;
                await db.SaveChangesAsync();
                if (occupied) await repository.SaveOriginalImageAsync(Id, 1, "image/webp", [9], default);
                var service = services.GetRequiredService<RecipeService>();
                if (occupied) await Assert.ThrowsAsync<InvalidDataException>(() => service.AddOriginalImageAsync(Id, Upload()));
                else await Assert.ThrowsAsync<RecipeContentConflictException>(() => service.AddOriginalImageAsync(Id, Upload()));
                Assert.False(await db.RecipeFilePublications.AnyAsync());
                Assert.False(await repository.ExistsAsync(Id, "original/1.png"));
                if (occupied) Assert.Equal(new byte[] { 9 }, await repository.GetOriginalImageAsync(Id, 1, default));
            });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task HumanImage_TwentiethAppendSucceedsAndNextUploadPreservesAllFiles()
    {
        await WithStore(async (services, repository, store, _) =>
        {
            var db = services.GetRequiredService<RecipeDbContext>();
            var recipe = await db.Recipes.SingleAsync(x => x.Id == Id);
            recipe.ImageCount = 19;
            await db.SaveChangesAsync();
            var info = await repository.GetInfoAsync(Id, default);
            info.ImageCount = 19;
            await repository.SaveInfoAsync(info, default);
            // This case qualifies image admission, not workflow execution. Keep
            // the accepted typed follow-up paused instead of the factory's shallow
            // initializer replacing its task while retaining the old dispatch.
            Mock.Get(services.GetRequiredService<IWorkflowOrchestrator>())
                .Setup(x => x.InitializeRecipeFollowupAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync((WorkflowInstance?)null);
            var service = services.GetRequiredService<RecipeService>();
            Assert.Equal(19, await service.AddOriginalImageAsync(Id, Upload()));
            var accepted = await db.RecipeFilePublications.SingleAsync();
            var followup = await db.WorkflowInstances.Include(x => x.Tasks).SingleAsync(x => x.Id == accepted.OperationId);
            Assert.Equal(WorkflowStatus.Paused, followup.Status);
            Assert.Equal("RecipeFollowupInitialization", Assert.Single(followup.Tasks).ProcessorName);
            await Assert.ThrowsAsync<ArgumentException>(() => service.AddOriginalImageAsync(Id, Upload()));
            Assert.Equal(20, (await repository.GetInfoAsync(Id, default)).ImageCount);
            Assert.Equal(new byte[] { 4, 5, 6 }, await repository.GetOriginalImageAsync(Id, 19, default));
            Assert.Single(await db.RecipeFilePublications.ToListAsync());
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task HistoricalTenSlotJournal_ResumesOnlyWhenUnrecordedSlotsRemainAbsent()
    {
        foreach (var extra in new[] { false, true })
            await WithStore(async (services, repository, store, storage) =>
            {
                var current = await store.CaptureAsync(Id);
                var historical = current with { Files = current.Files.Where(x => !System.Text.RegularExpressions.Regex.IsMatch(x.Key, @"^original/1[0-9]\."))
                    .ToDictionary(x => x.Key, x => x.Value) };
                var operation = Guid.NewGuid();
                storage.FailInfo = true;
                await Assert.ThrowsAsync<IOException>(() => store.PublishAsync(historical, Candidate(), operation));
                storage.FailInfo = false;
                if (extra)
                {
                    await repository.SaveOriginalImageAsync(Id, 19, "image/png", [9], default);
                    await Assert.ThrowsAsync<RecipeContentConflictException>(() => store.ResumeAsync(Id, operation));
                    Assert.Equal(new byte[] { 9 }, await repository.GetOriginalImageAsync(Id, 19, default));
                }
                else await store.ResumeAsync(Id, operation);
                var db = services.GetRequiredService<RecipeDbContext>();
                Assert.Equal(!extra, (await db.RecipeFilePublications.SingleAsync()).Delivered);
            });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task HumanImage_CaptureRetainsAllTwentySupportedPhotoSlots()
    {
        await WithStore(async (services, repository, store, _) =>
        {
            var db = services.GetRequiredService<RecipeDbContext>();
            var recipe = await db.Recipes.SingleAsync(x => x.Id == Id);
            recipe.ImageCount = 20;
            await db.SaveChangesAsync();
            var info = await repository.GetInfoAsync(Id, default);
            info.ImageCount = 20;
            await repository.SaveInfoAsync(info, default);
            await repository.SaveOriginalImageAsync(Id, 19, "image/png", [7, 8, 9], default);
            var capture = await store.CaptureAsync(Id);
            Assert.Equal(new byte[] { 7, 8, 9 }, capture.Files["original/19.png"]);
            Assert.Null(capture.Files["original/19.webp"]);
        });
    }

    private static IFormFile Upload(Action? onRead = null)
    {
        var file = new Mock<IFormFile>();
        file.SetupGet(x => x.Length).Returns(3);
        file.SetupGet(x => x.ContentType).Returns("image/png");
        file.SetupGet(x => x.FileName).Returns("human.png");
        file.Setup(x => x.OpenReadStream()).Returns(() =>
        {
            onRead?.Invoke();
            return new MemoryStream([4, 5, 6]);
        });
        return file.Object;
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task HumanImage_DelayedUploadCannotPublishAfterANewerHumanEdit()
    {
        await WithStore(async (services, repository, store, _) =>
        {
            var db = services.GetRequiredService<RecipeDbContext>();
            var recipe = await db.Recipes.SingleAsync(x => x.Id == Id);
            recipe.ImageCount = 1;
            await db.SaveChangesAsync();
            var file = Upload(() =>
            {
                recipe.Name = "Later human name";
                db.SaveChanges();
            });
            await Assert.ThrowsAsync<RecipeContentConflictException>(() =>
                services.GetRequiredService<RecipeService>().AddOriginalImageAsync(Id, file));
            Assert.Equal(1, (await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == Id)).ImageCount);
            Assert.Equal("Later human name", recipe.Name);
            Assert.False(await repository.ExistsAsync(Id, "original/1.png"));
            Assert.Equal(1, (await repository.GetInfoAsync(Id, default)).ImageCount);
            Assert.False(await db.RecipeFilePublications.AnyAsync());
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task HumanImage_CommittedInterruptedDeliveryRetainsOneAppendAndResumesWithoutAnotherUpload()
    {
        await WithStore(async (services, repository, store, storage) =>
        {
            var db = services.GetRequiredService<RecipeDbContext>();
            var recipe = await db.Recipes.SingleAsync(x => x.Id == Id);
            recipe.ImageCount = 1;
            recipe.FinishedDishIndex = 0;
            await db.SaveChangesAsync();
            var info = await repository.GetInfoAsync(Id, default);
            info.FinishedDishImageIndex = 0;
            await repository.SaveInfoAsync(info, default);
            // The service uses the same owner with a fault only at the external file boundary.
            var service = ActivatorUtilities.CreateInstance<RecipeService>(services, store);
            storage.FailInfo = true;
            await Assert.ThrowsAsync<IOException>(() => service.AddOriginalImageAsync(Id, Upload()));
            var journal = await db.RecipeFilePublications.SingleAsync();
            Assert.False(journal.Delivered);
            Assert.Equal(2, (await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == Id)).ImageCount);
            storage.FailInfo = false;
            await store.ResumeAsync(Id, journal.OperationId);
            await store.ResumeAsync(Id, journal.OperationId);
            Assert.True((await db.RecipeFilePublications.SingleAsync()).Delivered);
            Assert.Equal(new byte[] { 4, 5, 6 }, await repository.GetOriginalImageAsync(Id, 1, default));
            Assert.Equal(new byte[] { 1, 2, 3 }, await repository.GetOriginalImageAsync(Id, 0, default));
            Assert.Equal(2, (await repository.GetInfoAsync(Id, default)).ImageCount);
            Assert.Equal(0, (await repository.GetInfoAsync(Id, default)).FinishedDishImageIndex);
            Assert.Equal(Original, await repository.GetRecipeJsonAsync(Id, default));
        });
    }
}
