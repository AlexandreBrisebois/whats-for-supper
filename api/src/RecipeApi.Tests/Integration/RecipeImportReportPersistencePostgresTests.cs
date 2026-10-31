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

// Each case owns one disposable database; durable state is read through a separate connection.
public class RecipeImportReportPersistencePostgresTests : IAsyncLifetime
{
    private readonly string _databaseName = $"wfs_report_persistence_{Guid.NewGuid():N}";
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
    public async Task ManualAndIdenticalSave_PreserveOnePersistedReport()
    {
        var (recipe, member) = await SeedAsync();
        var service = Service();
        foreach (var _ in new[] { 1, 2 })
        {
            var result = await service.SubmitAsync(recipe.Id, member.Id,
                new() { Reasons = ["duplicate"], Note = "private synthetic feedback" });

            Assert.Equal(1, await PersistedCountAsync());
            Assert.False(result.ReimportStarted);
            Assert.False(result.ReimportLaunchFailed);
            _db.ChangeTracker.Clear();
            Assert.Equal("private synthetic feedback", (await _db.RecipeImportReports.AsNoTracking().SingleAsync()).Note);
        }
    }

    [PostgresFact]
    public async Task DatabaseRejection_LeavesNoReport()
    {
        var (recipe, member) = await SeedAsync();
        await _db.Database.ExecuteSqlRawAsync("ALTER TABLE recipe_import_reports ADD CONSTRAINT synthetic_note_rejection CHECK (note IS NULL)");

        await Assert.ThrowsAsync<DbUpdateException>(() => Service().SubmitAsync(recipe.Id, member.Id,
            new() { Reasons = ["duplicate"], Note = "private synthetic feedback" }));

        Assert.Equal(0, await PersistedCountAsync());
    }

    [PostgresFact]
    public async Task UncertainSaveAcknowledgement_PreservesCommittedReport()
    {
        var (recipe, member) = await SeedAsync();
        _saveFaults.AfterSave = () => throw new InvalidOperationException("synthetic uncertain save acknowledgement");

        await Assert.ThrowsAsync<InvalidOperationException>(() => Service().SubmitAsync(recipe.Id, member.Id,
            new() { Reasons = ["duplicate"] }));

        Assert.Equal(1, await PersistedCountAsync());
    }

    [PostgresFact]
    public async Task OuterLocalTransaction_RollbackRemovesUncommittedReport()
    {
        var (recipe, member) = await SeedAsync();
        await using (var transaction = await _db.Database.BeginTransactionAsync())
        {
            await Service().SubmitAsync(recipe.Id, member.Id, new() { Reasons = ["duplicate"] });

            Assert.Equal(1, await _db.RecipeImportReports.CountAsync());
            Assert.Equal(0, await PersistedCountAsync());
            await transaction.RollbackAsync();
        }
        Assert.Equal(0, await PersistedCountAsync());
    }

    [PostgresFact]
    public async Task OuterAmbientTransaction_RollbackRemovesReport()
    {
        var (recipe, member) = await SeedAsync();
        using (var transaction = new TransactionScope(TransactionScopeAsyncFlowOption.Enabled))
        {
            await Service().SubmitAsync(recipe.Id, member.Id, new() { Reasons = ["duplicate"] });
            Assert.Equal(1, await _db.RecipeImportReports.CountAsync());
        }
        Assert.Equal(0, await PersistedCountAsync());
    }

    [PostgresFact]
    public async Task ExplicitlyEnlistedTransaction_RollbackRemovesReport()
    {
        var (recipe, member) = await SeedAsync();
        using var transaction = new CommittableTransaction();
        await _db.Database.OpenConnectionAsync();
        _db.Database.EnlistTransaction(transaction);
        Assert.Null(Transaction.Current);
        Assert.Null(_db.Database.CurrentTransaction);

        await Service().SubmitAsync(recipe.Id, member.Id, new() { Reasons = ["duplicate"] });

        Assert.Equal(1, await _db.RecipeImportReports.CountAsync());
        Assert.Equal(0, await PersistedCountAsync());
        transaction.Rollback();
        _db.Database.EnlistTransaction(null);
        await _db.Database.CloseConnectionAsync();
        Assert.Equal(0, await PersistedCountAsync());
    }

