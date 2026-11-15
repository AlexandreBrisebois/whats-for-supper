using System.Text.Json;
using Npgsql;

namespace RecipeApi.Services;

internal sealed partial class V1ExactSourceAdmission
{
    internal static async Task LockTransitionPristineAsync(string root, byte[] request, NpgsqlConnection connection, CancellationToken ct)
    {
        var set = LoadAdmissionPolicy(root, request);
        var readback = Document(BoundArtifact(root, set.GetProperty("backup").GetProperty("files")[3]));
        var names = readback.GetProperty("tables").EnumerateObject().Select(x => "public." + Identifier(x.Name)).Order(StringComparer.Ordinal);
        await RecoverySnapshotService.ScalarAsync(connection, "LOCK TABLE " + string.Join(',', names) + " IN SHARE MODE", ct);
    }

    internal static async Task RequireTransitionPristineAsync(string root, byte[] request, NpgsqlConnection connection,
        string pristineDataRoot, CancellationToken ct)
    {
        var intent = FullSnapshotPolicy(root, request);
        var set = LoadAdmissionPolicy(root, request);
        await VerifyBackupAsync(root, set, ct);
        var backup = set.GetProperty("backup").GetProperty("files");
        var original = Document(BoundArtifact(root, intent.GetProperty("sourceSchema")));
        Require(SameFullSnapshotCatalog(await ObserveSchemaAsync(connection, ct), original), "pristine source schema differs");
        await VerifyOriginalRowsAsync(connection, original, Document(BoundArtifact(root, backup[3])), ct);
        ValidateReceiptSet(set, await ExtractOperationsAsync(connection, ct));
        await VerifyCopyFilesAsync(root, pristineDataRoot, backup[2], ct);
        VerifyGeneration(root, intent);
        VerifyPreparationReceipt(root, intent);
    }
}
