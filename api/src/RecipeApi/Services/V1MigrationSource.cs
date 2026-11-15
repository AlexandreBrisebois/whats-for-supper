using RecipeApi.Infrastructure;

namespace RecipeApi.Services;

// Invocation-local validated facts, never a durable mutator capability.
internal sealed class V1MigrationSource(RecoverySourceProtection protection, InspectedRecoverySnapshotIdentity identity,
    V1ExactSourceAdmission attestation, RecipeApi.Data.RecipeDbContext observationDb, RecipesRootResolver executionRoots) : IDisposable
{
    private volatile bool active = true;
    private readonly Microsoft.EntityFrameworkCore.Storage.IDbContextTransaction? transaction = observationDb?.Database.CurrentTransaction;
    internal RecoverySourceProtection Protection { get { RequireActive(); return protection; } }
    internal InspectedRecoverySnapshotIdentity Identity { get { RequireActive(); return identity; } }
    internal void RequireActive() => FoodVocabularyDefinitions.Require(active);
    internal void RequireOwner(RecipeApi.Data.RecipeDbContext owner, RecipesRootResolver roots)
    {
        RequireActive();
        FoodVocabularyDefinitions.Require(ReferenceEquals(observationDb, owner) && ReferenceEquals(executionRoots, roots)
            && transaction is not null && ReferenceEquals(owner.Database.CurrentTransaction, transaction));
    }
    internal IReadOnlyList<FoodVocabularyReferenceOrigin> RequiredReferences(FoodVocabularyInventoryFacts facts)
    {
        RequireActive();
        return FoodVocabularyInventoryQualification.RequiredReferencesForAttestedSource(facts, attestation);
    }
    public void Dispose() => active = false;
}
