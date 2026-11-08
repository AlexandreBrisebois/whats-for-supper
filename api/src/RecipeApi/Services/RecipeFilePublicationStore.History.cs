using RecipeApi.Models;

namespace RecipeApi.Services;

// Original semantic field/protection observations, separate from mutable recipe
// rows and file delivery. Nullable properties are required on read: omission is
// not an observation of null. Canonical/source/evidence extensions remain intact.
public sealed record RecipePublicationFields(Guid Id, string? Name, string? Description, string? Notes,
    RecipeRating Rating, Guid? AddedBy, string? SourceUrl, string? Ingredients, string? RawMetadata,
    string? CanonicalContent, int? Servings, string? Category, string? CuisineType, string[]? MealTypes,
    string? TotalTime, int ImageCount, int FinishedDishIndex, bool IsSynthesized, bool IsReady,
    bool IsDiscoverable, bool RotationHumanOff, string RotationSource, bool CookedSuppressed,
    bool? SupperSuitable, bool? IsVegetarian, DateTimeOffset? DeletedAt, Guid? DeletedBy,
    string? DeleteNote, DateTimeOffset? LastCookedDate);

public sealed partial class RecipeFilePublicationStore
{
    internal static (RecipePublicationCapture Capture, RecipePublicationCandidate Candidate) ReadOriginalPublication(RecipeFilePublication publication)
    {
        ValidateRecoveryJournal(publication);
        var envelope = ReadEnvelope(publication);
        return (envelope.Capture, envelope.Candidate);
    }

    internal static RecipePublicationFields Observe(Recipe recipe)
    {
        static string? JsonValue(string? value) => value is null ? null : CanonicalRecipeContentStore.NormalizeJson(value);
        return new(recipe.Id, recipe.Name, recipe.Description, recipe.Notes, recipe.Rating, recipe.AddedBy,
            recipe.SourceUrl, JsonValue(recipe.Ingredients), JsonValue(recipe.RawMetadata), JsonValue(recipe.CanonicalContent),
            recipe.Servings, recipe.Category, recipe.CuisineType, recipe.MealTypes?.ToArray(), recipe.TotalTime,
            recipe.ImageCount, recipe.FinishedDishIndex, recipe.IsSynthesized, recipe.IsReady, recipe.IsDiscoverable,
            recipe.RotationHumanOff, recipe.RotationSource, recipe.CookedSuppressed, recipe.SupperSuitable,
            recipe.IsVegetarian, recipe.DeletedAt, recipe.DeletedBy, recipe.DeleteNote, recipe.LastCookedDate);
    }

    internal static Recipe RestoreObservation(RecipePublicationFields value) => new()
    {
        Id = value.Id,
        Name = value.Name,
        Description = value.Description,
        Notes = value.Notes,
        Rating = value.Rating,
        AddedBy = value.AddedBy,
        SourceUrl = value.SourceUrl,
        Ingredients = value.Ingredients,
        RawMetadata = value.RawMetadata,
        CanonicalContent = value.CanonicalContent,
        Servings = value.Servings,
        Category = value.Category,
        CuisineType = value.CuisineType,
        MealTypes = value.MealTypes?.ToArray(),
        TotalTime = value.TotalTime,
        ImageCount = value.ImageCount,
        FinishedDishIndex = value.FinishedDishIndex,
        IsSynthesized = value.IsSynthesized,
        IsReady = value.IsReady,
        IsDiscoverable = value.IsDiscoverable,
        RotationHumanOff = value.RotationHumanOff,
        RotationSource = value.RotationSource,
        CookedSuppressed = value.CookedSuppressed,
        SupperSuitable = value.SupperSuitable,
        IsVegetarian = value.IsVegetarian,
        DeletedAt = value.DeletedAt,
        DeletedBy = value.DeletedBy,
        DeleteNote = value.DeleteNote,
        LastCookedDate = value.LastCookedDate
    };

    private static void ValidateOriginalFields(RecipePublicationCapture capture)
    {
        if (capture.FieldHashVersion is not (null or 2 or 3))
            throw new InvalidDataException("Unsupported original publication fields.");
        if (capture.FieldHashVersion != 3)
        {
            if (capture.Fields is not null) throw new InvalidDataException("Historical capture cannot claim original field authority.");
            return;
        }
        if (capture.ContentRevision == "absent")
        {
            if (capture.SourceRevision != "absent" || capture.FieldHash != "absent" || capture.Fields is not null)
                throw new InvalidDataException("Captured absence differs from original field observations.");
            return;
        }
        if (capture.Fields is not { } fields || fields.Id != capture.RecipeId || Hash(fields) != capture.FieldHash)
            throw new InvalidDataException("Original publication field observations differ from their fingerprint.");
        var observed = RestoreObservation(fields);
        if (CanonicalRecipeContentStore.InspectContentRevision(observed) != capture.ContentRevision
            || CanonicalRecipeContentStore.InspectSourceRevision(observed) != capture.SourceRevision)
            throw new InvalidDataException("Original publication revisions differ from observed content/source.");
    }

    private static void ValidateOriginalResult(RecipeFilePublication publication, Envelope envelope)
    {
        ValidateOriginalFields(envelope.Capture);
        if (envelope.Capture.FieldHashVersion != 3)
        {
            if (envelope.Result is not null) throw new InvalidDataException("Historical publication cannot claim result authority.");
            return; // Missing historical authority stays absent; no destination reconstruction.
        }
        if (envelope.Result is not { } result || result.Id != publication.RecipeId || Hash(result) != publication.ResultHash)
            throw new InvalidDataException("Original publication result differs from its fingerprint.");
        var expected = envelope.Candidate.SourceKind == "bootstrap" ? NewRecipe(envelope.Candidate)
            : RestoreObservation(envelope.Capture.Fields ?? throw new InvalidDataException("Original fields are missing."));
        if (envelope.Candidate.SourceKind != "bootstrap")
            Apply(expected, envelope.Candidate, envelope.Output.GetValueOrDefault("recipe.info") ?? envelope.Capture.Files["recipe.info"]!);
        if (Hash(Observe(expected)) != publication.ResultHash)
            throw new InvalidDataException("Original publication result differs from the captured operation.");
    }
}
