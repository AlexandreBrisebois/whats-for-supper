using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;

namespace RecipeApi.Services;

// A transaction-local view of independently admitted originals and exact producer
// bytes. It never changes the fixed historical membership or supplies public reads.
internal sealed class V1AuthorityTransitionContext : IDisposable
{
    private readonly RecipeDbContext db;
    private readonly RecipesRootResolver roots;
    private readonly RecoveryBoundary boundary;
    private readonly IDbContextTransaction transaction;
    private readonly Guid operationId;
    private readonly string candidate;
    private readonly string assembly;
    private readonly string root;
    private readonly Dictionary<Guid, string> originalCommands;
    private readonly Dictionary<(Guid Recipe, Guid Operation), (string Bytes, Guid Plan)> successors = new();
    private readonly Dictionary<Guid, string> plans = new();
    private bool active = true;
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    internal V1RecoveryHistoryContext HistoryAuthority { get; }

    internal V1AuthorityTransitionContext(RecipeDbContext db, RecipesRootResolver roots, RecoveryBoundary boundary,
        V1RecoveryHistoryContext original, FoodVocabularyInventoryFacts originalFacts, Guid operationId,
        string candidate, string assembly, MaintenanceCommandObservation? expectedPlan, CanonicalRecipeOperation? expectedConversion)
        : this(db, roots, boundary, original, originalFacts, operationId, candidate, assembly,
            expectedPlan is null ? [] : [expectedPlan], expectedConversion is null ? [] : [expectedConversion])
    {
        FoodVocabularyDefinitions.Require(expectedPlan is null || CanonicalRecipeMigrationReceipt.Read(expectedPlan).Payload.Recipes.Count == 1);
    }

    // The successor coordinator supplies an independently admitted tracer plus
    // its finite remaining selection. These maps never admit observed DB bytes.
    internal V1AuthorityTransitionContext(RecipeDbContext db, RecipesRootResolver roots, RecoveryBoundary boundary,
        V1RecoveryHistoryContext original, FoodVocabularyInventoryFacts originalFacts, Guid operationId,
        string candidate, string assembly, MaintenanceCommandObservation[] expectedPlans, CanonicalRecipeOperation[] expectedConversions)
    {
        this.db = db; this.roots = roots; this.boundary = boundary;
        transaction = db.Database.CurrentTransaction ?? throw new InvalidDataException("Transition needs its actual transaction.");
        this.operationId = operationId; this.candidate = candidate; this.assembly = assembly; root = roots.Root;
        original.RequireFacts(originalFacts);
        HistoryAuthority = original;
        originalCommands = originalFacts.History.Commands.ToDictionary(x => x.Id, x => JsonSerializer.Serialize(x, Json));
        FoodVocabularyDefinitions.Require(expectedPlans.Length <= 2 && expectedConversions.Length <= 198);
        var selections = new Dictionary<(Guid Recipe, Guid Operation), Guid>();
        foreach (var expected in expectedPlans)
        {
            var payload = CanonicalRecipeMigrationReceipt.Read(expected).Payload;
            FoodVocabularyDefinitions.Require(payload.Phase == "plan" && !originalCommands.ContainsKey(expected.Id)
                && plans.TryAdd(expected.Id, JsonSerializer.Serialize(expected, Json)));
            if (expected.Id == operationId)
                FoodVocabularyDefinitions.Require(payload.CandidateCommit == candidate && payload.CandidateArtifactSha256 == assembly);
            foreach (var selected in payload.Recipes)
                FoodVocabularyDefinitions.Require(selections.TryAdd((selected.RecipeId, selected.OperationId), expected.Id));
        }
        FoodVocabularyDefinitions.Require(expectedPlans.Length == 0 || plans.ContainsKey(operationId));
        foreach (var expected in expectedConversions)
        {
            var selectedPlan = selections.GetValueOrDefault((expected.RecipeId, expected.OperationId));
            FoodVocabularyDefinitions.Require(!original.Attestation.ContainsReceipt(expected) && selectedPlan != Guid.Empty);
            using var request = JsonDocument.Parse(expected.OriginalRequest!);
            FoodVocabularyDefinitions.Require(request.RootElement.GetProperty("version").GetInt32() == 2
                && request.RootElement.GetProperty("kind").GetString() == "convert");
            _ = CanonicalRecipeContentStore.ReadValidatedRetainedResult(expected);
            FoodVocabularyDefinitions.Require(successors.TryAdd((expected.RecipeId, expected.OperationId),
                (JsonSerializer.Serialize(expected, Json), selectedPlan)));
        }
        RequireOwner(db, roots);
    }

    internal void RequireOwner(RecipeDbContext owner, RecipesRootResolver ownerRoots)
    {
        FoodVocabularyDefinitions.Require(active && ReferenceEquals(owner, db) && ReferenceEquals(ownerRoots, roots)
            && ReferenceEquals(db.Database.CurrentTransaction, transaction) && roots.Root == root);
        boundary.ValidateMaintenanceInvocation(operationId, candidate, assembly);
    }

    internal void RequireFacts(FoodVocabularyInventoryFacts facts)
    {
        RequireOwner(db, roots);
        var original = facts.CanonicalOperations.Where(HistoryAuthority.Attestation.ContainsReceipt).ToArray();
        HistoryAuthority.Attestation.RequireReceiptMembership(facts with { CanonicalOperations = original });
        var added = facts.CanonicalOperations.Where(x => !HistoryAuthority.Attestation.ContainsReceipt(x)).ToArray();
        FoodVocabularyDefinitions.Require(added.Length <= successors.Count);
        foreach (var receipt in added) _ = References(receipt);
        var commands = facts.History.Commands.ToDictionary(x => x.Id, x => JsonSerializer.Serialize(x, Json));
        FoodVocabularyDefinitions.Require(originalCommands.All(x => commands.TryGetValue(x.Key, out var actual) && actual == x.Value));
        foreach (var command in facts.History.Commands.Where(x => !originalCommands.ContainsKey(x.Id)))
            FoodVocabularyDefinitions.Require(plans.TryGetValue(command.Id, out var expected) && JsonSerializer.Serialize(command, Json) == expected);
        foreach (var receipt in added)
            FoodVocabularyDefinitions.Require(commands.ContainsKey(successors[(receipt.RecipeId, receipt.OperationId)].Plan));
    }

    internal FoodVocabularyReference[] References(CanonicalRecipeOperation receipt)
    {
        RequireOwner(db, roots);
        if (HistoryAuthority.Attestation.ContainsReceipt(receipt)) return HistoryAuthority.Attestation.References(receipt);
        FoodVocabularyDefinitions.Require(successors.TryGetValue((receipt.RecipeId, receipt.OperationId), out var expected)
            && JsonSerializer.Serialize(receipt, Json) == expected.Bytes);
        return CanonicalRecipeContentStore.VocabularyReferences(receipt);
    }

    internal IReadOnlyList<FoodVocabularyReferenceOrigin> RequiredReferences(FoodVocabularyInventoryFacts facts)
    {
        RequireFacts(facts);
        return FoodVocabularyInventoryQualification.RequiredReferencesForTransition(facts, this);
    }

    public void Dispose() => active = false;
}
