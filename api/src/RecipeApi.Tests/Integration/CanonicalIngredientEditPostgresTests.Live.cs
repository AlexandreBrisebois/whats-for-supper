using RecipeApi.Infrastructure;
using System.Diagnostics;
using System.Text.Json;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Integration;

public sealed partial class CanonicalIngredientEditPostgresTests
{
    [DeploymentCalendarPostgresTests.CalendarLiveFact]
    public Task LiveBrowser_CanonicalIngredientCorrection() => RunCanonicalBrowser(mixed: false);

    [DeploymentCalendarPostgresTests.CalendarLiveFact]
    public Task LiveBrowser_CanonicalMixedIncompleteBaseline() => RunCanonicalBrowser(mixed: true);

    [DeploymentCalendarPostgresTests.CalendarLiveFact]
    public Task LiveBrowser_CookingStepScaling() => RunCanonicalBrowser(mixed: false, stepScaling: true);

    [DeploymentCalendarPostgresTests.CalendarLiveFact]
    public Task LiveBrowser_CookingStepSplitOil() => RunCanonicalBrowser(mixed: false, allocation: "split");

    [DeploymentCalendarPostgresTests.CalendarLiveFact]
    public Task LiveBrowser_CookingStepPartial() => RunCanonicalBrowser(mixed: false, allocation: "partial");

    [DeploymentCalendarPostgresTests.CalendarLiveFact]
    public Task LiveBrowser_CookingStepExhaustiveReduction() => RunCanonicalBrowser(mixed: false, allocation: "exhaustive");

    [DeploymentCalendarPostgresTests.CalendarLiveFact]
    public Task LiveBrowser_CookingReportRefresh() => RunCanonicalBrowser(mixed: false, stepScaling: true, reportRefresh: true);

    [DeploymentCalendarPostgresTests.CalendarLiveFact]
    public Task LiveBrowser_CookingStepInstructionGuard() => RunCanonicalBrowser(mixed: false, stepScaling: true, instructionGuard: true);

    [DeploymentCalendarPostgresTests.CalendarLiveFact]
    public Task LiveBrowser_CookingStepFraction() => RunCanonicalBrowser(mixed: false, allocation: "fraction");

    [DeploymentCalendarPostgresTests.CalendarLiveFact]
    public Task LiveBrowser_CookingStepRemainder() => RunCanonicalBrowser(mixed: false, allocation: "remainder");

    [DeploymentCalendarPostgresTests.CalendarLiveFact]
    public Task LiveBrowser_CookingStepPerItem() => RunCanonicalBrowser(mixed: false, allocation: "perItem");

    [DeploymentCalendarPostgresTests.CalendarLiveFact]
    public Task LiveBrowser_CookingStepFixed() => RunCanonicalBrowser(mixed: false, allocation: "fixed");

