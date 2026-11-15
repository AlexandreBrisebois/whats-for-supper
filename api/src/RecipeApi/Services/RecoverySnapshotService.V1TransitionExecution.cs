using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;

namespace RecipeApi.Services;

public partial class RecoverySnapshotService
{
    internal Task<V1TransitionOutcome> ExecuteAttestedV1MigrationRecipeStageAsync(string repositoryRoot, string sourceDataRoot,
        byte[] request, byte[] attempt, byte[] writeAdmission, string bundle, RecoverySnapshotService sourceService,
        CanonicalRecipeContentStore store, RecipesRootResolver executionRoots, CancellationToken ct)
        => RunTransitionAsync(repositoryRoot, sourceDataRoot, request, attempt, writeAdmission, bundle, sourceService, store, executionRoots, false, ct);

    internal Task<V1TransitionOutcome> ReadAttestedV1MigrationRecipeStageAsync(string repositoryRoot, string sourceDataRoot,
        byte[] request, byte[] attempt, byte[] writeAdmission, string bundle, RecoverySnapshotService sourceService,
        CanonicalRecipeContentStore store, RecipesRootResolver executionRoots, CancellationToken ct)
        => RunTransitionAsync(repositoryRoot, sourceDataRoot, request, attempt, writeAdmission, bundle, sourceService, store, executionRoots, true, ct);

    private async Task<V1TransitionOutcome> RunTransitionAsync(string root, string sourceDataRoot, byte[] requestBytes,
        byte[] attemptBytes, byte[] writeBytes, string bundle, RecoverySnapshotService sourceService,
        CanonicalRecipeContentStore store, RecipesRootResolver executionRoots, bool readOnly, CancellationToken ct)
    {
        requestBytes = requestBytes.ToArray(); attemptBytes = attemptBytes.ToArray(); writeBytes = writeBytes.ToArray();
        using var deadline = CancellationTokenSource.CreateLinkedTokenSource(ct);
        deadline.CancelAfter(TimeSpan.FromSeconds(Math.Clamp(configuration.GetValue("Recovery:MaxFreezeSeconds", 30), 1, 3600)));
        ct = deadline.Token;
        var request = V1AuthorityTransitionPolicy.Request(root, requestBytes);
        RequireTransitionBuild(root, request);
        _ = V1AuthorityTransitionPolicy.Attempt(requestBytes, attemptBytes, new DeploymentCalendar(configuration));
        _ = V1AuthorityTransitionPolicy.WriteAdmission(root, requestBytes, attemptBytes, writeBytes);
        FoodVocabularyDefinitions.Require(bundle == V1AuthorityTransitionPolicy.Bundle(root) && sourceDataRoot == request.SourceDataRoot);
        await RequireTransitionGraphsAsync(request, sourceService, executionRoots, ct);
        return await boundary.RunMaintenanceAsync(request.Selection.OperationId, request.CandidateCommit, TransitionHash(request.HoldAfterBytes), async token =>
        {
            if (!readOnly) RequireTransitionDate(request);
            await using var source = await sourceService.OpenTransitionSourceAsync(root, sourceDataRoot, request, token);
            await using var writeLease = await boundary.EnterAsync(RecoveryAccess.Write, token);
            using var binding = boundary.BindLease(writeLease);
            await RetainTransitionBundleAsync(Path.Combine(bundle, "write-admission"), new Dictionary<string, byte[]> { ["write-input.json"] = writeBytes }, token);
            var execution = new V1TransitionExecution(this, sourceService, source, store, root, requestBytes, attemptBytes, writeBytes, request, readOnly);
            await execution.ValidateProducerAsync(token);
            if (!readOnly)
            {
                await execution.RetainPlanAsync(token);
                await store.CommitTransitionConversionAsync(execution.Selection.Recipes.Single(), execution.Conversion, execution, token);
            }
            var state = await execution.ReadStateAsync(token);
            var label = readOnly && state == "C" ? "D-reconciled-C" : state;
            var result = new V1TransitionOutcome(label, request.Selection.OperationId, request.Selection.Selected[0].RecipeId,
                request.Selection.Selected[0].OperationId, 46, state == "C" ? 1 : 0, state == "C" ? 197 : 198, 23, 36);
            await execution.RecordAsync(result, token);
            return result;
        }, ct);
    }

