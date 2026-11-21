using Xunit;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Tests.Services;
using Xunit.Abstractions;

namespace RecipeApi.Tests.Integration;

public sealed class WorkflowProcessorHistoryPostgresTests(ITestOutputHelper output)
{
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task SearchOriginalInvocationAssociations()
    {
        foreach (var mode in new[] { "indexed", "missing", "deleted", "stale", "empty", "no-sidecar", "no-provider", "demo",
            "provider-failure", "absent-fingerprint", "null-fingerprint", "empty-fingerprint", "both-aliases", "upper-alias" })
            await new TomorrowPushPostgresTests(output).WithDatabase(settings =>
                WorkflowWorkerAuthorityTests.CheckSearchHistoryAsync(b => b.UseNpgsql(settings.ConnectionString), mode));
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task SyncOriginalPublicationAssociations()
    {
        foreach (var mode in new[] { "confirmed", "upper-alias", "both-aliases", "repeated", "pending-delivery", "unlinked", "replay" })
            await new TomorrowPushPostgresTests(output).WithDatabase(settings =>
                WorkflowWorkerAuthorityTests.CheckSyncHistoryAsync(b => b.UseNpgsql(settings.ConnectionString), mode));
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task MetadataOriginalResultAssociations()
    {
        foreach (var mode in new[] { "classified", "missing", "no-result", "caught-failure", "upper-alias", "both-aliases" })
            await new TomorrowPushPostgresTests(output).WithDatabase(settings =>
                WorkflowWorkerAuthorityTests.CheckMetadataHistoryAsync(b => b.UseNpgsql(settings.ConnectionString), "CategorizeRecipe", mode));
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task VegetarianOriginalResultAssociations()
    {
        foreach (var mode in new[] { "classified", "false", "missing", "empty", "no-result", "provider-failure", "upper-alias", "both-aliases" })
            await new TomorrowPushPostgresTests(output).WithDatabase(settings =>
                WorkflowWorkerAuthorityTests.CheckMetadataHistoryAsync(b => b.UseNpgsql(settings.ConnectionString), "ClassifyRecipeVegetarian", mode));
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task ReportOriginalResultAssociations()
    {
        foreach (var mode in new[] { "ready", "duplicate", "missing", "other-workflow", "upper-alias", "both-aliases" })
            await new TomorrowPushPostgresTests(output).WithDatabase(settings =>
                WorkflowWorkerAuthorityTests.CheckReportCategoryHistoryAsync(b => b.UseNpgsql(settings.ConnectionString), "CompleteRecipeImportReport", mode));
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task CategoryOriginalResultAssociations()
    {
        foreach (var mode in new[] { "published", "missing", "empty", "cached", "no-result", "caught-failure", "upper-alias", "both-aliases" })
            await new TomorrowPushPostgresTests(output).WithDatabase(settings =>
                WorkflowWorkerAuthorityTests.CheckReportCategoryHistoryAsync(b => b.UseNpgsql(settings.ConnectionString), "CategorizeIngredients", mode));
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task HeroOriginalResultAssociations()
    {
        foreach (var mode in new[] { "raw", "finished-dish", "missing-dish", "force", "force-string", "recovered", "existing", "no-source", "no-image" })
            await new TomorrowPushPostgresTests(output).WithDatabase(settings =>
                WorkflowWorkerAuthorityTests.CheckHeroProcessorHistoryAsync(b => b.UseNpgsql(settings.ConnectionString), mode));
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task RecipeOriginalResultAssociations()
    {
        foreach (var (processor, mode) in new[] { ("ExtractRecipe", "published"), ("ExtractRecipe", "recovered"), ("ExtractRecipe", "no-source"),
            ("GenerateDescription", "published"), ("GenerateDescription", "recovered"), ("SynthesizeRecipe", "published"),
            ("SynthesizeRecipe", "recovered"), ("SynthesizeRecipe", "fallback"), ("SynthesizeRecipe", "fallback-empty"), ("SynthesizeRecipe", "fallback-null") })
            await new TomorrowPushPostgresTests(output).WithDatabase(settings =>
                WorkflowWorkerAuthorityTests.CheckRecipeProcessorHistoryAsync(b => b.UseNpgsql(settings.ConnectionString), processor, mode));
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task WebOriginalResultAssociations()
    {
        foreach (var mode in new[] { "plain", "hero", "hero-failed", "forbidden", "fallback", "recovered" })
            await new TomorrowPushPostgresTests(output).WithDatabase(settings =>
                WorkflowWorkerAuthorityTests.CheckWebProcessorHistoryAsync(b => b.UseNpgsql(settings.ConnectionString), mode));
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task ReadinessOriginalResultAssociations()
    {
        foreach (var mode in new[] { "pdf", "non-pdf", "recovered", "already-ready", "missing" })
            await new TomorrowPushPostgresTests(output).WithDatabase(settings =>
                WorkflowWorkerAuthorityTests.CheckReadinessProcessorHistoryAsync(b => b.UseNpgsql(settings.ConnectionString), mode));
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task PdfOriginalResultAssociations()
    {
        foreach (var mode in new[] { "rendered", "reused", "recovered", "skipped" })
            await new TomorrowPushPostgresTests(output).WithDatabase(settings =>
                WorkflowWorkerAuthorityTests.CheckPdfProcessorHistoryAsync(b => b.UseNpgsql(settings.ConnectionString), mode));
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task OriginalPublicationAndCanonicalAssociations() => new TomorrowPushPostgresTests(output).WithDatabase(settings =>
        WorkflowWorkerAuthorityTests.CheckProcessorAssociationsAsync(b => b.UseNpgsql(settings.ConnectionString)));

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task NullResultIsExplicit() => new TomorrowPushPostgresTests(output).WithDatabase(settings =>
        WorkflowWorkerAuthorityTests.CheckNullProcessorResultAsync(b => b.UseNpgsql(settings.ConnectionString)));

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task UnacknowledgedAdmissionAndOutcome()
    {
        foreach (var outcome in new[] { false, true })
            foreach (var committed in new[] { false, true })
                await new TomorrowPushPostgresTests(output).WithDatabase(settings =>
                    WorkflowWorkerAuthorityTests.CheckUnacknowledgedHistoryAsync(b => b.UseNpgsql(settings.ConnectionString), outcome, committed));
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task OriginalAndOutcomeSurviveResetAndRemoval() => new TomorrowPushPostgresTests(output).WithDatabase(settings =>
        WorkflowWorkerAuthorityTests.CheckProcessorHistoryAsync(b => b.UseNpgsql(settings.ConnectionString)));

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task FailuresDoNotClaimEarlierResults()
    {
        foreach (var retry in new[] { true, false })
            await new TomorrowPushPostgresTests(output).WithDatabase(settings =>
                WorkflowWorkerAuthorityTests.CheckProcessorFailureHistoryAsync(b => b.UseNpgsql(settings.ConnectionString), retry));
    }
}
