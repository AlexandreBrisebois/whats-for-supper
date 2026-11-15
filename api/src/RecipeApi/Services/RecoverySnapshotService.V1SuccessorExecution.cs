using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;

namespace RecipeApi.Services;

public partial class RecoverySnapshotService
{
    internal Task<V1SuccessorOutcome> ExecuteAttestedV1RemainingRecipeStageAsync(string root, byte[] request, byte[] attempt,
        byte[] write, string bundle, RecoverySnapshotService sourceService, CanonicalRecipeContentStore store,
        RecipesRootResolver roots, CancellationToken ct)
        => RunSuccessorAsync(root, request, attempt, write, bundle, sourceService, store, roots, false, ct);
    internal Task<V1SuccessorOutcome> ReadAttestedV1RemainingRecipeStageAsync(string root, byte[] request, byte[] attempt,
        byte[] write, string bundle, RecoverySnapshotService sourceService, CanonicalRecipeContentStore store,
        RecipesRootResolver roots, CancellationToken ct)
        => RunSuccessorAsync(root, request, attempt, write, bundle, sourceService, store, roots, true, ct);

    private async Task<V1SuccessorOutcome> RunSuccessorAsync(string root, byte[] requestBytes, byte[] attemptBytes, byte[] writeBytes,
        string bundle, RecoverySnapshotService sourceService, CanonicalRecipeContentStore store, RecipesRootResolver roots,
        bool readOnly, CancellationToken ct)
    {
        requestBytes = requestBytes.ToArray(); attemptBytes = attemptBytes.ToArray(); writeBytes = writeBytes.ToArray();
        using var deadline = CancellationTokenSource.CreateLinkedTokenSource(ct);
        deadline.CancelAfter(TimeSpan.FromSeconds(Math.Clamp(configuration.GetValue("Recovery:MaxFreezeSeconds", 30), 1, 3600)));
        ct = deadline.Token;
        var request = V1AuthoritySuccessorPolicy.Request(root, requestBytes);
        var runtime = request.Runtime;
        _ = V1AuthoritySuccessorPolicy.WriteAdmission(root, requestBytes, attemptBytes, writeBytes);
        V1AuthoritySuccessorPolicy.Attempt(requestBytes, attemptBytes, new DeploymentCalendar(configuration));
        FoodVocabularyDefinitions.Require(bundle == V1AuthoritySuccessorPolicy.Bundle(root));
        RequireTransitionBuild(root, runtime, bundle);
        await RequireTransitionGraphsAsync(runtime, sourceService, roots, ct);
        return await boundary.RunMaintenanceAsync(runtime.Selection.OperationId, runtime.CandidateCommit, TransitionHash(runtime.HoldAfterBytes), async token =>
        {
            if (!readOnly) RequireTransitionDate(runtime);
            // Both independently admitted source databases remain SHARE locked
            // through this invocation. Each short execution transaction obtains a
            // fresh revocable context and rereads complete execution deltas plus
            // all source before-images after its final-source checkpoint. Initial
            // and final full readmission avoid reconstructing the locked original
            // source once per recipe without caching any execution capability.
            await using var source = await sourceService.OpenTransitionSourceAsync(root, runtime.SourceDataRoot, runtime, token);
            await using var writeLease = await boundary.EnterAsync(RecoveryAccess.Write, token);
            using var binding = boundary.BindLease(writeLease);
            var execution = new V1SuccessorExecution(this, sourceService, source, store, root, requestBytes, attemptBytes, writeBytes, request, readOnly);
            await execution.ValidateProducersAsync(token);
            await RetainTransitionBundleAsync(Path.Combine(bundle, "write-admission"), new Dictionary<string, byte[]> { ["write-input.json"] = writeBytes }, token);
            if (!readOnly)
            {
                await execution.RetainPlanAsync(token);
                foreach (var item in execution.Inventory.Recipes)
                    await store.CommitTransitionConversionAsync(item, execution.Producer(item.RecipeId).Prepared, execution.For(item), token);
            }
            await source.RevalidateAsync(token);
            return await execution.RecordAsync(token);
        }, ct);
    }

