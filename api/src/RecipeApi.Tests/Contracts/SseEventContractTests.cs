using System.Reflection;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using RecipeApi.Dto;
using RecipeApi.Infrastructure;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Contracts;

/// <summary>
/// Verifies contract parity between C# SSE emitters (<see cref="SseEventPublisher"/>
/// and <c>StreamController</c>) and the PWA <c>useScheduleStream</c> consumer hook.
/// </summary>
public class SseEventContractTests
{
    private static readonly HashSet<string> CanonicalSseEvents = new(StringComparer.Ordinal)
    {
        "connected",
        "demo_reset",
        "slot_updated",
        "week_updated",
        "vote_updated",
        "voting_session_updated",
        "smart_defaults_updated",
        "fill_the_gap_invalidated",
        "recipe_ready",
        "recipe_searchable",
        "recipe_enriched",
        "recipe_enrichment_failed",
        "capture_step_updated",
        "recipe_failed",
        "grocery_updated",
        "grocery_extras_updated",
    };

    [Fact]
    public void CanonicalEventSetMatchesServerEmittersAndPwaScheduleStreamListeners()
    {
        var repoRoot = FindRepoRoot();
        var hookPath = Path.Combine(repoRoot, "pwa", "src", "hooks", "useScheduleStream.ts");
        var publisherPath = Path.Combine(repoRoot, "api", "src", "RecipeApi", "Infrastructure", "SseEventPublisher.cs");
        var streamControllerPath = Path.Combine(repoRoot, "api", "src", "RecipeApi", "Controllers", "StreamController.cs");

        var pwaEvents = ParsePwaRegisteredEvents(File.ReadAllText(hookPath));
        var serverEvents = ParseServerEmittedEvents(
            File.ReadAllText(publisherPath),
            File.ReadAllText(streamControllerPath));

        AssertSetParity("CanonicalSseEvents", CanonicalSseEvents, "C# SSE emitters", serverEvents);
        AssertSetParity("CanonicalSseEvents", CanonicalSseEvents, "useScheduleStream.ts listeners", pwaEvents);
    }

