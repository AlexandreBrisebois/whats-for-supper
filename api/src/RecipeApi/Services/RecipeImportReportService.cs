using System.Collections.Concurrent;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Models;

namespace RecipeApi.Services;

public class RecipeImportReportService(RecipeDbContext db, IWorkflowOrchestrator? orchestrator = null)
{
    private const int MaxErrorLength = 2000;
    // This is intentionally in-process only; adding concurrent API replicas needs a new durability design.
    private static readonly ConcurrentDictionary<Guid, SemaphoreSlim> RecipeLocks = new();
    private static readonly HashSet<string> AllowedReasons = ["ingredients", "steps", "duplicate"];

    public async Task<RecipeImportReportSubmissionResponseDto> SubmitAsync(
        Guid recipeId,
        Guid familyMemberId,
        RecipeImportIssueRequest request)
    {
        var (recipe, reasons, note) = await ValidateAsync(recipeId, familyMemberId, request);
        var recipeLock = RecipeLocks.GetOrAdd(recipeId, _ => new SemaphoreSlim(1, 1));
        await recipeLock.WaitAsync();
        try
        {
            var report = await db.RecipeImportReports.SingleOrDefaultAsync(r => r.RecipeId == recipeId);
            var priorWorkflow = report?.LastWorkflowInstanceId is Guid priorWorkflowId
                ? await db.WorkflowInstances.SingleOrDefaultAsync(workflow => workflow.Id == priorWorkflowId)
                : null;
            var active = priorWorkflow is not null && IsActive(priorWorkflow.Status);
            var matchingPriorFeedback = priorWorkflow is not null && MatchesSnapshot(priorWorkflow, reasons, note);
            var materiallyChanged = report is not null && (!report.Reasons.SequenceEqual(reasons, StringComparer.Ordinal)
                || !string.Equals(report.Note, note, StringComparison.Ordinal));

            if (active && (!matchingPriorFeedback || materiallyChanged))
                throw new RecipeImportReportActiveException("This report cannot change while re-import is active.");

            await PersistAsync(recipeId, familyMemberId, reasons, note);
            report = await db.RecipeImportReports.SingleAsync(entry => entry.RecipeId == recipeId);

            if (!IsEligible(recipe, reasons, note))
                return ToSubmissionResponse(recipe, report, false, null, false);

            if (active && matchingPriorFeedback)
                return ToSubmissionResponse(recipe, report, true, priorWorkflow!.Id, false);

            if (matchingPriorFeedback)
                return ToSubmissionResponse(recipe, report, false, null, false);

            WorkflowInstance? created = null;
            try
            {
                created = await (orchestrator ?? throw new InvalidOperationException("Workflow orchestration is unavailable."))
                    .TriggerAsync(WorkflowIdFor(recipe), WorkflowParameters(recipe, reasons, note));
                await MarkAttemptStartedAsync(recipeId, created.Id);
                return ToSubmissionResponse(recipe, report, true, created.Id, false);
            }
            catch (Exception)
            {
                if (created is not null && !await CompensateLaunchAsync(recipeId, created.Id))
                    return ToSubmissionResponse(recipe, report, true, created.Id, false);

                await ClearUnstartedAttemptAsync(recipeId);
                report = await db.RecipeImportReports.SingleAsync(entry => entry.RecipeId == recipeId);
                return ToSubmissionResponse(recipe, report, false, null, true);
            }
        }
        finally
        {
            recipeLock.Release();
        }
    }

    public async Task<RecipeDetailResponseDto> DeleteAsync(Guid recipeId, Guid familyMemberId)
    {
        var recipe = await RequireRecipeAndMemberAsync(recipeId, familyMemberId);
        var recipeLock = RecipeLocks.GetOrAdd(recipeId, _ => new SemaphoreSlim(1, 1));
        await recipeLock.WaitAsync();
        try
        {
            var report = await db.RecipeImportReports.SingleOrDefaultAsync(r => r.RecipeId == recipeId);
            if (report?.LastWorkflowInstanceId is Guid workflowId)
            {
                var workflow = await db.WorkflowInstances.SingleOrDefaultAsync(entry => entry.Id == workflowId);
                if (workflow is not null && IsActive(workflow.Status))
                    throw new RecipeImportReportActiveException("This report cannot be resolved while re-import is active.");
            }
            if (report is not null)
            {
                db.RecipeImportReports.Remove(report);
                await db.SaveChangesAsync();
            }

            return ToDetailResponse(recipe, null);
        }
        finally
        {
            recipeLock.Release();
        }
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
                    : "reported",
                IsReimporting = report.Status == RecipeImportReportStatus.Reimporting,
                ReimportFailureMessage = report.Status == RecipeImportReportStatus.ReimportFailed
                    ? "We couldn’t re-import this recipe. Your report is saved. Add or change a detail, then Save to try again."
                    : null
            };

