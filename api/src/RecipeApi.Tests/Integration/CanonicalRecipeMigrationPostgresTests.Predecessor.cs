using System.Reflection;
using System.Runtime.ExceptionServices;
using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Integration;

public sealed partial class CanonicalRecipeMigrationPostgresTests
{
    [RecipeImportReportPostgresTests.PostgresTheory]
    [InlineData("valid")]
    [InlineData("plan-column")]
    [InlineData("missing-operation")]
    public Task SuccessorAdmission_PreservesIndependentlyBoundTracerAndOriginalBaseline(string mutation) => WithExecution(async (services, original, commit, hash) =>
    {
        var legacy = original.Recipes.Single(x => x.Status == "requires-forward-assessment");
        var tracer = Rehash(original with { Request = original.Request with { Selected = [new(legacy.RecipeId, legacy.OperationId)] }, Recipes = [legacy] });
        await ExecuteRecipeStage(services, tracer, commit, hash);
        var db = services.GetRequiredService<RecipeDbContext>(); db.ChangeTracker.Clear();
        var oldPlan = await db.MaintenanceCommands.AsNoTracking().SingleAsync(x => x.Id == tracer.Request.OperationId);
        var oldConversion = await db.CanonicalRecipeOperations.AsNoTracking().SingleAsync(x => x.RecipeId == legacy.RecipeId && x.OperationId == legacy.OperationId);
        var remaining = original.Recipes.Where(x => x.RecipeId != legacy.RecipeId).Select(x => x with { OperationId = Guid.NewGuid() }).ToArray();
        var next = Rehash(original with { Request = original.Request with { OperationId = Guid.NewGuid(), Selected = remaining.Select(x => new CanonicalMigrationSelection(x.RecipeId, x.OperationId)).ToArray() }, Recipes = remaining });
        var assembly = typeof(CanonicalRecipeContentStore).Assembly;
        var predecessorType = assembly.GetType("RecipeApi.Services.V1MigrationPredecessor")!;
        var predecessor = Activator.CreateInstance(predecessorType, legacy, oldPlan, oldConversion)!;
        var plan = (MaintenanceCommand)assembly.GetType("RecipeApi.Services.CanonicalRecipeMigrationReceipt")!
            .GetMethod("Plan", BindingFlags.Static | BindingFlags.NonPublic)!.Invoke(null, [next, commit, services.GetRequiredService<IClock>().UtcNow])!;
        if (mutation == "plan-column")
        {
            var foreign = Guid.NewGuid();
            await db.Database.ExecuteSqlInterpolatedAsync($"UPDATE maintenance_commands SET child_launch_intent_id={foreign} WHERE id={oldPlan.Id}");
        }
        if (mutation == "missing-operation")
            await db.Database.ExecuteSqlInterpolatedAsync($"DELETE FROM canonical_recipe_operations WHERE recipe_id={legacy.RecipeId} AND operation_id={legacy.OperationId}");
        var roots = services.GetRequiredService<RecipesRootResolver>();
        var marker = Path.Combine(roots.BaseRoot, ".maintenance-hold.json");
        await File.WriteAllTextAsync(marker, JsonSerializer.Serialize(new { version = 1, operationId = next.Request.OperationId, candidate = commit,
            createdAt = DateTimeOffset.UtcNow, apiImage = "sha256:" + next.Request.CandidateSha256, databaseContainer = new string('d', 64) }));
        var markerBytes = await File.ReadAllBytesAsync(marker);
        var markerHash = Convert.ToHexStringLower(SHA256.HashData(markerBytes));
        // The only changed file is independently declared operator hold bytes;
        // the original source inventory and every recipe artifact remain exact.
        next = Rehash(next with { Files = next.Files.Select(x => x.Path == ".maintenance-hold.json"
            ? new CanonicalMigrationFile(x.Path, markerBytes.Length, markerHash) : x).ToArray() });
        plan = (MaintenanceCommand)assembly.GetType("RecipeApi.Services.CanonicalRecipeMigrationReceipt")!
            .GetMethod("Plan", BindingFlags.Static | BindingFlags.NonPublic)!.Invoke(null, [next, commit, services.GetRequiredService<IClock>().UtcNow])!;
        var before = await DatabaseDigest(services);
        async Task Validate() => await services.GetRequiredService<RecoveryBoundary>().RunMaintenanceAsync(next.Request.OperationId, commit, markerHash, async ct =>
        {
            var boundary = services.GetRequiredService<RecoveryBoundary>();
            await using var lease = await boundary.EnterAsync(RecoveryAccess.Write, ct);
            using var binding = (IDisposable)typeof(RecoveryBoundary).GetMethod("BindLease", BindingFlags.Instance | BindingFlags.NonPublic)!.Invoke(boundary, [lease])!;
            await using var transaction = await db.Database.BeginTransactionAsync(ct);
            try
            {
                await (Task)typeof(CanonicalRecipeContentStore).GetMethod("RequireMigrationAdmissionAsync", BindingFlags.Instance | BindingFlags.NonPublic)!
                    .Invoke(services.GetRequiredService<CanonicalRecipeContentStore>(), [db, next, plan, services.GetRequiredService<RecoverySnapshotService>(), roots, ct, null, predecessor])!;
            }
            catch (TargetInvocationException error) { ExceptionDispatchInfo.Capture(error.InnerException!).Throw(); }
            await transaction.RollbackAsync(ct);
            return true;
        });
        if (mutation == "valid") await Validate();
        else
        {
            var error = await Assert.ThrowsAsync<InvalidDataException>(Validate);
            Assert.Contains(mutation == "plan-column" ? "predecessor physical plan row differs" : "missing predecessor conversion", error.Message);
        }
        Assert.Equal(before, await DatabaseDigest(services));
    });
}
