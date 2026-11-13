using System.Numerics;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;

namespace RecipeApi.Services;

public sealed record FoodVocabularyPublicationOutcome(FoodVocabularyReference? PreviousHead,
    FoodVocabularyReference NewHead, string PresentationVersion);
public sealed record FoodVocabularyPublicationRequest(string Kind, Guid OperationId, int RequestVersion,
    FoodVocabularyReference? ExpectedHead, FoodVocabularyReference NewFile, string AdoptionReviewIdentity);
public sealed record FoodVocabularyMembershipInspection(FoodVocabularyReference? ActiveRef,
    IReadOnlyList<FoodVocabularyReference> References, bool HasPrepared, string PresentationVersion, string PresentationEpoch, string RawSha256);
internal sealed record FoodVocabularyPublicationOperation(Guid OperationId, int RequestVersion, string InputHash,
    FoodVocabularyPublicationRequest Request, string State, FoodVocabularyPublicationOutcome? CommittedOutcome);
internal sealed record FoodVocabularyMembership(int Version, string? ActiveRevision, string? ActiveSha256,
    string PresentationVersion, string PresentationEpoch, FoodVocabularyReference[] Retained,
    FoodVocabularyPublicationOperation[] Operations)
{
    internal FoodVocabularyReference? Active => ActiveRevision is null && ActiveSha256 is null ? null
        : new(ActiveRevision ?? "", ActiveSha256 ?? "");
}

