using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json;

namespace RecipeApi.Models;

[Table("recipe_search_documents")]
public class RecipeSearchDocument
{
    [Key]
    [Column("recipe_id")]
    public Guid RecipeId { get; set; }

    [Column("document_text")]
    public string DocumentText { get; set; } = string.Empty;

    [Column("search_metadata", TypeName = "jsonb")]
    public string SearchMetadata { get; set; } = "{}";

    /// <summary>
    /// Embedding stored as a JSON float array string. Mapped to vector(1536) on Postgres
    /// via a value converter defined in DbContext. Null when index is pending.
    /// </summary>
    [Column("embedding_json")]
    public string? EmbeddingJson { get; set; }

    [NotMapped]
    public float[]? Embedding
    {
        get => EmbeddingJson is null ? null : JsonSerializer.Deserialize<float[]>(EmbeddingJson);
        set => EmbeddingJson = value is null ? null : JsonSerializer.Serialize(value);
    }

    [Column("embedding_model")]
    public string EmbeddingModel { get; set; } = string.Empty;

    [Column("embedding_version")]
    public string? EmbeddingVersion { get; set; }

    /// <summary>pending | indexing | ready | failed. This is canonical-content readiness only.</summary>
    [Column("index_status")]
    public string IndexStatus { get; set; } = "pending";

    /// <summary>pending | indexing | ready | failed. Independent from lexical content readiness.</summary>
    [Column("embedding_status")]
    public string EmbeddingStatus { get; set; } = "pending";

    /// <summary>Fingerprint of the canonical content that produced EmbeddingJson.</summary>
    [Column("embedding_fingerprint")]
    public string? EmbeddingFingerprint { get; set; }

    [Column("last_indexed_at")]
    public DateTimeOffset? LastIndexedAt { get; set; }

    [Column("source_fingerprint")]
    public string? SourceFingerprint { get; set; }

    [Column("schema_version")]
    public int SchemaVersion { get; set; } = 1;

    [ForeignKey(nameof(RecipeId))]
    public Recipe? Recipe { get; set; }
}
