using System.Security.Cryptography;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Infrastructure;
using RecipeApi.Models;

namespace RecipeApi.Services;

public sealed record RecipePublicationCapture(Guid RecipeId, string ContentRevision, string SourceRevision,
    string FieldHash, IReadOnlyDictionary<string, byte[]?> Files,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] int? FieldHashVersion = null,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] RecipePublicationFields? Fields = null,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] FoodMappingObservation? FoodEvidence = null,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] FoodVocabularyAuthority? FoodAuthority = null);
public sealed record RecipePublicationCandidate(string? RecipeJson, RecipeInfo Info, string? ProducerInput = null,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] IReadOnlyDictionary<string, byte[]?>? SourceFiles = null,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? SourceContext = null,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? SourceKind = null,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? BootstrapIntent = null,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? FollowupIntent = null,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string[]? ReviewReasons = null,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? MappingEvidence = null);

/// <summary>
/// Captured legacy publication. The committed database journal owns delivery;
/// retries never infer completion from a live file. Canonical merging stays fenced.
/// Callers participate in the existing recovery write lease and single-instance worker boundary.
/// </summary>
public sealed partial class RecipeFilePublicationStore(RecipeDbContext db, RecipeRepository repository,
    IClock clock, SupperProjectionInvalidation invalidation, FoodVocabularyStore vocabulary)
{
    private static readonly JsonSerializerOptions Json = new(JsonDefaults.CamelCase);
    private sealed record Envelope(RecipePublicationCapture Capture, RecipePublicationCandidate Candidate,
        IReadOnlyDictionary<string, byte[]?> Output,
        [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] RecipePublicationFields? Result = null,
        [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] FoodMappingObservation? ResultEvidence = null);

    public async Task<bool> TryResumeAsync(Guid recipeId, Guid operationId, string producerInput, CancellationToken ct = default)
    {
        var prior = await db.RecipeFilePublications.AsNoTracking().SingleOrDefaultAsync(
            x => x.RecipeId == recipeId && x.OperationId == operationId, ct);
        if (prior is null) return false;
        var saved = ReadEnvelope(prior);
        if (saved.Candidate.ProducerInput != producerInput)
        {
            var recipe = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == recipeId, ct);
            throw Conflict(recipe);
        }
        await ResumeAsync(recipeId, operationId, ct);
        if (saved.Candidate.SourceKind == "review-material")
            throw new RecipeContentReviewException("Retained recipe material still needs review.", saved.Candidate.ReviewReasons!);
        return true;
    }

    public async Task<RecipePublicationCapture> CaptureAsync(Guid recipeId, CancellationToken ct = default,
        bool requireSourceMatch = false, string? expectedSourceUrl = null)
    {
        var before = await db.Recipes.AsNoTracking().SingleOrDefaultAsync(x => x.Id == recipeId, ct)
            ?? throw new KeyNotFoundException("Recipe is unavailable.");
        var authority = await vocabulary.CaptureAuthorityAsync(before.FoodMappingEvidence, ct);
        await using var transaction = await RecipeRotation.LockAsync(db, recipeId, ct, lockSupperInputs: true);
        var recipe = await db.Recipes.AsNoTracking().SingleOrDefaultAsync(x => x.Id == recipeId, ct)
            ?? throw new KeyNotFoundException("Recipe is unavailable.");
        if (requireSourceMatch && !string.Equals(recipe.SourceUrl ?? "", expectedSourceUrl ?? "", StringComparison.Ordinal))
            throw new InvalidDataException("Repair source differs from its original command.");
        if (await db.RecipeFilePublications.AnyAsync(x => x.RecipeId == recipeId && !x.Delivered, ct))
            throw Conflict(recipe);
        if (Evidence(before) != Evidence(recipe)) throw Conflict(recipe);
        ValidateRecipeEvidence(recipe, authority);
        var capture = new RecipePublicationCapture(recipeId, CanonicalRecipeContentStore.InspectContentRevision(recipe),
            CanonicalRecipeContentStore.InspectSourceRevision(recipe), Fields(recipe, 4),
            await repository.CapturePublicationFilesAsync(recipeId, ct), FieldHashVersion: 4, Fields: Observe(recipe),
            FoodEvidence: new(Evidence(recipe)), FoodAuthority: authority);
        if (transaction is not null) await transaction.CommitAsync(ct);
        return capture;
    }

    public async Task PublishAsync(RecipePublicationCapture capture, RecipePublicationCandidate candidate, Guid operationId,
        CancellationToken ct = default)
    {
        if (operationId == Guid.Empty || candidate.Info.Id != capture.RecipeId)
            throw new ArgumentException("Publication requires operation and recipe membership.");
        ValidateOriginalFields(capture);
        var inputHash = Hash(new { capture, candidate });
        var replay = await db.RecipeFilePublications.AsNoTracking().SingleOrDefaultAsync(
            x => x.RecipeId == capture.RecipeId && x.OperationId == operationId, ct);
        if (replay is not null)
        {
            _ = ReadEnvelope(replay);
            if (replay.InputHash != inputHash)
            {
                var recipe = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == capture.RecipeId, ct);
                throw Conflict(recipe);
            }
            if (!replay.Delivered) await ResumeAsync(capture.RecipeId, operationId, ct);
            return;
        }
        if (capture.FieldHashVersion == 4) await vocabulary.ValidateLiveAuthorityAsync(capture.FoodAuthority!, ct);
        var followup = candidate.FollowupIntent is null ? null : ReadFollowupIntent(candidate);
        if (followup is not null && followup.Id != operationId) throw new InvalidDataException("Follow-up operation identity differs.");
        var output = Prepare(capture, candidate, operationId);
        var envelope = new Envelope(capture, candidate, output);
        var payload = JsonSerializer.Serialize(envelope, Json);
        // Retain the captured source and candidate before publication. A conflicting
        // operation ID cannot overwrite its earlier evidence, even if nothing committed.
        await using (var transaction = await RecipeRotation.LockAsync(db, capture.RecipeId, ct, lockSupperInputs: true))
        {
            var recipe = await db.Recipes.SingleOrDefaultAsync(x => x.Id == capture.RecipeId, ct);
            var prior = await db.RecipeFilePublications.SingleOrDefaultAsync(x => x.RecipeId == capture.RecipeId && x.OperationId == operationId, ct);
            // Staging participates in the same supper-input/recipe boundary as
            // retirement. Missing existing membership cannot recreate a directory.
            if (recipe is null && candidate.SourceKind != "bootstrap") throw new KeyNotFoundException("Recipe is unavailable.");
            var stage = $".publications/{operationId:N}/{inputHash}.json";
            await repository.DeliverPublicationFileAsync(capture.RecipeId, stage, System.Text.Encoding.UTF8.GetBytes(payload));
            ct.ThrowIfCancellationRequested();
            if (prior is null && candidate.SourceKind == "bootstrap")
            {
                if (recipe is not null) throw Conflict(recipe);
                await CheckEmptyBootstrapAsync(capture, ct);
                recipe = NewRecipe(candidate);
                if (candidate.BootstrapIntent is not null)
                {
                    var intent = ReadBootstrapIntent(candidate);
                    if (intent.Id != operationId) throw new InvalidDataException("Bootstrap intent has a different operation identity.");
                    var initialization = db.ChangeTracker.Entries<WorkflowInstance>().SingleOrDefault(x => x.Entity.Id == intent.Id)?.Entity
                        ?? throw new InvalidDataException("Bootstrap initialization must commit with its recipe.");
                    ValidateBootstrapWorkflow(candidate, operationId, initialization, requirePending: true);
                }
                db.Recipes.Add(recipe);
            }
            else if (recipe is null) throw new KeyNotFoundException("Recipe is unavailable.");
            if (prior is not null)
            {
                if (prior.InputHash != inputHash) throw Conflict(recipe);
                if (prior.Delivered) return; // A late replay never reinstalls old files over newer content.
            }
            else
            {
                if (candidate.SourceKind is "review-material" or "fresh-canonical")
                    await ValidateFreshReviewMaterialAsync(capture, candidate, operationId, recipe, ct);
                if (candidate.SourceKind == "review-canonical")
                    await ValidateReviewedCanonicalAsync(capture, candidate, operationId, recipe, ct);
                if (candidate.SourceKind == "hero" && recipe.CanonicalContent is not null)
                    await ValidateFreshCanonicalHeroAsync(recipe.Id, operationId, ct);
                if (candidate.SourceKind == "categorization")
                    await ValidateCategorizationTaskAsync(recipe.Id, operationId, candidate.ProducerInput, ct);
                // Readiness selects metadata only; it never reopens canonical facts.
                if (candidate.SourceKind != "bootstrap" && ((capture.FieldHashVersion != 4 && recipe.FoodMappingEvidence is not null) || (recipe.CanonicalContent is not null && candidate.SourceKind is not ("canonical-export" or "readiness" or "hero" or "categorization")) || capture.FieldHash != Fields(recipe, capture.FieldHashVersion)
                    || capture.ContentRevision != CanonicalRecipeContentStore.InspectContentRevision(recipe)
                    || capture.SourceRevision != CanonicalRecipeContentStore.InspectSourceRevision(recipe)
                    || await db.RecipeFilePublications.AnyAsync(x => x.RecipeId == recipe.Id && !x.Delivered, ct)))
                    throw Conflict(recipe);
                if (candidate.SourceKind == "readiness" && recipe.IsReady) throw Conflict(recipe);
                if (candidate.SourceKind != "bootstrap") await CheckFiles(capture, null, recipe, ct);
                if (candidate.SourceKind == "human-original" && recipe.ImageCount != candidate.Info.ImageCount - 1)
                    throw Conflict(recipe);
                if (candidate.SourceKind != "bootstrap") Apply(recipe, candidate, output.GetValueOrDefault("recipe.info") ?? capture.Files["recipe.info"]!);
                ApplyFoodEvidence(recipe, capture, candidate);
                recipe.UpdatedAt = clock.UtcNow;
                if (followup is not null)
                {
                    followup.CreatedAt = followup.UpdatedAt = clock.UtcNow;
                    foreach (var task in followup.Tasks) task.CreatedAt = task.UpdatedAt = clock.UtcNow;
                    db.WorkflowInstances.Add(followup);
                }
                db.RecipeFilePublications.Add(new RecipeFilePublication
                {
                    RecipeId = recipe.Id,
                    OperationId = operationId,
                    InputHash = inputHash,
                    Payload = capture.FieldHashVersion is 3 or 4
                        ? JsonSerializer.Serialize(envelope with { Result = Observe(recipe), ResultEvidence = capture.FieldHashVersion == 4 ? new(Evidence(recipe)) : null }, Json) : payload,
                    ResultHash = Fields(recipe, capture.FieldHashVersion),
                    CreatedAt = clock.UtcNow
                });
                var search = await db.RecipeSearchDocuments.FindAsync([recipe.Id], ct);
                if (search is null) db.RecipeSearchDocuments.Add(new RecipeSearchDocument
                {
                    RecipeId = recipe.Id,
                    SchemaVersion = RecipeSearchDocumentBuilder.CurrentSchemaVersion,
                    EmbeddingModel = Environment.GetEnvironmentVariable("EMBEDDING_MODEL_ID") ?? "gemini-embedding-2"
                });
                else { search.IndexStatus = "pending"; search.EmbeddingStatus = "pending"; search.EmbeddingFingerprint = null; }
                await db.SaveChangesAsync(ct);
                await invalidation.EnlistRecipeAsync(recipe.Id, ct);
            }
            if (transaction is not null) await transaction.CommitAsync(ct);
        }
        // Cancellation after commit can leave pending delivery; the operation is
        // recoverable and must not be reported as a rolled-back recipe mutation.
        await ResumeAsync(capture.RecipeId, operationId, ct);
    }

    public async Task ResumeAsync(Guid recipeId, Guid operationId, CancellationToken ct = default)
    {
        await using var transaction = await RecipeRotation.LockAsync(db, recipeId, ct, lockSupperInputs: true);
        var recipe = await db.Recipes.SingleOrDefaultAsync(x => x.Id == recipeId, ct)
            ?? throw new KeyNotFoundException("Recipe is unavailable.");
        var publication = await db.RecipeFilePublications.SingleAsync(x => x.RecipeId == recipeId && x.OperationId == operationId, ct);
        if (publication.Delivered) return;
        var envelope = ReadEnvelope(publication);
        if (envelope.Capture.FieldHashVersion != 4 && recipe.FoodMappingEvidence is not null) throw Conflict(recipe);
        if (envelope.Capture.FieldHashVersion == 4) await vocabulary.ValidateLiveAuthorityAsync(envelope.Capture.FoodAuthority!, ct);
        if (envelope.Candidate.SourceKind == "readiness" && !recipe.IsReady) throw Conflict(recipe);
        if ((recipe.CanonicalContent is not null && envelope.Candidate.SourceKind is not ("canonical-export" or "readiness" or "fresh-canonical" or "review-canonical" or "hero" or "categorization")) || Fields(recipe, envelope.Capture.FieldHashVersion) != publication.ResultHash) throw Conflict(recipe);
        // Validate every file before the first replacement, accepting the exact
        // candidate for already delivered files after an interrupted attempt.
        await CheckFiles(envelope.Capture, envelope.Output, recipe, ct);
        foreach (var (path, bytes) in envelope.Output)
        {
            ct.ThrowIfCancellationRequested();
            await repository.DeliverPublicationFileAsync(recipeId, path, bytes);
        }
        publication.Delivered = true;
        await db.SaveChangesAsync(ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
    }

    private async Task CheckFiles(RecipePublicationCapture capture, IReadOnlyDictionary<string, byte[]?>? output, Recipe recipe, CancellationToken ct)
    {
        var current = await repository.CapturePublicationFilesAsync(capture.RecipeId, ct, allowMissingInfo: capture.ContentRevision == "absent");
        if (current.Keys.Any(x => !capture.Files.ContainsKey(x)))
        {
            // Earlier journals did not inspect these additional media slots. A
            // present unrecorded file cannot be assumed unchanged during recovery.
            if (current.Any(x => !capture.Files.ContainsKey(x.Key) && x.Value is not null)) throw Conflict(recipe);
            current = current.Where(x => capture.Files.ContainsKey(x.Key)).ToDictionary(x => x.Key, x => x.Value);
        }
        if (!current.Keys.Order(StringComparer.Ordinal).SequenceEqual(capture.Files.Keys.Order(StringComparer.Ordinal))) throw Conflict(recipe);
        foreach (var (path, before) in capture.Files)
        {
            var now = current[path];
            if (Equal(now, before)) continue;
            if (output is not null && output.TryGetValue(path, out var after) && Equal(now, after)) continue;
            throw Conflict(recipe);
        }
    }

    private static bool Equal(byte[]? a, byte[]? b) => a is null ? b is null : b is not null && a.AsSpan().SequenceEqual(b);
    // Read-only recovery uses the same journal integrity owner as delivery.
    internal static string? ValidateRecoveryJournal(RecipeFilePublication publication)
    {
        var envelope = ReadRecoveryJson<Envelope>(publication.Payload);
        if (envelope.Capture is null || envelope.Candidate is null || envelope.Candidate.Info is null
            || envelope.Capture.Files is null || envelope.Output is null
            || !envelope.Capture.Files.Keys.All(IsRecoveryPublicationPath) || !envelope.Output.Keys.All(IsRecoveryPublicationPath))
            throw new InvalidDataException("Incomplete archived publication journal.");
        return ReadEnvelope(publication).Candidate.ProducerInput;
    }

    // Retained journal bytes have the publication owner's bounded path grammar.
    // Merely being embedded in JSON never grants a filesystem destination.
    private static bool IsRecoveryPublicationPath(string path) => path is "recipe.info" or "recipe.json"
        or "original/content.html" or "original/source.pdf" or "hero.webp" or "hero.jpg"
        || System.Text.RegularExpressions.Regex.IsMatch(path, @"^original/(?:[0-9]|1[0-9])\.(jpg|jpeg|png|webp)$",
            System.Text.RegularExpressions.RegexOptions.CultureInvariant);

    private static T ReadRecoveryJson<T>(string raw)
    {
        using var document = JsonDocument.Parse(raw);
        void Unique(JsonElement element)
        {
            if (element.ValueKind == JsonValueKind.Object)
            {
                var names = new HashSet<string>(StringComparer.Ordinal);
                foreach (var property in element.EnumerateObject())
                {
                    if (!names.Add(property.Name)) throw new InvalidDataException("Duplicate captured fact.");
                    Unique(property.Value);
                }
            }
            else if (element.ValueKind == JsonValueKind.Array) foreach (var item in element.EnumerateArray()) Unique(item);
        }
        Unique(document.RootElement);
        return document.RootElement.Deserialize<T>(new JsonSerializerOptions(Json)
        {
            PropertyNameCaseInsensitive = false,
            UnmappedMemberHandling = JsonUnmappedMemberHandling.Disallow,
            RespectRequiredConstructorParameters = true
        }) ?? throw new InvalidDataException("Missing captured facts.");
    }

    private static Envelope ReadEnvelope(RecipeFilePublication publication)
    {
        Envelope envelope;
        try { envelope = ReadRecoveryJson<Envelope>(publication.Payload); }
        catch (JsonException ex) { throw new InvalidDataException("Invalid publication journal.", ex); }
        if (envelope.Capture.RecipeId != publication.RecipeId || envelope.Candidate.Info.Id != publication.RecipeId
            || Hash(new { capture = envelope.Capture, candidate = envelope.Candidate }) != publication.InputHash
            || Hash(Prepare(envelope.Capture, envelope.Candidate, publication.OperationId)) != Hash(envelope.Output))
            throw new InvalidDataException("Publication evidence does not match its committed candidate.");
        if (envelope.Candidate.BootstrapIntent is not null && ReadBootstrapIntent(envelope.Candidate).Id != publication.OperationId)
            throw new InvalidDataException("Bootstrap intent has a different operation identity.");
        if (envelope.Candidate.FollowupIntent is not null && ReadFollowupIntent(envelope.Candidate).Id != publication.OperationId)
            throw new InvalidDataException("Follow-up intent has a different operation identity.");
        ValidateOriginalResult(publication, envelope);
        return envelope;
    }
    private static bool SameReviewedLine(RecipeIngredientLineDto actual, RecipeIngredientLineDto expected) =>
        actual.Description == expected.Description && actual.Amount == expected.Amount
        && actual.AmountText == expected.AmountText && actual.Unit == expected.Unit
        && actual.Scaling == expected.Scaling && actual.Package == expected.Package
        && actual.Shopping == expected.Shopping && actual.Provenance.Origin == "human"
        && actual.Provenance.SourceRef == expected.Provenance.SourceRef
        && actual.Provenance.ProtectedFields.SequenceEqual(expected.Provenance.ProtectedFields);

    // Compare complete original collections, not ingredient-to-step associations.
    // Independent reconstruction allocates new IDs/revisions; those and proposed
    // bindings are excluded while every original fact and text remains exact.
    private static string FreshOriginalFacts(CanonicalRecipeContent content) => Hash(new
    {
        content.Servings,
        Lines = content.IngredientLines.Select(line => new
        {
            line.Description,
            line.Amount,
            line.AmountText,
            line.Unit,
            line.Scaling,
            line.Package,
            line.Shopping,
            line.Provenance
        }),
        Sections = content.InstructionSections.Select(section => new
        { section.Name, Steps = section.Steps.Select(step => step.Text) })
    });

    private static IReadOnlyDictionary<string, byte[]?> Prepare(RecipePublicationCapture capture, RecipePublicationCandidate candidate, Guid operationId = default)
    {
        if (capture.FieldHashVersion == 4) return PrepareV4(capture, candidate, operationId);
        if (capture.FoodEvidence is not null || capture.FoodAuthority is not null || candidate.MappingEvidence is not null)
            throw new InvalidDataException("Historical publication cannot gain vocabulary authority.");
        if (candidate.SourceKind == "canonical-export")
        {
            if (capture.FieldHashVersion != 3 || capture.Fields is null || candidate.SourceFiles is not null
                || candidate.BootstrapIntent is not null || candidate.FollowupIntent is not null || candidate.RecipeJson is null)
                throw new InvalidDataException("Canonical export requires captured current facts without source or workflow replacement.");
            var saved = RestoreObservation(capture.Fields);
            var content = CanonicalRecipeContentStore.Read(saved) ?? throw new InvalidDataException("Canonical export requires canonical content.");
            using var document = JsonDocument.Parse(candidate.RecipeJson);
            var incoming = RecipeExportContent.ReadCurrent(document.RootElement, capture.RecipeId);
            if (!RecipeExportContent.IsIdenticalCurrent(incoming, new(saved.Id, content, saved.RawMetadata)))
                throw new InvalidDataException("Canonical export cannot change captured recipe facts.");
            return new Dictionary<string, byte[]?> { ["recipe.json"] = System.Text.Encoding.UTF8.GetBytes(candidate.RecipeJson) };
        }
        if (candidate.SourceKind == "fresh-canonical")
        {
            if (candidate.RecipeJson is null || candidate.SourceFiles is not null || candidate.BootstrapIntent is not null
                || candidate.FollowupIntent is not null || candidate.ReviewReasons is not null || capture.Fields is null)
                throw new InvalidDataException("Fresh canonical publication requires selected current content.");
            using var current = JsonDocument.Parse(candidate.RecipeJson);
            var incoming = RecipeExportContent.ReadCurrent(current.RootElement, capture.RecipeId);
            if (incoming.RawMetadata is null || incoming.Content.SourceRevision !=
                CanonicalRecipeContentStore.InspectSourceRevision(new Recipe
                { Id = capture.RecipeId, SourceUrl = capture.Fields.SourceUrl, RawMetadata = incoming.RawMetadata }))
                throw new InvalidDataException("Fresh canonical source revision differs from selected evidence.");
            if (incoming.Content.InstructionSections.SelectMany(section => section.Steps).Any(step => step.Bindings.Count != 0))
            {
                var original = CanonicalRecipeContentStore.PrepareFreshSource(capture.RecipeId, incoming.RawMetadata, capture.Fields.SourceUrl);
                if (FreshOriginalFacts(incoming.Content) != FreshOriginalFacts(original.Content))
                    throw new InvalidDataException("Fresh relationship originals differ from retained source evidence.");
            }
            CookingStepRelationshipProducer.ValidateFresh(incoming.Content);
        }
        if (candidate.SourceKind == "review-canonical")
        {
            if (candidate.RecipeJson is null || candidate.SourceFiles is not null || candidate.BootstrapIntent is not null
                || candidate.FollowupIntent is not null || candidate.ReviewReasons is not null || capture.Fields is null)
                throw new InvalidDataException("Reviewed canonical publication requires saved human facts.");
            using var current = JsonDocument.Parse(candidate.RecipeJson);
            var incoming = RecipeExportContent.ReadCurrent(current.RootElement, capture.RecipeId);
            var expected = CanonicalRecipeContentStore.PrepareReviewedSource(capture.Fields);
            if (CanonicalRecipeContentStore.NormalizeJson(incoming.RawMetadata) != CanonicalRecipeContentStore.NormalizeJson(expected.RawMetadata)
                || incoming.Content.SourceRevision != expected.Content.SourceRevision
                || incoming.Content.Servings != expected.Content.Servings
                || incoming.Content.IngredientLines.Count != expected.Content.IngredientLines.Count
                || incoming.Content.IngredientLines.Where((line, index) =>
                    !SameReviewedLine(line, expected.Content.IngredientLines[index])).Any()
                || incoming.Content.InstructionSections.Count != expected.Content.InstructionSections.Count
                || incoming.Content.InstructionSections.Where((section, index) => section.Name != expected.Content.InstructionSections[index].Name
                    || !section.Steps.Select(x => x.Text).SequenceEqual(expected.Content.InstructionSections[index].Steps.Select(x => x.Text))
                    || section.Steps.Any(step => step.Bindings.Count != 0)).Any())
                throw new InvalidDataException("Reviewed canonical facts differ from captured human corrections.");
        }
        if (candidate.FollowupIntent is not null) _ = ReadFollowupIntent(candidate);
        if (candidate.SourceKind == "bootstrap") return PrepareBootstrap(capture, candidate);
        if (candidate.SourceKind == "readiness") return PrepareReadiness(capture, candidate);
        if (candidate.SourceKind == "categorization") return PrepareCategorization(capture, candidate);
        if (candidate.SourceKind == "review-material" && (candidate.RecipeJson is null || candidate.SourceFiles is not null
            || candidate.BootstrapIntent is not null || candidate.FollowupIntent is not null || candidate.ReviewReasons is not { Length: > 0 }
            || candidate.ReviewReasons.Any(reason => reason is not ("ingredients" or "steps"))
            || candidate.ReviewReasons.Distinct(StringComparer.Ordinal).Count() != candidate.ReviewReasons.Length))
            throw new InvalidDataException("Review material requires selected content and semantic failure reasons.");
        if (candidate.SourceKind == "review-material")
        {
            var extracted = RecipeExtractionParser.ParseAndNormalize(candidate.RecipeJson!);
            var actual = new List<string>();
            if (extracted.Recipe?.RecipeIngredient?.Any(value => !string.IsNullOrWhiteSpace(value)) != true)
                actual.Add("ingredients");
            if (extracted.Recipe?.RecipeInstructions?.SelectMany(section => section.ItemListElement ?? [])
                .Any(step => !string.IsNullOrWhiteSpace(step.Text)) != true)
                actual.Add("steps");
            if (extracted.IsSemanticallyComplete)
            {
                if (!candidate.ReviewReasons!.SequenceEqual(["ingredients"]))
                    throw new InvalidDataException("Complete review material requires an ingredient representation failure.");
                var unrepresentable = false;
                try
                {
                    _ = CanonicalRecipeContentStore.PrepareFreshSource(capture.RecipeId, candidate.RecipeJson!, capture.Fields?.SourceUrl);
                }
                catch (InvalidDataException) { unrepresentable = true; }
                if (!unrepresentable)
                    throw new InvalidDataException("Lossless fresh facts cannot be retained as failed review material.");
            }
            else if (actual.Count == 0 ||
                !actual.Order(StringComparer.Ordinal).SequenceEqual(candidate.ReviewReasons!.Order(StringComparer.Ordinal)))
                throw new InvalidDataException("Retained review reasons differ from the selected content.");
        }
        if (candidate.SourceKind != "review-material" && candidate.ReviewReasons is not null)
            throw new InvalidDataException("Review reasons require a retained-material publication.");
        if (candidate.BootstrapIntent is not null) throw new InvalidDataException("Bootstrap intent requires new recipe membership.");
        if (candidate.RecipeJson is null && candidate.SourceFiles is null)
            throw new InvalidDataException("Publication has no selected content or source output.");
        if (candidate.RecipeJson is not null)
        {
            using var parsed = JsonDocument.Parse(candidate.RecipeJson);
            if (parsed.RootElement.ValueKind != JsonValueKind.Object) throw new InvalidDataException("Candidate must contain a recipe object.");
        }
        if (!capture.Files.TryGetValue("recipe.info", out var bytes) || bytes is null)
            throw new InvalidDataException("Captured metadata is missing.");
        var info = JsonSerializer.Deserialize<RecipeInfo>(bytes, Json) ?? throw new InvalidDataException("Captured metadata is invalid.");
        if (candidate.SourceKind == "review-canonical" && JsonSerializer.Serialize(candidate.Info, Json) != JsonSerializer.Serialize(info, Json))
            throw new InvalidDataException("Reviewed recovery cannot replace saved metadata.");
        if (info.Id != capture.RecipeId || candidate.Info.Id != capture.RecipeId || candidate.Info.ImageCount is < 0 or > 20
            || (candidate.SourceFiles is null && (candidate.Info.ImageCount != info.ImageCount || candidate.Info.SourceUrl != info.SourceUrl)))
            throw new InvalidDataException("Source/media replacement requires separately qualified selection.");
        // Preserve every unselected metadata field, including private notes and
        // rotation intent. These are the only fields owned by this legacy producer.
        if (candidate.RecipeJson is not null)
        {
            info.Name = candidate.Info.Name;
            info.Description = candidate.Info.Description;
            info.IsSynthesized = candidate.Info.IsSynthesized;
            info.TotalTime = candidate.Info.TotalTime;
        }
        var output = new Dictionary<string, byte[]?>(StringComparer.Ordinal);
        if (candidate.RecipeJson is not null) output["recipe.json"] = System.Text.Encoding.UTF8.GetBytes(candidate.RecipeJson);
        if (candidate.SourceFiles is not null)
        {
            if (candidate.RecipeJson is not null) throw new InvalidDataException("Source publication must not replace semantic content.");
            if (candidate.Info.FinishedDishImageIndex < -1 || candidate.Info.FinishedDishImageIndex >= candidate.Info.ImageCount)
                throw new InvalidDataException("Selected finished-dish image is outside source membership.");
            foreach (var (path, value) in candidate.SourceFiles)
            {
                if (!capture.Files.ContainsKey(path) || !IsSourceOutput(path, candidate.SourceKind))
                    throw new InvalidDataException("Source publication contains unsupported file membership.");
                output[path] = value;
            }
            if (candidate.SourceKind is not ("web" or "pdf" or "hero" or "human-original")) throw new InvalidDataException("Source writer selection is missing.");
            if (candidate.SourceKind == "human-original")
            {
                var prefix = $"original/{info.ImageCount}.";
                var selected = candidate.SourceFiles.FirstOrDefault();
                if (candidate.Info.ImageCount != info.ImageCount + 1
                    || candidate.Info.FinishedDishImageIndex != info.FinishedDishImageIndex
                    || candidate.SourceFiles.Count != 1
                    || !selected.Key.StartsWith(prefix, StringComparison.Ordinal) || selected.Value is not { Length: > 0 }
                    || capture.Files.Any(x => x.Key.StartsWith(prefix, StringComparison.Ordinal) && x.Value is not null))
                    throw new InvalidDataException("Human image publication requires one empty append slot and unchanged selection.");
            }
            if (candidate.SourceKind == "web")
            {
                info.Name = candidate.Info.Name;
                info.SourceUrl = candidate.Info.SourceUrl;
            }
            if (ReplacesMedia(candidate))
            {
                info.ImageCount = candidate.Info.ImageCount;
                if (ReplacesFinishedDish(candidate)) info.FinishedDishImageIndex = candidate.Info.FinishedDishImageIndex;
            }
        }
        if (candidate.SourceKind != "hero") output["recipe.info"] = JsonSerializer.SerializeToUtf8Bytes(info, Json);
        return output;
    }

    private static void Apply(Recipe recipe, RecipePublicationCandidate candidate, byte[] infoBytes)
    {
        if (candidate.SourceKind == "canonical-export") return;
        var info = JsonSerializer.Deserialize<RecipeInfo>(infoBytes, Json)!;
        if (candidate.SourceKind == "categorization")
        {
            recipe.Category = info.Category;
            recipe.CuisineType = info.CuisineType;
            recipe.MealTypes = info.MealTypes;
            recipe.IsVegetarian = info.IsVegetarian;
            return;
        }
        if (candidate.SourceKind == "readiness")
        {
            recipe.IsDiscoverable = RecipeRotation.Suitable(recipe) && !recipe.RotationHumanOff && !recipe.CookedSuppressed;
            if (!recipe.RotationHumanOff) recipe.RotationSource = "AI";
            recipe.IsReady = true;
            return;
        }
        if (candidate.SourceFiles is not null)
        {
            if (candidate.SourceKind == "web")
            {
                if (info.Name is not null) recipe.Name = info.Name;
                recipe.SourceUrl = info.SourceUrl;
            }
            if (ReplacesMedia(candidate))
            {
                recipe.ImageCount = info.ImageCount;
                if (ReplacesFinishedDish(candidate)) recipe.FinishedDishIndex = info.FinishedDishImageIndex;
            }
        }
        if (candidate.RecipeJson is null) return;
        using var document = JsonDocument.Parse(candidate.RecipeJson);
        var root = document.RootElement;
        if (candidate.SourceKind is "fresh-canonical" or "review-canonical")
        {
            var current = RecipeExportContent.ReadCurrent(root, recipe.Id);
            recipe.CanonicalContent = JsonSerializer.Serialize(current.Content, Json);
            recipe.RawMetadata = current.RawMetadata;
            recipe.Ingredients = JsonSerializer.Serialize(current.Content.IngredientLines.Select(CanonicalRecipeContentStore.Render), Json);
            recipe.Servings = current.Content.Servings;
            if (info.Name is not null) recipe.Name = info.Name;
            if (info.Description is not null) recipe.Description = info.Description;
            if (info.TotalTime is not null) recipe.TotalTime = info.TotalTime;
            return;
        }
        var exported = RecipeExportContent.Read(root);
        recipe.RawMetadata = exported is null ? candidate.RecipeJson : exported.RawMetadata;
        recipe.Ingredients = exported is not null ? exported.Ingredients
            : root.TryGetProperty("recipeIngredient", out var lines) && lines.ValueKind == JsonValueKind.Array ? lines.GetRawText()
            : root.TryGetProperty("ingredients", out var legacy) && legacy.ValueKind == JsonValueKind.Array ? legacy.GetRawText() : "[]";
        recipe.Servings = exported is null ? RecipeServings.FromMetadata(recipe.RawMetadata) : exported.Servings;
        if (info.Name is not null) recipe.Name = info.Name;
        if (info.Description is not null) recipe.Description = info.Description;
        if (info.TotalTime is not null) recipe.TotalTime = info.TotalTime;
        recipe.IsSynthesized = info.IsSynthesized;
    }

    // Include independent human fields: a delayed generated description/name must
    // not overwrite a later edit merely because ingredient tokens are unchanged.
    private static string Fields(Recipe recipe, int? version = null) => version switch
    {
        4 => Hash(new { version = 4, fieldsV3 = Observe(recipe), foodMappingEvidence = new FoodMappingObservation(Evidence(recipe)) }),
        3 => Hash(Observe(recipe)),
        2 => Hash(new { legacy = Fields(recipe), recipe.FinishedDishIndex }),
        null => LegacyFields(recipe),
        _ => throw new InvalidDataException("Unsupported publication field fingerprint.")
    };

    private static string LegacyFields(Recipe recipe) => Hash(new
    {
        recipe.Id,
        recipe.Name,
        recipe.Description,
        recipe.Notes,
        recipe.Rating,
        recipe.SourceUrl,
        Ingredients = CanonicalRecipeContentStore.NormalizeJson(recipe.Ingredients),
        RawMetadata = CanonicalRecipeContentStore.NormalizeJson(recipe.RawMetadata),
        recipe.Servings,
        Canonical = CanonicalRecipeContentStore.NormalizeJson(recipe.CanonicalContent),
        recipe.CuisineType,
        recipe.MealTypes,
        recipe.TotalTime,
        recipe.ImageCount,
        recipe.IsSynthesized,
        recipe.DeletedAt
    });
    private static bool ReplacesMedia(RecipePublicationCandidate candidate) => candidate.SourceKind is "pdf" or "human-original"
        || candidate.SourceKind == "web" && candidate.SourceFiles!.Any(x => x.Key.StartsWith("original/0", StringComparison.Ordinal) && x.Value is not null);

    private static bool ReplacesFinishedDish(RecipePublicationCandidate candidate) => candidate.SourceKind == "pdf"
        ? candidate.SourceFiles!.Count > 0 : candidate.SourceKind != "human-original" && ReplacesMedia(candidate);

    private static bool IsSourceOutput(string path, string? kind) => kind switch
    {
        "hero" => path == "hero.webp",
        "human-original" => System.Text.RegularExpressions.Regex.IsMatch(path, @"^original/(?:[0-9]|1[0-9])\.(jpg|png|webp)$", System.Text.RegularExpressions.RegexOptions.CultureInvariant),
        "web" => path == "original/content.html" || System.Text.RegularExpressions.Regex.IsMatch(path, @"^original/0\.(jpg|jpeg|png|webp)$", System.Text.RegularExpressions.RegexOptions.CultureInvariant),
        "pdf" => System.Text.RegularExpressions.Regex.IsMatch(path, @"^original/[0-9]\.(jpg|jpeg|png|webp)$", System.Text.RegularExpressions.RegexOptions.CultureInvariant),
        _ => false
    };

    private static string Hash(object value) => Convert.ToHexString(SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(
        CanonicalRecipeContentStore.NormalizeJson(JsonSerializer.Serialize(value, Json)))));
    private static RecipeContentConflictException Conflict(Recipe recipe) => new(CanonicalRecipeContentStore.InspectContentRevision(recipe), false);
}