    internal sealed class V1TransitionExecution : IV1MigrationConversionAdmission
    {
        void IV1MigrationConversionAdmission.Validate(CancellationToken ct) => Validate(ct);
        Task IV1MigrationConversionAdmission.CheckpointAsync(string point, CancellationToken ct) => CheckpointAsync(point, ct);
        Task IV1MigrationConversionAdmission.LockAsync(RecipeDbContext db, CancellationToken ct) => LockAsync(db, ct);
        V1AuthorityTransitionContext IV1MigrationConversionAdmission.Context() => Context();
        Task<string> IV1MigrationConversionAdmission.AdmitAsync(V1AuthorityTransitionContext context, CancellationToken ct, bool revalidateSource)
            => AdmitAsync(context, ct, revalidateSource);
        private readonly RecoverySnapshotService owner, sourceService;
        private readonly V1TransitionSourceLease source;
        private readonly CanonicalRecipeContentStore store;
        private readonly string root, bundle;
        private readonly byte[] requestBytes, attemptBytes, writeBytes;
        private readonly V1TransitionRequest request;
        private readonly bool readOnly;
        private readonly Dictionary<string, byte[]> captures, producers;
        private readonly V1TransitionWitness conversionPgWitness, planPgWitness;
        private readonly MaintenanceCommand plan;
        private readonly MaintenanceCommandObservation planPg;
        private readonly CanonicalRecipeOperation conversionPg;
        internal CanonicalMigrationInventory Selection { get; }
        internal CanonicalRecipeOperation Conversion { get; }

        internal V1TransitionExecution(RecoverySnapshotService owner, RecoverySnapshotService sourceService, V1TransitionSourceLease source,
            CanonicalRecipeContentStore store, string root, byte[] requestBytes, byte[] attemptBytes, byte[] writeBytes,
            V1TransitionRequest request, bool readOnly)
        {
            this.owner = owner; this.sourceService = sourceService; this.source = source; this.store = store; this.root = root;
            this.requestBytes = requestBytes; this.attemptBytes = attemptBytes; this.writeBytes = writeBytes;
            this.request = request; this.readOnly = readOnly; bundle = V1AuthorityTransitionPolicy.Bundle(root);
            captures = new[] { "request.json", "attempt.json", "corpus-inventory.json", "selection-inventory.json" }
                .ToDictionary(x => x, x => File.ReadAllBytes(Path.Combine(bundle, "capture", x)), StringComparer.Ordinal);
            producers = V1AuthorityTransitionPolicy.ProducerNames.ToDictionary(x => x, x => File.ReadAllBytes(Path.Combine(bundle, "producer", x)), StringComparer.Ordinal);
            RequireInputs();
            Selection = TransitionRead<CanonicalMigrationInventory>(captures["selection-inventory.json"]);
            var corpus = TransitionRead<CanonicalMigrationInventory>(captures["corpus-inventory.json"]);
            RequireTransitionAccounting(root, corpus, Selection);
            FoodVocabularyDefinitions.Require(TransitionBytes(request.Selection).AsSpan().SequenceEqual(TransitionBytes(Selection.Request))
                && TransitionBytes(request.Corpus).AsSpan().SequenceEqual(TransitionBytes(corpus.Request)));
            var witnesses = producers.ToDictionary(x => Path.GetFileNameWithoutExtension(x.Key), x => TransitionRead<V1TransitionWitness>(x.Value));
            foreach (var (kind, witness) in witnesses)
                FoodVocabularyDefinitions.Require(witness.Version == 1 && witness.Kind == kind && witness.CaptureRequestSha256 == TransitionHash(requestBytes)
                    && witness.CaptureAttemptSha256 == TransitionHash(attemptBytes) && witness.CorpusInventorySha256 == TransitionHash(captures["corpus-inventory.json"])
                    && witness.SelectionInventorySha256 == TransitionHash(captures["selection-inventory.json"])
                    && witness.PlanOperationId == request.Selection.OperationId && witness.RecipeId == request.Selection.Selected[0].RecipeId
                    && witness.ConversionOperationId == request.Selection.Selected[0].OperationId);
            plan = TransitionRead<MaintenanceCommand>(witnesses["plan-producer"].TypedOutputUtf8);
            planPgWitness = witnesses["plan-postgres"];
            planPg = TransitionRead<MaintenanceCommandObservation>(planPgWitness.TypedOutputUtf8);
            Conversion = TransitionRead<CanonicalRecipeOperation>(witnesses["conversion-producer"].TypedOutputUtf8);
            conversionPgWitness = witnesses["conversion-postgres"];
            conversionPg = TransitionRead<CanonicalRecipeOperation>(conversionPgWitness.TypedOutputUtf8);
            var expectedPlan = CanonicalRecipeMigrationReceipt.Plan(Selection, request.CandidateCommit, request.CapturedAt);
            FoodVocabularyDefinitions.Require(TransitionBytes(plan).AsSpan().SequenceEqual(TransitionBytes(expectedPlan))
                && Conversion.CreatedAt == request.CapturedAt && conversionPg.CreatedAt == request.CapturedAt);
            _ = CanonicalRecipeContentStore.ReadValidatedRetainedResult(Conversion);
            foreach (var (kind, requestText, resultText) in new[] { ("plan-producer", plan.Payload, plan.Result!),
                ("plan-postgres", planPg.Payload, planPg.Result!), ("conversion-producer", Conversion.OriginalRequest!, Conversion.Result),
                ("conversion-postgres", conversionPg.OriginalRequest!, conversionPg.Result) })
                FoodVocabularyDefinitions.Require(witnesses[kind].RequestUtf8.AsSpan().SequenceEqual(TransitionUtf8.GetBytes(requestText))
                    && witnesses[kind].ResultUtf8.AsSpan().SequenceEqual(TransitionUtf8.GetBytes(resultText)));
            FoodVocabularyDefinitions.Require(witnesses["plan-producer"].RowUtf8.AsSpan().SequenceEqual(planPgWitness.RowUtf8)
                && witnesses["conversion-producer"].RowUtf8.AsSpan().SequenceEqual(conversionPgWitness.RowUtf8));
            foreach (var witness in witnesses.Values)
                FoodVocabularyDefinitions.Require(witness.RecipeBeforeUtf8.AsSpan().SequenceEqual(conversionPgWitness.RecipeBeforeUtf8)
                    && witness.RecipeAfterUtf8.AsSpan().SequenceEqual(conversionPgWitness.RecipeAfterUtf8)
                    && witness.SearchBeforeUtf8.AsSpan().SequenceEqual(conversionPgWitness.SearchBeforeUtf8)
                    && witness.SearchAfterUtf8.AsSpan().SequenceEqual(conversionPgWitness.SearchAfterUtf8));
        }

