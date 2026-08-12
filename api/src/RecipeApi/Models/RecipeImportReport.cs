using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RecipeApi.Models;

public enum RecipeImportReportStatus
{
    Reported,
    Reimporting,
    ReimportFailed,
    ReadyToReview
}

[Table("recipe_import_reports")]
public class RecipeImportReport
{
    [Key]
    [Column("recipe_id")]
    public Guid RecipeId { get; set; }

    [Column("reasons")]
    public string[] Reasons { get; set; } = [];

    [MaxLength(500)]
    [Column("note")]
    public string? Note { get; set; }

    [Column("status")]
    public RecipeImportReportStatus Status { get; set; } = RecipeImportReportStatus.Reported;

    [Column("reported_by")]
    public Guid? ReportedBy { get; set; }

    [Column("updated_by")]
    public Guid? UpdatedBy { get; set; }

    [Column("created_at")]
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    [Column("updated_at")]
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    [Column("last_workflow_instance_id")]
    public Guid? LastWorkflowInstanceId { get; set; }

    [Column("last_attempt_at")]
    public DateTimeOffset? LastAttemptAt { get; set; }

    [Column("reimported_at")]
    public DateTimeOffset? ReimportedAt { get; set; }

    [MaxLength(2000)]
    [Column("last_error")]
    public string? LastError { get; set; }

    public Recipe Recipe { get; set; } = null!;
    public FamilyMember? Reporter { get; set; }
    public FamilyMember? Updater { get; set; }
}
