using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Moq;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;
using TaskStatus = RecipeApi.Models.TaskStatus;

namespace RecipeApi.Tests.Controllers;

public class DemoManagementAccessTests
{
    [Theory]
    [InlineData("/api/management/demo-capture")]
    [InlineData("/api/management/demo-restore")]
    [InlineData("/api/workflows/demo-capture/trigger")]
    [InlineData("/api/workflows/demo-restore/trigger")]
    [InlineData("/api/management/seed")]
    [InlineData("/api/management/disaster-recovery")]
    [InlineData("/api/workflows/db-restore/trigger")]
    [InlineData("/api/workflows/db-disaster-recovery/trigger")]
    [InlineData("/api/management/recovery/restore/660e8400-e29b-41d4-a716-446655440010")]
    public async Task Demo_rejects_manual_management_without_accepting_work(string path)
    {
        await using var factory = await TestWebApplicationFactory.CreateAsync(new Dictionary<string, string?> { ["DEMO_MODE"] = "true" });
        using var client = factory.CreateClient();
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var before = await db.WorkflowInstances.CountAsync();

        var response = await client.PostAsJsonAsync(path, new { parameters = new { } });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        var error = await response.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
        Assert.Equal("DEMO_MANAGEMENT_UNAVAILABLE", error.GetProperty("code").GetString());
        Assert.Equal(before, await db.WorkflowInstances.CountAsync());
    }

    [Theory]
    [InlineData("CaptureDemoState", "demo-capture")]
    [InlineData("RestoreDemoState", "demo-restore")]
    [InlineData("CaptureDemoState", "custom-capture")]
    [InlineData("StartWorkflow", "custom-wrapper")]
    [InlineData("RestoreDatabase", "db-restore")]
    [InlineData("DisasterRecovery", "db-disaster-recovery")]
    public async Task Demo_rejects_task_retry_without_changing_failed_task(string processor, string workflowId)
    {
        await using var factory = await TestWebApplicationFactory.CreateAsync(new Dictionary<string, string?> { ["DEMO_MODE"] = "true" });
        using var client = factory.CreateClient();
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var instance = new WorkflowInstance { Id = Guid.NewGuid(), WorkflowId = workflowId, Status = WorkflowStatus.Failed };
        var task = new WorkflowTask
        {
            TaskId = Guid.NewGuid(), InstanceId = instance.Id, Instance = instance,
            TaskName = "operation", ProcessorName = processor, Status = TaskStatus.Failed,
            Payload = processor == "StartWorkflow" ? "{\"workflowId\":\"demo-restore\"}" : "{}",
            RetryCount = 3, ErrorMessage = "Original failure"
        };
        db.WorkflowInstances.Add(instance);
        db.WorkflowTasks.Add(task);
        await db.SaveChangesAsync();

        var response = await client.PostAsync($"/api/workflows/tasks/{task.TaskId}/reset", null);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        await db.Entry(task).ReloadAsync();
        Assert.Equal(TaskStatus.Failed, task.Status);
        Assert.Equal(3, task.RetryCount);
        Assert.Equal("Original failure", task.ErrorMessage);
    }

