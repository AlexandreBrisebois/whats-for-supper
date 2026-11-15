using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace RecipeApi.Services;

internal sealed record V1SourceInspection(V1ExactSourceAdmission Attestation, bool RemainingInventoryValidated, string? Blocker);

public partial class RecoverySnapshotService
{
    // Explicit internal inspection only. Capture/restore/migration and ordinary
    // history readers never inherit this exception or a long-lived bypass.
    internal async Task<V1SourceInspection> InspectAttestedV1SourceAsync(string repositoryRoot,
        string copyDataRoot, byte[] intentBytes, CancellationToken ct)
    {
        if (Path.GetFullPath(data.Root) != Path.GetFullPath(copyDataRoot)
            || Path.GetFullPath(recipes.Root) != Path.GetFullPath(Path.Combine(copyDataRoot, "recipes"))
            || recipes.Generation is not null)
            throw new InvalidDataException("Attested source inspection is configured for a different file tree/generation.");
        await using var lease = await boundary.EnterAsync(RecoveryAccess.Snapshot, ct);
        await using var connection = await OpenAsync(ct);
        var attestation = await V1ExactSourceAdmission.InspectAsync(repositoryRoot, connection, copyDataRoot, intentBytes, checkpoint, ct);
        try
        {
            // Existing source/storage/schema owners remain strict. A new blocker
            // is returned separately from acceptance of the 46-receipt gate.
            await using var transaction = await db.Database.BeginTransactionAsync(System.Data.IsolationLevel.RepeatableRead, ct);
            await db.Database.ExecuteSqlRawAsync("SET TRANSACTION READ ONLY", ct);
            var facts = await vocabulary.ObserveInventoryFactsAsync(ct);
            _ = FoodVocabularyInventoryQualification.RequiredReferencesForAttestedSource(facts, attestation);
            await transaction.CommitAsync(ct);
            // Re-admit after the downstream read, including files and generation.
            _ = await V1ExactSourceAdmission.InspectAsync(repositoryRoot, connection, copyDataRoot, intentBytes, checkpoint, ct);
            return new(attestation, true, null);
        }
        catch (Exception error) when (error is InvalidDataException or PostgresException)
        {
            return new(attestation, false, error is PostgresException sql ? $"PostgreSQL {sql.SqlState}: {sql.MessageText}" : error.Message);
        }
    }
}
