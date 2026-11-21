using System.Net;
using System.Reflection;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Services.Agents;
using RecipeApi.Services.Processors;
using RecipeApi.Tests.Infrastructure;
using RecipeApi.Tests.Integration;
using Xunit;

namespace RecipeApi.Tests.Services;

public sealed partial class RecipeProtectedReimportTests
{
    public static IEnumerable<object[]> CapturedSourceRepairCases() =>
        from channel in new[] { "url", "pdf" }
        from mode in new[] { "source", "steps-source", "steps-protected", "steps-reverted", "steps-missing-proof", "steps-late-human", "steps-forged-proof", "steps-repeat", "protected-before", "renamed-before", "stale-after", "mapped-source", "mapped-clear-before",
            "reordered", "duplicate", "changed-shape", "followup", "report-note-mismatch", "report-reasons-mismatch",
            "provider-failure", "provider-cancellation", "stale-during-provider", "source-during-provider", "delivery-replay", "delivery-newer-pending", "metadata-sync-failure" }
        select new object[] { channel, mode };

    [Theory]
    [MemberData(nameof(CapturedSourceRepairCases))]
    public async Task CapturedSourceRepair_UsesAcceptedOriginalAndPreservesHumanContent(string channel, string mode)
    {
        await using var factory = await TestWebApplicationFactory.CreateWithAuthAsync(configurationOverrides: new()
        { ["Tests:LocalRecipeStore"] = "true", ["Tests:RealWorkflowOrchestrator"] = "true" });
        await QualifyPhotoRepairAsync(factory, mode, channel);
    }

    private static WebAcquisitionAgent RepairWebAgent(RecipeFilePublicationStore publisher, byte[]? originalImage = null)
    {
        var chat = new Mock<IChatClient>();
        chat.Setup(x => x.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ChatResponse(new ChatMessage(ChatRole.Assistant,
                """{"name":"Pasta","heroImageUrl":"https://example.test/original.png"}""")));
        var prompts = new Mock<IPromptRepository>();
        prompts.Setup(x => x.GetPrompt(It.IsAny<PromptType>())).Returns("Read original page context.");
        return new(chat.Object, publisher, prompts.Object, new HttpClient(new RepairSourceHandler(originalImage)),
            NullLogger<WebAcquisitionAgent>.Instance);
    }

    private sealed class RepairSourceHandler(byte[]? originalImage) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Assert.NotNull(originalImage); // Repair must use its retained source; never fetch replacement media.
            var response = new HttpResponseMessage(HttpStatusCode.OK);
            response.Content = request.RequestUri!.AbsolutePath.EndsWith(".png", StringComparison.Ordinal)
                ? new ByteArrayContent(originalImage!) : new StringContent("<html>Retained original recipe</html>");
            response.Content.Headers.ContentType = new(request.RequestUri.AbsolutePath.EndsWith(".png", StringComparison.Ordinal)
                ? "image/png" : "text/html");
            return Task.FromResult(response);
        }
    }

    private static async Task ReuseCapturedChannel(RecipeFilePublicationStore publisher, RecipeDbContext db,
        WorkflowInstance workflow, string channel, Guid id)
    {
        if (channel == "photo") return;
        var processor = channel == "url" ? "FetchUrlContent" : "ConvertPdf";
        var task = workflow.Tasks.Single(x => x.ProcessorName == processor);
        var returned = channel == "url" ? await RepairWebAgent(publisher).ExecuteAsync(task, default)
            : await new PdfConversionProcessor(publisher, Mock.Of<IPdfPageRenderer>(MockBehavior.Strict)).ExecuteAsync(task, default);
        var result = JsonSerializer.Serialize(returned, JsonDefaults.CamelCase);
        Assert.True(JsonSerializer.Deserialize<JsonElement>(result).GetProperty("skipped").GetBoolean());
        Assert.False(await db.RecipeFilePublications.AnyAsync(x => x.OperationId == task.TaskId));
        var type = channel == "url" ? typeof(WebAcquisitionAgent) : typeof(PdfConversionProcessor);
        var validate = type.GetMethod("ValidateOriginalHistory", BindingFlags.NonPublic | BindingFlags.Static)!;
        Assert.Equal(id, validate.Invoke(null, [task.Payload, result, Array.Empty<RecipeFilePublication>()]));
    }

    private static async Task PrepareOriginalChannel(IServiceProvider services, RecipeFilePublicationStore publisher,
        WorkflowInstance workflow, string channel, byte[] originalImage)
    {
        if (channel == "url")
            await RepairWebAgent(publisher, originalImage).ExecuteAsync(workflow.Tasks.Single(x => x.ProcessorName == "FetchUrlContent"), default);
        if (channel != "pdf") return;
        var renderer = new Mock<IPdfPageRenderer>();
        renderer.Setup(x => x.RenderAsync(It.IsAny<Stream>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<byte[]>)[originalImage]);
        var converter = new PdfConversionProcessor(publisher, renderer.Object);
        var task = workflow.Tasks.Single(x => x.ProcessorName == "ConvertPdf");
        // Reuse the real admission/completion observation test owner; no seeded history.
        var observe = typeof(CanonicalIngredientPublicationPostgresTests).GetMethod("ObservePdfConversionCompletionAsync",
            BindingFlags.NonPublic | BindingFlags.Static)!;
        await (Task<string>)observe.Invoke(null, [services.GetRequiredService<RecipeDbContext>(), workflow, task,
            services.GetRequiredService<IClock>(), (Func<Task<object?>>)(() => converter.ExecuteAsync(task, default))])!;
    }
}