    [PostgresFact]
    public async Task ConfirmedSaveBeforeReadFailure_PersistsDespiteFailedResponse()
    {
        var (recipe, member) = await SeedAsync();
        _saveFaults.AfterSave = () => _readFaults.FailNextReportRead = true;

        await Assert.ThrowsAsync<InvalidOperationException>(() => Service().SubmitAsync(recipe.Id, member.Id,
            new() { Reasons = ["duplicate"] }));

        Assert.Equal(1, await PersistedCountAsync());
    }

    [PostgresFact]
    public async Task ConfirmedSaveBeforeLaunchFailure_PreservesReportAndFailureResponse()
    {
        var (recipe, member) = await SeedAsync();
        int? persistedCountAtLaunch = null;
        var orchestrator = new Mock<IWorkflowOrchestrator>();
        orchestrator.Setup(x => x.TriggerAsync("url-import", It.IsAny<Dictionary<string, string>>(), null))
            .Returns(async () =>
            {
                persistedCountAtLaunch = await PersistedCountAsync();
                throw new InvalidOperationException("synthetic launch failure");
            });

        var result = await new RecipeImportReportService(new SystemClock(), _db, orchestrator.Object)
            .SubmitAsync(recipe.Id, member.Id, new() { Reasons = ["ingredients"], Note = "private synthetic feedback" });

        Assert.True(result.ReimportLaunchFailed);
        Assert.False(result.ReimportStarted);
        Assert.Null(result.ImportId);
        Assert.Equal(1, await PersistedCountAsync());
        Assert.Equal(1, persistedCountAtLaunch);
        Assert.Empty(await _db.WorkflowInstances.AsNoTracking().ToListAsync());
        Assert.Equal(RecipeImportReportStatus.Reported, (await _db.RecipeImportReports.AsNoTracking().SingleAsync()).Status);
    }

    [PostgresFact]
    public async Task Resolution_RepeatedResolutionIsNoOp()
    {
        var (recipe, member) = await SeedReportAsync();
        var service = Service();

        var result = await service.DeleteAsync(recipe.Id, member.Id);
        var repeated = await service.DeleteAsync(recipe.Id, member.Id);

        Assert.Null(result.Recipe.ImportIssue);
        Assert.Null(repeated.Recipe.ImportIssue);
        Assert.Equal(0, await PersistedCountAsync());
    }

    [PostgresFact]
    public async Task Resolution_AbsentReportReturnsNoIssue()
    {
        var (recipe, member) = await SeedAsync();
        var result = await Service().DeleteAsync(recipe.Id, member.Id);
        Assert.Null(result.Recipe.ImportIssue);
        Assert.Equal(0, await PersistedCountAsync());
    }

    [PostgresFact]
    public async Task Resolution_ActiveAttemptRejectsWithoutRemovingReport()
    {
        var (recipe, member) = await SeedReportAsync();
        var workflow = new WorkflowInstance { Id = Guid.NewGuid(), WorkflowId = "url-import", Status = WorkflowStatus.Processing };
        _db.WorkflowInstances.Add(workflow);
        var report = await _db.RecipeImportReports.SingleAsync();
        report.LastWorkflowInstanceId = workflow.Id;
        report.Status = RecipeImportReportStatus.Reimporting;
        await _db.SaveChangesAsync();

        await Assert.ThrowsAsync<RecipeImportReportActiveException>(() => Service().DeleteAsync(recipe.Id, member.Id));
        Assert.Equal(1, await PersistedCountAsync());
    }