    [Fact]
    public async Task AllScheduleEventPublisherMethods_EmitValidCamelCasePayloadsWithExpectedClientKeys()
    {
        var calendar = new DeploymentCalendar(new ConfigurationManager())
            .Capture(DateTimeOffset.Parse("2026-10-12T12:00:00Z"));
        var weekStart = new DateOnly(2026, 10, 12);
        var recipeId = Guid.NewGuid();
        var occurrenceId = Guid.NewGuid();
        var workflowId = Guid.NewGuid();

        var recipeDto = new ScheduleRecipeDto(recipeId, "Roast Chicken", "/img/chicken.jpg");
        var nonCookingDto = new NonCookingPlanDto("custom", "Pizza night");
        var prepDto = new SupperPreparationDto
        {
            PreparedOn = weekStart,
            PreparedAtUtc = DateTimeOffset.Parse("2026-10-12T17:00:00Z"),
            Servings = 4,
            PortionContext = "dated",
            OriginalServings = 4,
            PlanToken = "v1.token",
            ServingVersion = "v1",
        };
        var dayDto = new ScheduleDayDto("Monday", "2026-10-12", recipeDto, 1, nonCookingDto, null, occurrenceId, prepDto);
        var scheduleDto = new ScheduleDays(0, false, 0, [dayDto], calendar, weekStart);
        var defaultsDto = new SmartDefaultsDto(0, 4, 2, [], [], 1, weekStart);
        var sessionDto = new VotingSessionSnapshot
        {
            IncarnationId = Guid.NewGuid(),
            Revision = 1,
            RoundId = Guid.NewGuid(),
            WeekStartDate = weekStart,
            Phase = "open",
            RequiredSlots = 3,
            CoveredSlots = 1,
            CandidateCount = 5,
            SmartDefaults = defaultsDto,
        };
        var groceryRow = new GroceryLineItemDto("Milk", "milk", "Dairy & Eggs", 1.0, "L", [recipeId])
        {
            RowId = "row-1",
            RowVersion = "1",
            WeekStartDate = weekStart,
            DemandIdentity = "milk",
        };
        var grocerySnapshot = new GroceryMutationResult(
            DateTimeOffset.Parse("2026-10-12T12:00:00Z"),
            weekStart,
            "2",
            new Dictionary<string, bool> { ["row-1"] = true },
            [groceryRow])
        {
            PresentationVersion = "1",
            PresentationEpoch = Guid.NewGuid(),
        };
        var groceryExtra = new GroceryExtraDto(
            Guid.NewGuid(), Guid.NewGuid(), weekStart, "Sourdough", "sourdough", "Bakery", true, 1, "extra", false);

        var cases = new (string MethodName, Func<SseEventPublisher, Task> Invoke, string ExpectedEvent, string[] RequiredTopLevelKeys)[]
        {
            (nameof(IScheduleEventPublisher.PublishSlotUpdatedAsync),
                p => p.PublishSlotUpdatedAsync(weekStart, recipeDto, 1, nonCooking: nonCookingDto, occurrenceId: occurrenceId),
                "slot_updated",
                ["date", "recipe", "status", "nonCooking", "occurrenceId"]),
            (nameof(IScheduleEventPublisher.PublishWeekUpdatedAsync),
                p => p.PublishWeekUpdatedAsync(scheduleDto, echoSeq: 3),
                "week_updated",
                ["schedule", "echoSeq"]),
            (nameof(IScheduleEventPublisher.PublishVotingSessionUpdatedAsync),
                p => p.PublishVotingSessionUpdatedAsync(sessionDto),
                "voting_session_updated",
                ["session"]),
            (nameof(IScheduleEventPublisher.PublishVoteUpdatedAsync),
                p => p.PublishVoteUpdatedAsync(recipeId, 2),
                "vote_updated",
                ["recipeId", "voteCount"]),
            (nameof(IScheduleEventPublisher.PublishSmartDefaultsUpdatedAsync),
                p => p.PublishSmartDefaultsUpdatedAsync(0, defaultsDto),
                "smart_defaults_updated",
                ["weekOffset", "defaults"]),
            (nameof(IScheduleEventPublisher.PublishFillTheGapInvalidatedAsync),
                p => p.PublishFillTheGapInvalidatedAsync(0, weekStart),
                "fill_the_gap_invalidated",
                ["weekOffset", "weekStartDate"]),
            (nameof(IScheduleEventPublisher.PublishAllSuggestionsInvalidatedAsync),
                p => p.PublishAllSuggestionsInvalidatedAsync(),
                "fill_the_gap_invalidated",
                ["allWeeks"]),
            (nameof(IScheduleEventPublisher.PublishDemoResetAsync),
                p => p.PublishDemoResetAsync(Guid.NewGuid()),
                "demo_reset",
                ["generation"]),
            (nameof(IScheduleEventPublisher.PublishRecipeReadyAsync),
                p => p.PublishRecipeReadyAsync(recipeId, "Roast Chicken", "/img/chicken.jpg", isSuspectedDuplicate: true),
                "recipe_ready",
                ["recipeId", "name", "imageUrl", "isSuspectedDuplicate"]),
            (nameof(IScheduleEventPublisher.PublishRecipeSearchableAsync),
                p => p.PublishRecipeSearchableAsync(recipeId, "Roast Chicken", isSuspectedDuplicate: false),
                "recipe_searchable",
                ["recipeId", "name", "isSuspectedDuplicate"]),
            (nameof(IScheduleEventPublisher.PublishRecipeEnrichedAsync),
                p => p.PublishRecipeEnrichedAsync(recipeId),
                "recipe_enriched",
                ["recipeId"]),
            (nameof(IScheduleEventPublisher.PublishRecipeEnrichmentFailedAsync),
                p => p.PublishRecipeEnrichmentFailedAsync(recipeId),
                "recipe_enrichment_failed",
                ["recipeId"]),
            (nameof(IScheduleEventPublisher.PublishCaptureStepUpdatedAsync),
                p => p.PublishCaptureStepUpdatedAsync(workflowId, recipeId, "extract_recipe", "Extracting recipe"),
                "capture_step_updated",
                ["workflowInstanceId", "recipeId", "stepName", "stepLabel"]),
            (nameof(IScheduleEventPublisher.PublishRecipeFailedAsync),
                p => p.PublishRecipeFailedAsync(recipeId, workflowId, "Extraction failed", "extract_recipe", null),
                "recipe_failed",
                ["recipeId", "workflowInstanceId", "errorMessage", "failedStep", "partialData"]),
            (nameof(IScheduleEventPublisher.PublishGroceryUpdatedAsync),
                p => p.PublishGroceryUpdatedAsync(0, new Dictionary<string, bool> { ["MilkKey"] = true }, weekStart),
                "grocery_updated",
                ["weekOffset", "weekStartDate", "groceryState"]),
            (nameof(IScheduleEventPublisher.PublishGroceryRowsUpdatedAsync),
                p => p.PublishGroceryRowsUpdatedAsync(0, grocerySnapshot),
                "grocery_updated",
                ["weekOffset", "weekStartDate", "groceryListVersion", "groceryState", "groceryItems", "presentationVersion", "presentationEpoch"]),
            (nameof(IScheduleEventPublisher.PublishGroceryExtrasUpdatedAsync),
                p => p.PublishGroceryExtrasUpdatedAsync(weekStart, [groceryExtra]),
                "grocery_extras_updated",
                ["weekStartDate", "groceryExtras"]),
        };

        var interfaceMethods = typeof(IScheduleEventPublisher)
            .GetMethods(BindingFlags.Public | BindingFlags.Instance)
            .Select(static m => m.Name)
            .ToHashSet(StringComparer.Ordinal);
        var coveredMethods = cases.Select(static c => c.MethodName).ToHashSet(StringComparer.Ordinal);
        AssertSetParity("IScheduleEventPublisher methods", interfaceMethods, "Contract test cases", coveredMethods);

        foreach (var testCase in cases)
        {
            var (manager, body) = CreateCaptureSink();
            var publisher = new SseEventPublisher(manager);

            await testCase.Invoke(publisher);

            var (eventType, payload) = ParseSseFrame(body);
            Assert.Equal(testCase.ExpectedEvent, eventType);
            Assert.Contains(eventType, CanonicalSseEvents);
            Assert.Equal(JsonValueKind.Object, payload.ValueKind);

            foreach (var key in testCase.RequiredTopLevelKeys)
            {
                Assert.True(
                    payload.TryGetProperty(key, out _),
                    $"Method '{testCase.MethodName}' event '{eventType}' is missing required camelCase key '{key}'.");
            }

            AssertCamelCaseObjectKeys(payload, parentPropertyName: null, context: $"{testCase.MethodName} ({eventType})");
        }
    }

