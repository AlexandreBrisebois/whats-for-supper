using System.Data.Common;
using System.Transactions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.EntityFrameworkCore.Storage;
using Moq;
using Npgsql;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Services;
using Xunit;
using PostgresFact = RecipeApi.Tests.Integration.RecipeImportReportPostgresTests.PostgresFactAttribute;

namespace RecipeApi.Tests.Integration;

// Each case owns one disposable database. State is read independently of observer receipt.
public class RecipeIssueTelemetryPersistencePostgresTests : IAsyncLifetime
{
    private readonly string _databaseName = $"wfs_issue_telemetry_{Guid.NewGuid():N}";
    private readonly SaveFaults _saveFaults = new();
    private readonly ReadFaults _readFaults = new();
    private NpgsqlConnection _admin = null!;
    private RecipeDbContext _db = null!;
    private string _connection = null!;

    public async Task InitializeAsync()
    {
        var connection = new NpgsqlConnectionStringBuilder(Environment.GetEnvironmentVariable("WFS_TEST_POSTGRES_CONNECTION"))
        {
            Pooling = false
        };
        _admin = new NpgsqlConnection(connection.ConnectionString);
        await _admin.OpenAsync();
        await new NpgsqlCommand($"CREATE DATABASE {_databaseName}", _admin).ExecuteNonQueryAsync();
        connection.Database = _databaseName;
        _connection = connection.ConnectionString;
        _db = new RecipeDbContext(new DbContextOptionsBuilder<RecipeDbContext>()
            .UseNpgsql(_connection).AddInterceptors(_saveFaults, _readFaults).Options);
        await using var schema = new NpgsqlConnection(_connection);
        await schema.OpenAsync();
        await new NpgsqlCommand(ReadSchema(), schema).ExecuteNonQueryAsync();
    }

    public async Task DisposeAsync()
    {
        if (_db is not null) await _db.DisposeAsync();
        if (_admin is not null)
        {
            if (_admin.State == System.Data.ConnectionState.Open)
                await new NpgsqlCommand($"DROP DATABASE IF EXISTS {_databaseName} WITH (FORCE)", _admin).ExecuteNonQueryAsync();
            await _admin.DisposeAsync();
        }
    }

    [PostgresFact]
    public async Task ManualAndIdenticalSave_ConfirmTwoBoundariesAndOnePersistedReport()
    {
        var (recipe, member) = await SeedAsync();
        var observer = new Observer();
        var service = Service(observer);
        foreach (var expected in new[] { 1, 2 })
        {
            var result = await service.SubmitAsync(recipe.Id, member.Id,
                new() { Reasons = ["duplicate"], Note = "private synthetic feedback" });

            Assert.Equal(1, await PersistedCountAsync());
            Assert.Equal(expected, observer.SavedCount);
            Assert.Equal(0, observer.ResolvedCount);
            Assert.False(result.ReimportStarted);
            Assert.False(result.ReimportLaunchFailed);
            _db.ChangeTracker.Clear();
            Assert.Equal("private synthetic feedback", (await _db.RecipeImportReports.AsNoTracking().SingleAsync()).Note);
        }
    }

    [PostgresFact]
    public async Task DatabaseRejection_EmitsNothingAndLeavesNoReport()
    {
        var (recipe, member) = await SeedAsync();
        await _db.Database.ExecuteSqlRawAsync("ALTER TABLE recipe_import_reports ADD CONSTRAINT synthetic_note_rejection CHECK (note IS NULL)");
        var observer = new Observer();

        await Assert.ThrowsAsync<DbUpdateException>(() => Service(observer).SubmitAsync(recipe.Id, member.Id,
            new() { Reasons = ["duplicate"], Note = "private synthetic feedback" }));

        Assert.Equal(0, await PersistedCountAsync());
        Assert.Equal(0, observer.SavedCount);
    }

    [PostgresFact]
    public async Task UncertainSaveAcknowledgement_EmitsNothingEvenThoughDatabaseCommitted()
    {
        var (recipe, member) = await SeedAsync();
        var observer = new Observer();
        _saveFaults.AfterSave = () => throw new InvalidOperationException("synthetic uncertain save acknowledgement");

        await Assert.ThrowsAsync<InvalidOperationException>(() => Service(observer).SubmitAsync(recipe.Id, member.Id,
            new() { Reasons = ["duplicate"] }));

        Assert.Equal(1, await PersistedCountAsync());
        Assert.Equal(0, observer.SavedCount);
    }

