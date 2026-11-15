using System.Data;
using System.Text.Json;
using Npgsql;
using RecipeApi.Infrastructure;

namespace RecipeApi.Services;

// One reviewed continuation of the original source, never a general legacy adapter.
internal sealed partial class V1ExactSourceAdmission
{
    internal const string SchemaContinuationSha256 = "0bc8fc02687eeb74f93f099e3b08c58559bdc335f97508fc795c60f56652270b";
    internal const string HistoryContinuationSha256 = "a8aabc6e9f5b5e78a057328769119cb6bc3f8fcc3ca55f71d6b85f1b0bff202f";
    private static bool IsHistoryContinuation(byte[] bytes) => Sha(bytes) == HistoryContinuationSha256;
    private static bool IsPreparedContinuation(byte[] bytes) => Sha(bytes) == SchemaContinuationSha256
        || IsHistoryContinuation(bytes) || IsFullSnapshotContinuation(bytes);
    private static string PreparationSha(JsonElement intent) => intent.GetProperty("version").GetInt32() switch
    {
        2 => SchemaContinuationSha256,
        3 => HistoryContinuationSha256,
        4 => FullSnapshotContinuationSha256,
        _ => throw new InvalidDataException("Unsupported schema preparation request.")
    };
    private static byte[] BoundArtifact(string root, JsonElement artifact)
        => ExactFile(Path.Combine(root, artifact.GetProperty("path").GetString()!), artifact.GetProperty("sha256").GetString()!);

    private static JsonElement LoadAdmissionPolicy(string root, byte[] request)
    {
        if (!IsPreparedContinuation(request)) return LoadPolicy(root, request);
        _ = ExactFile(Path.Combine(root, PolicyDirectory, "V1-SCHEMA-CONTINUATION.json"), SchemaContinuationSha256);
        var intent = Document(request);
        if (IsFullSnapshotContinuation(request)) LoadFullSnapshotBindings(root, intent);
        if (IsHistoryContinuation(request))
        {
            _ = ExactFile(Path.Combine(root, PolicyDirectory, "V1-RECOVERY-HISTORY-CONTINUATION.json"), HistoryContinuationSha256);
            Require(intent.GetProperty("schemaContinuationSha256").GetString() == SchemaContinuationSha256, "foreign schema predecessor");
        }
        Require(intent.GetProperty("predecessorIntentSha256").GetString() == IntentSha256, "foreign predecessor");
        var set = LoadPolicy(root, ExactFile(Path.Combine(root, PolicyDirectory, "V1-ADMISSION-INTENT.json"), IntentSha256));
        foreach (var input in intent.GetProperty("schemaInputs").EnumerateArray()) _ = BoundArtifact(root, input);
        _ = BoundArtifact(root, intent.GetProperty("sourceSchema"));
        _ = BoundArtifact(root, intent.GetProperty("preparedSchema"));
        _ = SchemaTransition(root, intent);
        return set;
    }

    private static string SchemaTransition(string root, JsonElement intent)
    {
        var transition = intent.GetProperty("transition");
        var owner = transition.GetProperty("owner").GetString()!;
        var input = intent.GetProperty("schemaInputs").EnumerateArray().Single(x => x.GetProperty("path").GetString() == owner);
        var sql = Utf8.GetString(BoundArtifact(root, input));
        var result = "";
        foreach (var section in transition.GetProperty("sections").EnumerateArray())
        {
            var text = sql.Substring(section.GetProperty("start").GetInt32(), section.GetProperty("length").GetInt32());
            Require(Sha(Utf8.GetBytes(text)) == section.GetProperty("sha256").GetString(), "unreviewed SQL section");
            result += text;
        }
        Require(Sha(Utf8.GetBytes(result)) == transition.GetProperty("sqlSha256").GetString(), "unreviewed SQL transition");
        return result;
    }

    // Includes original column ordinals/defaults/identity/collation, relationships,
    // indexes, triggers, rules, policies, functions, sequences and extension versions.
    internal static async Task<JsonElement> ObserveSchemaAsync(NpgsqlConnection connection, CancellationToken ct)
        => Document(Utf8.GetBytes(await RecoverySnapshotService.ScalarAsync(connection, SchemaObservationSql, ct)));