        private void RequireInputs()
        {
            V1AuthorityTransitionPolicy.RequireCallerInputs(root, requestBytes, attemptBytes, writeBytes);
            _ = V1AuthorityTransitionPolicy.WriteAdmission(root, requestBytes, attemptBytes, writeBytes);
            RequireTransitionBuild(root, request);
            FoodVocabularyDefinitions.Require(captures["request.json"].AsSpan().SequenceEqual(requestBytes)
                && captures["attempt.json"].AsSpan().SequenceEqual(attemptBytes));
            RequireTransitionBundle(Path.Combine(bundle, "capture"), captures);
            RequireTransitionBundle(Path.Combine(bundle, "producer"), producers);
        }

        internal void Validate(CancellationToken ct)
        {
            ct.ThrowIfCancellationRequested();
            if (!readOnly) owner.RequireTransitionDate(request);
            owner.TransitionBoundary.ValidateMaintenanceInvocation(request.Selection.OperationId, request.CandidateCommit, request.ApiAssemblySha256);
        }
        internal Task CheckpointAsync(string point, CancellationToken ct)
            => owner.TransitionCheckpointAsync(point, ct);
        internal async Task LockAsync(RecipeDbContext db, CancellationToken ct)
        {
            FoodVocabularyDefinitions.Require(ReferenceEquals(db, owner.TransitionDb));
            Validate(ct);
            await owner.LockTransitionRemainderAsync(request, ct);
        }
        internal V1AuthorityTransitionContext Context()
            => new(owner.TransitionDb, owner.TransitionRoots, owner.TransitionBoundary, source.Authority, source.Facts,
                request.Selection.OperationId, request.CandidateCommit, request.ApiAssemblySha256, planPg, conversionPg);