    [PostgresFact]
    public async Task OuterLocalTransaction_EmitsNothingAndRollbackRemovesUncommittedReport()
    {
        var (recipe, member) = await SeedAsync();
        var observer = new Observer();
        await using (var transaction = await _db.Database.BeginTransactionAsync())
        {
            await Service(observer).SubmitAsync(recipe.Id, member.Id, new() { Reasons = ["duplicate"] });

            Assert.Equal(1, await _db.RecipeImportReports.CountAsync());
            Assert.Equal(0, await PersistedCountAsync());
            Assert.Equal(0, observer.SavedCount);
            await transaction.RollbackAsync();
        }
        Assert.Equal(0, await PersistedCountAsync());
        Assert.Equal(0, observer.SavedCount);
    }

    [PostgresFact]
    public async Task OuterAmbientTransaction_EmitsNothingAndRollbackRemovesReport()
    {
        var (recipe, member) = await SeedAsync();
        var observer = new Observer();
        using (var transaction = new TransactionScope(TransactionScopeAsyncFlowOption.Enabled))
        {
            await Service(observer).SubmitAsync(recipe.Id, member.Id, new() { Reasons = ["duplicate"] });
            Assert.Equal(1, await _db.RecipeImportReports.CountAsync());
            Assert.Equal(0, observer.SavedCount);
        }
        Assert.Equal(0, await PersistedCountAsync());
        Assert.Equal(0, observer.SavedCount);
    }

    [PostgresFact]
    public async Task ExplicitlyEnlistedTransaction_EmitsNothingWithoutAmbientOrLocalTransaction()
    {
        var (recipe, member) = await SeedAsync();
        var observer = new Observer();
        using var transaction = new CommittableTransaction();
        await _db.Database.OpenConnectionAsync();
        _db.Database.EnlistTransaction(transaction);
        Assert.Null(Transaction.Current);
        Assert.Null(_db.Database.CurrentTransaction);

        await Service(observer).SubmitAsync(recipe.Id, member.Id, new() { Reasons = ["duplicate"] });

        Assert.Equal(1, await _db.RecipeImportReports.CountAsync());
        Assert.Equal(0, await PersistedCountAsync());
        Assert.Equal(0, observer.SavedCount);
        transaction.Rollback();
        _db.Database.EnlistTransaction(null);
        await _db.Database.CloseConnectionAsync();
        Assert.Equal(0, await PersistedCountAsync());
    }

    [PostgresFact]
    public async Task TransactionAppearingBeforeSaveReturns_ConservativelySuppressesObservation()
    {
        var (recipe, member) = await SeedAsync();
        var observer = new Observer();
        IDbContextTransaction? transaction = null;
        _saveFaults.AfterSave = () => transaction = _db.Database.BeginTransaction();
        try
        {
            await Service(observer).SubmitAsync(recipe.Id, member.Id, new() { Reasons = ["duplicate"] });

            Assert.NotNull(transaction);
            Assert.Equal(1, await PersistedCountAsync());
            Assert.Equal(0, observer.SavedCount);
        }
        finally
        {
            if (transaction is not null) await transaction.DisposeAsync();
        }
    }

    [PostgresFact]
    public async Task ConfirmedSaveBeforeReadFailure_AlreadyObservedFactSurvivesFailedResponse()
    {
        var (recipe, member) = await SeedAsync();
        var observer = new Observer();
        _saveFaults.AfterSave = () => _readFaults.FailNextReportRead = true;

        await Assert.ThrowsAsync<InvalidOperationException>(() => Service(observer).SubmitAsync(recipe.Id, member.Id,
            new() { Reasons = ["duplicate"] }));

        Assert.Equal(1, await PersistedCountAsync());
        Assert.Equal(1, observer.SavedCount);
    }

