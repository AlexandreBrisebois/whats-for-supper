using System.Collections.Concurrent;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Models;

namespace RecipeApi.Services;

public class RecipeImportReportService(RecipeDbContext db)
{
    private const int MaxErrorLength = 2000;
    private static readonly ConcurrentDictionary<Guid, SemaphoreSlim> RecipeLocks = new();
    private static readonly HashSet<string> AllowedReasons = ["ingredients", "steps"];

    public async Task<RecipeDetailResponseDto> UpsertAsync(
        Guid recipeId,
        Guid familyMemberId,
        RecipeImportIssueRequest request)
    {
        var (recipe, reasons, note) = await ValidateAsync(recipeId, familyMemberId, request);
        var recipeLock = RecipeLocks.GetOrAdd(recipeId, _ => new SemaphoreSlim(1, 1));
        await recipeLock.WaitAsync();
        try
        {
            if (db.Database.IsRelational())
            {
                await UpsertRelationalAsync(recipeId, familyMemberId, reasons, note);
            }
            else
            {
                await UpsertTrackedAsync(recipeId, familyMemberId, reasons, note);
            }

            var report = await db.RecipeImportReports.AsNoTracking().SingleAsync(r => r.RecipeId == recipeId);
            return ToDetailResponse(recipe, report);
        }
        finally
        {
            recipeLock.Release();
        }
    }

    public async Task<RecipeDetailResponseDto> DeleteAsync(Guid recipeId, Guid familyMemberId)
    {
        var recipe = await RequireRecipeAndMemberAsync(recipeId, familyMemberId);
        var report = await db.RecipeImportReports.SingleOrDefaultAsync(r => r.RecipeId == recipeId);
        if (report is not null)
        {
            db.RecipeImportReports.Remove(report);
            await db.SaveChangesAsync();
        }

        return ToDetailResponse(recipe, null);
    }

    public static RecipeImportIssueDto? ToPublicDto(RecipeImportReport? report) =>
        report is null
            ? null
            : new RecipeImportIssueDto
            {
                Reasons = report.Reasons,
                Note = report.Note,
                Status = report.Status == RecipeImportReportStatus.ReadyToReview
                    ? "readyToReview"
                    : "reported"
            };

    public async Task MarkAttemptStartedAsync(Guid recipeId, Guid workflowInstanceId)
    {
        var now = DateTimeOffset.UtcNow;
        if (db.Database.IsRelational())
        {
            await db.RecipeImportReports
                .Where(report => report.RecipeId == recipeId)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(report => report.Status, RecipeImportReportStatus.Reimporting)
                    .SetProperty(report => report.LastWorkflowInstanceId, workflowInstanceId)
                    .SetProperty(report => report.LastAttemptAt, now)
                    .SetProperty(report => report.ReimportedAt, (DateTimeOffset?)null)
                    .SetProperty(report => report.LastError, (string?)null)
                    .SetProperty(report => report.UpdatedAt, now));
            return;
        }

        var report = await db.RecipeImportReports.SingleOrDefaultAsync(r => r.RecipeId == recipeId);
        if (report is null) return;

