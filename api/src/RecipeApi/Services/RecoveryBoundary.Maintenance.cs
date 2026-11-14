using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace RecipeApi.Services;

public sealed partial class RecoveryBoundary
{
    private static readonly AsyncLocal<MaintenanceCapability?> Operator = new();
    private sealed record MaintenanceHold(int Version, Guid OperationId, string Candidate,
        DateTimeOffset CreatedAt, string ApiImage, string DatabaseContainer);
    private sealed class MaintenanceCapability(string root, string database, string markerSha256, Guid operationId, string candidate, NpgsqlConnection connection)
    {
        public Guid OperationId { get; } = operationId;
        public string Candidate { get; } = candidate;
        public string Root { get; } = root;
        public string Database { get; } = database;
        public string MarkerSha256 { get; } = markerSha256;
        public volatile bool Active = true;
        public readonly object SessionGate = new();
        public NpgsqlConnection Connection { get; } = connection;
    }

    // Operator invocation only. This method has no HTTP route or configuration bypass.
    // Hold only the operator mutex across the callback: existing owners acquire their
    // own Snapshot/Write/Publish leases in the normal order.
    public async Task<T> RunMaintenanceAsync<T>(Guid operationId, string candidate, string expectedMarkerSha256,
        Func<CancellationToken, Task<T>> action, CancellationToken ct = default)
    {
        if (!db.Database.IsNpgsql() || Operator.Value is not null || operationId == Guid.Empty
            || !Hex(candidate, 40) || !Hex(expectedMarkerSha256, 64))
            throw new RecoveryBusyException("Maintenance invocation identity is invalid.");
        ArgumentNullException.ThrowIfNull(action);
        await using var connection = new NpgsqlConnection(db.Database.GetConnectionString());
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(ct);
        timeout.CancelAfter(TimeSpan.FromSeconds(Math.Clamp(configuration.GetValue("Recovery:WaitSeconds", 5), 1, 60)));
        try
        {
            await connection.OpenAsync(timeout.Token);
            await using var command = new NpgsqlCommand("SELECT pg_advisory_lock(244005)", connection);
            await command.ExecuteNonQueryAsync(timeout.Token);
        }
        catch (OperationCanceledException) when (!ct.IsCancellationRequested)
        { throw new RecoveryBusyException("Another maintenance invocation is coordinating this database."); }
        var capability = new MaintenanceCapability(Path.GetFullPath(recipes.BaseRoot),
            db.Database.GetConnectionString()!, expectedMarkerSha256, operationId, candidate, connection);
        RequireMaintenanceMarker(capability, operationId, candidate);
        Operator.Value = capability;
        try { return await action(ct); }
        finally
        {
            // AsyncLocal copies share this revocable object, including child tasks.
            capability.Active = false;
            Operator.Value = null;
        }
        // Connection disposal releases the operator mutex, including on interruption.
    }

    public void ValidateMaintenanceInvocation(Guid operationId, string candidate, string expectedAssemblySha256)
    {
        if (!OperatorMayWrite() || Operator.Value is not { } capability
            || capability.OperationId != operationId || capability.Candidate != candidate
            || !Hex(expectedAssemblySha256, 64)
            || Convert.ToHexStringLower(SHA256.HashData(File.ReadAllBytes(typeof(RecoveryBoundary).Assembly.Location))) != expectedAssemblySha256)
            throw new RecoveryBusyException("Maintenance invocation does not match this operation and executing candidate assembly.");
    }

    private bool OperatorMayWrite()
    {
        if (Operator.Value is not { } capability) return false;
        if (!capability.Active || capability.Root != Path.GetFullPath(recipes.BaseRoot)
            || capability.Database != db.Database.GetConnectionString())
            throw new RecoveryBusyException("Maintenance invocation no longer owns this household.");
        RequireMaintenanceMarker(capability);
        lock (capability.SessionGate)
        {
            try
            {
                using var probe = new NpgsqlCommand("SELECT EXISTS(SELECT 1 FROM pg_locks WHERE pid=pg_backend_pid() AND locktype='advisory' AND classid=0 AND objid=244005 AND objsubid=1 AND granted)", capability.Connection);
                if (!capability.Active || probe.ExecuteScalar() is not true) throw new InvalidOperationException();
            }
            catch (Exception error) when (error is NpgsqlException or InvalidOperationException or IOException)
            {
                capability.Active = false;
                throw new RecoveryBusyException("Maintenance lost its PostgreSQL operator session and must be read back before retry.");
            }
        }
        return true;
    }

    private static bool Hex(string? value, int length) => value is not null
        && Regex.IsMatch(value, "^[a-f0-9]{" + length + "}$", RegexOptions.CultureInvariant);

    private static void RequireMaintenanceMarker(MaintenanceCapability capability, Guid? operationId = null, string? candidate = null)
    {
        try
        {
            var marker = Path.Combine(capability.Root, ".maintenance-hold.json");
            if ((File.GetAttributes(capability.Root) & FileAttributes.ReparsePoint) != 0
                || (File.GetAttributes(marker) & (FileAttributes.ReparsePoint | FileAttributes.Directory)) != 0)
                throw new InvalidDataException();
            var bytes = File.ReadAllBytes(marker);
            if (bytes.Length is 0 or > 65536 || Convert.ToHexStringLower(SHA256.HashData(bytes)) != capability.MarkerSha256)
                throw new InvalidDataException();
            var hold = FoodVocabularyDefinitions.ReadStrict<MaintenanceHold>(new UTF8Encoding(false, true).GetString(bytes));
            if (hold.Version != 1 || hold.OperationId == Guid.Empty || !Hex(hold.Candidate, 40)
                || hold.CreatedAt == default || hold.ApiImage is null || !hold.ApiImage.StartsWith("sha256:", StringComparison.Ordinal)
                || !Hex(hold.ApiImage[7..], 64) || !Hex(hold.DatabaseContainer, 64)
                || operationId is not null && hold.OperationId != operationId || candidate is not null && hold.Candidate != candidate)
                throw new InvalidDataException();
        }
        catch (Exception error) when (error is IOException or InvalidDataException or UnauthorizedAccessException or ArgumentException)
        { throw new RecoveryBusyException("Maintenance requires the exact unchanged durable operator hold."); }
    }
}