// Only this owner publishes live definitions. No controller, provider output or
// first request can implicitly install a vocabulary or infer a current head.
public sealed class FoodVocabularyStore(RecipeDbContext db, IStorageProvider storage,
    RecipesRootResolver recipes, RecoveryBoundary boundary, IClock clock)
{
    private const string Key = "food_vocabulary_publication";
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    internal static string PathFor(FoodVocabularyReference reference)
    {
        FoodVocabularyDefinitions.ValidateReference(reference);
        return $".household/food-vocabulary/{reference.Revision}-{reference.Sha256}.json";
    }

    public async Task<FoodVocabularyCapture> LoadCapturedAsync(FoodVocabularyReference reference, CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();
        _ = recipes.Root; // Validate the selected generation before any file read.
        var bytes = await storage.LoadAsync("recipes", PathFor(reference))
            ?? throw new InvalidDataException("Referenced vocabulary file is missing.");
        var captured = new FoodVocabularyCapture(reference, 1, bytes);
        _ = captured.Definitions();
        return captured;
    }

    public async Task<FoodVocabularyCapture?> CaptureActiveAsync(CancellationToken ct = default)
    {
        await using var lease = await boundary.EnterAsync(RecoveryAccess.Read, ct);
        var member = await db.FamilySettings.AsNoTracking().SingleOrDefaultAsync(x => x.Key == Key, ct);
        if (member is null)
        {
            await RequireUnreferencedAbsence(ct);
            return null;
        }
        var membership = ReadMembership(member.Value.GetRawText());
        if (membership.Operations.Any(x => x.State == "prepared"))
            throw new InvalidDataException("Vocabulary publication requires explicit reconciliation.");
        foreach (var retained in membership.Retained) _ = await LoadCapturedAsync(retained, ct);
        return membership.Active is { } active ? await LoadCapturedAsync(active, ct)
            : throw new InvalidDataException("Vocabulary membership has no committed active head.");
    }

    public async Task<FoodVocabularyAuthority> CaptureAuthorityAsync(string? priorEvidence, CancellationToken ct = default)
    {
        var active = await CaptureActiveAsync(ct);
        var captures = new Dictionary<FoodVocabularyReference, FoodVocabularyCapture>();
        if (active is not null) captures.Add(active.Reference, active);
        if (priorEvidence is not null)
            foreach (var reference in FoodMappingQualification.References(priorEvidence))
                if (!captures.ContainsKey(reference)) captures.Add(reference, await LoadCapturedAsync(reference, ct));
        var result = new FoodVocabularyAuthority(active?.Reference, captures.Values.OrderBy(x => x.Reference.Revision, StringComparer.Ordinal)
            .ThenBy(x => x.Reference.Sha256, StringComparer.Ordinal).ToArray());
        result.Validate();
        return result;
    }

    public async Task ValidateLiveAuthorityAsync(FoodVocabularyAuthority authority, CancellationToken ct = default)
    {
        authority.Validate();
        foreach (var captured in authority.Captures)
        {
            var live = await LoadCapturedAsync(captured.Reference, ct);
            FoodVocabularyDefinitions.Require(live.RawBytes.AsSpan().SequenceEqual(captured.RawBytes));
        }
    }

    public async Task<FoodVocabularyPublicationOutcome> PublishReviewedAsync(byte[] bytes, FoodVocabularyReference? expectedHead,
        Guid operationId, string adoptionReviewIdentity, CancellationToken ct = default)
    {
        FoodVocabularyDefinitions.Require(operationId != Guid.Empty && !string.IsNullOrWhiteSpace(adoptionReviewIdentity));
        var owned = bytes.ToArray();
        var definition = FoodVocabularyDefinitions.Read(owned);
        var reference = new FoodVocabularyReference(definition.Revision, FoodVocabularyDefinitions.Sha256(owned));
        var request = new FoodVocabularyPublicationRequest("publish-reviewed-vocabulary", operationId, 1, expectedHead, reference, adoptionReviewIdentity);
        var hash = RequestHash(request);
        // This is a top-level operator call. It must never upgrade a caller's
        // shared write lease to exclusive publication authority.
        await using var lease = await boundary.EnterAsync(RecoveryAccess.Publish, ct);
        _ = recipes.Root;
        await using var transaction = db.Database.IsRelational() ? await db.Database.BeginTransactionAsync(ct) : null;
        if (db.Database.IsNpgsql()) await db.Database.ExecuteSqlRawAsync("LOCK TABLE family_settings IN SHARE ROW EXCLUSIVE MODE", ct);
        var member = await db.FamilySettings.SingleOrDefaultAsync(x => x.Key == Key, ct);
        // The lock serializes writers, not EF's existing identity-map values.
        // Refresh only this owned row; unrelated pending entities remain intact.
        if (member is not null) await db.Entry(member).ReloadAsync(ct);
        var state = member is null ? null : ReadMembership(member.Value.GetRawText());
        var previous = state?.Operations.SingleOrDefault(x => x.OperationId == operationId);
        if (previous is not null)
        {
            FoodVocabularyDefinitions.Require(previous.InputHash == hash && RequestHash(previous.Request) == hash);
            if (previous.State == "committed")
            {
                _ = await LoadCapturedAsync(reference, ct);
                return previous.CommittedOutcome!; // Retained outcome, never reactivate an older head.
            }
        }
        else
        {
            if (state is null) await RequireUnreferencedAbsence(ct);
            FoodVocabularyDefinitions.Require(state?.Active == expectedHead && state?.Operations.Any(x => x.State == "prepared") != true);
            if (state is not null)
                foreach (var retained in state.Retained)
                    definition.ValidateCompatible((await LoadCapturedAsync(retained, ct)).Definitions());
            state ??= new(1, null, null, "0", operationId.ToString("D"), [], []);
            state = state with { Operations = [.. state.Operations, new(operationId, 1, hash, request, "prepared", null)] };
            if (member is null) { member = new FamilySetting { Key = Key }; db.FamilySettings.Add(member); }
            Set(member, state);
            await db.SaveChangesAsync(ct);
            // A prepared request survives a file-write interruption. The exclusive
            // lease remains held across the separate durable preparation commit.
            if (transaction is not null) await transaction.CommitAsync(ct);
        }
        // Existing identical bytes can be resumed; divergent bytes cannot be
        // replaced under an immutable reference even after interruption.
        var saved = await storage.LoadAsync("recipes", PathFor(reference));
        if (saved is not null) FoodVocabularyDefinitions.Require(saved.AsSpan().SequenceEqual(owned));
        else await storage.SaveAtomicallyAsync("recipes", PathFor(reference), owned);
        var outcome = new FoodVocabularyPublicationOutcome(expectedHead, reference,
            (BigInteger.Parse(state!.PresentationVersion, System.Globalization.CultureInfo.InvariantCulture) + 1).ToString(System.Globalization.CultureInfo.InvariantCulture));
        // The first transaction may have committed; use a fresh transaction for
        // head+retained outcome. Recovery Publish excludes concurrent writers.
        if (transaction is not null) await transaction.DisposeAsync();
        await using var commit = db.Database.IsRelational() ? await db.Database.BeginTransactionAsync(ct) : null;
        if (db.Database.IsNpgsql()) await db.Database.ExecuteSqlRawAsync("LOCK TABLE family_settings IN SHARE ROW EXCLUSIVE MODE", ct);
        state = state with
        {
            ActiveRevision = reference.Revision,
            ActiveSha256 = reference.Sha256,
            PresentationVersion = outcome.PresentationVersion,
            PresentationEpoch = operationId.ToString("D"),
            Retained = state.Retained.Contains(reference) ? state.Retained : [.. state.Retained, reference],
            Operations = state.Operations.Select(x => x.OperationId == operationId ? x with { State = "committed", CommittedOutcome = outcome } : x).ToArray()
        };
        Set(member!, state);
        await db.SaveChangesAsync(ct);
        if (commit is not null) await commit.CommitAsync(ct);
        return outcome;
    }

    private void Set(FamilySetting member, FoodVocabularyMembership state)
    {
        member.Value = JsonSerializer.SerializeToElement(state, Json);
        member.UpdatedAt = clock.UtcNow;
    }
    private static string RequestHash(FoodVocabularyPublicationRequest request) => FoodVocabularyDefinitions.Sha256(
        Encoding.UTF8.GetBytes(CanonicalRecipeContentStore.NormalizeJson(JsonSerializer.Serialize(request, Json))));

    private static FoodVocabularyMembership ReadMembership(string raw)
    {
        var state = FoodVocabularyDefinitions.ReadStrict<FoodVocabularyMembership>(raw);
        var parsedVersion = BigInteger.TryParse(state.PresentationVersion, out var version);
        FoodVocabularyDefinitions.Require(state.Version == 1 && state.Retained is not null && state.Operations is not null
            && parsedVersion && version >= 0
            && version.ToString(System.Globalization.CultureInfo.InvariantCulture) == state.PresentationVersion
            && Guid.TryParseExact(state.PresentationEpoch, "D", out var epoch) && epoch != Guid.Empty);
        if (state.Active is not null) FoodVocabularyDefinitions.ValidateReference(state.Active);
        var references = new HashSet<FoodVocabularyReference>();
        foreach (var reference in state.Retained) { FoodVocabularyDefinitions.ValidateReference(reference); FoodVocabularyDefinitions.Require(references.Add(reference)); }
        if (state.Active is not null) FoodVocabularyDefinitions.Require(references.Contains(state.Active));
        var operations = new HashSet<Guid>();
        foreach (var operation in state.Operations)
        {
            FoodVocabularyDefinitions.Require(operation is not null && operation.OperationId != Guid.Empty && operations.Add(operation.OperationId)
                && operation.RequestVersion == 1 && operation.Request is not null && operation.Request.RequestVersion == 1
                && operation.Request.Kind == "publish-reviewed-vocabulary" && operation.Request.OperationId == operation.OperationId
                && !string.IsNullOrWhiteSpace(operation.Request.AdoptionReviewIdentity) && operation.InputHash == RequestHash(operation.Request)
                && operation.State is "prepared" or "committed");
            FoodVocabularyDefinitions.ValidateReference(operation!.Request.NewFile);
            if (operation.Request.ExpectedHead is not null) FoodVocabularyDefinitions.ValidateReference(operation.Request.ExpectedHead);
            if (operation.State == "prepared") FoodVocabularyDefinitions.Require(operation.CommittedOutcome is null);
            else FoodVocabularyDefinitions.Require(operation.CommittedOutcome is { } outcome && outcome.NewHead == operation.Request.NewFile
                && outcome.PreviousHead == operation.Request.ExpectedHead && references.Contains(outcome.NewHead)
                && BigInteger.TryParse(outcome.PresentationVersion, out var outcomeVersion) && outcomeVersion > 0 && outcomeVersion <= version);
        }
        FoodVocabularyDefinitions.Require(state.Operations.Count(x => x.State == "prepared") <= 1);
        var committed = state.Operations.Where(x => x.State == "committed")
            .OrderBy(x => BigInteger.Parse(x.CommittedOutcome!.PresentationVersion, System.Globalization.CultureInfo.InvariantCulture)).ToArray();
        FoodVocabularyReference? priorHead = null;
        for (var index = 0; index < committed.Length; index++)
        {
            var operation = committed[index];
            FoodVocabularyDefinitions.Require(operation.CommittedOutcome!.PresentationVersion == (index + 1).ToString(System.Globalization.CultureInfo.InvariantCulture)
                && operation.CommittedOutcome.PreviousHead == priorHead);
            priorHead = operation.CommittedOutcome.NewHead;
        }
        FoodVocabularyDefinitions.Require(version == committed.Length && state.Active == priorHead
            && (committed.Length == 0 || state.PresentationEpoch == committed[^1].OperationId.ToString("D"))
            && references.SetEquals(committed.Select(x => x.CommittedOutcome!.NewHead))
            && state.Operations.Where(x => x.State == "prepared").All(x => x.Request.ExpectedHead == state.Active));
        return state;
    }

    public static FoodVocabularyReference[] MembershipReferences(string raw)
    {
        var state = ReadMembership(raw);
        return state.Retained.Concat(state.Operations.Select(x => x.Request.NewFile))
            .Concat(state.Operations.Where(x => x.Request.ExpectedHead is not null).Select(x => x.Request.ExpectedHead!))
            .Distinct().ToArray();
    }
    public static FoodVocabularyMembershipInspection InspectMembership(string raw)
    {
        var state = ReadMembership(raw);
        return new(state.Active, Array.AsReadOnly(MembershipReferences(raw)), state.Operations.Any(x => x.State == "prepared"),
            state.PresentationVersion, state.PresentationEpoch, FoodVocabularyDefinitions.Sha256(Encoding.UTF8.GetBytes(raw)));
    }

    private async Task RequireUnreferencedAbsence(CancellationToken ct)
    {
        var recipesWithFacts = await db.Recipes.AsNoTracking().Where(x => x.FoodMappingEvidence != null || x.CanonicalContent != null).ToListAsync(ct);
        foreach (var recipe in recipesWithFacts)
        {
            var content = CanonicalRecipeContentStore.Read(recipe);
            if (content is null) FoodVocabularyDefinitions.Require(recipe.FoodMappingEvidence is null);
            else
            {
                FoodVocabularyDefinitions.Require(recipe.FoodMappingEvidence is null || !FoodMappingQualification.References(recipe.FoodMappingEvidence).Any());
                FoodMappingQualification.Validate(content, recipe.FoodMappingEvidence, new(null, []), recipe.Id);
            }
        }
        var operations = await db.CanonicalRecipeOperations.AsNoTracking().ToListAsync(ct);
        var publications = await db.RecipeFilePublications.AsNoTracking().ToListAsync(ct);
        var workflows = await db.WorkflowInstances.AsNoTracking().Include(x => x.Tasks).ToListAsync(ct);
        FoodVocabularyDefinitions.Require(!operations.SelectMany(CanonicalRecipeContentStore.VocabularyReferences).Any()
            && !publications.SelectMany(RecipeFilePublicationStore.VocabularyReferences).Any()
            && !workflows.SelectMany(RecipeFilePublicationStore.VocabularyReferences).Any());
    }
}