    public async Task MarkAttemptStartedAsync(Guid recipeId, Guid workflowInstanceId)
    {
        var now = DateTimeOffset.UtcNow;
        if (db.Database.IsRelational())
        {
            await db.RecipeImportReports
                .Where(report =>
                    report.RecipeId == recipeId
                    && (report.Reasons.Contains("ingredients") || report.Reasons.Contains("steps")))
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
        if (report is null
            || (!report.Reasons.Contains("ingredients") && !report.Reasons.Contains("steps"))) return;

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
                    .SetProperty(
                        report => report.Status,
                        report => report.Reasons.Contains("duplicate")
                            ? RecipeImportReportStatus.Reported
                            : RecipeImportReportStatus.ReadyToReview)
                    .SetProperty(report => report.ReimportedAt, now)
                    .SetProperty(report => report.LastError, (string?)null)
                    .SetProperty(report => report.UpdatedAt, now));
            return;
        }

        var report = await db.RecipeImportReports.SingleOrDefaultAsync(r =>
            r.RecipeId == recipeId && r.LastWorkflowInstanceId == workflowInstanceId);
        if (report is null) return;

        report.Status = report.Reasons.Contains("duplicate")
            ? RecipeImportReportStatus.Reported
            : RecipeImportReportStatus.ReadyToReview;
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
        var reasons = request.Reasons
            .Select(reason => reason?.Trim().ToLowerInvariant() ?? string.Empty)
            .Order(StringComparer.Ordinal)
            .ToArray();
        if (reasons.Length == 0)
            throw new ArgumentException("At least one import issue reason is required.");
        if (reasons.Any(reason => !AllowedReasons.Contains(reason)))
            throw new ArgumentException("Issue reasons must be ingredients, steps, or duplicate.");
        if (reasons.Distinct(StringComparer.Ordinal).Count() != reasons.Length)
            throw new ArgumentException("Import issue reasons must be unique.");
        var hasContentReason = reasons.Contains("ingredients") || reasons.Contains("steps");
        if (hasContentReason && !reasons.Contains("duplicate") && !RecipeService.CanReimport(recipe))
        {
            throw new RecipeImportReportIneligibleException(
                "Ingredient and step issues can only be reported for recipes that can be re-imported.");
        }

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

    private async Task PersistAsync(
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

    private static bool IsActive(WorkflowStatus status) =>
        status is WorkflowStatus.Pending or WorkflowStatus.Processing;

    private static bool IsEligible(Recipe recipe, string[] reasons, string? note) =>
        RecipeService.CanReimport(recipe)
        && !reasons.Contains("duplicate")
        && (reasons.Contains("ingredients") || reasons.Contains("steps"))
        && !string.IsNullOrWhiteSpace(note);

    private static string WorkflowIdFor(Recipe recipe) => !string.IsNullOrEmpty(recipe.SourceUrl)
        ? "url-import"
        : recipe.ImageCount > 0
            ? "recipe-import"
            : throw new InvalidOperationException("Synthesized recipes cannot be reimported.");

    private static Dictionary<string, string> WorkflowParameters(Recipe recipe, string[] reasons, string? note) => new()
    {
        ["recipeId"] = recipe.Id.ToString(),
        ["repairReasons"] = string.Join(',', reasons),
        ["repairNote"] = note!
    };

    private static bool MatchesSnapshot(WorkflowInstance workflow, string[] reasons, string? note)
    {
        var parameters = workflow.Parameters is null
            ? null
            : System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, string>>(workflow.Parameters);
        return parameters is not null
            && parameters.TryGetValue("repairReasons", out var snapshotReasons)
            && parameters.TryGetValue("repairNote", out var snapshotNote)
            && string.Equals(snapshotReasons, string.Join(',', reasons), StringComparison.Ordinal)
            && string.Equals(snapshotNote, note, StringComparison.Ordinal);
    }

    private async Task<bool> CompensateLaunchAsync(Guid recipeId, Guid workflowId)
    {
        try
        {
            var workflow = await db.WorkflowInstances.SingleOrDefaultAsync(entry => entry.Id == workflowId);
            if (workflow is not null)
            {
                db.WorkflowInstances.Remove(workflow);
                await db.SaveChangesAsync();
            }
            return true;
        }
        catch (Exception)
        {
            return false;
        }
    }

    private async Task ClearUnstartedAttemptAsync(Guid recipeId)
    {
        var report = await db.RecipeImportReports.SingleAsync(entry => entry.RecipeId == recipeId);
        report.Status = RecipeImportReportStatus.Reported;
        report.LastWorkflowInstanceId = null;
        report.LastAttemptAt = null;
        report.ReimportedAt = null;
        report.LastError = null;
        report.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();
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

    private static RecipeImportReportSubmissionResponseDto ToSubmissionResponse(
        Recipe recipe,
        RecipeImportReport report,
        bool reimportStarted,
        Guid? importId,
        bool reimportLaunchFailed)
    {
        var detail = ToDetailResponse(recipe, report);
        return new RecipeImportReportSubmissionResponseDto
        {
            UpdatedAt = detail.UpdatedAt,
            Recipe = detail.Recipe,
            ReimportStarted = reimportStarted,
            ImportId = importId,
            ReimportLaunchFailed = reimportLaunchFailed
        };
    }
}

public sealed class RecipeImportReportIneligibleException(string message) : InvalidOperationException(message);
public sealed class RecipeImportReportActiveException(string message) : InvalidOperationException(message);
