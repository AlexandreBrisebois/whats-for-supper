using System.Reflection;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using RecipeApi.Tests.Integration;
using Xunit;
using TaskStatus = RecipeApi.Models.TaskStatus;

namespace RecipeApi.Tests.Services;

public sealed class SupperRefreshLaunchTests
{
    [Theory]
    [InlineData("save")]
    [InlineData("invalidate")]
    [InlineData("retry")]
    public Task RefreshAcceptance_PersistsOriginalDispatchBeforeExecution(string entrypoint)
    {
        var name = Guid.NewGuid().ToString();
        return CheckAcceptanceAsync(b => b.UseInMemoryDatabase(name), entrypoint);
    }

    internal static async Task CheckAcceptanceAsync(Action<DbContextOptionsBuilder> configure, string entrypoint)
    {
        var options = new DbContextOptionsBuilder<RecipeDbContext>();
        configure(options);
        await using var db = new RecipeDbContext(options.Options);
        var clock = new DeploymentCalendarIntegrationTests.CalendarClock
        { UtcNow = new DateTimeOffset(2026, 11, 8, 9, 40, 0, TimeSpan.Zero) };
        var calendar = new DeploymentCalendar(new ConfigurationManager());
        var invalidation = new SupperProjectionInvalidation(db, clock, calendar);
        var service = new SupperServingsService(db, clock, calendar, invalidation);
        var monday = DeploymentCalendar.Monday(calendar.Capture(clock.UtcNow).Today);
        Guid? originalId = null;
        string? originalCapture = null;
        if (entrypoint == "save")
        {
            var before = await service.ReadAsync(0, monday, default);
            await service.SaveAsync(new SupperServingsSaveDto(monday, 0, before.Version,
                [new(calendar.Capture(clock.UtcNow).Today, JsonSerializer.SerializeToElement(6))], default), default);
        }
        else
        {
            await invalidation.EnlistWeeksAsync([monday], default);
            if (entrypoint == "retry")
            {
                var first = await db.WorkflowInstances.AsNoTracking().Include(x => x.Tasks).SingleAsync();
                originalId = first.Id; originalCapture = first.RecipePublicationCapture;
                var plan = await db.WeeklyPlans.SingleAsync();
                plan.ServingRefreshStatus = "failed";
                await db.SaveChangesAsync();
                await service.RetryAsync(new SupperServingsRefreshDto([monday]), default);
            }
        }
        // Independent context observes committed acceptance, not a tracked object.
        await using var read = new RecipeDbContext(options.Options);
        var savedPlan = await read.WeeklyPlans.AsNoTracking().SingleAsync(x => x.WeekStartDate == monday);
        var workflow = await read.WorkflowInstances.AsNoTracking().Include(x => x.Tasks)
            .SingleAsync(x => x.Id == savedPlan.ServingRefreshWorkflowId);
        Assert.Equal("updating", savedPlan.ServingRefreshStatus);
        Assert.NotEqual(savedPlan.ServingInputVersion, savedPlan.ServingAppliedVersion);
        Assert.Equal(WorkflowStatus.Pending, workflow.Status);
        var task = Assert.Single(workflow.Tasks);
        Assert.Equal(TaskStatus.Pending, task.Status);
        Assert.Null(task.Result);
        Assert.Equal("RefreshSupperGroceries", task.ProcessorName);
        Assert.NotNull(workflow.RecipePublicationCapture);
        using var capture = JsonDocument.Parse(workflow.RecipePublicationCapture!);
        Assert.Equal("dispatch", capture.RootElement.GetProperty("kind").GetString());
        Assert.Equal(workflow.Id, capture.RootElement.GetProperty("instanceId").GetGuid());
        Assert.Equal(monday.ToString("yyyy-MM-dd"), capture.RootElement.GetProperty("parameters")
            .GetProperty("weekStartDate").GetString());
        Assert.Equal(task.TaskId.ToString(), Assert.Single(capture.RootElement.GetProperty("tasks").EnumerateObject()).Name);
        Validate(workflow);
        if (originalId is { } prior)
        {
            Assert.NotEqual(prior, workflow.Id);
            var original = await read.WorkflowInstances.AsNoTracking().Include(x => x.Tasks).SingleAsync(x => x.Id == prior);
            Assert.NotNull(originalCapture);
            Assert.Equal(originalCapture, original.RecipePublicationCapture);
            Assert.Equal(TaskStatus.Pending, Assert.Single(original.Tasks).Status);
            Validate(original);
        }
        // Coherent edits to raw parameters/payload are not a new accepted command.
        workflow.Parameters = """{"weekStartDate":"2026-11-16"}""";
        task.Payload = workflow.Parameters;
        Assert.Throws<InvalidDataException>(() => Validate(workflow));
        await using var final = new RecipeDbContext(options.Options);
        Assert.Equal(workflow.RecipePublicationCapture,
            (await final.WorkflowInstances.SingleAsync(x => x.Id == workflow.Id)).RecipePublicationCapture);
        Assert.Null((await final.WorkflowTasks.SingleAsync(x => x.TaskId == task.TaskId)).Result);
    }

    private static void Validate(WorkflowInstance instance)
    {
        var method = typeof(RecipeFilePublicationStore).GetMethod("ValidateRecoveryLaunch", BindingFlags.Static | BindingFlags.NonPublic)!;
        try { method.Invoke(null, [instance, false]); }
        catch (TargetInvocationException error)
        { System.Runtime.ExceptionServices.ExceptionDispatchInfo.Capture(error.InnerException!).Throw(); }
    }
}
