using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Models;

namespace RecipeApi.Services;

public enum RetryResult { Queued, AlreadyRetrying, UnsupportedPayloadVersion, NotFound }

public class CaptureFailureService(RecipeDbContext db)
{
    private static readonly HashSet<string> UrlWorkflowIds =
        new(StringComparer.OrdinalIgnoreCase) { "url-import" };

    private static readonly HashSet<string> PhotoWorkflowIds =
        new(StringComparer.OrdinalIgnoreCase) { "recipe-import" };

    public async Task PersistFailureAsync(
        Guid? recipeId,
        string workflowId,
        string? failureCode,
        string? technicalReason,
        string retryPayload,
        Guid? familyMemberId = null,
        string? previewText = null,
        CancellationToken ct = default)
    {
        var sourceType = ResolveSourceType(workflowId);
        var friendlyReason = CaptureFailureReasonMapper.ToFriendlyReason(failureCode);
        var now = DateTimeOffset.UtcNow;

        var failure = new CaptureFailure
        {
            Id = Guid.NewGuid(),
            FamilyMemberId = familyMemberId,
            SourceType = sourceType,
            RetryPayload = retryPayload,
            PayloadVersion = 1,
            PreviewText = previewText,
            FriendlyReason = friendlyReason,
            TechnicalReason = technicalReason,
            FailureCode = failureCode,
            Status = "failed",
            RetryCount = 0,
            RecipeId = recipeId,
            CreatedAt = now,
            LastFailedAt = now,
        };

        db.CaptureFailures.Add(failure);
        await db.SaveChangesAsync(ct);
    }

    public async Task<List<CaptureFailure>> GetActiveFailuresAsync(CancellationToken ct = default) =>
        await db.CaptureFailures
            .Where(f => f.Status != "resolved")
            .OrderByDescending(f => f.LastFailedAt)
            .ToListAsync(ct);

    /// <summary>
    /// Transitions a failure record from 'failed' to 'retrying'.
    /// Returns <see cref="RetryResult.AlreadyRetrying"/> if a retry is already in progress.
    /// Returns <see cref="RetryResult.UnsupportedPayloadVersion"/> if payload_version != 1.
    /// Note: the compare-and-set semantics are enforced at the application layer; for
    /// true concurrent-request safety a SELECT FOR UPDATE or DB-level CAS is needed in prod.
    /// </summary>
    public async Task<RetryResult> RetryAsync(Guid id, CancellationToken ct = default)
    {
        var row = await db.CaptureFailures.FindAsync([id], ct);
        if (row is null) return RetryResult.NotFound;

        if (row.Status != "failed") return RetryResult.AlreadyRetrying;

        if (row.PayloadVersion != 1) return RetryResult.UnsupportedPayloadVersion;

        row.Status = "retrying";
        row.LastRetriedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);

        return RetryResult.Queued;
    }

    private static string ResolveSourceType(string workflowId)
    {
        if (UrlWorkflowIds.Contains(workflowId)) return "url";
        if (PhotoWorkflowIds.Contains(workflowId)) return "photos";
        return "describe";
    }
}