    private sealed class V1SuccessorExecution
    {
        private readonly RecoverySnapshotService owner, original;
        private readonly V1TransitionSourceLease source;
        private readonly CanonicalRecipeContentStore store;
        private readonly string root, bundle;
        private readonly byte[] requestBytes, attemptBytes, writeBytes;
        private readonly V1SuccessorRequest request;
        private readonly V1TransitionRequest runtime;
        private readonly bool readOnly;
        private readonly SuccessorPrior prior;
        private readonly V1SuccessorPlan plan;
        private readonly V1SuccessorPreparation[] outcomes;
        private readonly Dictionary<Guid, V1SuccessorProducer> producers;
        private readonly Dictionary<string, byte[]> captures, producerBytes;
        internal CanonicalMigrationInventory Inventory { get; }
        internal V1SuccessorProducer Producer(Guid recipe) => producers[recipe];

        internal V1SuccessorExecution(RecoverySnapshotService owner, RecoverySnapshotService original, V1TransitionSourceLease source,
            CanonicalRecipeContentStore store, string root, byte[] requestBytes, byte[] attemptBytes, byte[] writeBytes,
            V1SuccessorRequest request, bool readOnly)
        {
            this.owner = owner; this.original = original; this.source = source; this.store = store; this.root = root;
            this.requestBytes = requestBytes; this.attemptBytes = attemptBytes; this.writeBytes = writeBytes;
            this.request = request; runtime = request.Runtime; this.readOnly = readOnly; bundle = V1AuthoritySuccessorPolicy.Bundle(root);
            prior = LoadSuccessorPrior(root, request);
            captures = new[] { "request.json", "attempt.json", "selection-inventory.json", "outcomes.json" }
                .ToDictionary(x => x, x => File.ReadAllBytes(Path.Combine(bundle, "capture", x)), StringComparer.Ordinal);
            outcomes = TransitionRead<V1SuccessorPreparation[]>(captures["outcomes.json"]);
            FoodVocabularyDefinitions.Require(outcomes.Length == 197 && outcomes.Select(x => x.RecipeId).Distinct().Count() == 197
                && runtime.Selection.Selected.All(x => outcomes.Count(y => y.RecipeId == x.RecipeId && y.OperationId == x.OperationId
                    && y.Outcome is "eligible" or "deferred" && (y.Outcome == "eligible" ? y.Reason is null : y.Reason is not null)) == 1));
            var eligible = outcomes.Where(x => x.Outcome == "eligible").Select(x => new CanonicalMigrationSelection(x.RecipeId, x.OperationId)).ToArray();
            Inventory = TransitionRead<CanonicalMigrationInventory>(captures["selection-inventory.json"]);
            FoodVocabularyDefinitions.Require(TransitionBytes(Inventory).AsSpan().SequenceEqual(TransitionBytes(
                SuccessorInventory(prior.Corpus, runtime.Selection with { Selected = eligible }, runtime.EvaluationDate, runtime.HoldAfterBytes))));
            producerBytes = eligible.Select(x => x.RecipeId.ToString("N") + ".json").Append("plan.json")
                .ToDictionary(x => x, x => File.ReadAllBytes(Path.Combine(bundle, "producer", x)), StringComparer.Ordinal);
            plan = TransitionRead<V1SuccessorPlan>(producerBytes["plan.json"]);
            producers = eligible.ToDictionary(x => x.RecipeId, x => TransitionRead<V1SuccessorProducer>(producerBytes[x.RecipeId.ToString("N") + ".json"]));
            FoodVocabularyDefinitions.Require(TransitionBytes(plan.Prepared).AsSpan().SequenceEqual(TransitionBytes(
                CanonicalRecipeMigrationReceipt.Plan(Inventory, runtime.CandidateCommit, runtime.CapturedAt))));
            RequireInputs();
        }

        private void RequireInputs()
        {
            _ = V1AuthoritySuccessorPolicy.WriteAdmission(root, requestBytes, attemptBytes, writeBytes);
            RequireTransitionBuild(root, runtime, bundle);
            FoodVocabularyDefinitions.Require(captures["request.json"].AsSpan().SequenceEqual(requestBytes) && captures["attempt.json"].AsSpan().SequenceEqual(attemptBytes));
            RequireTransitionBundle(Path.Combine(bundle, "capture"), captures);
            RequireTransitionBundle(Path.Combine(bundle, "producer"), producerBytes);
        }
        internal void Validate(CancellationToken ct)
        {
            ct.ThrowIfCancellationRequested();
            if (!readOnly) owner.RequireTransitionDate(runtime);
            owner.TransitionBoundary.ValidateMaintenanceInvocation(runtime.Selection.OperationId, runtime.CandidateCommit, runtime.ApiAssemblySha256);
        }
        internal V1AuthorityTransitionContext Context() => new(owner.TransitionDb, owner.TransitionRoots, owner.TransitionBoundary,
            source.Authority, source.Facts, runtime.Selection.OperationId, runtime.CandidateCommit, runtime.ApiAssemblySha256,
            new[] { TransitionRead<MaintenanceCommandObservation>(prior.PlanWitness.TypedOutputUtf8), plan.Postgres },
            producers.Values.Select(x => x.Postgres).Prepend(prior.Predecessor.Conversion).ToArray());