    private static (SseConnectionManager Manager, MemoryStream Body) CreateCaptureSink()
    {
        var manager = new SseConnectionManager();
        var context = new DefaultHttpContext();
        var body = new MemoryStream();
        context.Response.Body = body;
        manager.AddConnection(context.Response);
        return (manager, body);
    }

    private static (string EventType, JsonElement Payload) ParseSseFrame(MemoryStream body)
    {
        var raw = Encoding.UTF8.GetString(body.ToArray());
        Assert.EndsWith("\n\n", raw, StringComparison.Ordinal);

        var lines = raw.Split('\n', StringSplitOptions.RemoveEmptyEntries);
        Assert.Equal(2, lines.Length);
        Assert.StartsWith("event: ", lines[0], StringComparison.Ordinal);
        Assert.StartsWith("data: ", lines[1], StringComparison.Ordinal);

        var eventType = lines[0]["event: ".Length..];
        using var doc = JsonDocument.Parse(lines[1]["data: ".Length..]);
        return (eventType, doc.RootElement.Clone());
    }

    private static void AssertCamelCaseObjectKeys(JsonElement element, string? parentPropertyName, string context)
    {
        // Dictionary<string, bool> map entries (groceryState) carry arbitrary item keys rather than DTO property names.
        if (parentPropertyName == "groceryState")
        {
            return;
        }

        if (element.ValueKind == JsonValueKind.Object)
        {
            foreach (var prop in element.EnumerateObject())
            {
                Assert.True(
                    prop.Name.Length > 0 && char.IsLower(prop.Name[0]),
                    $"Non-camelCase property '{prop.Name}' emitted in {context}.");
                AssertCamelCaseObjectKeys(prop.Value, prop.Name, context);
            }
        }
        else if (element.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in element.EnumerateArray())
            {
                AssertCamelCaseObjectKeys(item, null, context);
            }
        }
    }

    private static HashSet<string> ParsePwaRegisteredEvents(string hookSource) =>
        Regex.Matches(hookSource, @"source\.addEventListener\(\s*['""]([^'""]+)['""]")
            .Select(static m => m.Groups[1].Value)
            .ToHashSet(StringComparer.Ordinal);

    private static HashSet<string> ParseServerEmittedEvents(string publisherSource, string streamControllerSource)
    {
        var events = new HashSet<string>(StringComparer.Ordinal);

        foreach (Match match in Regex.Matches(publisherSource, @"(?:BroadcastAsync|PublishAndRefreshAsync)\(\s*""([^""]+)"""))
        {
            events.Add(match.Groups[1].Value);
        }

        foreach (Match match in Regex.Matches(streamControllerSource, @"event:\s*([a-z0-9_]+)"))
        {
            events.Add(match.Groups[1].Value);
        }

        return events;
    }

    private static void AssertSetParity(string leftName, IReadOnlySet<string> left, string rightName, IReadOnlySet<string> right)
    {
        var onlyLeft = left.Except(right).OrderBy(static x => x, StringComparer.Ordinal).ToArray();
        var onlyRight = right.Except(left).OrderBy(static x => x, StringComparer.Ordinal).ToArray();

        Assert.True(
            onlyLeft.Length == 0 && onlyRight.Length == 0,
            $"SSE contract mismatch between {leftName} and {rightName}.\n" +
            $"Only in {leftName}: [{string.Join(", ", onlyLeft)}]\n" +
            $"Only in {rightName}: [{string.Join(", ", onlyRight)}]");
    }

    private static string FindRepoRoot()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null)
        {
            if (File.Exists(Path.Combine(dir.FullName, "specs", "openapi.yaml")))
            {
                return dir.FullName;
            }

            dir = dir.Parent;
        }

        throw new FileNotFoundException("Could not locate repository root containing specs/openapi.yaml.");
    }
}
