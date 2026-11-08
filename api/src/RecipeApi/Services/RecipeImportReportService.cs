using System.Collections.Concurrent;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Models;

namespace RecipeApi.Services;

public class RecipeImportReportService(
    IClock clock,
    RecipeDbContext db,
    IWorkflowOrchestrator? orchestrator = null,
    ILogger<RecipeImportReportService>? logger = null)
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

            RecipeRepairIntent? intent = null;
            if (IsEligible(recipe, reasons, note) && !active && !matchingPriorFeedback)
            {
                if (!materiallyChanged && report?.RepairIntentId is Guid savedId)
                    intent = await db.RecipeRepairIntents.AsNoTracking().SingleOrDefaultAsync(x => x.Id == savedId)
                        ?? throw new InvalidDataException("Saved repair intent is missing.");
                else
                {
                    var id = Guid.NewGuid();
                    var workflowId = WorkflowIdFor(recipe);
                    var parameters = WorkflowParameters(recipe, reasons, note);
                    WorkflowInstance? prepared = null;
                    try
                    {
                        if (report is not null && !materiallyChanged)
                            throw new InvalidDataException("Historical feedback has no original repair capture.");
                        prepared = await (orchestrator ?? throw new InvalidOperationException("Workflow orchestration is unavailable."))
                            .PrepareReportAsync(id, workflowId, parameters);
                        intent = RecipeReportRepairIntent.Create(id, recipeId, workflowId, parameters, prepared, clock.UtcNow);
                    }
                    catch (Exception)
                    {
                        // Capture failure is retained explicitly as a non-executable
                        // command. An unchanged retry must never recapture today's state.
                        intent = RecipeReportRepairIntent.Create(id, recipeId, workflowId, parameters, null, clock.UtcNow);
                    }
                    db.RecipeRepairIntents.Add(intent);
                }
            }
            await PersistAsync(recipeId, familyMemberId, reasons, note, intent?.Id);
            report = await db.RecipeImportReports.SingleAsync(entry => entry.RecipeId == recipeId);

            if (!IsEligible(recipe, reasons, note))
                return ToSubmissionResponse(recipe, report, false, null, false);

            if (active && matchingPriorFeedback)
                return ToSubmissionResponse(recipe, report, true, priorWorkflow!.Id, false);

            if (matchingPriorFeedback)
                return ToSubmissionResponse(recipe, report, false, null, false);

            return await LaunchSavedAsync(recipe, report, intent ?? throw new InvalidDataException("Original repair intent is missing."), reasons, note);
        }
        finally
        {
            recipeLock.Release();
        }
    }

    private async Task<RecipeImportReportSubmissionResponseDto> LaunchSavedAsync(Recipe recipe,
        RecipeImportReport report, RecipeRepairIntent intent, string[] reasons, string? note)
    {
        // Reuse the identity saved with feedback so a lost acknowledgement
        // can be reconciled without deleting accepted work.
        var command = RecipeReportRepairIntent.Read(intent);
        var instanceId = command.Id;
        try
        {
            var created = await (orchestrator ?? throw new InvalidOperationException("Workflow orchestration is unavailable."))
                .TriggerReportAsync(instanceId, recipe.Id, command.WorkflowId, command.Parameters);
            return ToSubmissionResponse(recipe, report, true, created.Id, false);
        }
        catch (Exception)
        {
            var committed = await db.WorkflowInstances.AsNoTracking().Include(x => x.Tasks).SingleOrDefaultAsync(x => x.Id == instanceId);
            var committedReport = await db.RecipeImportReports.AsNoTracking().SingleAsync(x => x.RecipeId == recipe.Id);
            if (committed is not null || committedReport.LastWorkflowInstanceId == instanceId)
            {
                // An unavailable/inconsistent read is not evidence of rollback.
                // Do not compensate by removing an independently running child.
                if (committed is null || committedReport.LastWorkflowInstanceId != instanceId
                    || !MatchesSnapshot(committed, reasons, note))
                    throw new InvalidDataException("Report acceptance has an inconsistent committed association.");
                RecipeReportRepairIntent.ValidateAccepted(intent, committed);
                return ToSubmissionResponse(recipe, committedReport, true, instanceId, false);
            }

            // Rollback can leave the request context tracking the attempted
            // child and report update. Do not accidentally save either again.
            foreach (var entry in db.ChangeTracker.Entries<WorkflowTask>().Where(x => x.Entity.InstanceId == instanceId).ToList())
                entry.State = EntityState.Detached;
            foreach (var entry in db.ChangeTracker.Entries<WorkflowInstance>().Where(x => x.Entity.Id == instanceId).ToList())
                entry.State = EntityState.Detached;
            await db.Entry(report).ReloadAsync();
            // Association and launch roll back together. There is nothing
            // to clear, and a different accepted attempt must stay intact.
            return ToSubmissionResponse(recipe, report, false, null, true);
        }
    }

    public async Task<int> ReconcilePendingAsync(CancellationToken ct = default)
    {
        var candidates = await db.RecipeImportReports.AsNoTracking()
            .Where(x => x.RepairIntentId != null && x.LastWorkflowInstanceId == null && x.Status == RecipeImportReportStatus.Reported)
            .Select(x => x.RecipeId).ToListAsync(ct);
        var accepted = 0;
        foreach (var recipeId in candidates)
        {
            ct.ThrowIfCancellationRequested();
            var gate = RecipeLocks.GetOrAdd(recipeId, _ => new SemaphoreSlim(1, 1));
            await gate.WaitAsync(ct);
            try
            {
                var report = await db.RecipeImportReports.SingleOrDefaultAsync(x => x.RecipeId == recipeId, ct);
                if (report is null) continue;
                await db.Entry(report).ReloadAsync(ct);
                if (report.RepairIntentId is not Guid intentId || report.LastWorkflowInstanceId is not null
                    || report.Status != RecipeImportReportStatus.Reported) continue;
                var intent = await db.RecipeRepairIntents.AsNoTracking().SingleOrDefaultAsync(x => x.Id == intentId, ct);
                if (intent is null || RecipeReportRepairIntent.Read(intent).Prepared is null) continue;
                var recipe = await db.Recipes.AsNoTracking().SingleOrDefaultAsync(x => x.Id == recipeId, ct);
                if (recipe is null) continue;
                var response = await LaunchSavedAsync(recipe, report, intent, report.Reasons, report.Note);
                if (response.ReimportStarted && ++accepted == 10) break;
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested) { throw; }
            catch (Exception ex)
            {
                // Missing/divergent authority is retained for reconciliation;
                // it cannot be repaired by recapturing current recipe/files.
                logger?.LogWarning(ex, "Could not reconcile original repair intent for recipe {RecipeId}", recipeId);
            }
            finally { gate.Release(); }
        }
        return accepted;
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
                    : null,
                ReimportFailureImportId = report.Status == RecipeImportReportStatus.ReimportFailed
                    ? report.LastWorkflowInstanceId
                    : null
            };

    public async Task MarkAttemptStartedAsync(Guid recipeId, Guid workflowInstanceId)
    {
        var now = clock.UtcNow;
        if (db.Database.IsRelational())
        {
            // Keep the predicate and state transition atomic; the RC1 provider cannot
            // translate primitive-array membership inside ExecuteUpdate.
            await db.Database.ExecuteSqlAsync($"""
                UPDATE recipe_import_reports
                SET status = 'reimporting', last_workflow_instance_id = {workflowInstanceId},
                    last_attempt_at = {now}, reimported_at = NULL, last_error = NULL,
                    updated_at = {now}
                WHERE recipe_id = {recipeId}
                  AND reasons && ARRAY['ingredients', 'steps']::text[]
                """);
            return;
        }

        var report = await db.RecipeImportReports.SingleOrDefaultAsync(r => r.RecipeId == recipeId);
        if (report is null
            || (!report.Reasons.Contains("ingredients") && !report.Reasons.Contains("steps"))) return;

        RecordAttemptStarted(report, workflowInstanceId, now);
        await db.SaveChangesAsync();
    }

    internal static void AssociateLaunch(RecipeImportReport report, WorkflowInstance instance, DateTimeOffset now)
    {
        var parameters = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, string>>(instance.Parameters!);
        if (instance.WorkflowId is not ("url-import" or "recipe-import") || parameters is null
            || !parameters.TryGetValue("recipeId", out var recipe) || !Guid.TryParse(recipe, out var id) || id != report.RecipeId
            || report.Reasons.Contains("duplicate") || string.IsNullOrWhiteSpace(report.Note)
            || !report.Reasons.Any(x => x is "ingredients" or "steps")
            || !MatchesSnapshot(instance, report.Reasons, report.Note))
            throw new InvalidDataException("Report feedback differs from the accepted repair command.");
        RecordAttemptStarted(report, instance.Id, now);
    }

    internal static void AssociateManualImport(RecipeImportReport report, Guid instanceId, DateTimeOffset now)
    {
        // Ordinary reimport has always associated content reports, including
        // blank notes and mixed duplicate/content feedback. It creates no report.
        if (report.Reasons.Contains("ingredients") || report.Reasons.Contains("steps"))
            RecordAttemptStarted(report, instanceId, now);
    }

    private static void RecordAttemptStarted(RecipeImportReport report, Guid workflowInstanceId, DateTimeOffset now)
    {
        report.Status = RecipeImportReportStatus.Reimporting;
        report.LastWorkflowInstanceId = workflowInstanceId;
        report.LastAttemptAt = now;
        report.ReimportedAt = null;
        report.LastError = null;
        report.UpdatedAt = now;
    }

    public async Task MarkSucceededAsync(Guid recipeId, Guid workflowInstanceId)
    {
        var now = clock.UtcNow;
        if (db.Database.IsRelational())
        {
            await db.Database.ExecuteSqlAsync($"""
                UPDATE recipe_import_reports
                SET status = CASE WHEN 'duplicate' = ANY(reasons)
                                  THEN 'reported' ELSE 'ready_to_review' END,
                    reimported_at = {now}, last_error = NULL, updated_at = {now}
                WHERE recipe_id = {recipeId} AND last_workflow_instance_id = {workflowInstanceId}
                """);
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
        var now = clock.UtcNow;
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
        string? note,
        Guid? repairIntentId)
    {
        var now = clock.UtcNow;
        var report = await db.RecipeImportReports.SingleOrDefaultAsync(r => r.RecipeId == recipeId);
        if (report is null)
        {
            db.RecipeImportReports.Add(new RecipeImportReport
            {
                RecipeId = recipeId,
                RepairIntentId = repairIntentId,
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
            if (repairIntentId is not null || materiallyChanged) report.RepairIntentId = repairIntentId;
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

    private static Dictionary<string, string> WorkflowParameters(Recipe recipe, string[] reasons, string? note)
    {
        var parameters = new Dictionary<string, string>
        {
            ["recipeId"] = recipe.Id.ToString(),
            ["repairReasons"] = string.Join(',', reasons),
            ["repairNote"] = note!
        };
        if (!string.IsNullOrEmpty(recipe.SourceUrl)) parameters["url"] = recipe.SourceUrl;
        return parameters;
    }

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

    private RecipeDetailResponseDto ToDetailResponse(Recipe recipe, RecipeImportReport? report)
    {
        var dto = RecipeService.MapToDto(recipe);
        dto.ImportIssue = ToPublicDto(report);
        return new RecipeDetailResponseDto
        {
            UpdatedAt = clock.UtcNow,
            Recipe = dto
        };
    }

    private RecipeImportReportSubmissionResponseDto ToSubmissionResponse(
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