    [PostgresFact]
    public async Task ConfirmedSaveBeforeLaunchFailure_ProducesOneFactAndPreservesFailureResponse()
    {
        var (recipe, member) = await SeedAsync();
        var observer = new Observer();
        int? persistedCountAtLaunch = null;
        int? observedCountAtLaunch = null;
        var orchestrator = new Mock<IWorkflowOrchestrator>();
        orchestrator.Setup(x => x.TriggerAsync("url-import", It.IsAny<Dictionary<string, string>>(), null))
            .Returns(async () =>
            {
                persistedCountAtLaunch = await PersistedCountAsync();
                observedCountAtLaunch = observer.SavedCount;
                throw new InvalidOperationException("synthetic launch failure");
            });

        var result = await new RecipeImportReportService(new SystemClock(), _db, orchestrator.Object, observer)
            .SubmitAsync(recipe.Id, member.Id, new() { Reasons = ["ingredients"], Note = "private synthetic feedback" });

        Assert.True(result.ReimportLaunchFailed);
        Assert.False(result.ReimportStarted);
        Assert.Null(result.ImportId);
        Assert.Equal(1, await PersistedCountAsync());
        Assert.Equal(1, observer.SavedCount);
        Assert.Equal(1, persistedCountAtLaunch);
        Assert.Equal(1, observedCountAtLaunch);
        Assert.Empty(await _db.WorkflowInstances.AsNoTracking().ToListAsync());
        Assert.Equal(RecipeImportReportStatus.Reported, (await _db.RecipeImportReports.AsNoTracking().SingleAsync()).Status);
    }

    [PostgresFact]
    public async Task ThrowingObserver_CannotUndoSavedReportOrChangeManualResponse()
    {
        var (recipe, member) = await SeedAsync();
        var observer = new Observer { Throw = true };

        var result = await Service(observer).SubmitAsync(recipe.Id, member.Id, new() { Reasons = ["duplicate"] });

        Assert.Equal(1, await PersistedCountAsync());
        Assert.Equal(1, observer.SavedCount);
        Assert.False(result.ReimportStarted);
        Assert.False(result.ReimportLaunchFailed);
    }

    [PostgresFact]
    public async Task Resolution_ConfirmsRemovalBeforeObservationAndRepeatedResolutionIsNoOp()
    {
        var (recipe, member) = await SeedReportAsync();
        int? countAtObservation = null;
        var observer = new Observer { OnResolved = () => countAtObservation = PersistedCountAsync().GetAwaiter().GetResult() };
        var service = Service(observer);

        var result = await service.DeleteAsync(recipe.Id, member.Id);
        var repeated = await service.DeleteAsync(recipe.Id, member.Id);

        Assert.Null(result.Recipe.ImportIssue);
        Assert.Null(repeated.Recipe.ImportIssue);
        Assert.Equal(0, await PersistedCountAsync());
        Assert.Equal(0, countAtObservation);
        Assert.Equal(1, observer.ResolvedCount);
        Assert.Equal(0, observer.SavedCount);
    }

    [PostgresFact]
    public async Task Resolution_AbsentReportEmitsNothing()
    {
        var (recipe, member) = await SeedAsync();
        var observer = new Observer();
        var result = await Service(observer).DeleteAsync(recipe.Id, member.Id);
        Assert.Null(result.Recipe.ImportIssue);
        Assert.Equal(0, await PersistedCountAsync());
        Assert.Equal(0, observer.ResolvedCount);
    }

    [PostgresFact]
    public async Task Resolution_ActiveAttemptRejectsWithoutRemovingReportOrObservation()
    {
        var (recipe, member) = await SeedReportAsync();
        var workflow = new WorkflowInstance { Id = Guid.NewGuid(), WorkflowId = "url-import", Status = WorkflowStatus.Processing };
        _db.WorkflowInstances.Add(workflow);
        var report = await _db.RecipeImportReports.SingleAsync();
        report.LastWorkflowInstanceId = workflow.Id;
        report.Status = RecipeImportReportStatus.Reimporting;
        await _db.SaveChangesAsync();
        var observer = new Observer();

        await Assert.ThrowsAsync<RecipeImportReportActiveException>(() => Service(observer).DeleteAsync(recipe.Id, member.Id));
        Assert.Equal(1, await PersistedCountAsync());
        Assert.Equal(0, observer.ResolvedCount);
    }

    [PostgresFact]
    public async Task Resolution_CascadeRecipeDeletionDoesNotManufactureExplicitRemovalFact()
    {
        var (recipe, member) = await SeedReportAsync();
        var observer = new Observer();
        _ = Service(observer);
        _db.Recipes.Remove(recipe);
        await _db.SaveChangesAsync();
        Assert.Equal(0, await PersistedCountAsync());
        Assert.Equal(0, observer.ResolvedCount);
    }

