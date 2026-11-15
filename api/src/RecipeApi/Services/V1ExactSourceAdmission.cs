using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Npgsql;
using RecipeApi.Models;

namespace RecipeApi.Services;

// Internal one-time source qualification. No registration, public route or flag.
internal sealed partial class V1ExactSourceAdmission
{
    internal const string PackageSha256 = "bb40457ca9b1ed47b79b2165d855b40f2970083c260de91d8055a1ee5f369827";
    internal const string ApprovalSha256 = "6eef7a175751927f26fb41950f94d7c60de8b69acfab0a31148e8f5c5c78e0a7";
    internal const string IntentSha256 = "fb54c5660b0f9b0f6f89369f85cef9334943d854427b9f36b84aaa77a1ad0a1c";
    internal const string PolicyDirectory = "docs/handoffs/dependable-portions-next-slice/";
    private static readonly UTF8Encoding Utf8 = new(false, true);
    private static string Sha(byte[] bytes) => Convert.ToHexStringLower(SHA256.HashData(bytes));
    private static void Require(bool condition, string reason)
    {
        if (!condition) throw new InvalidDataException("Exact-source V1 attestation: " + reason);
    }
    private static byte[] ExactFile(string path, string sha)
    {
        RecoverySnapshotService.RejectLinks(path);
        var bytes = File.ReadAllBytes(path);
        Require(Sha(bytes) == sha, "artifact hash differs: " + Path.GetFileName(path));
        return bytes;
    }
    private static JsonElement Document(byte[] bytes) => FoodVocabularyDefinitions.ReadStrict<JsonElement>(Utf8.GetString(bytes));

    internal static JsonElement LoadPolicy(string repositoryRoot, byte[] intentBytes)
    {
        Require(Sha(intentBytes) == IntentSha256, "unreviewed operation/generation/request or policy/extraction version");
        _ = ExactFile(Path.Combine(repositoryRoot, PolicyDirectory, "V1-ADMISSION-INTENT.json"), IntentSha256);
        var package = Document(ExactFile(Path.Combine(repositoryRoot, PolicyDirectory, "V1-AUTHORITY-PACKAGE.json"), PackageSha256));
        var approval = Document(ExactFile(Path.Combine(repositoryRoot, PolicyDirectory, "V1-AUTHORITY-APPROVAL.json"), ApprovalSha256));
        Require(approval.GetProperty("decision").GetString() == "approve-option-B-policy-only"
            && approval.GetProperty("packageSha256").GetString() == PackageSha256
            && approval.GetProperty("proposalId").GetString() == package.GetProperty("proposalId").GetString(), "approval binding differs");
        foreach (var artifact in package.GetProperty("artifacts").EnumerateArray())
        {
            var path = artifact.GetProperty("path").GetString()!;
            Require(path.StartsWith(PolicyDirectory, StringComparison.Ordinal) && !path.Contains(".."), "invalid policy artifact path");
            _ = ExactFile(Path.Combine(repositoryRoot, path), artifact.GetProperty("sha256").GetString()!);
        }
        var set = Document(ExactFile(Path.Combine(repositoryRoot, PolicyDirectory, "V1-ATTESTATION-SET.json"),
            approval.GetProperty("attestationSetSha256").GetString()!));
        var members = set.GetProperty("rows").EnumerateArray().ToArray();
        Require(set.GetProperty("schemaVersion").GetInt32() == 1 && members.Length == 46
            && members.Select(x => (x.GetProperty("recipeId").GetGuid(), x.GetProperty("operationId").GetGuid())).Distinct().Count() == 46
            && members.Sum(x => x.GetProperty("duplicateSites").GetArrayLength()) == 140, "invalid exact membership");
        return set;
    }

    private readonly string _repositoryRoot;
    private readonly JsonElement _set;
    private readonly byte[] _intent;
    private readonly byte[] _lineage;
    private readonly Dictionary<(Guid Recipe, Guid Operation), CanonicalRecipeOperation> _operations;

