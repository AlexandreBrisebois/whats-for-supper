using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;

namespace RecipeApi.Services;

internal sealed record V1SuccessorPreparation(Guid RecipeId, Guid OperationId, string Outcome, string? Reason);
internal sealed record V1SuccessorProducer(Guid RecipeId, Guid OperationId, CanonicalRecipeOperation Prepared,
    CanonicalRecipeOperation Postgres, byte[] OperationRow, byte[] RecipeBefore, byte[] RecipeAfter, byte[] SearchBefore, byte[] SearchAfter);
internal sealed record V1SuccessorPlan(MaintenanceCommand Prepared, MaintenanceCommandObservation Postgres, byte[] Row);
internal sealed record V1SuccessorOutcome(string State, Guid OperationId, int OriginalReceipts, int OriginalDeferred,
    int TracerConverted, int Converted, int Deferred, int Remaining, int Weeks);

public partial class RecoverySnapshotService
{
    private sealed record SuccessorPrior(V1TransitionRequest Request, CanonicalMigrationInventory Corpus,
        CanonicalMigrationInventory Selection, V1MigrationPredecessor Predecessor, V1TransitionWitness PlanWitness,
        V1TransitionWitness ConversionWitness, CanonicalRecipeOperation Prepared);

    private static SuccessorPrior LoadSuccessorPrior(string root, V1SuccessorRequest successor)
    {
        var oldBundle = V1AuthorityTransitionPolicy.Bundle(root);
        byte[] Bytes(string path) => V1AuthoritySuccessorPolicy.Predecessor(root, path);
        var request = TransitionRead<V1TransitionRequest>(Bytes("caller/capture-request.json"));
        RequireTransitionBuild(root, request);
        foreach (var (directory, names) in new[] {
            ("capture", new[] { "request.json", "attempt.json", "corpus-inventory.json", "selection-inventory.json" }),
            ("producer", V1AuthorityTransitionPolicy.ProducerNames), ("write-admission", new[] { "write-input.json" }),
            (Path.GetDirectoryName(successor.TracerReadbackFiles[0].Path)!, V1AuthoritySuccessorPolicy.ReadbackNames.Where(x => x != "complete.json").ToArray()) })
            RequireTransitionBundle(Path.Combine(oldBundle, directory), names.ToDictionary(x => x, x => Bytes(directory + "/" + x), StringComparer.Ordinal));
        FoodVocabularyDefinitions.Require(Bytes("caller/capture-request.json").AsSpan().SequenceEqual(Bytes("capture/request.json"))
            && Bytes("caller/capture-attempt.json").AsSpan().SequenceEqual(Bytes("capture/attempt.json"))
            && Bytes("caller/write-input.json").AsSpan().SequenceEqual(Bytes("write-admission/write-input.json")));
        var corpus = TransitionRead<CanonicalMigrationInventory>(Bytes("capture/corpus-inventory.json"));
        var selection = TransitionRead<CanonicalMigrationInventory>(Bytes("capture/selection-inventory.json"));
        RequireTransitionAccounting(root, corpus, selection);
        var witnesses = V1AuthorityTransitionPolicy.ProducerNames.ToDictionary(x => Path.GetFileNameWithoutExtension(x), x => TransitionRead<V1TransitionWitness>(Bytes("producer/" + x)));
        foreach (var (kind, witness) in witnesses)
            FoodVocabularyDefinitions.Require(witness.Version == 1 && witness.Kind == kind
                && witness.CaptureRequestSha256 == TransitionHash(Bytes("caller/capture-request.json"))
                && witness.CaptureAttemptSha256 == TransitionHash(Bytes("caller/capture-attempt.json"))
                && witness.CorpusInventorySha256 == TransitionHash(Bytes("capture/corpus-inventory.json"))
                && witness.SelectionInventorySha256 == TransitionHash(Bytes("capture/selection-inventory.json"))
                && witness.PlanOperationId == request.Selection.OperationId && witness.RecipeId == request.Selection.Selected[0].RecipeId
                && witness.ConversionOperationId == request.Selection.Selected[0].OperationId);
        var plan = TransitionRead<MaintenanceCommand>(witnesses["plan-producer"].TypedOutputUtf8);
        var planPg = TransitionRead<MaintenanceCommandObservation>(witnesses["plan-postgres"].TypedOutputUtf8);
        var conversion = TransitionRead<CanonicalRecipeOperation>(witnesses["conversion-producer"].TypedOutputUtf8);
        var conversionPg = TransitionRead<CanonicalRecipeOperation>(witnesses["conversion-postgres"].TypedOutputUtf8);
        FoodVocabularyDefinitions.Require(TransitionBytes(plan).AsSpan().SequenceEqual(TransitionBytes(CanonicalRecipeMigrationReceipt.Plan(selection, request.CandidateCommit, request.CapturedAt)))
            && conversion.CreatedAt == request.CapturedAt && conversionPg.CreatedAt == request.CapturedAt);
        foreach (var (kind, input, output) in new[] { ("plan-producer", plan.Payload, plan.Result!), ("plan-postgres", planPg.Payload, planPg.Result!),
            ("conversion-producer", conversion.OriginalRequest!, conversion.Result), ("conversion-postgres", conversionPg.OriginalRequest!, conversionPg.Result) })
            FoodVocabularyDefinitions.Require(witnesses[kind].RequestUtf8.AsSpan().SequenceEqual(TransitionUtf8.GetBytes(input))
                && witnesses[kind].ResultUtf8.AsSpan().SequenceEqual(TransitionUtf8.GetBytes(output)));
        _ = CanonicalRecipeContentStore.ReadValidatedRetainedResult(conversion);
        _ = CanonicalRecipeContentStore.ReadValidatedRetainedResult(conversionPg);
        return new(request, corpus, selection, new(selection.Recipes.Single(), plan, conversionPg), witnesses["plan-postgres"], witnesses["conversion-postgres"], conversion);
    }