    [PostgresFact]
    public async Task Resolution_DatabaseRejectionEmitsNothingAndRetainsReport()
    {
        var (recipe, member) = await SeedReportAsync();
        await _db.Database.ExecuteSqlRawAsync("""
            CREATE FUNCTION synthetic_reject_removal() RETURNS trigger AS $$
            BEGIN RAISE EXCEPTION 'synthetic rejected removal'; END;
            $$ LANGUAGE plpgsql;
            CREATE TRIGGER synthetic_reject_removal BEFORE DELETE ON recipe_import_reports
            FOR EACH ROW EXECUTE FUNCTION synthetic_reject_removal();
            """);
        var observer = new Observer();
        await Assert.ThrowsAsync<DbUpdateException>(() => Service(observer).DeleteAsync(recipe.Id, member.Id));
        Assert.Equal(1, await PersistedCountAsync());
        Assert.Equal(0, observer.ResolvedCount);
    }

    [PostgresFact]
    public async Task Resolution_UncertainAcknowledgementEmitsNothingEvenThoughRemovalCommitted()
    {
        var (recipe, member) = await SeedReportAsync();
        _saveFaults.AfterSave = () => throw new InvalidOperationException("synthetic uncertain removal acknowledgement");
        var observer = new Observer();
        await Assert.ThrowsAsync<InvalidOperationException>(() => Service(observer).DeleteAsync(recipe.Id, member.Id));
        Assert.Equal(0, await PersistedCountAsync());
        Assert.Equal(0, observer.ResolvedCount);
    }

    [PostgresFact]
    public async Task Resolution_OuterLocalTransactionSuppressesFactAndRollbackRetainsReport()
    {
        var (recipe, member) = await SeedReportAsync();
        var observer = new Observer();
        await using (var transaction = await _db.Database.BeginTransactionAsync())
        {
            var result = await Service(observer).DeleteAsync(recipe.Id, member.Id);
            Assert.Null(result.Recipe.ImportIssue);
            Assert.Equal(0, await _db.RecipeImportReports.CountAsync());
            Assert.Equal(1, await PersistedCountAsync());
            Assert.Equal(0, observer.ResolvedCount);
            await transaction.RollbackAsync();
        }
        Assert.Equal(1, await PersistedCountAsync());
    }

    [PostgresFact]
    public async Task Resolution_OuterAmbientTransactionSuppressesFactAndRollbackRetainsReport()
    {
        var (recipe, member) = await SeedReportAsync();
        var observer = new Observer();
        using (var transaction = new TransactionScope(TransactionScopeAsyncFlowOption.Enabled))
        {
            var result = await Service(observer).DeleteAsync(recipe.Id, member.Id);
            Assert.Null(result.Recipe.ImportIssue);
            Assert.Equal(0, await _db.RecipeImportReports.CountAsync());
            Assert.Equal(0, observer.ResolvedCount);
        }
        Assert.Equal(1, await PersistedCountAsync());
    }

    [PostgresFact]
    public async Task Resolution_ExplicitlyEnlistedTransactionSuppressesFactAndRollbackRetainsReport()
    {
        var (recipe, member) = await SeedReportAsync();
        var observer = new Observer();
        using var transaction = new CommittableTransaction();
        await _db.Database.OpenConnectionAsync();
        _db.Database.EnlistTransaction(transaction);
        Assert.Null(Transaction.Current);
        Assert.Null(_db.Database.CurrentTransaction);
        await Service(observer).DeleteAsync(recipe.Id, member.Id);
        Assert.Equal(0, await _db.RecipeImportReports.CountAsync());
        Assert.Equal(1, await PersistedCountAsync());
        Assert.Equal(0, observer.ResolvedCount);
        transaction.Rollback();
        _db.Database.EnlistTransaction(null);
        await _db.Database.CloseConnectionAsync();
        Assert.Equal(1, await PersistedCountAsync());
    }