    [PostgresFact]
    public async Task Resolution_CascadeRecipeDeletionRemovesReport()
    {
        var (recipe, member) = await SeedReportAsync();
        _db.Recipes.Remove(recipe);
        await _db.SaveChangesAsync();
        Assert.Equal(0, await PersistedCountAsync());
    }

    [PostgresFact]
    public async Task Resolution_DatabaseRejectionRetainsReport()
    {
        var (recipe, member) = await SeedReportAsync();
        await _db.Database.ExecuteSqlRawAsync("""
            CREATE FUNCTION synthetic_reject_removal() RETURNS trigger AS $$
            BEGIN RAISE EXCEPTION 'synthetic rejected removal'; END;
            $$ LANGUAGE plpgsql;
            CREATE TRIGGER synthetic_reject_removal BEFORE DELETE ON recipe_import_reports
            FOR EACH ROW EXECUTE FUNCTION synthetic_reject_removal();
            """);
        await Assert.ThrowsAsync<DbUpdateException>(() => Service().DeleteAsync(recipe.Id, member.Id));
        Assert.Equal(1, await PersistedCountAsync());
    }

    [PostgresFact]
    public async Task Resolution_UncertainAcknowledgementPreservesCommittedRemoval()
    {
        var (recipe, member) = await SeedReportAsync();
        _saveFaults.AfterSave = () => throw new InvalidOperationException("synthetic uncertain removal acknowledgement");
        await Assert.ThrowsAsync<InvalidOperationException>(() => Service().DeleteAsync(recipe.Id, member.Id));
        Assert.Equal(0, await PersistedCountAsync());
    }

    [PostgresFact]
    public async Task Resolution_OuterLocalTransactionRollbackRetainsReport()
    {
        var (recipe, member) = await SeedReportAsync();
        await using (var transaction = await _db.Database.BeginTransactionAsync())
        {
            var result = await Service().DeleteAsync(recipe.Id, member.Id);
            Assert.Null(result.Recipe.ImportIssue);
            Assert.Equal(0, await _db.RecipeImportReports.CountAsync());
            Assert.Equal(1, await PersistedCountAsync());
            await transaction.RollbackAsync();
        }
        Assert.Equal(1, await PersistedCountAsync());
    }

    [PostgresFact]
    public async Task Resolution_OuterAmbientTransactionRollbackRetainsReport()
    {
        var (recipe, member) = await SeedReportAsync();
        using (var transaction = new TransactionScope(TransactionScopeAsyncFlowOption.Enabled))
        {
            var result = await Service().DeleteAsync(recipe.Id, member.Id);
            Assert.Null(result.Recipe.ImportIssue);
            Assert.Equal(0, await _db.RecipeImportReports.CountAsync());
        }
        Assert.Equal(1, await PersistedCountAsync());
    }

    [PostgresFact]
    public async Task Resolution_ExplicitlyEnlistedTransactionRollbackRetainsReport()
    {
        var (recipe, member) = await SeedReportAsync();
        using var transaction = new CommittableTransaction();
        await _db.Database.OpenConnectionAsync();
        _db.Database.EnlistTransaction(transaction);
        Assert.Null(Transaction.Current);
        Assert.Null(_db.Database.CurrentTransaction);
        await Service().DeleteAsync(recipe.Id, member.Id);
        Assert.Equal(0, await _db.RecipeImportReports.CountAsync());
        Assert.Equal(1, await PersistedCountAsync());
        transaction.Rollback();
        _db.Database.EnlistTransaction(null);
        await _db.Database.CloseConnectionAsync();
        Assert.Equal(1, await PersistedCountAsync());
    }

    private async Task<(Recipe Recipe, FamilyMember Member)> SeedReportAsync()
    {
        var (recipe, member) = await SeedAsync();
        await new RecipeImportReportService(new SystemClock(), _db).SubmitAsync(recipe.Id, member.Id,
            new() { Reasons = ["duplicate"], Note = "private synthetic feedback" });
        return (recipe, member);
    }

    private RecipeImportReportService Service() =>
        new(new SystemClock(), _db);

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
