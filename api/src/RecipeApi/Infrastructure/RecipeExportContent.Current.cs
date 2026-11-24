using System.Text.Json;
using System.Text.Json.Serialization;
using RecipeApi.Dto;
using RecipeApi.Services;

namespace RecipeApi.Infrastructure;

public sealed record StructuredRecipeExport(Guid RecipeId, StructuredRecipeContent Content, string? RawMetadata);

public sealed partial record RecipeExportContent
{
    private static readonly JsonSerializerOptions CurrentJson = new(JsonSerializerDefaults.Web)
    {
        PropertyNameCaseInsensitive = false,
        UnmappedMemberHandling = JsonUnmappedMemberHandling.Disallow,
        RespectRequiredConstructorParameters = true
    };

    public static bool IsCurrent(JsonElement root) =>
        root.ValueKind == JsonValueKind.Object
        && root.TryGetProperty("format", out var format) && format.ValueKind == JsonValueKind.String
        && format.GetString() == "wfs-recipe"
        && root.TryGetProperty("version", out var version) && version.ValueKind == JsonValueKind.Number
        && version.TryGetInt32(out var v) && v == 2;

    // This decodes recipe content only. Household/media manifests, captured merge
    // authority and coordinated publication must qualify before routine restore uses it.
    public static StructuredRecipeExport ReadCurrent(JsonElement root, Guid expectedRecipeId)
        => ReadCurrentCore(root, expectedRecipeId, retainedHistory: false);

    private static StructuredRecipeExport ReadCurrentCore(JsonElement root, Guid expectedRecipeId, bool retainedHistory)
    {
        try
        {
            RejectDuplicateProperties(root);
            var envelope = root.Deserialize<CurrentEnvelope>(CurrentJson) ?? throw InvalidCurrent();
            if (envelope.Format != "wfs-recipe" || envelope.Version != 2 || envelope.ContentSchemaVersion != 2
                || expectedRecipeId == Guid.Empty || envelope.RecipeId != expectedRecipeId
                || envelope.Content is null || envelope.ContentRevision != envelope.Content.ContentRevision)
                throw InvalidCurrent();
            StructuredRecipeContentStore.ValidateContent(envelope.Content, retainedHistory);
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

    public static string WriteCurrent(StructuredRecipeExport export)
    {
        var envelope = new CurrentEnvelope("wfs-recipe", 2, export.RecipeId, 2,
            export.Content.ContentRevision, export.Content, export.RawMetadata);
        var serialized = JsonSerializer.SerializeToElement(envelope, CurrentJson);
        // Keep the writer and decoder on the same validity boundary. No conversion,
        // identity allocation, provider work or live storage is permitted here.
        ReadCurrent(serialized, export.RecipeId);
        return serialized.GetRawText();
    }

    // Internal history may retain a proof after a unit/dependency change. Its
    // old validation tokens keep it inert; exact original-command rederivation
    // remains required by the caller. Public current/export defaults stay strict.
    internal static void ValidateRetainedHistory(StructuredRecipeExport export)
    {
        var envelope = new CurrentEnvelope("wfs-recipe", 2, export.RecipeId, 2,
            export.Content.ContentRevision, export.Content, export.RawMetadata);
        _ = ReadCurrentCore(JsonSerializer.SerializeToElement(envelope, CurrentJson), export.RecipeId, retainedHistory: true);
    }

    public static bool IsIdenticalCurrent(StructuredRecipeExport incoming, StructuredRecipeExport saved)
    {
        // Both sides must be independently valid. Equality grants only a no-write
        // replay; it never supplies a missing captured destination merge baseline.
        WriteCurrent(incoming);
        WriteCurrent(saved);
        if (incoming.RecipeId != saved.RecipeId) throw InvalidCurrent();
        var contentMatches = StructuredRecipeContentStore.NormalizeJson(JsonSerializer.Serialize(incoming.Content, CurrentJson))
            == StructuredRecipeContentStore.NormalizeJson(JsonSerializer.Serialize(saved.Content, CurrentJson));
        if (incoming.Content.ContentRevision == saved.Content.ContentRevision && !contentMatches)
            throw new InvalidDataException("Identical recipe content revisions contain different canonical content.");
        return contentMatches && (incoming.RawMetadata is null) == (saved.RawMetadata is null)
            && StructuredRecipeContentStore.NormalizeJson(incoming.RawMetadata)
            == StructuredRecipeContentStore.NormalizeJson(saved.RawMetadata);
    }

    private sealed record CurrentEnvelope(string Format, int Version, Guid RecipeId,
        int ContentSchemaVersion, string ContentRevision, StructuredRecipeContent Content, string? RawMetadata);

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
