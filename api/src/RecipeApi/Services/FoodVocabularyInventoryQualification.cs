using RecipeApi.Infrastructure;
using RecipeApi.Models;

namespace RecipeApi.Services;

public sealed record FoodVocabularyMembershipObservation(string? RawJson);
public sealed record FoodVocabularyRecipeObservation(Guid RecipeId, string? CanonicalContent, string? FoodMappingEvidence);
public enum FoodVocabularyOverrideCoverage { LiveOwnerNotImplemented, CapturedV1 }
public sealed record FoodVocabularyScopedOverrideObservation(Guid Id, string Revision, Guid? FoodId,
    string? DictionaryRevision, FoodVocabularyReference? Document, string? FallbackKey, string? ShoppingName,
    string? GrocerySection, string[] ProtectedFields, string PresentationSequence, DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt);
public sealed record FoodVocabularyOverrideFeed(FoodVocabularyOverrideCoverage Coverage,
    IReadOnlyList<FoodVocabularyScopedOverrideObservation>? Rows);
public sealed record FoodVocabularyStagedJournalObservation(Guid RecipeId, Guid OperationId, string InputHash, byte[] RawBytes);
public sealed record FoodVocabularyHistoryFacts(IReadOnlyList<WorkflowInstance> Instances,
    IReadOnlyList<WorkflowLaunchIntent> Launches, IReadOnlyList<WorkflowChildIntent> Children,
    IReadOnlyList<WorkflowResetIntent> Resets, IReadOnlyList<WorkflowProcessorAttempt> Attempts,
    IReadOnlyList<WorkflowLifecycleRecord> Retirements, IReadOnlyList<RecipeRepairIntent> Repairs,
    IReadOnlyList<RecipePhysicalDeletion> PhysicalRetirements,
    IReadOnlyList<MaintenanceCommandLifecycleRecord> MaintenanceRetirements, IReadOnlyList<FoodVocabularyStagedJournalObservation> StagedJournals,
    IReadOnlyList<MaintenanceCommandObservation> Commands);
public sealed record FoodVocabularyInventoryFacts(FoodVocabularyMembershipObservation Membership,
    IReadOnlyList<FoodVocabularyRecipeObservation> Recipes, IReadOnlyList<CanonicalRecipeOperation> CanonicalOperations,
    IReadOnlyList<RecipeFilePublication> Publications, FoodVocabularyHistoryFacts History, FoodVocabularyOverrideFeed Overrides);
public sealed record FoodVocabularyReferenceOrigin(FoodVocabularyReference Reference, string OwnerKind, string OwnerKey);

// No database, storage, identity allocation or current-head lookup belongs here.
// Each retained format is interpreted exclusively by its existing typed owner.
public static partial class FoodVocabularyInventoryQualification
{
    public static IReadOnlyList<FoodVocabularyReferenceOrigin> RequiredReferences(FoodVocabularyInventoryFacts facts)
        => RequiredReferences(facts, prospectiveDemoInvalidation: false);

    internal static IReadOnlyList<FoodVocabularyReferenceOrigin> ContextReferences(FoodVocabularyContextFacts context) =>
        context.Context.Kind == "demo-destination" ? RequiredReferencesForDemoInvalidation(context.Facts) : RequiredReferences(context.Facts);

    internal static IReadOnlyList<FoodVocabularyReferenceOrigin> RequiredReferencesForDemoInvalidation(FoodVocabularyInventoryFacts facts)
        => RequiredReferences(facts, prospectiveDemoInvalidation: true);