    private const string SchemaObservationSql = """
        SELECT jsonb_build_object(
         'tables', (SELECT coalesce(jsonb_agg(jsonb_build_array(c.relname,c.relkind,c.relpersistence,c.relrowsecurity,c.relforcerowsecurity,c.relreplident,c.reloptions,c.relispartition) ORDER BY c.relname),'[]') FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','f','S')),
         'columns',(SELECT coalesce(jsonb_agg(jsonb_build_array(c.relname,a.attname,a.attnum,format_type(a.atttypid,a.atttypmod),a.attnotnull,pg_get_expr(d.adbin,d.adrelid),a.attidentity,a.attgenerated,co.collname) ORDER BY c.relname,a.attnum),'[]') FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum LEFT JOIN pg_collation co ON co.oid=a.attcollation WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','f','S') AND a.attnum>0 AND NOT a.attisdropped),
         'constraints',(SELECT coalesce(jsonb_agg(jsonb_build_array(t.relname,c.conname,pg_get_constraintdef(c.oid),c.convalidated) ORDER BY t.relname,c.conname),'[]') FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname='public'),
         'indexes',(SELECT coalesce(jsonb_agg(jsonb_build_array(t.relname,i.relname,pg_get_indexdef(i.oid),x.indisvalid,x.indisready) ORDER BY t.relname,i.relname),'[]') FROM pg_index x JOIN pg_class t ON t.oid=x.indrelid JOIN pg_class i ON i.oid=x.indexrelid JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname='public'),
         'triggers',(SELECT coalesce(jsonb_agg(jsonb_build_array(c.relname,CASE WHEN t.tgisinternal THEN 'constraint:'||k.conname||':'||t.tgtype ELSE t.tgname END,t.tgenabled,t.tgfoid::regproc::text,t.tgdeferrable,t.tginitdeferred,CASE WHEN NOT t.tgisinternal THEN pg_get_triggerdef(t.oid) END) ORDER BY c.relname,CASE WHEN t.tgisinternal THEN 'constraint:'||k.conname||':'||t.tgtype ELSE t.tgname END),'[]') FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace LEFT JOIN pg_constraint k ON k.oid=t.tgconstraint WHERE n.nspname='public'),
         'rules',(SELECT coalesce(jsonb_agg(jsonb_build_array(c.relname,r.rulename,pg_get_ruledef(r.oid)) ORDER BY c.relname,r.rulename),'[]') FROM pg_rewrite r JOIN pg_class c ON c.oid=r.ev_class JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'),
         'policies',(SELECT coalesce(jsonb_agg(to_jsonb(p) ORDER BY p.tablename,p.policyname),'[]') FROM pg_policies p WHERE schemaname='public'),
         'functions',(SELECT coalesce(jsonb_agg(jsonb_build_array(p.proname,pg_get_function_identity_arguments(p.oid),p.prosrc,p.probin,p.provolatile,p.prosecdef,p.proconfig,p.prokind,pg_get_function_result(p.oid),p.proisstrict,p.proparallel,p.proleakproof,p.procost,p.prorows,p.provariadic::regtype::text,p.prosupport::regproc::text,p.proretset,p.proargnames,p.prosqlbody::text) ORDER BY p.proname,pg_get_function_identity_arguments(p.oid)),'[]') FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public'),
         'sequences',(SELECT coalesce(jsonb_agg(to_jsonb(s) - 'sequenceowner' ORDER BY s.sequencename),'[]') FROM pg_sequences s WHERE schemaname='public'),
         'namespaces',(SELECT coalesce(jsonb_agg(nspname ORDER BY nspname),'[]') FROM pg_namespace WHERE nspname NOT LIKE 'pg_%' AND nspname<>'information_schema'),
         'types',(SELECT coalesce(jsonb_agg(jsonb_build_array(t.typname,t.typtype,t.typcategory,t.typnotnull,t.typdefault,t.typbasetype::regtype::text,t.typelem::regtype::text,c.relname) ORDER BY t.typname),'[]') FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace LEFT JOIN pg_class c ON c.oid=t.typrelid WHERE n.nspname='public'),
         'enums',(SELECT coalesce(jsonb_agg(jsonb_build_array(t.typname,e.enumsortorder,e.enumlabel) ORDER BY t.typname,e.enumsortorder),'[]') FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public'),
         'operators',(SELECT coalesce(jsonb_agg(jsonb_build_array(o.oprname,o.oprleft::regtype::text,o.oprright::regtype::text,o.oprresult::regtype::text,o.oprcode::regproc::text) ORDER BY o.oprname,o.oprleft::regtype::text,o.oprright::regtype::text),'[]') FROM pg_operator o JOIN pg_namespace n ON n.oid=o.oprnamespace WHERE n.nspname='public'),
         'casts',(SELECT coalesce(jsonb_agg(jsonb_build_array(c.castsource::regtype::text,c.casttarget::regtype::text,c.castfunc::regproc::text,c.castcontext,c.castmethod) ORDER BY c.castsource::regtype::text,c.casttarget::regtype::text),'[]') FROM pg_cast c),
         'collations',(SELECT coalesce(jsonb_agg(jsonb_build_array(c.collname,c.collprovider,c.collisdeterministic,c.collencoding,c.collcollate,c.collctype,c.colllocale,c.collversion) ORDER BY c.collname),'[]') FROM pg_collation c JOIN pg_namespace n ON n.oid=c.collnamespace WHERE n.nspname='public'),
         'extensions',(SELECT coalesce(jsonb_agg(jsonb_build_array(e.extname,e.extversion,n.nspname) ORDER BY e.extname),'[]') FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace)
        )::text;
        """;

