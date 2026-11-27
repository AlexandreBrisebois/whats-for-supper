using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services.Management;

namespace RecipeApi.Services;

public record WorkflowPruneResult(int PrunedInstances, int PrunedTasks);

public record MaintenanceCommandPruneResult(int PrunedCommands, int InitializedCompletionTimestamps, DateTimeOffset Cutoff);

public record MaintenanceCommandBatchResult(int PendingAtStart, int Completed, int Skipped, int Failed, List<MaintenanceCommandReportItem> Items);

public record MaintenanceCommandReportItem(Guid CommandId, string CommandType, string Status, Guid? RecipeId, Guid? WorkflowInstanceId, string? Reason);

public record DreamingReportResult(string Path, int FailedWorkflows, int StuckWorkflows);

public record DemoStateResult(string Message, int FamilyMembers, int Recipes, int SearchDocuments, Guid? BaselineId = null, Guid? Generation = null, IReadOnlyDictionary<string, int>? StateCounts = null);

public sealed record GroceryExtraBackup(int Version, IReadOnlyList<GroceryExtraOccurrence> Occurrences);

/// <summary>
/// Coordinates database/store backup, restore, disaster recovery, demo state snapshots,
/// workflow/maintenance pruning, and nightly dreaming reports across focused domain collaborators.
/// </summary>
public partial class ManagementService(
    RecipeDbContext db,
    IRecipeStore recipeStore,
    RecipesRootResolver recipesRoot,
    DataRootResolver dataRoot,
    IClock clock,
    ILogger<ManagementService> logger,
    DemoModeOptions demoMode,
    RecoverySnapshotService recovery,
    DeploymentCalendar calendar,
    IScheduleEventPublisher? publisher = null,
    FoodVocabularyStore? vocabulary = null)
{
    private ManagementSearchService? _search;
    private ManagementBackupService? _backup;
    private ManagementMemberRecoveryService? _memberRecovery;
    private ManagementSeedService? _seed;
    private ManagementArtifactRestoreService? _artifactRestore;
    private ManagementRestoreService? _restore;
    private DemoManagementService? _demo;
    private ManagementMaintenanceService? _maintenance;
    private ManagementDreamingReportService? _dreamingReport;

    private string DataRoot => dataRoot.Root;

    private ManagementSearchService Search =>
        _search ??= new(db, recipesRoot, clock, logger);

    private ManagementBackupService Backup =>
        _backup ??= new(db, recipeStore, dataRoot, Search, logger);

    private ManagementMemberRecoveryService MemberRecovery =>
        _memberRecovery ??= new(db, recipeStore, dataRoot, clock, demoMode, logger);

    private ManagementSeedService Seed =>
        _seed ??= new(db, recipeStore, clock, logger);

    private ManagementArtifactRestoreService ArtifactRestore =>
        _artifactRestore ??= new(db, dataRoot, clock, logger);

    private ManagementRestoreService Restore =>
        _restore ??= new(db, recipeStore, dataRoot, clock, demoMode, vocabulary, MemberRecovery, Seed, Search, ArtifactRestore, logger);

    private DemoManagementService Demo =>
        _demo ??= new(db, demoMode, recovery, publisher);

    private ManagementMaintenanceService Maintenance =>
        _maintenance ??= new(db, recipesRoot, clock, logger);

    private ManagementDreamingReportService DreamingReport =>
        _dreamingReport ??= new(db, dataRoot, clock, logger);

    /// <summary>
    /// Exports live database tables, recipe metadata/JSON files, and search index sidecars.
    /// </summary>
    public Task<object> BackupAsync() =>
        Backup.BackupAsync(ExportSupperServingsAsync, ExportInterestAsync);

    /// <summary>
    /// Captures the Demo Mode master baseline snapshot.
    /// </summary>
    public Task<DemoStateResult> CaptureDemoStateAsync(CancellationToken ct = default) =>
        Demo.CaptureDemoStateAsync(ct);

    /// <summary>
    /// Restores the Demo Mode master baseline snapshot and publishes reset notifications.
    /// </summary>
    public Task<DemoStateResult> RestoreDemoStateAsync(CancellationToken ct = default, Guid? workflowInstanceId = null) =>
        Demo.RestoreDemoStateAsync(ct, workflowInstanceId);

    /// <summary>
    /// Retains and prunes terminal workflow instances older than the retention window.
    /// </summary>
    public Task<WorkflowPruneResult> PruneWorkflowsAsync(int retentionDays, CancellationToken ct = default) =>
        Maintenance.PruneWorkflowsAsync(retentionDays, ct);

    /// <summary>
    /// Executes up to 50 pending maintenance commands that are due for processing.
    /// </summary>
    public Task<MaintenanceCommandBatchResult> ProcessMaintenanceCommandsAsync(CancellationToken ct = default) =>
        Maintenance.ProcessMaintenanceCommandsAsync(ct);

    /// <summary>
    /// Initializes missing completion timestamps and prunes expired terminal maintenance commands.
    /// </summary>
    public Task<MaintenanceCommandPruneResult> PruneMaintenanceCommandsAsync(
        int retentionDays = 30,
        int batchSize = 500,
        CancellationToken ct = default) =>
        Maintenance.PruneMaintenanceCommandsAsync(retentionDays, batchSize, ct);

    /// <summary>
    /// Generates the nightly markdown dreaming report summarizing maintenance, backup, and workflow health.
    /// </summary>
    public Task<DreamingReportResult> GenerateDreamingReportAsync(
        WorkflowPruneResult? pruneResult = null,
        MaintenanceCommandBatchResult? maintenanceResult = null,
        MaintenanceCommandPruneResult? maintenancePruneResult = null,
        GroceryExtraRolloverResult? groceryExtraRolloverResult = null,
        CancellationToken ct = default) =>
        DreamingReport.GenerateDreamingReportAsync(
            pruneResult,
            maintenanceResult,
            maintenancePruneResult,
            groceryExtraRolloverResult,
            ct);

    /// <summary>
    /// Restores household members, recipes, search sidecars, plans, calendar events, and recovery artifacts.
    /// </summary>
    public async Task<SeedResult> RestoreAsync(CancellationToken ct = default)
    {
        SupperServingsBackup? servingBackup = null;
        return await Restore.RestoreAsync(
            async token => { servingBackup = await ReadSupperServingsAsync(token); },
            token => RestoreSupperServingsAsync(servingBackup, token),
            RestoreInterestAsync,
            ReadCalendarEventsAsync,
            ct);
    }

    /// <summary>
    /// Reconciles missing family member placeholders referenced by stored recipes into family-members.json.
    /// </summary>
    public Task<SeedResult> DisasterRecoveryAsync() =>
        MemberRecovery.DisasterRecoveryAsync();

    internal static void ValidateGroceryExtraHistory(IReadOnlyList<GroceryExtraOccurrence> rows) =>
        ManagementArtifactRestoreService.ValidateGroceryExtraHistory(rows);

    private static Task WriteJsonAsync<T>(string path, T value, CancellationToken ct) =>
        ManagementSharedHelpers.WriteJsonAsync(path, value, ct);

    private static Task<T?> ReadJsonAsync<T>(string path, CancellationToken ct) =>
        ManagementSharedHelpers.ReadJsonAsync<T>(path, ct);

    internal sealed class DeleteFailedCaptureResiduePayload
    {
        public Guid? RecipeId { get; set; }
        public Guid? WorkflowInstanceId { get; set; }
        public string? SourceWorkflowId { get; set; }
        public string? Reason { get; set; }
    }
}