        internal async Task ValidateProducersAsync(CancellationToken ct)
        {
            await owner.ValidateSuccessorPriorAsync(prior, original, source.Facts, ct);
            await owner.RequireTransitionOriginalBaselineAsync(runtime with { HoldBeforeBytes = prior.Request.HoldBeforeBytes }, original, prior.Corpus, ct);
            FoodVocabularyDefinitions.Require(TransitionBytes(await original.ProjectTransitionPlanAsync(plan.Prepared, ct)).AsSpan().SequenceEqual(TransitionBytes(plan.Postgres))
                && (await original.ProjectTransitionCommandRowAsync(plan.Postgres, ct)).AsSpan().SequenceEqual(plan.Row));
            foreach (var item in Inventory.Recipes)
            {
                var producer = producers[item.RecipeId];
                await CanonicalRecipeContentStore.RequireOriginalPreparedConversionAsync(original.TransitionDb, item, producer.Prepared, source.Facts, ct);
                await ValidateSuccessorProducerAsync(original, item, producer, runtime, ct);
            }
        }

        private async Task<int> AdmitAsync(V1AuthorityTransitionContext context, CancellationToken ct)
        {
            Validate(ct); context.RequireOwner(owner.TransitionDb, owner.TransitionRoots);
            await owner.TransitionCheckpointAsync("v1-successor-final-source-validated", ct);
            await source.RequireBeforeImagesAsync(ct);
            RequireInputs();
            await owner.RequireTransitionOriginalBaselineAsync(runtime with { HoldBeforeBytes = prior.Request.HoldBeforeBytes }, original, prior.Corpus, ct, compareTables: false);
            using var admitted = new V1MigrationSource(source.Protection, source.Identity, source.Attestation, owner.TransitionDb, owner.TransitionRoots, context);
            await store.RequireRemainingTransitionAdmissionAsync(Inventory, plan.Prepared, owner, owner.TransitionRoots, admitted, prior.Predecessor, ct);
            await owner.RequireSuccessorPriorRowsAsync(prior, ct);
            foreach (var week in Inventory.Weeks)
                FoodVocabularyDefinitions.Require(await CanonicalRecipeMigrationReceipt.FindAsync(owner.TransitionDb,
                    CanonicalRecipeMigrationReceipt.WeekReceiptId(plan.Prepared.Id, week.WeekStart), ct) is null);
            var planRow = await owner.TransitionReceiptRowAsync("maintenance_commands", plan.Prepared.Id, null, ct);
            if (planRow is not null) FoodVocabularyDefinitions.Require(planRow.AsSpan().SequenceEqual(plan.Row));
            var converted = 0;
            foreach (var producer in producers.Values)
            {
                var row = await owner.TransitionReceiptRowAsync("canonical_recipe_operations", producer.OperationId, producer.RecipeId, ct);
                if (row is not null)
                {
                    FoodVocabularyDefinitions.Require(planRow is not null && row.AsSpan().SequenceEqual(producer.OperationRow));
                    converted++;
                }
                FoodVocabularyDefinitions.Require((await owner.TransitionRowAsync("recipes", producer.RecipeId, ct)).AsSpan()
                    .SequenceEqual(row is null ? producer.RecipeBefore : producer.RecipeAfter)
                    && (await owner.TransitionRowAsync("recipe_search_documents", producer.RecipeId, ct)).AsSpan()
                    .SequenceEqual(row is null ? producer.SearchBefore : producer.SearchAfter));
            }
            RequireInputs(); Validate(ct);
            return converted;
        }