    [Theory]
    [InlineData("CaptureDemoState")]
    [InlineData("RestoreDemoState")]
    public async Task Demo_rejects_custom_workflow_with_demo_management_processor(string processor)
    {
        await using var factory = await TestWebApplicationFactory.CreateAsync(new Dictionary<string, string?> { ["DEMO_MODE"] = "true" });
        factory.WorkflowOrchestratorMock.Setup(o => o.GetDefinitionAsync("custom-management"))
            .ReturnsAsync(new WorkflowDefinition { Tasks = [new() { Name = "operation", Processor = processor }] });
        using var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/workflows/custom-management/trigger", new { parameters = new { } });
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Demo_rejects_wrapper_that_dispatches_demo_reset()
    {
        await using var factory = await TestWebApplicationFactory.CreateAsync(new Dictionary<string, string?> { ["DEMO_MODE"] = "true" });
        factory.WorkflowOrchestratorMock.Setup(o => o.GetDefinitionAsync("custom-wrapper"))
            .ReturnsAsync(new WorkflowDefinition { Tasks = [new() { Name = "start", Processor = "StartWorkflow", Payload = new() { ["workflowId"] = "demo-restore" } }] });
        using var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/workflows/custom-wrapper/trigger", new { parameters = new { } });
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Demo_checks_parameterized_sibling_dispatches_independently()
    {
        await using var factory = await TestWebApplicationFactory.CreateAsync(new Dictionary<string, string?> { ["DEMO_MODE"] = "true" });
        factory.WorkflowOrchestratorMock.Setup(o => o.GetDefinitionAsync("siblings"))
            .ReturnsAsync(new WorkflowDefinition { Tasks = [
                new() { Name = "safe", Processor = "StartWorkflow", Payload = new() { ["workflowId"] = "router", ["parameters"] = new Dictionary<string, string> { ["target"] = "safe" } } },
                new() { Name = "unsafe", Processor = "StartWorkflow", Payload = new() { ["workflowId"] = "router", ["parameters"] = new Dictionary<string, string> { ["target"] = "demo-capture" } } }
            ] });
        factory.WorkflowOrchestratorMock.Setup(o => o.GetDefinitionAsync("router"))
            .ReturnsAsync(new WorkflowDefinition { Tasks = [new() { Name = "dispatch", Processor = "StartWorkflow", Payload = new() { ["workflowId"] = "{{target}}" } }] });
        using var client = factory.CreateClient();
        Assert.Equal(HttpStatusCode.Forbidden, (await client.PostAsJsonAsync("/api/workflows/siblings/trigger", new { parameters = new { } })).StatusCode);
    }

    [Fact]
    public async Task Demo_capture_execution_is_blocked_before_writing_baseline()
    {
        await using var factory = await TestWebApplicationFactory.CreateAsync(new Dictionary<string, string?> { ["DEMO_MODE"] = "true" });
        using var scope = factory.Services.CreateScope();
        var service = scope.ServiceProvider.GetRequiredService<ManagementService>();
        var error = await Assert.ThrowsAsync<InvalidOperationException>(() => service.CaptureDemoStateAsync());
        Assert.Contains("Demo Mode", error.Message);
    }

    [Fact]
    public async Task Invalid_demo_flag_retains_non_demo_acceptance_in_recovery_boundary()
    {
        await using var factory = await TestWebApplicationFactory.CreateAsync(new Dictionary<string, string?> { ["DEMO_MODE"] = "invalid" });
        using var client = factory.CreateClient();
        Assert.Equal(HttpStatusCode.Accepted, (await client.PostAsync("/api/management/demo-capture", null)).StatusCode);
    }

    [Fact]
    public async Task Demo_rejects_execution_of_unscheduled_restore_work()
    {
        await using var factory = await TestWebApplicationFactory.CreateAsync(new Dictionary<string, string?> { ["DEMO_MODE"] = "true" });
        using var scope = factory.Services.CreateScope();
        var service = scope.ServiceProvider.GetRequiredService<ManagementService>();
        var error = await Assert.ThrowsAsync<InvalidOperationException>(() => service.RestoreDemoStateAsync());
        Assert.Contains("Demo Mode", error.Message);
    }

    [Theory]
    [InlineData("/api/management/demo-capture")]
    [InlineData("/api/management/demo-restore")]
    [InlineData("/api/workflows/demo-capture/trigger")]
    [InlineData("/api/workflows/demo-restore/trigger")]
    public async Task Private_preparation_retains_management_acceptance(string path)
    {
        await using var factory = await TestWebApplicationFactory.CreateAsync(new Dictionary<string, string?> { ["DEMO_MODE"] = "false" });
        using var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync(path, new { parameters = new { } });
        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
    }
}