    internal async Task RunCanonicalBrowser(bool mixed, bool stepScaling = false, string? allocation = null, bool reportRefresh = false, bool instructionGuard = false, string? preparedContext = null, string? packageLocale = null, string? exactDisplayLocale = null)
    {
        if (exactDisplayLocale is not null && (mixed || stepScaling || allocation is not null || reportRefresh
            || instructionGuard || preparedContext is not null || packageLocale is not null || exactDisplayLocale is not ("en" or "fr")))
            throw new ArgumentException("Exact-display locale must be en/fr and cannot combine with another native selector.", nameof(exactDisplayLocale));
        // The task runner prepares an immutable production-built source copy.
        // Uses the same canonical editor registration as ordinary application composition.
        var browserRoot = Environment.GetEnvironmentVariable("WFS_CANONICAL_BROWSER_ROOT")
            ?? throw new InvalidOperationException("Requires an isolated production-built PWA copy.");
        var evidenceRoot = Environment.GetEnvironmentVariable("WFS_CANONICAL_EVIDENCE")
            ?? throw new InvalidOperationException("Requires a unique evidence directory.");
        var evidence = Path.Combine(evidenceRoot, exactDisplayLocale is not null ? Path.Combine("exact-display", exactDisplayLocale) : packageLocale is not null ? Path.Combine("packages", packageLocale) : preparedContext is not null ? "prepared-" + preparedContext : allocation ?? (instructionGuard ? "instruction-guard" : reportRefresh ? "report-refresh" : stepScaling ? "cooking-step" : mixed ? "mixed" : "correction"));
        Assert.True(File.Exists(Path.Combine(browserRoot, "pwa", ".next", "BUILD_ID")));
        Directory.CreateDirectory(evidence);
        var pwaPort = DeploymentCalendarPostgresTests.FreePort();
        var pwaUrl = $"http://127.0.0.1:{pwaPort}";
        var monday = new DateOnly(2026, 10, 12);
        await WithEditor(async (factory, before) =>
        {
            Guid secondMember;
            if (stepScaling) before = await SeedCookingWholeUse(factory, before, preparedContext is not null);
            if (allocation == "fixed") before = await SeedCookingFixed(factory, before);
            else if (allocation == "perItem") before = await SeedCookingPerItem(factory, before);
            else if (allocation == "remainder") before = await SeedCookingRemainder(factory, before);
            else if (allocation == "fraction") before = await SeedCookingFraction(factory, before);
            else if (allocation is not null) before = await SeedCookingAllocation(factory, before, allocation != "partial", exhaustive: allocation == "exhaustive");
            var savedBaseline = before;
            string? sourceMetadataBaseline = null;
            string? sourceUrlBaseline = null;
            if (packageLocale is not null || exactDisplayLocale is not null)
            {
                using var sourceScope = factory.Services.CreateScope();
                var sourceRecipe = await sourceScope.ServiceProvider.GetRequiredService<RecipeDbContext>().Recipes.AsNoTracking()
                    .SingleAsync(recipe => recipe.Id == Id);
                sourceMetadataBaseline = sourceRecipe.RawMetadata;
                sourceUrlBaseline = sourceRecipe.SourceUrl;
            }
            if (mixed)
            {
                using var seedClient = factory.CreateAuthenticatedClient();
                var created = await seedClient.PatchAsJsonAsync($"/api/recipes/{Id}", new
                {
                    expectedContentRevision = before.ContentRevision,
                    ingredientLines = new[] { Row(before.IngredientLines[0]), Row(before.IngredientLines[1]),
                        Row(before.IngredientLines[0]) with { Id = null, ClientId = "mixed-unknown", Description = "Additional pasta", Amount = null, AmountText = null } }
                });
                Assert.Equal(System.Net.HttpStatusCode.OK, created.StatusCode);
                using var body = JsonDocument.Parse(await created.Content.ReadAsStringAsync());
                using var scope = factory.Services.CreateScope();
                savedBaseline = CanonicalRecipeContentStore.Read(await scope.ServiceProvider.GetRequiredService<RecipeDbContext>().Recipes.AsNoTracking().SingleAsync(x => x.Id == Id))!;
                Assert.Equal(body.RootElement.GetProperty("createdIds").GetProperty("mixed-unknown").GetGuid(), savedBaseline.IngredientLines[2].Id);
            }
            using (var scope = factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
                var member = new FamilyMember { Id = Guid.NewGuid(), Name = "Second shopper" };
                secondMember = member.Id;
                db.FamilyMembers.Add(member);
                db.FamilySettings.Add(new FamilySetting
                {
                    Key = SupperServingsService.DefaultKey,
                    Value = JsonSerializer.SerializeToElement(new { servings = allocation is "partial" or "fraction" ? 6 : 8, version = Guid.NewGuid() })
                });
                await db.SaveChangesAsync();
                await scope.ServiceProvider.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(monday, default);
            }
            JsonElement? preparedReceipt = null;
            string? preparedOccurrences = null;
            string? preparedHistory = null;
            if (preparedContext is not null)
            {
                preparedReceipt = await PreparedSupperPostgresTests.SeedCanonicalPreparation(factory, preparedContext == "six");
                using var baselineScope = factory.Services.CreateScope();
                var baselineDb = baselineScope.ServiceProvider.GetRequiredService<RecipeDbContext>();
                preparedOccurrences = JsonSerializer.Serialize(await baselineDb.CalendarEvents.AsNoTracking().OrderBy(x => x.Id).ToListAsync());
                preparedHistory = JsonSerializer.Serialize(await baselineDb.Recipes.AsNoTracking().OrderBy(x => x.Id).Select(x => new { x.Id, x.LastCookedDate }).ToListAsync());
            }
            ProcessStartInfo Command(params string[] args)
            {
                var start = new ProcessStartInfo("node")
                {
                    WorkingDirectory = Path.Combine(browserRoot, "pwa"),
                    RedirectStandardOutput = true,
                    RedirectStandardError = true
                };
                foreach (var arg in args) start.ArgumentList.Add(arg);
                foreach (var key in new[] { "CI", "WFS_E2E_SUITE", "PORT" }) start.Environment.Remove(key);
                start.Environment["BASE_URL"] = factory.HttpAddress;
                start.Environment["API_INTERNAL_URL"] = factory.HttpAddress;
                start.Environment["NEXT_PUBLIC_API_BASE_URL"] = "";
                start.Environment["NEXT_PUBLIC_ENVIRONMENT"] = "test";
                start.Environment["NEXT_TELEMETRY_DISABLED"] = "1";
                start.Environment["HEARTH_SECRET"] = TestWebApplicationFactory.TestSecret;
                start.Environment["CANONICAL_RECIPE_ID"] = Id.ToString();
                if (packageLocale is not null) start.Environment["CANONICAL_PACKAGE_LOCALE"] = packageLocale;
                if (exactDisplayLocale is not null) start.Environment["CANONICAL_EXACT_DISPLAY_LOCALE"] = exactDisplayLocale;
                if (preparedContext is not null) start.Environment["COOKING_PREPARED_CONTEXT"] = preparedContext;
                if (allocation is not null) start.Environment["COOKING_ALLOCATION"] = allocation;
                start.Environment["CANONICAL_MEMBERS"] = $"{factory.DefaultFamilyMemberId},{secondMember}";
                start.Environment["PLAYWRIGHT_JSON_OUTPUT_NAME"] = Path.Combine(evidence, "browser-results.json");
                return start;
            }
            using var server = Process.Start(Command("node_modules/next/dist/bin/next", "start", "-H", "127.0.0.1", "-p", pwaPort.ToString()))!;
            var stdout = Pump(server.StandardOutput, Path.Combine(evidence, "server.log"));
            var stderr = Pump(server.StandardError, Path.Combine(evidence, "server-error.log"));
            await File.WriteAllTextAsync(Path.Combine(evidence, "live-resource.json"), JsonSerializer.Serialize(new
            { api = factory.HttpAddress, pwa = pwaUrl, pid = server.Id, browserRoot, stopped = false }));
            try
            {
                using var probe = new HttpClient();
                var ready = false;
                for (var attempt = 0; attempt < 100; attempt++)
                {
                    try { ready = (await probe.GetAsync(pwaUrl + "/welcome")).IsSuccessStatusCode; }
                    catch (HttpRequestException) { }
                    if (ready || server.HasExited) break;
                    await Task.Delay(300);
                }
                Assert.True(ready, "Owned production PWA did not become ready.");
                using var browser = Process.Start(Command("node_modules/@playwright/test/cli.js", "test", exactDisplayLocale is not null ? "canonical-exact-display-live.spec.ts" : packageLocale is not null ? "canonical-package-live.spec.ts" : preparedContext is not null ? "prepared-supper-live.spec.ts" : allocation is not null ? "cooking-step-scaling-live.spec.ts" : stepScaling ? "cooking-step-scaling-live.spec.ts" : "canonical-ingredient-live.spec.ts", "--grep", exactDisplayLocale is not null ? $"exact display {exactDisplayLocale} " : packageLocale is not null ? $"declared package {packageLocale} " : preparedContext is not null ? "canonical prepared correction" : instructionGuard ? "undated instruction guard" : reportRefresh ? "report refresh" : allocation == "fixed" ? "standalone fixed use" : allocation == "perItem" ? "per-item dose" : allocation == "remainder" ? "remaining follows" : allocation == "fraction" ? "relative fraction" : allocation is not null ? "absolute allocation" : stepScaling ? "corrected whole use" : mixed ? "mixed incomplete baseline" : "original correction",
                    "--workers=1", "--retries=0", "--reporter=line,json", "--output", Path.Combine(evidence, "browser-artifacts")))!;
                var browserOut = Pump(browser.StandardOutput, Path.Combine(evidence, "browser.log"));
                var browserError = Pump(browser.StandardError, Path.Combine(evidence, "browser-error.log"));
                try
                {
                    await browser.WaitForExitAsync().WaitAsync(TimeSpan.FromMinutes(4));
                    await Task.WhenAll(browserOut, browserError);
                    Assert.Equal(0, browser.ExitCode);
                }
                finally { await StopOwned(browser); }
                using var final = factory.Services.CreateScope();
                var finalDb = final.ServiceProvider.GetRequiredService<RecipeDbContext>();
                var saved = await finalDb.Recipes.AsNoTracking().SingleAsync(x => x.Id == Id);
                var content = CanonicalRecipeContentStore.Read(saved)!;
                Assert.Equal(before.SourceRevision, content.SourceRevision);
                if (exactDisplayLocale is not null)
                {
                    Assert.Equal(sourceMetadataBaseline, saved.RawMetadata);
                    Assert.Equal(sourceUrlBaseline, saved.SourceUrl);
                    using var projectionClient = factory.CreateAuthenticatedClient();
                    await AssertCanonicalExactDisplayBrowserResult(finalDb, savedBaseline, saved, content, monday, evidence, projectionClient);
                    return;
                }
                if (packageLocale is not null)
                {
                    Assert.Equal(sourceMetadataBaseline, saved.RawMetadata);
                    Assert.Equal(sourceUrlBaseline, saved.SourceUrl);
                    await AssertCanonicalPackageBrowserResult(finalDb, savedBaseline, content, monday, evidence);
                    return;
                }
                Assert.Equal(savedBaseline.IngredientLines.Select(x => x.Id), content.IngredientLines.Select(x => x.Id));
                if (preparedContext is not null)
                {
                    Assert.Equal("250", content.IngredientLines[0].AmountText);
                    Assert.Equal(5, saved.Servings);
                    Assert.Equal(preparedOccurrences, JsonSerializer.Serialize(await finalDb.CalendarEvents.AsNoTracking().OrderBy(x => x.Id).ToListAsync()));
                    Assert.Equal(preparedHistory, JsonSerializer.Serialize(await finalDb.Recipes.AsNoTracking().OrderBy(x => x.Id).Select(x => new { x.Id, x.LastCookedDate }).ToListAsync()));
                    Assert.Equal(savedBaseline.InstructionSections[0].Steps[0].Id, content.InstructionSections[0].Steps[0].Id);
                    using var projectionClient = factory.CreateAuthenticatedClient();
                    var occurrenceId = preparedReceipt!.Value.GetProperty("occurrenceId").GetGuid();
                    var projection = await projectionClient.GetFromJsonAsync<JsonElement>($"/api/recipes/{Id}/ingredient-projection?supperDate=2026-10-16&context=assigned&occurrenceId={occurrenceId}");
                    Assert.Equal(preparedReceipt.Value.GetProperty("preparation").GetRawText(), projection.GetProperty("preparation").GetRawText());
                    var preparedPlan = await finalDb.WeeklyPlans.AsNoTracking().SingleAsync(x => x.WeekStartDate == monday);
                    var preparedRows = JsonSerializer.Deserialize<List<GroceryLineItemDto>>(preparedPlan.GroceryItems)!;
                    Assert.Equal(LegacyGroceryQuantity.Parse(preparedContext == "six" ? "300" : "250"), Assert.Single(preparedRows, x => x.NormalizedKey == "pasta").ExactQuantity);
                    await File.WriteAllTextAsync(Path.Combine(evidence, "persisted-result.json"), JsonSerializer.Serialize(new { content, projection, preparedReceipt, rows = preparedRows, preparedOccurrences, preparedHistory }, Json));
                    return;
                }
                if (allocation == "fixed")
                {
                    Assert.Equal("3", content.IngredientLines[0].AmountText);
                    Assert.Equal("tsp", content.IngredientLines[0].Unit!.Text);
                    Assert.Equal(before.InstructionSections[0].Steps.Select(x => (x.Id, x.Text)), content.InstructionSections[0].Steps.Select(x => (x.Id, x.Text)));
                    var projected = CookingStepProjection.Read(content, 8);
                    Assert.Equal(0, projected.ValidatedUses); Assert.Equal(2, projected.UncertainUses);
                    var fixedPlan = await finalDb.WeeklyPlans.AsNoTracking().SingleAsync(x => x.WeekStartDate == monday);
                    var fixedRows = JsonSerializer.Deserialize<List<GroceryLineItemDto>>(fixedPlan.GroceryItems)!;
                    Assert.Equal(LegacyGroceryQuantity.Parse("6"), Assert.Single(fixedRows, x => x.NormalizedKey == "oil").ExactQuantity);
                    await File.WriteAllTextAsync(Path.Combine(evidence, "persisted-result.json"), JsonSerializer.Serialize(new { content, projected, rows = fixedRows }, Json));
                    return;
                }
                if (allocation == "perItem")
                {
                    Assert.Equal("6", content.IngredientLines[0].AmountText);
                    Assert.Equal("3", content.IngredientLines[1].AmountText);
                    Assert.Equal("g", content.IngredientLines[0].Unit!.Text);
                    Assert.Equal(before.InstructionSections[0].Steps[0].Text, content.InstructionSections[0].Steps[0].Text);
                    var projected = CookingStepProjection.Read(content, 8);
                    Assert.Equal(0, projected.ValidatedUses); Assert.Equal(2, projected.UncertainUses);
                    var perItemPlan = await finalDb.WeeklyPlans.AsNoTracking().SingleAsync(x => x.WeekStartDate == monday);
                    var perItemRows = JsonSerializer.Deserialize<List<GroceryLineItemDto>>(perItemPlan.GroceryItems)!;
                    Assert.Equal(LegacyGroceryQuantity.Parse("12"), Assert.Single(perItemRows, x => x.NormalizedKey == "pieces").ExactQuantity);
                    Assert.Equal(LegacyGroceryQuantity.Parse("6"), Assert.Single(perItemRows, x => x.NormalizedKey == "oil").ExactQuantity);
                    await File.WriteAllTextAsync(Path.Combine(evidence, "persisted-result.json"), JsonSerializer.Serialize(new { content, projected, rows = perItemRows }, Json));
                    return;
                }
                if (allocation == "remainder")
                {
                    Assert.Equal("1/2", content.IngredientLines[0].AmountText);
                    Assert.Equal(before.InstructionSections[0].Steps.Select(x => (x.Id, x.Text)), content.InstructionSections[0].Steps.Select(x => (x.Id, x.Text)));
                    var projected = CookingStepProjection.Read(content, 8);
                    Assert.Equal(0, projected.ValidatedUses); Assert.Equal(2, projected.UncertainUses);
                    var remainderPlan = await finalDb.WeeklyPlans.AsNoTracking().SingleAsync(x => x.WeekStartDate == monday);
                    var remainderRows = JsonSerializer.Deserialize<List<GroceryLineItemDto>>(remainderPlan.GroceryItems)!;
                    Assert.Equal(LegacyGroceryQuantity.Parse("1"), Assert.Single(remainderRows, x => x.NormalizedKey == "oil").ExactQuantity);
                    await File.WriteAllTextAsync(Path.Combine(evidence, "persisted-result.json"), JsonSerializer.Serialize(new { content, projected, rows = remainderRows }, Json));
                    return;
                }
                if (allocation == "fraction")
                {
                    Assert.Equal("250", content.IngredientLines[0].AmountText);
                    Assert.Equal(before.InstructionSections[0].Steps.Select(x => (x.Id, x.Text)), content.InstructionSections[0].Steps.Select(x => (x.Id, x.Text)));
                    var half = content.InstructionSections[0].Steps[1].Bindings[0];
                    Assert.Equal(before.InstructionSections[0].Steps[1].Bindings[0].GetProperty("id").GetGuid(), half.GetProperty("id").GetGuid());
                    Assert.Equal("2", half.GetProperty("payload").GetProperty("fraction").GetProperty("d").GetString());
                    Assert.Equal(content.ContentRevision, half.GetProperty("validatedContentRevision").GetString());
                    var projected = CookingStepProjection.Read(content, 6);
                    Assert.Equal(2, projected.ValidatedUses); Assert.Equal(3, projected.UncertainUses);
                    Assert.Equal("Add half the pasta; cook 20 minutes at 180 °C.", projected.Sections[0].Steps[1].Text);
                    var fractionPlan = await finalDb.WeeklyPlans.AsNoTracking().SingleAsync(x => x.WeekStartDate == monday);
                    var fractionRows = JsonSerializer.Deserialize<List<GroceryLineItemDto>>(fractionPlan.GroceryItems)!;
                    Assert.Equal(LegacyGroceryQuantity.Parse("375"), Assert.Single(fractionRows, x => x.NormalizedKey == "pasta").ExactQuantity);
                    await File.WriteAllTextAsync(Path.Combine(evidence, "persisted-result.json"), JsonSerializer.Serialize(new { content, projected, rows = fractionRows }, Json));
                    return;
                }
                if (allocation is not null)
                {
                    var split = allocation != "partial";
                    var uncertain = allocation == "exhaustive";
                    Assert.Equal(uncertain ? "1" : split ? "2" : "250", content.IngredientLines[0].AmountText);
                    Assert.Equal(before.InstructionSections[0].Steps.Select(x => x.Text), content.InstructionSections[0].Steps.Select(x => x.Text));
                    var projected = CookingStepProjection.Read(content, split ? 8 : 6);
                    Assert.Equal(uncertain ? 0 : split ? 2 : 1, projected.ValidatedUses);
                    Assert.Equal(uncertain ? 2 : 0, projected.UncertainUses);
                    Assert.Equal(uncertain ? "Heat 1 tbsp oil." : split ? "Heat 2 tbsp oil." : "Add 75 g pasta from a 400 g package; cook 20 minutes at 180 °C.", projected.Sections[0].Steps[0].Text);
                    if (split) Assert.Equal(uncertain ? "Finish with 1 tbsp oil." : "Finish with 2 tbsp oil.", projected.Sections[0].Steps[1].Text);
                    else Assert.Equal("50", content.InstructionSections[0].Steps[0].Bindings[0].GetProperty("payload").GetProperty("amount").GetProperty("value").GetProperty("n").GetString());
                    var allocationPlan = await finalDb.WeeklyPlans.AsNoTracking().SingleAsync(x => x.WeekStartDate == monday);
                    var allocationRows = JsonSerializer.Deserialize<List<GroceryLineItemDto>>(allocationPlan.GroceryItems)!;
                    Assert.Equal(LegacyGroceryQuantity.Parse(uncertain ? "2" : split ? "4" : "375"), Assert.Single(allocationRows, x => x.NormalizedKey == (split ? "oil" : "pasta")).ExactQuantity);
                    await File.WriteAllTextAsync(Path.Combine(evidence, "persisted-result.json"), JsonSerializer.Serialize(new { content, rows = allocationRows, projected }, Json));
                    return;
                }
                if (instructionGuard)
                {
                    Assert.Equal("250", content.IngredientLines[0].AmountText);
                    Assert.Equal(before.InstructionSections[0].Id, content.InstructionSections[0].Id);
                    Assert.Equal(before.InstructionSections[0].Steps[0].Id, content.InstructionSections[0].Steps[0].Id);
                    Assert.Equal(before.InstructionSections[0].Steps[0].Text + " Stir gently. Original reply recovery. Dated reply recovery.", content.InstructionSections[0].Steps[0].Text);
                    Assert.NotEqual(before.ContentRevision, content.ContentRevision);
                    var projected = CookingStepProjection.Read(content, 8);
                    Assert.Equal(0, projected.ValidatedUses);
                    Assert.Contains("Add 200 g pasta", projected.Sections[0].Steps[0].Text);
                    await File.WriteAllTextAsync(Path.Combine(evidence, "persisted-result.json"), JsonSerializer.Serialize(new { content, projected }, Json));
                    return;
                }
                if (stepScaling)
                {
                    Assert.Equal(reportRefresh ? "300" : "250", content.IngredientLines[0].AmountText);
                    Assert.Equal("Add 200 g pasta from a 400 g package; cook 20 minutes at 180 °C.", content.InstructionSections[0].Steps[0].Text);
                    var projected = CookingStepProjection.Read(content, 8);
                    Assert.Contains(reportRefresh ? "Add 600 g pasta" : "Add 500 g pasta", projected.Sections[0].Steps[0].Text);
                    var plan2 = await finalDb.WeeklyPlans.AsNoTracking().SingleAsync(x => x.WeekStartDate == monday);
                    var rows2 = JsonSerializer.Deserialize<List<GroceryLineItemDto>>(plan2.GroceryItems)!;
                    var pasta2 = Assert.Single(rows2, x => x.NormalizedKey == "pasta");
                    Assert.Equal(LegacyGroceryQuantity.Parse(reportRefresh ? "600" : "500"), pasta2.ExactQuantity);
                    await File.WriteAllTextAsync(Path.Combine(evidence, "persisted-result.json"), JsonSerializer.Serialize(new { content, rows = rows2, projected }, Json));
                    return;
                }
                if (mixed)
                {
                    Assert.Equal("200", content.IngredientLines[0].AmountText);
                    Assert.Equal("150", content.IngredientLines[1].AmountText);
                    Assert.Equal("100", content.IngredientLines[2].AmountText);
                    Assert.Equal("g", content.IngredientLines[2].Unit!.Text);
                }
                else
                {
                    Assert.Equal("Retained family pasta", saved.Name);
                    Assert.Equal(RecipeRating.Love, saved.Rating);
                    Assert.Equal("2", content.IngredientLines[0].AmountText);
                    Assert.Equal("cup", content.IngredientLines[0].Unit!.Text);
                    Assert.Equal(JsonSerializer.Serialize(before.IngredientLines[1]), JsonSerializer.Serialize(content.IngredientLines[1]));
                }
                var plan = await finalDb.WeeklyPlans.AsNoTracking().SingleAsync(x => x.WeekStartDate == monday);
                var rows = JsonSerializer.Deserialize<List<GroceryLineItemDto>>(plan.GroceryItems)!;
                var checks = JsonSerializer.Deserialize<Dictionary<string, bool>>(plan.GroceryState)!;
                Assert.True(checks[rows.Single(x => x.NormalizedKey == "pasta").RowId]);
                Assert.Equal(!mixed, checks[rows.Single(x => x.NormalizedKey == "sauce").RowId]);
                using var baselines = JsonDocument.Parse(plan.GroceryCheckedDemandBaselines);
                var baseline = baselines.RootElement.GetProperty(rows.Single(x => x.NormalizedKey == "pasta").RowId);
                Assert.Equal("g", baseline.GetProperty("Unit").GetString());
                Assert.Equal(LegacyGroceryQuantity.Parse(mixed ? "400" : "500"), baseline.GetProperty("Quantity").Deserialize<GroceryQuantity>());
                if (mixed) Assert.False(baseline.GetProperty("QuantityComplete").GetBoolean());
                await File.WriteAllTextAsync(Path.Combine(evidence, "persisted-result.json"), JsonSerializer.Serialize(new
                { content, rows, checks, baseline, operations = await finalDb.CanonicalRecipeOperations.CountAsync() }, Json));
            }
            finally
            {
                await StopOwned(server);
                await Task.WhenAll(stdout, stderr);
                await File.WriteAllTextAsync(Path.Combine(evidence, "live-resource.json"), JsonSerializer.Serialize(new
                { api = factory.HttpAddress, pwa = pwaUrl, pid = server.Id, browserRoot, stopped = server.HasExited }));
            }
        }, application =>
        {
            // Test-only work dispatch. Executes the existing recompute owner; it
            // does not bypass revision checks or activate normal composition.
            application.MapPost("/_test/canonical/recompute", async (GroceryRecomputeService service) =>
            {
                await service.RecomputeForWeekAsync(monday, default);
                return Results.Ok();
            }).ExcludeFromDescription().RequireAuthorization();
            application.MapPost("/_test/canonical/failed-import", async (RecipeDbContext db, RecipeRepository repository, RecipeImportReportService reports, IStorageProvider storage) =>
            {
                var id = Guid.NewGuid();
                var workflow = new WorkflowInstance
                {
                    Id = Guid.NewGuid(),
                    WorkflowId = "url-import",
                    Status = WorkflowStatus.Paused,
                    Parameters = JsonSerializer.Serialize(new { recipeId = id }),
                    CreatedAt = DateTimeOffset.UtcNow
                };
                var recipe = new Recipe
                {
                    Id = id,
                    Name = "Flagged incomplete recipe",
                    SourceUrl = "https://example.test/incomplete",
                    IsReady = false,
                    Ingredients = "[\"Salt\"]",
                    RawMetadata = "{\"recipeInstructions\":[]}",
                    MealTypes = ["Supper"]
                };
                db.Recipes.Add(recipe); db.WorkflowInstances.Add(workflow);
                db.WorkflowTasks.Add(new WorkflowTask { TaskId = Guid.NewGuid(), InstanceId = workflow.Id, TaskName = "ExtractRecipe", ProcessorName = "ExtractRecipe", Status = RecipeApi.Models.TaskStatus.Failed });
                await db.SaveChangesAsync();
                await repository.SaveInfoAsync(new RecipeInfo { Id = id, Name = recipe.Name, SourceUrl = recipe.SourceUrl }, default);
                await storage.SaveAsync("workflows", "url-import.yaml", """
                    name: content-review
                    parameters: [recipeId, url, repairReasons, repairNote]
                    tasks:
                      - name: extract
                        processor: ExtractRecipe
                        payload: {recipeId: "{{ recipeId }}"}
                    """);
                await reports.MarkFailedAsync(id, workflow.Id, "ExtractRecipe", "Incomplete original steps", ["steps"]);
                return Results.Ok(new { recipeId = id });
            }).ExcludeFromDescription().RequireAuthorization();
            application.MapFallback("{**path}", async context =>
            {
                using var gateway = new HttpClient();
                using var request = new HttpRequestMessage(new HttpMethod(context.Request.Method), pwaUrl + context.Request.Path + context.Request.QueryString);
                if (context.Request.ContentLength > 0) request.Content = new StreamContent(context.Request.Body);
                foreach (var header in context.Request.Headers)
                    if (!string.Equals(header.Key, "Host", StringComparison.OrdinalIgnoreCase)) request.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray());
                try
                {
                    using var response = await gateway.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, context.RequestAborted);
                    context.Response.StatusCode = (int)response.StatusCode;
                    foreach (var header in response.Headers.Concat(response.Content.Headers)) context.Response.Headers[header.Key] = header.Value.ToArray();
                    context.Response.Headers.Remove("transfer-encoding");
                    await response.Content.CopyToAsync(context.Response.Body, context.RequestAborted);
                }
                catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested) { }
            });
        }, sourceUrl: reportRefresh || instructionGuard || preparedContext is not null ? "https://example.test/owned-report-fixture" : null,
            realWorkflow: !mixed && !stepScaling && allocation is null && preparedContext is null);
    }

    private static async Task Pump(StreamReader reader, string path)
    {
        await using var log = new StreamWriter(path) { AutoFlush = true };
        while (await reader.ReadLineAsync() is { } line) await log.WriteLineAsync(line);
    }
    private static async Task StopOwned(Process process)
    {
        if (!process.HasExited)
        {
            using var terminate = Process.Start(new ProcessStartInfo("kill") { ArgumentList = { "-TERM", process.Id.ToString() } });
            if (terminate is not null) await terminate.WaitForExitAsync();
            try { await process.WaitForExitAsync().WaitAsync(TimeSpan.FromSeconds(15)); }
            catch (TimeoutException) { process.Kill(true); await process.WaitForExitAsync(); }
        }
    }
}