    private static IReadOnlyList<FoodVocabularyReferenceOrigin> RequiredReferences(FoodVocabularyInventoryFacts facts, bool prospectiveDemoInvalidation)
    {
        FoodVocabularyDefinitions.Require(facts is not null && facts.Membership is not null && facts.Recipes is not null
            && facts.CanonicalOperations is not null && facts.Publications is not null && facts.History is not null
            && facts.Overrides is not null);
        var history = facts.History;
        FoodVocabularyDefinitions.Require(history.Instances is not null && history.Launches is not null && history.Children is not null
            && history.Resets is not null && history.Attempts is not null && history.Retirements is not null && history.Repairs is not null
            && history.PhysicalRetirements is not null && history.MaintenanceRetirements is not null && history.StagedJournals is not null && history.Commands is not null);
        RequireUnique(facts.Recipes, x => x.RecipeId);
        RequireUnique(facts.CanonicalOperations, x => (x.RecipeId, x.OperationId));
        RequireUnique(facts.Publications, x => (x.RecipeId, x.OperationId));
        RequireUnique(history.Instances, x => x.Id);
        RequireUnique(history.Launches, x => x.Id);
        RequireUnique(history.Children, x => x.Id);
        RequireUnique(history.Resets, x => x.Id);
        RequireUnique(history.Attempts, x => x.Id);
        RequireUnique(history.Retirements, x => x.Id);
        RequireUnique(history.Repairs, x => x.Id);
        RequireUnique(history.PhysicalRetirements, x => x.RecipeId);
        RequireUnique(history.MaintenanceRetirements, x => (x.Id, x.Disposition));
        RequireUnique(history.Commands, x => x.Id);
        RequireUnique(history.StagedJournals, x => (x.RecipeId, x.OperationId, x.InputHash));
        var origins = new HashSet<FoodVocabularyReferenceOrigin>();
        void Add(IEnumerable<FoodVocabularyReference> references, string kind, string key)
        {
            foreach (var reference in references)
            {
                FoodVocabularyDefinitions.ValidateReference(reference);
                origins.Add(new(reference, kind, key));
            }
        }
        if (facts.Membership.RawJson is { } membership)
            Add(FoodVocabularyStore.MembershipReferences(membership), "membership", "food_vocabulary_publication");
        foreach (var recipe in facts.Recipes) Add(RecipeReferences(recipe), "recipe", recipe.RecipeId.ToString("D"));
        foreach (var operation in facts.CanonicalOperations)
            Add(CanonicalRecipeContentStore.VocabularyReferences(operation), "canonical-operation", $"{operation.RecipeId:D}/{operation.OperationId:D}");
        foreach (var publication in facts.Publications)
            Add(RecipeFilePublicationStore.VocabularyReferences(publication), "publication", $"{publication.RecipeId:D}/{publication.OperationId:D}");
        var observedTaskIds = history.Children.Select(x => x.ParentTaskId).Concat(history.Resets.Select(x => x.TaskId))
            .Concat(history.Attempts.Select(x => x.TaskId)).Concat(facts.Publications.Select(x => x.OperationId))
            .Concat(history.StagedJournals.Select(x => x.OperationId)).Concat(facts.CanonicalOperations.Select(x => x.OperationId))
            .Concat(history.Retirements.SelectMany(WorkflowLifecycle.RetainedTasks).Select(x => x.TaskId)).ToHashSet();
        foreach (var workflow in history.Instances)
            Add(RecipeFilePublicationStore.VocabularyReferencesForInventory(workflow, observedTaskIds, prospectiveDemoInvalidation), "workflow", workflow.Id.ToString("D"));
        foreach (var launch in history.Launches)
            Add(WorkflowOrchestrator.VocabularyReferences(launch), "launch", launch.Id.ToString("D"));
        var parents = history.Instances.SelectMany(x => x.Tasks).Concat(history.Resets.Select(WorkflowReset.RetainedTask))
            .Concat(history.Attempts.Select(WorkflowProcessorHistory.RetainedTask))
            .Concat(history.Retirements.SelectMany(WorkflowLifecycle.RetainedTasks)).ToArray();
        foreach (var child in history.Children)
            Add(WorkflowOrchestrator.VocabularyReferences(child, parents), "child", child.Id.ToString("D"));
        foreach (var reset in history.Resets)
            Add(WorkflowReset.VocabularyReferences(reset), "reset", reset.Id.ToString("D"));
        foreach (var attempt in history.Attempts)
            Add(WorkflowProcessorHistory.VocabularyReferences(attempt), "processor-attempt", attempt.Id.ToString("D"));
        foreach (var retirement in history.Retirements)
            Add(WorkflowLifecycle.VocabularyReferences(retirement), "workflow-retirement", retirement.Id.ToString("D"));
        foreach (var repair in history.Repairs)
            Add(RecipeReportRepairIntent.VocabularyReferences(repair), "repair", repair.Id.ToString("D"));
        foreach (var physical in history.PhysicalRetirements)
            Add(RecipePhysicalLifecycle.VocabularyReferences(physical), "physical-retirement", physical.RecipeId.ToString("D"));
        foreach (var command in history.Commands)
            MaintenanceCommandLifecycle.ValidateCurrentReferences(command, history.Retirements, history.PhysicalRetirements);
        foreach (var maintenance in history.MaintenanceRetirements)
            MaintenanceCommandLifecycle.ValidateRetainedReferences(maintenance, history.Retirements, history.PhysicalRetirements);
        foreach (var physical in history.PhysicalRetirements)
            RecipePhysicalLifecycle.ValidateRetainedWorkflowReferences(physical, history.Retirements);
        foreach (var stage in history.StagedJournals)
            Add(RecipeFilePublicationStore.VocabularyReferences(stage, facts.Publications), "staged-journal", $"{stage.RecipeId:D}/{stage.OperationId:D}/{stage.InputHash}");
        if (facts.Overrides.Coverage == FoodVocabularyOverrideCoverage.LiveOwnerNotImplemented)
            FoodVocabularyDefinitions.Require(facts.Overrides.Rows is null);
        else
        {
            FoodVocabularyDefinitions.Require(facts.Overrides.Coverage == FoodVocabularyOverrideCoverage.CapturedV1 && facts.Overrides.Rows is not null);
            RequireUnique(facts.Overrides.Rows, x => x.Id);
            foreach (var row in facts.Overrides.Rows)
            {
                FoodVocabularyDefinitions.Require(row.Id != Guid.Empty && !string.IsNullOrWhiteSpace(row.Revision)
                    && row.ProtectedFields is not null && row.CreatedAt != default && row.UpdatedAt >= row.CreatedAt);
                if (row.FoodId is not null)
                {
                    FoodVocabularyDefinitions.Require(row.FoodId != Guid.Empty && row.Document is not null
                        && !string.IsNullOrWhiteSpace(row.DictionaryRevision) && row.FallbackKey is null);
                    Add([row.Document], "household-override", row.Id.ToString("D"));
                }
                else FoodVocabularyDefinitions.Require(!string.IsNullOrWhiteSpace(row.FallbackKey)
                    && row.Document is null && row.DictionaryRevision is null);
            }
        }
        return origins.OrderBy(x => x.Reference.Revision, StringComparer.Ordinal).ThenBy(x => x.Reference.Sha256, StringComparer.Ordinal)
            .ThenBy(x => x.OwnerKind, StringComparer.Ordinal).ThenBy(x => x.OwnerKey, StringComparer.Ordinal).ToArray();
    }

    internal static FoodVocabularyReference[] RecipeReferences(FoodVocabularyRecipeObservation recipe)
    {
        FoodVocabularyDefinitions.Require(recipe.RecipeId != Guid.Empty);
        var content = CanonicalRecipeContentStore.Read(new Recipe { Id = recipe.RecipeId, CanonicalContent = recipe.CanonicalContent });
        if (content is null)
        {
            FoodVocabularyDefinitions.Require(recipe.FoodMappingEvidence is null);
            return [];
        }
        RecipeExportContent.ValidateRetainedHistory(new(recipe.RecipeId, content, null));
        var references = recipe.FoodMappingEvidence is null ? [] : FoodMappingQualification.References(recipe.FoodMappingEvidence).ToArray();
        if (references.Length == 0) FoodMappingQualification.Validate(content, recipe.FoodMappingEvidence, new(null, []), recipe.RecipeId);
        return references;
    }

    private static void RequireUnique<T, TKey>(IReadOnlyList<T> rows, Func<T, TKey> key)
    {
        FoodVocabularyDefinitions.Require(rows.All(x => x is not null) && rows.Select(key).Distinct().Count() == rows.Count);
    }
}