    private V1ExactSourceAdmission(string repositoryRoot, JsonElement set, byte[] intent,
        CanonicalRecipeOperation[] operations)
    {
        _repositoryRoot = repositoryRoot; _set = set; _intent = intent.ToArray();
        _operations = operations.ToDictionary(x => (x.RecipeId, x.OperationId));
        _lineage = JsonSerializer.SerializeToUtf8Bytes(new
        {
            version = 1,
            requestSha256 = Sha(_intent),
            intent = _intent,
            approval = ExactFile(Path.Combine(repositoryRoot, PolicyDirectory, "V1-AUTHORITY-APPROVAL.json"), ApprovalSha256),
            package = ExactFile(Path.Combine(repositoryRoot, PolicyDirectory, "V1-AUTHORITY-PACKAGE.json"), PackageSha256),
            policyArtifacts = new[] { "V1-AUTHORITY-DECISION.md", "V1-ATTESTATION-SET.json", "V1-HISTORICAL-AUTHORITY.json" }
                .Select(name => new { name, bytes = ExactFile(Path.Combine(repositoryRoot, PolicyDirectory, name), Document(ExactFile(Path.Combine(repositoryRoot, PolicyDirectory, "V1-AUTHORITY-PACKAGE.json"), PackageSha256)).GetProperty("artifacts").EnumerateArray().Single(x => x.GetProperty("path").GetString() == PolicyDirectory + name).GetProperty("sha256").GetString()!) }).ToArray(),
            // Separate lineage preserves the originals; it never upgrades/replaces receipts.
            operations = operations.OrderBy(x => x.OperationId).Select(x => new
            {
                x.RecipeId,
                x.OperationId,
                x.InputHash,
                x.CreatedAt,
                originalRequestUtf8 = Utf8.GetBytes(x.OriginalRequest!),
                resultPostgresTextUtf8 = Utf8.GetBytes(x.Result)
            }).ToArray()
        });
        if (IsPreparedContinuation(intent))
        {
            var continuation = Document(intent);
            _lineage = JsonSerializer.SerializeToUtf8Bytes(new
            {
                version = 2,
                originalLineage = _lineage,
                predecessorIntent = ExactFile(Path.Combine(repositoryRoot, PolicyDirectory, "V1-ADMISSION-INTENT.json"), IntentSha256),
                sourceSchema = BoundArtifact(repositoryRoot, continuation.GetProperty("sourceSchema")),
                preparedSchema = BoundArtifact(repositoryRoot, continuation.GetProperty("preparedSchema")),
                schemaInputs = continuation.GetProperty("schemaInputs").EnumerateArray()
                    .Select(x => new { path = x.GetProperty("path").GetString(), bytes = BoundArtifact(repositoryRoot, x) }).ToArray(),
                transitionUtf8 = Utf8.GetBytes(SchemaTransition(repositoryRoot, continuation))
            });
        }
        if (IsHistoryContinuation(intent))
            _lineage = JsonSerializer.SerializeToUtf8Bytes(new
            {
                version = 3,
                preparedLineage = _lineage,
                schemaContinuation = ExactFile(Path.Combine(repositoryRoot, PolicyDirectory, "V1-SCHEMA-CONTINUATION.json"), SchemaContinuationSha256)
            });
        if (IsFullSnapshotContinuation(intent))
        {
            var continuation = Document(intent);
            _lineage = JsonSerializer.SerializeToUtf8Bytes(new
            {
                version = 4,
                preparedLineage = _lineage,
                schemaContinuation = ExactFile(Path.Combine(repositoryRoot, PolicyDirectory, "V1-SCHEMA-CONTINUATION.json"), SchemaContinuationSha256),
                historyContinuation = BoundArtifact(repositoryRoot, continuation.GetProperty("historyContinuation")),
                historyDelivery = BoundArtifact(repositoryRoot, continuation.GetProperty("historyDelivery"))
            });
        }
    }

    internal byte[] LineageBytes => _lineage.ToArray();
    internal int ReceiptCount => _operations.Count;

    internal async Task<CanonicalRecipeWriteResult> ReplayAsync(byte[] intentBytes, byte[]? lineageBytes,
        Guid recipeId, Guid operationId, string inputHash, CancellationToken ct)
    {
        ct.ThrowIfCancellationRequested();
        Require(intentBytes.AsSpan().SequenceEqual(_intent) && lineageBytes is not null
            && lineageBytes.AsSpan().SequenceEqual(_lineage), "missing or changed recovery lineage/request");
        var set = LoadAdmissionPolicy(_repositoryRoot, intentBytes);
        VerifyGeneration(_repositoryRoot, Document(intentBytes));
        if (IsPreparedContinuation(intentBytes)) VerifyPreparationReceipt(_repositoryRoot, Document(intentBytes));
        await VerifyBackupAsync(_repositoryRoot, set, ct);
        Require(_operations.TryGetValue((recipeId, operationId), out var operation)
            && operation.InputHash == inputHash, "historical replay binding differs");
        return CanonicalRecipeContentStore.ValidateAttestedV1(operation!, Member(recipeId, operationId));
    }

    internal FoodVocabularyReference[] References(CanonicalRecipeOperation operation)
    {
        Require(_operations.TryGetValue((operation.RecipeId, operation.OperationId), out var saved)
            && operation.InputHash == saved.InputHash && operation.CreatedAt == saved.CreatedAt
            && operation.OriginalRequest == saved.OriginalRequest && operation.Result == saved.Result, "foreign receipt");
        var result = CanonicalRecipeContentStore.ValidateAttestedV1(operation, Member(operation.RecipeId, operation.OperationId));
        Require(result.Content.IngredientLines.All(x => x.Shopping.FoodId is null && x.Shopping.MappingRevision is null), "unexpected V1 food mapping");
        return [];
    }

