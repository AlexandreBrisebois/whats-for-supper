using Microsoft.EntityFrameworkCore;
using Npgsql;
using System.Numerics;
using System.Globalization;

namespace RecipeApi.Services;

public sealed record FoodVocabularyPresentationCapture(FoodVocabularyAuthority Authority, string Version, Guid Epoch, IReadOnlyList<HouseholdFoodOverrideSnapshot> Overrides);

public sealed partial class FoodVocabularyStore
{
    public async Task<FoodVocabularyPresentationCapture> CapturePresentationAsync(IEnumerable<string?> evidence, CancellationToken ct = default)
    {
        // Keep current-head/absence/prepared-publication policy with the existing
        // owner. The outer shared lease fixes membership across the entire capture.
        await using var lease = await boundary.EnterAsync(RecoveryAccess.Read, ct);
        await using var presentationLock = await EnterPresentationLockAsync(write: false, ct);
        await using var readConnection = await DatabaseReadConnection.RetainAsync(db, ct);
        _ = recipes.Root; // Validate the actual selected generation while publication is excluded.
        var generation = recipes.Generation;
        var active = await CaptureActiveAsync(ct);
        var membership = await db.FamilySettings.AsNoTracking().SingleOrDefaultAsync(x => x.Key == Key, ct);
        var state = membership is null ? null : ReadMembership(membership.Value.GetRawText());
        var captures = new Dictionary<FoodVocabularyReference, FoodVocabularyCapture>();
        if (active is not null) captures.Add(active.Reference, active);
        foreach (var raw in evidence.Where(value => value is not null).Distinct(StringComparer.Ordinal))
            foreach (var reference in FoodMappingQualification.References(raw!))
                if (!captures.ContainsKey(reference)) captures.Add(reference, await LoadCapturedAsync(reference, ct));
        var overrides = (await db.HouseholdFoodOverrides.AsNoTracking().OrderBy(x => x.Id).ToArrayAsync(ct))
            .Select(HouseholdFoodOverrideSnapshot.From).ToArray();
        FoodVocabularyDefinitions.Require(state is not null || overrides.All(row => row.Document is null));
        foreach (var reference in overrides.Where(row => row.Document is not null).Select(row => row.Document!).Distinct())
            if (!captures.ContainsKey(reference)) captures.Add(reference, await LoadCapturedAsync(reference, ct));
        var authority = new FoodVocabularyAuthority(active?.Reference, captures.Values.ToArray());
        authority.Validate();
        HouseholdFoodOverrideValidation.Validate(overrides, authority);
        var sequence = overrides.Select(row => BigInteger.Parse(row.PresentationSequence, CultureInfo.InvariantCulture)).DefaultIfEmpty(BigInteger.Zero).Max();
        var version = (BigInteger.Parse(state?.PresentationVersion ?? "0", CultureInfo.InvariantCulture) + sequence).ToString(CultureInfo.InvariantCulture);
        var epoch = generation is not null ? Guid.ParseExact(generation, "N")
            : state is null ? Guid.Empty : Guid.Parse(state.PresentationEpoch);
        epoch = await CanonicalRecipeMigrationReceipt.BindPresentationEpochAsync(db, epoch, ct);
        return new(authority, version, epoch, Array.AsReadOnly(overrides));
    }

    // Acquire after the recovery publication lease, before recipe/week locks.
    // A separate connection keeps the snapshot lock across ordinary read queries.
    internal async Task<IAsyncDisposable> EnterPresentationLockAsync(bool write, CancellationToken ct)
    {
        if (!db.Database.IsNpgsql())
        {
            await PresentationGate.WaitAsync(ct);
            return new MemoryPresentationLease();
        }
        var connection = new NpgsqlConnection(db.Database.GetConnectionString());
        using var deadline = CancellationTokenSource.CreateLinkedTokenSource(ct);
        deadline.CancelAfter(TimeSpan.FromSeconds(5));
        try
        {
            await connection.OpenAsync(deadline.Token);
            await using var command = new NpgsqlCommand(write ? "SELECT pg_advisory_lock(244003)" : "SELECT pg_advisory_lock_shared(244003)", connection);
            await command.ExecuteNonQueryAsync(deadline.Token);
            return new PresentationLease(connection);
        }
        catch (OperationCanceledException) when (!ct.IsCancellationRequested)
        {
            await connection.DisposeAsync();
            throw new RecoveryBusyException("Household presentation is coordinating a correction; retry after five seconds.");
        }
        catch { await connection.DisposeAsync(); throw; }
    }
    private static readonly SemaphoreSlim PresentationGate = new(1, 1);
    private sealed class MemoryPresentationLease : IAsyncDisposable
    {
        public ValueTask DisposeAsync() { PresentationGate.Release(); return ValueTask.CompletedTask; }
    }
    private sealed class PresentationLease(NpgsqlConnection connection) : IAsyncDisposable
    {
        public async ValueTask DisposeAsync()
        {
            try { await new NpgsqlCommand("SELECT pg_advisory_unlock_all()", connection).ExecuteNonQueryAsync(); }
            finally { await connection.DisposeAsync(); }
        }
    }

}