        internal async Task RetainPlanAsync(CancellationToken ct)
        {
            Validate(ct); await owner.TransitionCheckpointAsync("v1-successor-B-before-lock", ct);
            await using var transaction = await RecipeRotation.LockAsync(owner.TransitionDb, Inventory.Recipes[0].RecipeId, ct, lockSupperInputs: true);
            await owner.LockTransitionRemainderAsync(runtime, ct);
            using var context = Context();
            _ = await AdmitAsync(context, ct);
            if (await CanonicalRecipeMigrationReceipt.FindAsync(owner.TransitionDb, plan.Prepared.Id, ct) is not null)
            { await transaction!.RollbackAsync(ct); return; }
            foreach (var item in Inventory.Recipes) await store.RequireMigrationPreparationAsync(item, producers[item.RecipeId].Prepared, context, ct);
            Validate(ct); await owner.TransitionCheckpointAsync("v1-successor-B-before-save", ct);
            owner.TransitionDb.MaintenanceCommands.Add(TransitionRead<MaintenanceCommand>(TransitionBytes(plan.Prepared)));
            await owner.TransitionDb.SaveChangesAsync(ct);
            await owner.TransitionCheckpointAsync("v1-successor-B-after-save", ct);
            _ = await AdmitAsync(context, ct);
            Validate(ct); await transaction!.CommitAsync(ct);
            await owner.TransitionCheckpointAsync("v1-successor-B-after-commit", ct);
        }

        internal IV1MigrationConversionAdmission For(CanonicalMigrationRecipe recipe) => new ConversionAdmission(this, recipe);
        private sealed class ConversionAdmission(V1SuccessorExecution execution, CanonicalMigrationRecipe recipe) : IV1MigrationConversionAdmission
        {
            public void Validate(CancellationToken ct) => execution.Validate(ct);
            public Task CheckpointAsync(string point, CancellationToken ct) => execution.owner.TransitionCheckpointAsync(point.Replace("v1-transition-", "v1-successor-"), ct);
            public Task LockAsync(RecipeDbContext db, CancellationToken ct)
            {
                FoodVocabularyDefinitions.Require(ReferenceEquals(db, execution.owner.TransitionDb));
                return execution.owner.LockTransitionRemainderAsync(execution.runtime, ct);
            }
            public V1AuthorityTransitionContext Context() => execution.Context();
            public async Task<string> AdmitAsync(V1AuthorityTransitionContext context, CancellationToken ct, bool revalidateSource = true)
            {
                _ = await execution.AdmitAsync(context, ct);
                var retained = await execution.owner.TransitionDb.CanonicalRecipeOperations.AsNoTracking().AnyAsync(x => x.RecipeId == recipe.RecipeId && x.OperationId == recipe.OperationId, ct);
                if (retained) return "C";
                return await CanonicalRecipeMigrationReceipt.FindAsync(execution.owner.TransitionDb, execution.plan.Prepared.Id, ct) is null ? "A" : "B";
            }
        }

        internal async Task<V1SuccessorOutcome> RecordAsync(CancellationToken ct)
        {
            await using var transaction = await RecipeRotation.LockAsync(owner.TransitionDb, Inventory.Recipes[0].RecipeId, ct, lockSupperInputs: true);
            await owner.LockTransitionRemainderAsync(runtime, ct);
            using var context = Context();
            var converted = await AdmitAsync(context, ct);
            var result = new V1SuccessorOutcome(readOnly && converted == producers.Count ? "D-reconciled-recipes" : "recipes-checkpoint",
                runtime.Selection.OperationId, 46, 23, 1, converted, outcomes.Count(x => x.Outcome == "deferred"), producers.Count - converted, 36);
            var outputs = new Dictionary<string, byte[]>
            {
                ["request.json"] = requestBytes,
                ["attempt.json"] = attemptBytes,
                ["write-input.json"] = writeBytes,
                ["state.json"] = TransitionBytes(result),
                ["outcomes.json"] = TransitionBytes(outcomes)
            };
            var planRow = await owner.TransitionReceiptRowAsync("maintenance_commands", plan.Prepared.Id, null, ct);
            outputs["plan-row.json"] = planRow ?? "null"u8.ToArray();
            foreach (var producer in producers.Values)
            {
                outputs[producer.RecipeId.ToString("N") + "-operation.json"] = await owner.TransitionReceiptRowAsync("canonical_recipe_operations", producer.OperationId, producer.RecipeId, ct) ?? "null"u8.ToArray();
                outputs[producer.RecipeId.ToString("N") + "-recipe.json"] = await owner.TransitionRowAsync("recipes", producer.RecipeId, ct);
                outputs[producer.RecipeId.ToString("N") + "-search.json"] = await owner.TransitionRowAsync("recipe_search_documents", producer.RecipeId, ct);
            }
            await RetainTransitionBundleAsync(Path.Combine(bundle, "invocations", Guid.NewGuid().ToString("N")), outputs, ct);
            RequireInputs(); Validate(ct); await transaction!.RollbackAsync(ct);
            return result;
        }
    }
}