    private JsonElement Member(Guid recipe, Guid operation) => _set.GetProperty("rows").EnumerateArray()
        .Single(x => x.GetProperty("recipeId").GetGuid() == recipe && x.GetProperty("operationId").GetGuid() == operation);

    private static void VerifyGeneration(string repositoryRoot, JsonElement intent)
    {
        // Task-owned generation descriptor, outside the copied source files. This
        // is not a live .recovery-active pointer and grants no activation authority.
        var path = Path.Combine(repositoryRoot, intent.GetProperty("targetGenerationMarkerRelativePath").GetString()!);
        RecoverySnapshotService.RejectLinks(path);
        Require(File.ReadAllText(path) == intent.GetProperty("targetGeneration").GetString() + "\n", "target generation differs");
    }

    private static async Task VerifyBackupAsync(string repositoryRoot, JsonElement set, CancellationToken ct)
    {
        foreach (var artifact in set.GetProperty("backup").GetProperty("files").EnumerateArray())
        {
            ct.ThrowIfCancellationRequested();
            var path = Path.Combine(repositoryRoot, artifact.GetProperty("path").GetString()!);
            RecoverySnapshotService.RejectLinks(path);
            await using var file = File.OpenRead(path);
            Require(file.Length == artifact.GetProperty("byteCount").GetInt64()
                && Convert.ToHexStringLower(await SHA256.HashDataAsync(file, ct)) == artifact.GetProperty("sha256").GetString(),
                "backup artifact differs: " + Path.GetFileName(path));
        }
    }

    internal static async Task<V1ExactSourceAdmission> InspectAsync(string repositoryRoot, NpgsqlConnection connection,
        string copyDataRoot, byte[] intentBytes, IRecoveryCheckpoint? checkpoint, CancellationToken ct)
    {
        // Own the read-only transaction: an existing transaction cannot confer authority.
        var intent = Document(intentBytes);
        var set = LoadAdmissionPolicy(repositoryRoot, intentBytes);
        Require(connection.Database == intent.GetProperty("databaseName").GetString()
            && Path.GetFullPath(copyDataRoot) == Path.GetFullPath(Path.Combine(repositoryRoot, intent.GetProperty("copyDataRelativePath").GetString()!)),
            "unreviewed copy destination");
        VerifyGeneration(repositoryRoot, intent);
        await VerifyBackupAsync(repositoryRoot, set, ct);
        await using var transaction = await connection.BeginTransactionAsync(System.Data.IsolationLevel.RepeatableRead, ct);
        await RecoverySnapshotService.ScalarAsync(connection, "SET TRANSACTION READ ONLY", ct);
        await RecoverySnapshotService.ScalarAsync(connection, "SET LOCAL search_path = pg_catalog, public, pg_temp", ct);
        Require(await RecoverySnapshotService.ScalarAsync(connection, "SHOW server_version_num", ct) == "180006"
            && await RecoverySnapshotService.ScalarAsync(connection, "SHOW server_encoding", ct) == "UTF8"
            && await RecoverySnapshotService.ScalarAsync(connection, "SHOW client_encoding", ct) == "UTF8", "unsupported extraction profile");
        var backup = set.GetProperty("backup").GetProperty("files");
        var readback = Document(ExactFile(Path.Combine(repositoryRoot, backup[3].GetProperty("path").GetString()!), backup[3].GetProperty("sha256").GetString()!));
        if (IsPreparedContinuation(intentBytes))
            await VerifySchemaDescendantAsync(repositoryRoot, connection, intentBytes, readback, requireCompletion: true, ct);
        else
        {
            var tables = readback.GetProperty("tables");
            var names = (await RecoverySnapshotService.ScalarAsync(connection,
                "SELECT string_agg(tablename,',' ORDER BY tablename) FROM pg_tables WHERE schemaname='public'", ct)).Split(',');
            Require(names.SequenceEqual(tables.EnumerateObject().Select(x => x.Name).Order(StringComparer.Ordinal)), "source table membership differs");
            foreach (var table in tables.EnumerateObject())
            {
                // Table identifiers come only from the immutable reviewed readback.
                var digest = await RecoverySnapshotService.ScalarAsync(connection,
                    $"SELECT count(*)::text||'|'||md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text)::text,'[]')) FROM public.\"{table.Name}\" t", ct);
                Require(digest == table.Value.GetString(), "copy lineage differs: " + table.Name);
            }
        }
        await VerifyCopyFilesAsync(repositoryRoot, copyDataRoot, backup[2], ct);
        if (checkpoint is not null) await checkpoint.ReachedAsync("v1-attestation-lineage-observed", ct);
        var operations = await ExtractOperationsAsync(connection, ct);
        ValidateReceiptSet(set, operations);
        if (checkpoint is not null) await checkpoint.ReachedAsync("v1-attestation-receipts-validated", ct);
        ct.ThrowIfCancellationRequested();
        await VerifyCopyFilesAsync(repositoryRoot, copyDataRoot, backup[2], ct);
        // Evidence cannot change between qualification and context construction.
        _ = LoadAdmissionPolicy(repositoryRoot, intentBytes);
        await VerifyBackupAsync(repositoryRoot, set, ct);
        VerifyGeneration(repositoryRoot, intent);
        var result = new V1ExactSourceAdmission(repositoryRoot, set, intentBytes, operations);
        await transaction.CommitAsync(ct);
        return result;
    }

