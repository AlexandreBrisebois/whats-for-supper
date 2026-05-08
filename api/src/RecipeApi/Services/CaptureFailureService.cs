using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Models;

namespace RecipeApi.Services;

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

    private static string ResolveSourceType(string workflowId)
    {
        if (UrlWorkflowIds.Contains(workflowId)) return "url";
        if (PhotoWorkflowIds.Contains(workflowId)) return "photos";
        return "describe";
    }
}