    private static CanonicalMigrationInventory SuccessorInventory(CanonicalMigrationInventory original, CanonicalMigrationRequest request, DateOnly date, byte[] holdAfter)
    {
        var selection = request.Selected.Select(x => original.Recipes.Single(item => item.RecipeId == x.RecipeId) with { OperationId = x.OperationId }).ToArray();
        FoodVocabularyDefinitions.Require(original.Files.Count(x => x.Path == ".maintenance-hold.json") == 1);
        var files = original.Files.Select(x => x.Path == ".maintenance-hold.json"
            ? new CanonicalMigrationFile(x.Path, holdAfter.LongLength, TransitionHash(holdAfter)) : x).ToArray();
        var inventory = original with { Request = request, Recipes = selection, Files = files, EvaluationDate = date, ObservationSha256 = "" };
        return inventory with { ObservationSha256 = TransitionHash(TransitionBytes(inventory)) };
    }

    private async Task ValidateSuccessorPriorAsync(SuccessorPrior prior, RecoverySnapshotService original, FoodVocabularyInventoryFacts originalFacts, CancellationToken ct)
    {
        await CanonicalRecipeContentStore.RequireOriginalTransitionRecipesAsync(original.TransitionDb, prior.Corpus, ct);
        await CanonicalRecipeContentStore.RequireOriginalPreparedConversionAsync(original.TransitionDb, prior.Predecessor.Recipe, prior.Prepared, originalFacts, ct);
        FoodVocabularyDefinitions.Require(TransitionBytes(await original.ProjectTransitionPlanAsync(prior.Predecessor.Plan, ct)).AsSpan()
            .SequenceEqual(prior.PlanWitness.TypedOutputUtf8)
            && TransitionBytes(await original.ProjectTransitionConversionAsync(prior.Prepared, ct)).AsSpan().SequenceEqual(prior.ConversionWitness.TypedOutputUtf8)
            && (await original.ProjectTransitionCommandRowAsync(TransitionRead<MaintenanceCommandObservation>(prior.PlanWitness.TypedOutputUtf8), ct)).AsSpan().SequenceEqual(prior.PlanWitness.RowUtf8)
            && (await original.ProjectTransitionCanonicalRowAsync(prior.Predecessor.Conversion, ct)).AsSpan().SequenceEqual(prior.ConversionWitness.RowUtf8));
        var after = await original.ProjectTransitionRowsAsync(prior.Prepared, ct);
        FoodVocabularyDefinitions.Require((await original.TransitionRowAsync("recipes", prior.Prepared.RecipeId, ct)).AsSpan().SequenceEqual(prior.ConversionWitness.RecipeBeforeUtf8)
            && (await original.TransitionRowAsync("recipe_search_documents", prior.Prepared.RecipeId, ct)).AsSpan().SequenceEqual(prior.ConversionWitness.SearchBeforeUtf8)
            && after.Recipe.AsSpan().SequenceEqual(prior.ConversionWitness.RecipeAfterUtf8) && after.Search.AsSpan().SequenceEqual(prior.ConversionWitness.SearchAfterUtf8));
    }