        report.Status = RecipeImportReportStatus.Reimporting;
        report.LastWorkflowInstanceId = workflowInstanceId;
        report.LastAttemptAt = now;
        report.ReimportedAt = null;
        report.LastError = null;
        report.UpdatedAt = now;
        await db.SaveChangesAsync();
    }

    public async Task MarkSucceededAsync(Guid recipeId, Guid workflowInstanceId)
    {
        var now = DateTimeOffset.UtcNow;
        if (db.Database.IsRelational())
        {
            await db.RecipeImportReports
                .Where(report =>
                    report.RecipeId == recipeId
                    && report.LastWorkflowInstanceId == workflowInstanceId)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(report => report.Status, RecipeImportReportStatus.ReadyToReview)
                    .SetProperty(report => report.ReimportedAt, now)
                    .SetProperty(report => report.LastError, (string?)null)
                    .SetProperty(report => report.UpdatedAt, now));
            return;
        }

        var report = await db.RecipeImportReports.SingleOrDefaultAsync(r =>
            r.RecipeId == recipeId && r.LastWorkflowInstanceId == workflowInstanceId);
        if (report is null) return;

        report.Status = RecipeImportReportStatus.ReadyToReview;
        report.ReimportedAt = now;
        report.LastError = null;
        report.UpdatedAt = now;
        await db.SaveChangesAsync();
    }

    public async Task MarkFailedAsync(
        Guid recipeId,
        Guid workflowInstanceId,
        string failedStep,
        string errorSummary)
    {
        var now = DateTimeOffset.UtcNow;
        var failureSummary = BuildFailureSummary(failedStep, errorSummary);
        if (db.Database.IsRelational())
        {
            await db.RecipeImportReports
                .Where(report =>
                    report.RecipeId == recipeId
                    && report.LastWorkflowInstanceId == workflowInstanceId)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(report => report.Status, RecipeImportReportStatus.ReimportFailed)
                    .SetProperty(report => report.LastError, failureSummary)
                    .SetProperty(report => report.ReimportedAt, (DateTimeOffset?)null)
                    .SetProperty(report => report.UpdatedAt, now));
            return;
        }

        var report = await db.RecipeImportReports.SingleOrDefaultAsync(r =>
            r.RecipeId == recipeId && r.LastWorkflowInstanceId == workflowInstanceId);
        if (report is null) return;

        report.Status = RecipeImportReportStatus.ReimportFailed;
        report.LastError = failureSummary;
        report.ReimportedAt = null;
        report.UpdatedAt = now;
        await db.SaveChangesAsync();
    }

    private static string BuildFailureSummary(string failedStep, string errorSummary)
    {
        var normalizedStep = string.Join(' ', failedStep.Split(
            (char[]?)null,
            StringSplitOptions.RemoveEmptyEntries));
        var normalizedError = string.Join(' ', errorSummary.Split(
            (char[]?)null,
            StringSplitOptions.RemoveEmptyEntries));
        var summary = $"{normalizedStep}: {normalizedError}";
        return summary.Length <= MaxErrorLength ? summary : summary[..MaxErrorLength];
    }

    private async Task<(Recipe Recipe, string[] Reasons, string? Note)> ValidateAsync(
        Guid recipeId,
        Guid familyMemberId,
        RecipeImportIssueRequest request)
    {
        var recipe = await RequireRecipeAndMemberAsync(recipeId, familyMemberId);
        if (!RecipeService.CanReimport(recipe))
        {
            throw new RecipeImportReportIneligibleException(
                "Import issues can only be reported for recipes that can be re-imported.");
        }

        var reasons = request.Reasons
            .Select(reason => reason?.Trim().ToLowerInvariant() ?? string.Empty)
            .Order(StringComparer.Ordinal)
            .ToArray();
        if (reasons.Length == 0)
            throw new ArgumentException("At least one import issue reason is required.");
        if (reasons.Any(reason => !AllowedReasons.Contains(reason)))
            throw new ArgumentException("Import issue reasons must be ingredients or steps.");
        if (reasons.Distinct(StringComparer.Ordinal).Count() != reasons.Length)
            throw new ArgumentException("Import issue reasons must be unique.");

        var note = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim();
        if (note?.Length > 500)
            throw new ArgumentException("Import issue note must be 500 characters or fewer.");

        return (recipe, reasons, note);
    }

    private async Task<Recipe> RequireRecipeAndMemberAsync(Guid recipeId, Guid familyMemberId)
    {
        if (!await db.FamilyMembers.AnyAsync(member => member.Id == familyMemberId))
            throw new KeyNotFoundException($"Family member {familyMemberId} not found.");

        return await db.Recipes.SingleOrDefaultAsync(recipe => recipe.Id == recipeId)
            ?? throw new KeyNotFoundException($"Recipe {recipeId} not found.");
    }

    private async Task UpsertTrackedAsync(
        Guid recipeId,
        Guid familyMemberId,
        string[] reasons,
        string? note)
    {
        var now = DateTimeOffset.UtcNow;
        var report = await db.RecipeImportReports.SingleOrDefaultAsync(r => r.RecipeId == recipeId);
        if (report is null)
        {
            db.RecipeImportReports.Add(new RecipeImportReport
            {
                RecipeId = recipeId,
                Reasons = reasons,
                Note = note,
                ReportedBy = familyMemberId,
                UpdatedBy = familyMemberId,
                CreatedAt = now,
                UpdatedAt = now
            });
        }
        else
        {
            var materiallyChanged = !report.Reasons.SequenceEqual(reasons, StringComparer.Ordinal)
                || !string.Equals(report.Note, note, StringComparison.Ordinal);
            report.Reasons = reasons;
            report.Note = note;
            report.UpdatedBy = familyMemberId;
            report.UpdatedAt = now;
            if (materiallyChanged)
            {
                report.Status = RecipeImportReportStatus.Reported;
                report.LastWorkflowInstanceId = null;
                report.LastAttemptAt = null;
                report.ReimportedAt = null;
                report.LastError = null;
            }
        }

        await db.SaveChangesAsync();
    }

    private async Task UpsertRelationalAsync(
        Guid recipeId,
        Guid familyMemberId,
        string[] reasons,
        string? note)
    {
        var now = DateTimeOffset.UtcNow;
        await db.Database.ExecuteSqlAsync($$"""
            INSERT INTO recipe_import_reports
                (recipe_id, reasons, note, status, reported_by, updated_by, created_at, updated_at)
            VALUES
                ({{recipeId}}, {{reasons}}, {{note}}, 'reported', {{familyMemberId}}, {{familyMemberId}}, {{now}}, {{now}})
            ON CONFLICT (recipe_id) DO UPDATE SET
                reasons = EXCLUDED.reasons,
                note = EXCLUDED.note,
                updated_by = EXCLUDED.updated_by,
                updated_at = EXCLUDED.updated_at,
                status = CASE
                    WHEN recipe_import_reports.reasons IS DISTINCT FROM EXCLUDED.reasons
                      OR recipe_import_reports.note IS DISTINCT FROM EXCLUDED.note
                    THEN 'reported'
                    ELSE recipe_import_reports.status
                END,
                last_workflow_instance_id = CASE
                    WHEN recipe_import_reports.reasons IS DISTINCT FROM EXCLUDED.reasons
                      OR recipe_import_reports.note IS DISTINCT FROM EXCLUDED.note
                    THEN NULL ELSE recipe_import_reports.last_workflow_instance_id END,
                last_attempt_at = CASE
                    WHEN recipe_import_reports.reasons IS DISTINCT FROM EXCLUDED.reasons
                      OR recipe_import_reports.note IS DISTINCT FROM EXCLUDED.note
                    THEN NULL ELSE recipe_import_reports.last_attempt_at END,
                reimported_at = CASE
                    WHEN recipe_import_reports.reasons IS DISTINCT FROM EXCLUDED.reasons
                      OR recipe_import_reports.note IS DISTINCT FROM EXCLUDED.note
                    THEN NULL ELSE recipe_import_reports.reimported_at END,
                last_error = CASE
                    WHEN recipe_import_reports.reasons IS DISTINCT FROM EXCLUDED.reasons
                      OR recipe_import_reports.note IS DISTINCT FROM EXCLUDED.note
                    THEN NULL ELSE recipe_import_reports.last_error END
            """);
    }

    private static RecipeDetailResponseDto ToDetailResponse(Recipe recipe, RecipeImportReport? report)
    {
        var dto = RecipeService.MapToDto(recipe);
        dto.ImportIssue = ToPublicDto(report);
        return new RecipeDetailResponseDto
        {
            UpdatedAt = DateTimeOffset.UtcNow,
            Recipe = dto
        };
    }
}

public sealed class RecipeImportReportIneligibleException(string message) : InvalidOperationException(message);