        internal async Task ValidateProducerAsync(CancellationToken ct)
        {
            // Independently derive the PG projections from the retained original
            // graph, never from a modified execution row or a journal's own hash.
            var projectedPlan = await sourceService.ProjectTransitionPlanAsync(plan, ct);
            var projectedConversion = await sourceService.ProjectTransitionConversionAsync(Conversion, ct);
            FoodVocabularyDefinitions.Require(TransitionBytes(projectedPlan).AsSpan().SequenceEqual(TransitionBytes(planPg))
                && TransitionBytes(projectedConversion).AsSpan().SequenceEqual(TransitionBytes(conversionPg))
                && (await sourceService.TransitionRowAsync("recipes", Conversion.RecipeId, ct)).AsSpan().SequenceEqual(conversionPgWitness.RecipeBeforeUtf8)
                && (await sourceService.TransitionRowAsync("recipe_search_documents", Conversion.RecipeId, ct)).AsSpan().SequenceEqual(conversionPgWitness.SearchBeforeUtf8));
            FoodVocabularyDefinitions.Require((await sourceService.ProjectTransitionCommandRowAsync(projectedPlan, ct)).AsSpan().SequenceEqual(planPgWitness.RowUtf8)
                && (await sourceService.ProjectTransitionCanonicalRowAsync(projectedConversion, ct)).AsSpan().SequenceEqual(conversionPgWitness.RowUtf8));
            var after = await sourceService.ProjectTransitionRowsAsync(Conversion, ct);
            FoodVocabularyDefinitions.Require(after.Recipe.AsSpan().SequenceEqual(conversionPgWitness.RecipeAfterUtf8)
                && after.Search.AsSpan().SequenceEqual(conversionPgWitness.SearchAfterUtf8));
        }

        internal async Task<string> AdmitAsync(V1AuthorityTransitionContext context, CancellationToken ct, bool revalidateSource = true)
        {
            Validate(ct);
            context.RequireOwner(owner.TransitionDb, owner.TransitionRoots);
            if (revalidateSource)
            {
                await source.RevalidateAsync(ct);
                await CheckpointAsync("v1-transition-final-source-validated", ct);
            }
            await source.RequireBeforeImagesAsync(ct);
            RequireInputs();
            await owner.RequireTransitionOriginalBaselineAsync(request, sourceService, Selection, ct, compareTables: false);
            using var admitted = new V1MigrationSource(source.Protection, source.Identity, source.Attestation,
                owner.TransitionDb, owner.TransitionRoots, context);
            await store.RequireTransitionAdmissionAsync(Selection, plan, owner, owner.TransitionRoots, admitted, ct);
            var actualPlan = await CanonicalRecipeMigrationReceipt.FindAsync(owner.TransitionDb, plan.Id, ct);
            var actualConversion = await owner.TransitionDb.CanonicalRecipeOperations.AsNoTracking().SingleOrDefaultAsync(x =>
                x.RecipeId == Conversion.RecipeId && x.OperationId == Conversion.OperationId, ct);
            FoodVocabularyDefinitions.Require(actualConversion is null || actualPlan is not null);
            var state = actualConversion is not null ? "C" : actualPlan is not null ? "B" : "A";
            var planRow = await owner.TransitionReceiptRowAsync("maintenance_commands", plan.Id, null, ct);
            var conversionRow = await owner.TransitionReceiptRowAsync("canonical_recipe_operations", Conversion.OperationId, Conversion.RecipeId, ct);
            FoodVocabularyDefinitions.Require(state == "A" ? planRow is null : planRow is not null && planRow.AsSpan().SequenceEqual(planPgWitness.RowUtf8));
            FoodVocabularyDefinitions.Require(state != "C" ? conversionRow is null : conversionRow is not null && conversionRow.AsSpan().SequenceEqual(conversionPgWitness.RowUtf8));
            FoodVocabularyDefinitions.Require((await owner.TransitionRowAsync("recipes", Conversion.RecipeId, ct)).AsSpan()
                .SequenceEqual(state == "C" ? conversionPgWitness.RecipeAfterUtf8 : conversionPgWitness.RecipeBeforeUtf8)
                && (await owner.TransitionRowAsync("recipe_search_documents", Conversion.RecipeId, ct)).AsSpan()
                .SequenceEqual(state == "C" ? conversionPgWitness.SearchAfterUtf8 : conversionPgWitness.SearchBeforeUtf8));
            RequireInputs();
            Validate(ct);
            return state;
        }