    internal static void ValidateReceiptSet(JsonElement set, CanonicalRecipeOperation[] operations)
    {
        var members = set.GetProperty("rows").EnumerateArray().ToArray();
        Require(operations.Length == members.Length && operations.Select(x => (x.RecipeId, x.OperationId)).ToHashSet()
            .SetEquals(members.Select(x => (x.GetProperty("recipeId").GetGuid(), x.GetProperty("operationId").GetGuid()))), "receipt membership differs");
        foreach (var operation in operations)
            _ = CanonicalRecipeContentStore.ValidateAttestedV1(operation, members.Single(x => x.GetProperty("operationId").GetGuid() == operation.OperationId));
    }

    internal static async Task<CanonicalRecipeOperation[]> ExtractOperationsAsync(NpgsqlConnection connection, CancellationToken ct)
    {
        var operations = new List<CanonicalRecipeOperation>();
        // Never use EF JSON materialization or JsonSerializer to hash saved results.
        await using var command = new NpgsqlCommand("SELECT recipe_id,operation_id,input_hash,original_request,result::text,created_at FROM canonical_recipe_operations ORDER BY recipe_id,operation_id", connection);
        await using var reader = await command.ExecuteReaderAsync(ct);
        while (await reader.ReadAsync(ct)) operations.Add(new()
        {
            RecipeId = reader.GetGuid(0),
            OperationId = reader.GetGuid(1),
            InputHash = reader.GetString(2),
            OriginalRequest = reader.GetString(3),
            Result = reader.GetString(4),
            CreatedAt = reader.GetFieldValue<DateTimeOffset>(5)
        });
        return operations.ToArray();
    }

    private static async Task VerifyCopyFilesAsync(string repositoryRoot, string copyDataRoot, JsonElement manifest, CancellationToken ct)
    {
        RecoverySnapshotService.RejectLinks(copyDataRoot);
        var expected = new Dictionary<string, string>(StringComparer.Ordinal);
        foreach (var line in Utf8.GetString(ExactFile(Path.Combine(repositoryRoot, manifest.GetProperty("path").GetString()!), manifest.GetProperty("sha256").GetString()!)).Split('\n', StringSplitOptions.RemoveEmptyEntries))
        {
            Require(line.Length > 72 && line[64..72] == "  /data/", "invalid source file manifest");
            var path = line[72..];
            Require(!Path.IsPathRooted(path) && !path.Split('/').Contains("..") && expected.TryAdd(path, line[..64]), "invalid source file path");
        }
        var files = RecoverySnapshotService.SafeFiles(copyDataRoot).Order(StringComparer.Ordinal).ToArray();
        Require(files.Length == expected.Count, "copy file membership differs");
        foreach (var path in files)
        {
            ct.ThrowIfCancellationRequested();
            RecoverySnapshotService.RejectLinks(path);
            var relative = Path.GetRelativePath(copyDataRoot, path).Replace('\\', '/');
            Require(expected.TryGetValue(relative, out var sha), "foreign copy file");
            await using var stream = File.OpenRead(path);
            Require(Convert.ToHexStringLower(await SHA256.HashDataAsync(stream, ct)) == sha, "copy file bytes differ: " + relative);
        }
    }
}

internal sealed partial class V1ExactSourceAdmission
{
    internal V1RecoveryHistoryContext RecoveryHistoryContext(byte[] request)
    {
        Require((IsHistoryContinuation(request) || IsFullSnapshotContinuation(request))
            && request.AsSpan().SequenceEqual(_intent), "foreign recovery-history request");
        _ = LoadAdmissionPolicy(_repositoryRoot, request);
        VerifyGeneration(_repositoryRoot, Document(request));
        VerifyPreparationReceipt(_repositoryRoot, Document(request));
        return new(this, Document(request));
    }

    internal void RequireReceiptMembership(FoodVocabularyInventoryFacts facts)
    {
        ValidateReceiptSet(_set, facts.CanonicalOperations.ToArray());
        foreach (var operation in facts.CanonicalOperations) _ = References(operation);
    }
}
