using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RecipeApi.Models;

[Table("capture_failures")]
public class CaptureFailure
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Column("family_member_id")]
    public Guid? FamilyMemberId { get; set; }

    /// <summary>url | photos | describe</summary>
    [Column("source_type")]
    public string SourceType { get; set; } = string.Empty;

    [Column("retry_payload", TypeName = "jsonb")]
    public string RetryPayload { get; set; } = "{}";

    [Column("payload_version")]
    public int PayloadVersion { get; set; } = 1;

    [Column("preview_text")]
    public string? PreviewText { get; set; }

    [Column("friendly_reason")]
    public string FriendlyReason { get; set; } = string.Empty;

    [Column("technical_reason")]
    public string? TechnicalReason { get; set; }

    [Column("failure_code")]
    public string? FailureCode { get; set; }

    /// <summary>failed | retrying | resolved</summary>
    [Column("status")]
    public string Status { get; set; } = "failed";

    [Column("retry_count")]
    public int RetryCount { get; set; } = 0;

    [Column("recipe_id")]
    public Guid? RecipeId { get; set; }

    [Column("created_at")]
    public DateTimeOffset CreatedAt { get; set; }

    [Column("last_failed_at")]
    public DateTimeOffset LastFailedAt { get; set; }

    [Column("last_retried_at")]
    public DateTimeOffset? LastRetriedAt { get; set; }
}