    private static string Identifier(string value) => new NpgsqlCommandBuilder().QuoteIdentifier(value);

    internal static async Task<string> ProjectedDigestAsync(NpgsqlConnection connection, string table,
        string[] columns, CancellationToken ct)
    {
        Require(columns.Length > 0 && columns.Distinct(StringComparer.Ordinal).Count() == columns.Length, "invalid original columns");
        var projection = string.Join(',', columns.Select(Identifier));
        return await RecoverySnapshotService.ScalarAsync(connection,
            $"SELECT count(*)::text||'|'||md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text)::text,'[]')) FROM (SELECT {projection} FROM public.{Identifier(table)}) t", ct);
    }

    private static async Task VerifyOriginalRowsAsync(NpgsqlConnection connection, JsonElement sourceSchema,
        JsonElement readback, CancellationToken ct)
    {
        foreach (var table in readback.GetProperty("tables").EnumerateObject())
        {
            // Expected projection comes only from the pinned independently verified pristine source.
            var columns = sourceSchema.GetProperty("columns").EnumerateArray().Where(x => x[0].GetString() == table.Name)
                .Select(x => x[1].GetString()!).ToArray();
            Require(await ProjectedDigestAsync(connection, table.Name, columns, ct) == table.Value.GetString(),
                "original source values/membership differ: " + table.Name);
        }
    }

    private static async Task VerifySchemaDescendantAsync(string root, NpgsqlConnection connection,
        byte[] request, JsonElement readback, bool requireCompletion, CancellationToken ct)
    {
        var intent = Document(request);
        var expected = Document(BoundArtifact(root, intent.GetProperty("preparedSchema")));
        var observed = await ObserveSchemaAsync(connection, ct);
        if (!(IsFullSnapshotContinuation(request) ? SameFullSnapshotCatalog(observed, expected) : JsonElement.DeepEquals(observed, expected)))
        {
            var error = new InvalidDataException("Exact-source V1 attestation: unreviewed or incomplete descendant schema");
            // Internal qualification may retain the exact observation without
            // emitting schema contents into ordinary application logs.
            error.Data["ObservedSourceCatalog"] = observed.GetRawText();
            throw error;
        }
        await VerifyOriginalRowsAsync(connection, Document(BoundArtifact(root, intent.GetProperty("sourceSchema"))), readback, ct);
        Require(await RecoverySnapshotService.ScalarAsync(connection,
            "SELECT count(*) FROM recipes WHERE food_mapping_evidence IS NOT NULL", ct) == "0", "new evidence must remain SQL NULL");
        Require(await RecoverySnapshotService.ScalarAsync(connection, "SELECT count(*) FROM household_food_overrides", ct) == "0",
            "new override storage must remain empty");
        if (requireCompletion) VerifyPreparationReceipt(root, intent);

    }

    private static void VerifyPreparationReceipt(string root, JsonElement intent)
    {
        var marker = Path.Combine(root, intent.GetProperty("preparationReceiptRelativePath").GetString()!);
        RecoverySnapshotService.RejectLinks(marker);
        Require(File.ReadAllText(marker) == PreparationSha(intent) + "\n", "missing or changed preparation completion");
    }

