using RecipeApi.Models;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Services;

public sealed class FoodVocabularyHistoryUnionTests
{
    private static readonly Guid WorkflowId = Guid.Parse("c9407b39-156b-491f-8205-bdc641d239bf");
    private static readonly Guid TaskId = Guid.Parse("10d96987-f099-422b-9f5c-ffb46630c03b");
    private static byte[] Observe(bool completed, string payload = "{}")
    {
        var at = DateTimeOffset.Parse("2026-11-13T16:00:00Z");
        var workflow = new WorkflowInstance { Id = WorkflowId, WorkflowId = "retained-work", Parameters = "{}",
            Status = completed ? WorkflowStatus.Completed : WorkflowStatus.Pending, CreatedAt = at, UpdatedAt = completed ? at.AddSeconds(1) : at,
            Tasks = [new WorkflowTask { TaskId = TaskId, InstanceId = WorkflowId, TaskName = "retained-task", ProcessorName = "RetainedProcessor",
                Payload = payload, Status = completed ? RecipeApi.Models.TaskStatus.Completed : RecipeApi.Models.TaskStatus.Pending, DependsOn = [],
                Result = completed ? "{\"receipt\":true}" : null, CreatedAt = at, UpdatedAt = completed ? at.AddSeconds(1) : at }] };
        var facts = new FoodVocabularyInventoryFacts(new(null), [], [], [], new([workflow], [], [], [], [], [], [], [], [], [], []),
            new(FoodVocabularyOverrideCoverage.CapturedV1, []));
        return FoodVocabularyInventoryQualification.WriteHistoryObservations(facts, "snapshot", Guid.NewGuid(), null, null);
    }

    [Fact]
    public void ExactDuplicateContext_CollapsesWithoutChangingRawBytes()
    {
        var package = Observe(false);
        Assert.Equal(package, FoodVocabularyInventoryQualification.MergeHistoryObservations(package, package));
    }

    [Fact]
    public void MutableReceiptProgression_PreservesBothTypedContextsAndIsIndependentOfSourceOrder()
    {
        var first = Observe(false);
        var second = Observe(true);
        var merged = FoodVocabularyInventoryQualification.MergeHistoryObservations(first, second);
        Assert.Equal(merged, FoodVocabularyInventoryQualification.MergeHistoryObservations(second, first));
        var contexts = FoodVocabularyInventoryQualification.ReadHistoryObservations(merged);
        Assert.Equal(2, contexts.Count);
        Assert.Contains(contexts, x => Assert.Single(x.Facts.History.Instances).Status == WorkflowStatus.Pending);
        Assert.Contains(contexts, x => Assert.Single(x.Facts.History.Instances).Status == WorkflowStatus.Completed);
    }

    [Fact]
    public void ConflictingOriginalTaskInput_RejectsBothSourceOrders()
    {
        var first = Observe(false);
        var conflicting = Observe(true, "{\"divergentOriginal\":true}");
        Assert.Throws<InvalidDataException>(() => FoodVocabularyInventoryQualification.MergeHistoryObservations(first, conflicting));
        Assert.Throws<InvalidDataException>(() => FoodVocabularyInventoryQualification.MergeHistoryObservations(conflicting, first));
    }
}
