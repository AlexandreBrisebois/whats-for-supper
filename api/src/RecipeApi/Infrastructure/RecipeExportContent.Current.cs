using System.Text.Json;
using System.Text.Json.Serialization;
using RecipeApi.Dto;
using RecipeApi.Services;

namespace RecipeApi.Infrastructure;

public sealed record CanonicalRecipeExport(Guid RecipeId, CanonicalRecipeContent Content, string? RawMetadata);

public sealed partial record RecipeExportContent
{
    private static readonly JsonSerializerOptions CurrentJson = new(JsonSerializerDefaults.Web)
    {
        PropertyNameCaseInsensitive = false,
        UnmappedMemberHandling = JsonUnmappedMemberHandling.Disallow,
        RespectRequiredConstructorParameters = true
    };

    // This decodes recipe content only. Household/media manifests, captured merge
    // authority and coordinated publication must qualify before routine restore uses it.
    public static CanonicalRecipeExport ReadCurrent(JsonElement root, Guid expectedRecipeId)
    {
        try
        {
            RejectDuplicateProperties(root);
            var envelope = root.Deserialize<CurrentEnvelope>(CurrentJson) ?? throw InvalidCurrent();
            if (envelope.Format != "wfs-recipe" || envelope.Version != 2 || envelope.ContentSchemaVersion != 2
                || expectedRecipeId == Guid.Empty || envelope.RecipeId != expectedRecipeId
                || envelope.Content is null || envelope.ContentRevision != envelope.Content.ContentRevision)
                throw InvalidCurrent();
            ValidateCurrentContent(envelope.Content);
            // Evidence is a separately retained JSON string, never the envelope or a
            // fallback owner for an explicitly cleared canonical field.
            if (envelope.RawMetadata is not null) using (JsonDocument.Parse(envelope.RawMetadata)) { }
            return new(envelope.RecipeId, envelope.Content, envelope.RawMetadata);
        }
        catch (Exception ex) when (ex is JsonException or ArgumentException or InvalidOperationException or KeyNotFoundException or FormatException or OverflowException)
        {
            throw InvalidCurrent();
        }
    }

    public static string WriteCurrent(CanonicalRecipeExport export)
    {
        var envelope = new CurrentEnvelope("wfs-recipe", 2, export.RecipeId, 2,
            export.Content.ContentRevision, export.Content, export.RawMetadata);
        var serialized = JsonSerializer.SerializeToElement(envelope, CurrentJson);
        // Keep the writer and decoder on the same validity boundary. No conversion,
        // identity allocation, provider work or live storage is permitted here.
        ReadCurrent(serialized, export.RecipeId);
        return serialized.GetRawText();
    }

    public static bool IsIdenticalCurrent(CanonicalRecipeExport incoming, CanonicalRecipeExport saved)
    {
        // Both sides must be independently valid. Equality grants only a no-write
        // replay; it never supplies a missing captured destination merge baseline.
        WriteCurrent(incoming);
        WriteCurrent(saved);
        if (incoming.RecipeId != saved.RecipeId) throw InvalidCurrent();
        var contentMatches = CanonicalRecipeContentStore.NormalizeJson(JsonSerializer.Serialize(incoming.Content, CurrentJson))
            == CanonicalRecipeContentStore.NormalizeJson(JsonSerializer.Serialize(saved.Content, CurrentJson));
        if (incoming.Content.ContentRevision == saved.Content.ContentRevision && !contentMatches)
            throw new InvalidDataException("Identical recipe content revisions contain different canonical content.");
        return contentMatches && (incoming.RawMetadata is null) == (saved.RawMetadata is null)
            && CanonicalRecipeContentStore.NormalizeJson(incoming.RawMetadata)
            == CanonicalRecipeContentStore.NormalizeJson(saved.RawMetadata);
    }

    private sealed record CurrentEnvelope(string Format, int Version, Guid RecipeId,
        int ContentSchemaVersion, string ContentRevision, CanonicalRecipeContent Content, string? RawMetadata);