    internal async Task<V1SuccessorOutcome> CaptureAttestedV1RemainingRecipeStageAsync(string root, byte[] requestBytes,
        byte[] attemptBytes, string bundle, RecoverySnapshotService sourceService, CanonicalRecipeContentStore store,
        RecipesRootResolver executionRoots, CancellationToken ct)
    {
        requestBytes = requestBytes.ToArray(); attemptBytes = attemptBytes.ToArray();
        using var deadline = CancellationTokenSource.CreateLinkedTokenSource(ct);
        deadline.CancelAfter(TimeSpan.FromSeconds(Math.Clamp(configuration.GetValue("Recovery:MaxFreezeSeconds", 30), 1, 3600)));
        ct = deadline.Token;
        var request = V1AuthoritySuccessorPolicy.Request(root, requestBytes);
        var runtime = request.Runtime;
        FoodVocabularyDefinitions.Require(bundle == V1AuthoritySuccessorPolicy.Bundle(root));
        V1AuthoritySuccessorPolicy.Attempt(requestBytes, attemptBytes, new DeploymentCalendar(configuration));
        V1AuthoritySuccessorPolicy.Caller(root, requestBytes, attemptBytes);
        RequireTransitionBuild(root, runtime, bundle);
        await RequireTransitionGraphsAsync(runtime, sourceService, executionRoots, ct);
        return await boundary.RunMaintenanceAsync(runtime.Selection.OperationId, runtime.CandidateCommit, TransitionHash(runtime.HoldAfterBytes), async token =>
        {
            RequireTransitionDate(runtime);
            await using var source = await sourceService.OpenTransitionSourceAsync(root, runtime.SourceDataRoot, runtime, token);
            await using var write = await boundary.EnterAsync(RecoveryAccess.Write, token);
            using var binding = boundary.BindLease(write);
            await using var transaction = await RecipeRotation.LockAsync(db, runtime.Selection.Selected[0].RecipeId, token, lockSupperInputs: true);
            await LockTransitionRemainderAsync(runtime, token);
            var prior = LoadSuccessorPrior(root, request);
            await ValidateSuccessorPriorAsync(prior, sourceService, source.Facts, token);
            await RequireTransitionOriginalBaselineAsync(runtime with { HoldBeforeBytes = prior.Request.HoldBeforeBytes }, sourceService, prior.Corpus, token);
            var selection = SuccessorInventory(prior.Corpus, runtime.Selection, runtime.EvaluationDate, runtime.HoldAfterBytes);
            var provisional = CanonicalRecipeMigrationReceipt.Plan(selection, runtime.CandidateCommit, runtime.CapturedAt);
            var priorPlan = TransitionRead<MaintenanceCommandObservation>(prior.PlanWitness.TypedOutputUtf8);
            using var context = new V1AuthorityTransitionContext(db, recipes, boundary, source.Authority, source.Facts,
                runtime.Selection.OperationId, runtime.CandidateCommit, runtime.ApiAssemblySha256,
                new[] { priorPlan, MaintenanceCommandObservation.From(provisional) }, new[] { prior.Predecessor.Conversion });
            using var admitted = new V1MigrationSource(source.Protection, source.Identity, source.Attestation, db, recipes, context);
            await store.RequireRemainingTransitionAdmissionAsync(selection, provisional, this, recipes, admitted, prior.Predecessor, token);
            await RequireSuccessorPriorRowsAsync(prior, token);
            var outcomes = new List<V1SuccessorPreparation>();
            var producers = new Dictionary<string, byte[]>(StringComparer.Ordinal);
            var producerPath = Path.Combine(bundle, "producer");
            Dictionary<Guid, V1SuccessorPreparation>? retainedOutcomes = null;
            if (File.Exists(Path.Combine(producerPath, "complete.json")))
            {
                var retainedCaptures = new[] { "request.json", "attempt.json", "selection-inventory.json", "outcomes.json" }
                    .ToDictionary(x => x, x => File.ReadAllBytes(Path.Combine(bundle, "capture", x)), StringComparer.Ordinal);
                RequireTransitionBundle(Path.Combine(bundle, "capture"), retainedCaptures);
                FoodVocabularyDefinitions.Require(retainedCaptures["request.json"].AsSpan().SequenceEqual(requestBytes)
                    && retainedCaptures["attempt.json"].AsSpan().SequenceEqual(attemptBytes));
                retainedOutcomes = TransitionRead<V1SuccessorPreparation[]>(retainedCaptures["outcomes.json"]).ToDictionary(x => x.RecipeId);
                FoodVocabularyDefinitions.Require(retainedOutcomes.Count == selection.Recipes.Count && selection.Recipes.All(item =>
                    retainedOutcomes.TryGetValue(item.RecipeId, out var outcome) && outcome.OperationId == item.OperationId
                    && outcome.Outcome is "eligible" or "deferred" && (outcome.Outcome == "eligible" ? outcome.Reason is null : outcome.Reason is not null)));
                var retainedNames = retainedOutcomes.Values.Where(x => x.Outcome == "eligible").Select(x => x.RecipeId.ToString("N") + ".json").ToList();
                if (retainedNames.Count != 0) retainedNames.Add("plan.json");
                RequireTransitionBundle(producerPath, retainedNames.ToDictionary(x => x, x => File.ReadAllBytes(Path.Combine(producerPath, x)), StringComparer.Ordinal));
            }
            foreach (var item in selection.Recipes)
            {
                RequireTransitionDate(runtime);
                var fileName = item.RecipeId.ToString("N") + ".json";
                var existingProducer = File.Exists(Path.Combine(producerPath, fileName));
                try
                {
                    V1SuccessorProducer producer;
                    if (existingProducer)
                    {
                        producer = TransitionRead<V1SuccessorProducer>(File.ReadAllBytes(Path.Combine(producerPath, fileName)));
                        await store.RequireMigrationPreparationAsync(item, producer.Prepared, context, token);
                        await ValidateSuccessorProducerAsync(sourceService, item, producer, runtime, token);
                    }
                    else
                    {
                        var prepared = await store.PrepareMigrationConversionAsync(item, runtime.CapturedAt, token, context);
                        var postgres = await sourceService.ProjectTransitionConversionAsync(prepared, token);
                        var after = await sourceService.ProjectTransitionRowsAsync(prepared, token);
                        producer = new(item.RecipeId, item.OperationId, prepared, postgres,
                            await sourceService.ProjectTransitionCanonicalRowAsync(postgres, token),
                            await sourceService.TransitionRowAsync("recipes", item.RecipeId, token), after.Recipe,
                            await sourceService.TransitionRowAsync("recipe_search_documents", item.RecipeId, token), after.Search);
                    }
                    FoodVocabularyDefinitions.Require(retainedOutcomes is null || retainedOutcomes[item.RecipeId].Outcome == "eligible");
                    producers.Add(fileName, TransitionBytes(producer));
                    outcomes.Add(new(item.RecipeId, item.OperationId, "eligible", null));
                }
                catch (Exception error) when (!existingProducer && error is (InvalidDataException or InvalidOperationException or JsonException or ArgumentException))
                {
                    // Unsupported producer eligibility is explicit; it never falls back
                    // to inferred quantities or another selected recipe.
                    if (retainedOutcomes is not null && (retainedOutcomes[item.RecipeId].Outcome != "deferred" || retainedOutcomes[item.RecipeId].Reason != error.Message)) throw;
                    outcomes.Add(new(item.RecipeId, item.OperationId, "deferred", error.Message));
                }
            }
            var eligible = outcomes.Where(x => x.Outcome == "eligible").Select(x => new CanonicalMigrationSelection(x.RecipeId, x.OperationId)).ToArray();
            var inventory = SuccessorInventory(prior.Corpus, runtime.Selection with { Selected = eligible }, runtime.EvaluationDate, runtime.HoldAfterBytes);
            if (eligible.Length != 0)
            {
                var plan = CanonicalRecipeMigrationReceipt.Plan(inventory, runtime.CandidateCommit, runtime.CapturedAt);
                var planPg = await sourceService.ProjectTransitionPlanAsync(plan, token);
                producers.Add("plan.json", TransitionBytes(new V1SuccessorPlan(plan, planPg, await sourceService.ProjectTransitionCommandRowAsync(planPg, token))));
            }
            var captures = new Dictionary<string, byte[]>
            {
                ["request.json"] = requestBytes,
                ["attempt.json"] = attemptBytes,
                ["selection-inventory.json"] = TransitionBytes(inventory),
                ["outcomes.json"] = TransitionBytes(outcomes)
            };
            await RetainTransitionBundleAsync(Path.Combine(bundle, "capture"), captures, token);
            await RetainTransitionBundleAsync(producerPath, producers, token);
            await source.RevalidateAsync(token);
            await TransitionCheckpointAsync("v1-successor-final-source-validated", token);
            await source.RequireBeforeImagesAsync(token);
            _ = V1AuthoritySuccessorPolicy.Request(root, requestBytes);
            V1AuthoritySuccessorPolicy.Caller(root, requestBytes, attemptBytes);
            RequireTransitionBuild(root, runtime, bundle);
            RequireTransitionBundle(Path.Combine(bundle, "capture"), captures); RequireTransitionBundle(producerPath, producers);
            await RequireSuccessorPriorRowsAsync(prior, token);
            await store.RequireRemainingTransitionAdmissionAsync(selection, provisional, this, recipes, admitted, prior.Predecessor, token);
            RequireTransitionDate(runtime);
            boundary.ValidateMaintenanceInvocation(runtime.Selection.OperationId, runtime.CandidateCommit, runtime.ApiAssemblySha256);
            await transaction!.RollbackAsync(token);
            return new V1SuccessorOutcome("captured", runtime.Selection.OperationId, 46, 23, 1, 0, outcomes.Count(x => x.Outcome == "deferred"), eligible.Length, 36);
        }, ct);
    }