    // Task-owned disposable target only. No service registration, CLI/public route,
    // environment switch, data migration, seeding or vocabulary adoption.
    internal static async Task PrepareSchemaDescendantAsync(string root, NpgsqlConnection connection,
        string copyDataRoot, byte[] request, IRecoveryCheckpoint? checkpoint, CancellationToken ct)
    {
        // Fail before DDL or completion publication on an unsupported storage host.
        if (!OperatingSystem.IsLinux())
            throw new PlatformNotSupportedException("Schema preparation requires the existing Linux recovery durability owner.");
        Require(IsPreparedContinuation(request), "unreviewed schema preparation request");
        var set = LoadAdmissionPolicy(root, request);
        var intent = Document(request);
        Require(connection.Database == intent.GetProperty("databaseName").GetString()
            && Path.GetFullPath(copyDataRoot) == Path.GetFullPath(Path.Combine(root, intent.GetProperty("copyDataRelativePath").GetString()!)),
            "unreviewed schema preparation destination");
        VerifyGeneration(root, intent);
        await VerifyBackupAsync(root, set, ct);
        var backup = set.GetProperty("backup").GetProperty("files");
        var readback = Document(BoundArtifact(root, backup[3]));
        await VerifyCopyFilesAsync(root, copyDataRoot, backup[2], ct);
        var completionPath = Path.Combine(root, intent.GetProperty("preparationReceiptRelativePath").GetString()!);
        RecoverySnapshotService.RejectLinks(completionPath);
        if (File.Exists(completionPath))
            Require(File.ReadAllText(completionPath) == PreparationSha(intent) + "\n", "changed preparation completion");
        await using (var transaction = await connection.BeginTransactionAsync(IsolationLevel.Serializable, ct))
        {
            Require(await RecoverySnapshotService.ScalarAsync(connection, "SHOW server_version_num", ct) == "180006"
                && await RecoverySnapshotService.ScalarAsync(connection, "SHOW server_encoding", ct) == "UTF8"
                && await RecoverySnapshotService.ScalarAsync(connection, "SHOW client_encoding", ct) == "UTF8", "unsupported extraction profile");
            await RecoverySnapshotService.ScalarAsync(connection, "SET LOCAL search_path = pg_catalog, public, pg_temp", ct);
            // Lock original tables before observing facts. DDL/new tables share the
            // same transaction; another preparer is serialized by this same lock set.
            var names = readback.GetProperty("tables").EnumerateObject().Select(x => "public." + Identifier(x.Name)).Order(StringComparer.Ordinal);
            await RecoverySnapshotService.ScalarAsync(connection, "LOCK TABLE " + string.Join(',', names) + " IN ACCESS EXCLUSIVE MODE", ct);
            var original = Document(BoundArtifact(root, intent.GetProperty("sourceSchema")));
            var prepared = Document(BoundArtifact(root, intent.GetProperty("preparedSchema")));
            var current = await ObserveSchemaAsync(connection, ct);
            bool SameCatalog(JsonElement expected) => IsFullSnapshotContinuation(request)
                ? SameFullSnapshotCatalog(current, expected) : JsonElement.DeepEquals(current, expected);
            Require(SameCatalog(original) || SameCatalog(prepared), "partial or foreign preparation state");
            await VerifyOriginalRowsAsync(connection, original, readback, ct);
            if (SameCatalog(original))
            {
                if (checkpoint is not null) await checkpoint.ReachedAsync("v1-schema-before-ddl", ct);
                // CREATE targets public; only the already-verified pristine schema
                // is trusted while these immutable DDL sections execute.
                await RecoverySnapshotService.ScalarAsync(connection, "SET LOCAL search_path = public, pg_catalog, pg_temp", ct);
                await RecoverySnapshotService.ScalarAsync(connection, SchemaTransition(root, intent), ct);
                await RecoverySnapshotService.ScalarAsync(connection, "SET LOCAL search_path = pg_catalog, public, pg_temp", ct);
                if (checkpoint is not null) await checkpoint.ReachedAsync("v1-schema-after-ddl", ct);
            }
            await VerifySchemaDescendantAsync(root, connection, request, readback, requireCompletion: false, ct);
            ValidateReceiptSet(set, await ExtractOperationsAsync(connection, ct));
            await VerifyCopyFilesAsync(root, copyDataRoot, backup[2], ct);
            _ = LoadAdmissionPolicy(root, request);
            await VerifyBackupAsync(root, set, ct);
            VerifyGeneration(root, intent);
            await transaction.CommitAsync(ct);
        }
        if (checkpoint is not null) await checkpoint.ReachedAsync("v1-schema-committed-before-completion", ct);
        // No admission between commit and durable evidence. Exact retry revalidates
        // all committed facts before publishing this deterministic completion marker.
        var marker = Path.Combine(root, intent.GetProperty("preparationReceiptRelativePath").GetString()!);
        RecoverySnapshotService.RejectLinks(marker);
        if (File.Exists(marker))
            Require(File.ReadAllText(marker) == PreparationSha(intent) + "\n", "changed preparation completion");
        else
        {
            var temporary = marker + ".pending-" + Guid.NewGuid().ToString("N");
            try
            {
                await using (var stream = new FileStream(temporary, FileMode.CreateNew, FileAccess.Write, FileShare.None))
                {
                    await stream.WriteAsync(Utf8.GetBytes(PreparationSha(intent) + "\n"), ct);
                    stream.Flush(true);
                }
                File.Move(temporary, marker, overwrite: false);
                RecoveryDurability.Flush(Path.GetDirectoryName(marker)!);
            }
            finally { if (File.Exists(temporary)) File.Delete(temporary); }
        }
    }
}