    private static void ValidateCurrentContent(CanonicalRecipeContent content)
    {
        if (content.ContentSchemaVersion != 2 || string.IsNullOrWhiteSpace(content.ContentRevision)
            || string.IsNullOrWhiteSpace(content.SourceRevision) || content.Servings is <= 0
            || content.IngredientLines is null || content.InstructionSections is null) throw InvalidCurrent();
        var ids = new HashSet<Guid>();
        void Identity(Guid id) { if (id == Guid.Empty || !ids.Add(id)) throw InvalidCurrent(); }
        foreach (var line in content.IngredientLines)
        {
            if (line is null) throw InvalidCurrent();
            Identity(line.Id);
            RecipeContentInput.Facts(line);
            // "unknown" is retained by the existing internal converter. Keep that
            // spelling lossless here; public DTO provenance is separately contracted.
            if (line.Provenance is not { Origin: "human" or "source" or "legacy_unknown" or "unknown", ProtectedFields: { } fields }
                || line.Provenance.SourceRef is { } source && string.IsNullOrWhiteSpace(source)
                || fields.Any(x => x is not ("description" or "amount" or "amountText" or "unit" or "scaling" or "package" or "shopping"))
                || fields.Distinct(StringComparer.Ordinal).Count() != fields.Count) throw InvalidCurrent();
        }
        foreach (var section in content.InstructionSections)
        {
            if (section is null || section.Steps is null) throw InvalidCurrent();
            Identity(section.Id);
            foreach (var step in section.Steps)
            {
                if (step is null || step.Text is null || string.IsNullOrWhiteSpace(step.TextRevision)
                    || step.Bindings is null) throw InvalidCurrent();
                Identity(step.Id);
            }
        }
        // Binding payloads remain step-companion-owned. Check the shared saved
        // references/span invariants without interpreting quantities or rewriting text.
        var ingredients = content.IngredientLines.Select(x => x.Id).ToHashSet();
        foreach (var step in content.InstructionSections.SelectMany(x => x.Steps))
        {
            var spans = new List<(int Start, int End)>();
            foreach (var binding in step.Bindings)
            {
                if (binding.ValueKind != JsonValueKind.Object) throw InvalidCurrent();
                Identity(binding.GetProperty("id").GetGuid());
                if (!ingredients.Contains(binding.GetProperty("ingredientLineId").GetGuid())
                    || binding.GetProperty("stepId").GetGuid() != step.Id
                    || binding.GetProperty("validatedContentRevision").GetString() != content.ContentRevision
                    || binding.GetProperty("validatedTextRevision").GetString() != step.TextRevision)
                    throw InvalidCurrent();
                var span = binding.GetProperty("span");
                var start = span.GetProperty("start").GetInt32();
                var end = span.GetProperty("end").GetInt32();
                if (start < 0 || end <= start || end > step.Text.Length
                    || !Boundary(step.Text, start) || !Boundary(step.Text, end)
                    || span.GetProperty("expectedText").GetString() != step.Text[start..end]
                    || spans.Any(x => start < x.End && end > x.Start)) throw InvalidCurrent();
                spans.Add((start, end));
                if (binding.GetProperty("role").GetString() is not ("mention" or "whole" or "absolute" or "fraction" or "remainder" or "fixed" or "perItem")
                    || binding.GetProperty("payload").ValueKind != JsonValueKind.Object
                    || string.IsNullOrWhiteSpace(binding.GetProperty("status").GetString())) throw InvalidCurrent();
            }
        }
    }

    private static bool Boundary(string text, int offset) => offset == 0 || offset == text.Length
        || !char.IsHighSurrogate(text[offset - 1]) || !char.IsLowSurrogate(text[offset]);

    private static void RejectDuplicateProperties(JsonElement value)
    {
        if (value.ValueKind == JsonValueKind.Object)
        {
            var names = new HashSet<string>(StringComparer.Ordinal);
            foreach (var property in value.EnumerateObject())
            {
                if (!names.Add(property.Name)) throw InvalidCurrent();
                RejectDuplicateProperties(property.Value);
            }
        }
        else if (value.ValueKind == JsonValueKind.Array)
            foreach (var item in value.EnumerateArray()) RejectDuplicateProperties(item);
    }

    private static InvalidDataException InvalidCurrent() => new("Unsupported or malformed current recipe content envelope.");
}