    private async Task RequireSuccessorPriorRowsAsync(SuccessorPrior prior, CancellationToken ct)
    {
        FoodVocabularyDefinitions.Require((await TransitionReceiptRowAsync("maintenance_commands", prior.Predecessor.Plan.Id, null, ct))?.AsSpan().SequenceEqual(prior.PlanWitness.RowUtf8) == true
            && (await TransitionReceiptRowAsync("canonical_recipe_operations", prior.Prepared.OperationId, prior.Prepared.RecipeId, ct))?.AsSpan().SequenceEqual(prior.ConversionWitness.RowUtf8) == true
            && (await TransitionRowAsync("recipes", prior.Prepared.RecipeId, ct)).AsSpan().SequenceEqual(prior.ConversionWitness.RecipeAfterUtf8)
            && (await TransitionRowAsync("recipe_search_documents", prior.Prepared.RecipeId, ct)).AsSpan().SequenceEqual(prior.ConversionWitness.SearchAfterUtf8));
    }

    private static async Task ValidateSuccessorProducerAsync(RecoverySnapshotService source, CanonicalMigrationRecipe item,
        V1SuccessorProducer producer, V1TransitionRequest runtime, CancellationToken ct)
    {
        FoodVocabularyDefinitions.Require(producer.RecipeId == item.RecipeId && producer.OperationId == item.OperationId
            && producer.Prepared.RecipeId == item.RecipeId && producer.Prepared.OperationId == item.OperationId && producer.Prepared.CreatedAt == runtime.CapturedAt
            && producer.Postgres.CreatedAt == runtime.CapturedAt
            && TransitionBytes(await source.ProjectTransitionConversionAsync(producer.Prepared, ct)).AsSpan().SequenceEqual(TransitionBytes(producer.Postgres))
            && (await source.ProjectTransitionCanonicalRowAsync(producer.Postgres, ct)).AsSpan().SequenceEqual(producer.OperationRow)
            && (await source.TransitionRowAsync("recipes", item.RecipeId, ct)).AsSpan().SequenceEqual(producer.RecipeBefore)
            && (await source.TransitionRowAsync("recipe_search_documents", item.RecipeId, ct)).AsSpan().SequenceEqual(producer.SearchBefore));
        var after = await source.ProjectTransitionRowsAsync(producer.Prepared, ct);
        FoodVocabularyDefinitions.Require(after.Recipe.AsSpan().SequenceEqual(producer.RecipeAfter) && after.Search.AsSpan().SequenceEqual(producer.SearchAfter));
    }
}
