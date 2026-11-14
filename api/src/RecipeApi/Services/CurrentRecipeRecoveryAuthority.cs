using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using RecipeApi.Infrastructure;

namespace RecipeApi.Services;

public sealed record CurrentRecipeRecoveryBaseline(Guid RecipeId, string ContentRevision, string ContentHash,
    string SourceRevision, string RawMetadataHash, string[] SelectedFields);

/// <summary>Baseline assessment only; not field-protection validation or publication authority.</summary>
public sealed record CurrentRecipeRecoveryAssessment(string State, string? Reason, IReadOnlyList<string> SelectedFields);

public static class CurrentRecipeRecoveryAuthority
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    private static readonly string[] Fields = ["ingredientLines", "instructionSections", "servings", "rawMetadata"];

    // These inspect hashes; they never create a reviewed destination baseline.
    public static string ContentHash(CanonicalRecipeExport recipe)
    {
        RecipeExportContent.WriteCurrent(recipe);
        return Hash(CanonicalRecipeContentStore.NormalizeJson(JsonSerializer.Serialize(recipe.Content, Json))!);
    }

    public static string RawMetadataHash(CanonicalRecipeExport recipe)
    {
        RecipeExportContent.WriteCurrent(recipe);
        // Serialize the nullable string, preserving both presence and exact bytes.
        // JSON null evidence and absent evidence must have different hashes.
        return Hash(JsonSerializer.Serialize(recipe.RawMetadata));
    }

    public static CurrentRecipeRecoveryAssessment Assess(CanonicalRecipeExport incoming, CanonicalRecipeExport destination,
        CurrentRecipeRecoveryBaseline? reviewedBaseline)
    {
        if (RecipeExportContent.IsIdenticalCurrent(incoming, destination))
            return new("identical-no-write", null, Array.Empty<string>());
        CurrentRecipeRecoveryAssessment Defer(string reason) => new("deferred", reason, Array.Empty<string>());
        if (reviewedBaseline is not { } baseline) return Defer("missing-captured-baseline");
        if (baseline.RecipeId != destination.RecipeId || string.IsNullOrWhiteSpace(baseline.ContentRevision)
            || string.IsNullOrWhiteSpace(baseline.SourceRevision) || !ValidHash(baseline.ContentHash)
            || !ValidHash(baseline.RawMetadataHash) || baseline.SelectedFields is not { Length: > 0 } selected
            || selected.Any(x => !Fields.Contains(x)) || selected.Distinct(StringComparer.Ordinal).Count() != selected.Length)
            return Defer("invalid-captured-baseline");
        // Opaque revisions have equality only. Never recapture a baseline here or
        // use timestamps, lexical ordering or IsIdenticalCurrent as merge authority.
        if (baseline.ContentRevision != destination.Content.ContentRevision) return Defer("stale-content-baseline");
        if (!baseline.ContentHash.Equals(ContentHash(destination), StringComparison.OrdinalIgnoreCase))
            throw new InvalidDataException("Captured recipe content revision has divergent canonical content.");
        if (baseline.SourceRevision != destination.Content.SourceRevision
            || !baseline.RawMetadataHash.Equals(RawMetadataHash(destination), StringComparison.OrdinalIgnoreCase))
            return Defer("stale-source-baseline");
        // This is necessary, not sufficient. The staged merge owner still has to
        // preserve human/unknown protection, validate all domain dependencies and
        // recheck the captured baseline in its publication transaction.
        return new("captured-baseline-matches", null, Array.AsReadOnly(selected.ToArray()));
    }

    private static string Hash(string value) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value)));
    private static bool ValidHash(string? value) => value is { Length: 64 } && value.All(Uri.IsHexDigit);
}