        internal async Task RetainPlanAsync(CancellationToken ct)
        {
            Validate(ct); await CheckpointAsync("v1-transition-B-before-lock", ct);
            await using var transaction = await RecipeRotation.LockAsync(owner.TransitionDb, Conversion.RecipeId, ct, lockSupperInputs: true);
            await LockAsync(owner.TransitionDb, ct);
            using var context = Context();
            await CheckpointAsync("v1-transition-B-locked", ct);
            var state = await AdmitAsync(context, ct, revalidateSource: false);
            if (state != "A") { await transaction!.RollbackAsync(ct); return; }
            await store.RequireMigrationPreparationAsync(Selection.Recipes.Single(), Conversion, context, ct);
            await CheckpointAsync("v1-transition-B-before-save", ct); Validate(ct);
            owner.TransitionDb.MaintenanceCommands.Add(TransitionRead<MaintenanceCommand>(TransitionBytes(plan)));
            await owner.TransitionDb.SaveChangesAsync(ct);
            await CheckpointAsync("v1-transition-B-after-save", ct);
            await CheckpointAsync("v1-transition-B-before-commit", ct);
            FoodVocabularyDefinitions.Require(await AdmitAsync(context, ct) == "B");
            Validate(ct); await transaction!.CommitAsync(ct);
            await CheckpointAsync("v1-transition-B-after-commit", ct);
        }

        internal async Task<string> ReadStateAsync(CancellationToken ct)
        {
            Validate(ct);
            await using var transaction = await RecipeRotation.LockAsync(owner.TransitionDb, Conversion.RecipeId, ct, lockSupperInputs: true);
            await LockAsync(owner.TransitionDb, ct);
            using var context = Context();
            var state = await AdmitAsync(context, ct);
            await transaction!.RollbackAsync(ct);
            return state;
        }

        internal async Task RecordAsync(V1TransitionOutcome outcome, CancellationToken ct)
        {
            RequireInputs(); Validate(ct);
            await using var transaction = await RecipeRotation.LockAsync(owner.TransitionDb, Conversion.RecipeId, ct, lockSupperInputs: true);
            await LockAsync(owner.TransitionDb, ct);
            using var context = Context();
            var state = await AdmitAsync(context, ct);
            FoodVocabularyDefinitions.Require(outcome.Converted == (state == "C" ? 1 : 0));
            using var admitted = new V1MigrationSource(source.Protection, source.Identity, source.Attestation,
                owner.TransitionDb, owner.TransitionRoots, context);
            var observedInventory = await store.ObserveAttestedMigrationManifestAsync(request.Selection, owner.TransitionRoots, admitted, request.EvaluationDate, ct);
            var actualPlan = await CanonicalRecipeMigrationReceipt.FindAsync(owner.TransitionDb, plan.Id, ct);
            var actualConversion = await owner.TransitionDb.CanonicalRecipeOperations.AsNoTracking().SingleOrDefaultAsync(x =>
                x.RecipeId == Conversion.RecipeId && x.OperationId == Conversion.OperationId, ct);
            var observed = new Dictionary<string, byte[]>
            {
                ["state.json"] = TransitionBytes(new
                {
                    version = 1,
                    requestSha256 = TransitionHash(requestBytes),
                    attemptSha256 = TransitionHash(attemptBytes),
                    writeInputSha256 = TransitionHash(writeBytes),
                    outcome
                }),
                ["inventory.json"] = TransitionBytes(observedInventory),
                ["plan.json"] = TransitionBytes(actualPlan),
                ["conversion.json"] = TransitionBytes(actualConversion),
                ["plan-row.json"] = await owner.TransitionReceiptRowAsync("maintenance_commands", plan.Id, null, ct) ?? "null"u8.ToArray(),
                ["conversion-row.json"] = await owner.TransitionReceiptRowAsync("canonical_recipe_operations", Conversion.OperationId, Conversion.RecipeId, ct) ?? "null"u8.ToArray(),
                ["recipe.json"] = await owner.TransitionRowAsync("recipes", Conversion.RecipeId, ct),
                ["search.json"] = await owner.TransitionRowAsync("recipe_search_documents", Conversion.RecipeId, ct)
            };
            await RetainTransitionBundleAsync(Path.Combine(bundle, "invocations", Guid.NewGuid().ToString("N")), observed, ct);
            RequireInputs(); Validate(ct);
            await transaction!.RollbackAsync(ct);
        }

    }

    private Task TransitionCheckpointAsync(string point, CancellationToken ct)
        => checkpoint?.ReachedAsync(point, ct) ?? Task.CompletedTask;
}