    [PostgresFact]
    public async Task Resolution_TransactionAppearingBeforeSaveReturnsSuppressesFact()
    {
        var (recipe, member) = await SeedReportAsync();
        var observer = new Observer();
        IDbContextTransaction? transaction = null;
        _saveFaults.AfterSave = () => transaction = _db.Database.BeginTransaction();
        try
        {
            await Service(observer).DeleteAsync(recipe.Id, member.Id);
            Assert.NotNull(transaction);
            Assert.Equal(0, await PersistedCountAsync());
            Assert.Equal(0, observer.ResolvedCount);
        }
        finally
        {
            if (transaction is not null) await transaction.DisposeAsync();
        }
    }

    [PostgresFact]
    public async Task Resolution_ThrowingObserverCannotUndoRemovalOrChangeResponse()
    {
        var (recipe, member) = await SeedReportAsync();
        var observer = new Observer { Throw = true };
        var result = await Service(observer).DeleteAsync(recipe.Id, member.Id);
        Assert.Null(result.Recipe.ImportIssue);
        Assert.Equal(0, await PersistedCountAsync());
        Assert.Equal(1, observer.ResolvedCount);
        Assert.Equal(0, observer.SavedCount);
    }

    private async Task<(Recipe Recipe, FamilyMember Member)> SeedReportAsync()
    {
        var (recipe, member) = await SeedAsync();
        await new RecipeImportReportService(new SystemClock(), _db).SubmitAsync(recipe.Id, member.Id,
            new() { Reasons = ["duplicate"], Note = "private synthetic feedback" });
        return (recipe, member);
    }

    private RecipeImportReportService Service(IRecipeIssueTelemetry observer) =>
        new(new SystemClock(), _db, telemetry: observer);

    private async Task<(Recipe Recipe, FamilyMember Member)> SeedAsync()
    {
        var member = new FamilyMember { Id = Guid.NewGuid(), Name = "Synthetic member" };
        var recipe = new Recipe
        {
            Id = Guid.NewGuid(), Name = "Synthetic recipe", SourceUrl = "https://example.invalid/private", AddedBy = member.Id
        };
        _db.FamilyMembers.Add(member);
        _db.Recipes.Add(recipe);
        await _db.SaveChangesAsync();
        return (recipe, member);
    }

    private async Task<int> PersistedCountAsync()
    {
        await using var connection = new NpgsqlConnection(_connection);
        await connection.OpenAsync();
        return Convert.ToInt32(await new NpgsqlCommand("SELECT COUNT(*) FROM recipe_import_reports", connection).ExecuteScalarAsync());
    }

    private static string ReadSchema()
    {
        var root = new DirectoryInfo(AppContext.BaseDirectory);
        while (root is not null && !Directory.Exists(Path.Combine(root.FullName, "api", "database"))) root = root.Parent;
        return File.ReadAllText(Path.Combine(root?.FullName ?? throw new DirectoryNotFoundException("Repository root missing."),
            "api", "database", "schema.sql"));
    }

    private sealed class Observer : IRecipeIssueTelemetry
    {
        public int SavedCount { get; private set; }
        public int ResolvedCount { get; private set; }
        public bool Throw { get; init; }
        public Action? OnResolved { get; init; }
        public void Saved() { SavedCount++; if (Throw) throw new InvalidOperationException("synthetic observer failure"); }
        public void Resolved() { ResolvedCount++; OnResolved?.Invoke(); if (Throw) throw new InvalidOperationException("synthetic observer failure"); }
    }

    private sealed class SaveFaults : SaveChangesInterceptor
    {
        public Action? AfterSave { get; set; }
        public override ValueTask<int> SavedChangesAsync(SaveChangesCompletedEventData eventData, int result,
            CancellationToken cancellationToken = default)
        {
            AfterSave?.Invoke();
            return ValueTask.FromResult(result);
        }
    }

    private sealed class ReadFaults : DbCommandInterceptor
    {
        public bool FailNextReportRead { get; set; }
        public override ValueTask<InterceptionResult<DbDataReader>> ReaderExecutingAsync(DbCommand command,
            CommandEventData eventData, InterceptionResult<DbDataReader> result, CancellationToken cancellationToken = default)
        {
            if (FailNextReportRead && command.CommandText.Contains("FROM recipe_import_reports", StringComparison.Ordinal))
            {
                FailNextReportRead = false;
                throw new InvalidOperationException("synthetic post-save read failure");
            }
            return ValueTask.FromResult(result);
        }
    }
}
