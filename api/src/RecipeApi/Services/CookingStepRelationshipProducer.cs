using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using RecipeApi.Dto;

namespace RecipeApi.Services;

// A bounded write-time inlet. Neither provider labels nor the projector establish
// ingredient-use semantics. Unsupported language remains ordinary readable text.
public static partial class CookingStepRelationshipProducer
{
    private const string WholeRule = "explicit-whole-clause";
    private const string AbsoluteRule = "explicit-absolute-clause";
    private const string HalfRule = "explicit-half-annotation-clause";
    private const string RemainderRule = "explicit-final-all-remaining-clause";
    private static readonly GroceryRational Half = new("1", "2");
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    private const RegexOptions Options = RegexOptions.CultureInvariant | RegexOptions.IgnoreCase;
    private static readonly TimeSpan MatchTimeout = TimeSpan.FromMilliseconds(100);
    private static readonly Regex PartialOrConditional = new(
        @"(?<![\p{L}\p{N}])(half|remaining|remainder|rest|reserve|reserved|except|unless|some|part|divided|each|per|alternatively|or|if|not|never|moitié|reste|restant|restante|réserver|réservez|sauf|chaque|par|ou|si|pas|jamais)(?![\p{L}\p{N}])", Options, MatchTimeout);
    private static readonly Regex NeutralRemainderStep = new(
        @"\A[ \t]*Simmer[ \t]+[1-9][0-9]*[ \t]+minutes[ \t]+at[ \t]+[1-9][0-9]*[ \t]+°C\.[ \t]*\z", Options, MatchTimeout);
    private sealed record Span(int Start, int End, string ExpectedText);
    private sealed record Evidence(int Version, string Rule, string SourceRevision, GroceryQuantity OriginalAmount);
    private sealed record AllocationGroup(Guid Id, bool Exhaustive, Guid[] BindingIds);
    private sealed record Payload(Evidence RelationshipEvidence,
        [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] GroceryQuantity? Amount = null,
        [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] RecipeUnitDto? Unit = null,
        [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] GroceryRational? Fraction = null,
        [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] Span? AnnotationSpan = null,
        [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] AllocationGroup? AllocationGroup = null,
        [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] Guid? AllocationGroupId = null,
        [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] Guid[]? Predecessors = null,
        [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] Dose? Dose = null,
        [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] Guid? CountBindingId = null);
    private sealed record Binding(Guid Id, Guid IngredientLineId, Guid StepId, string ValidatedContentRevision,
        string ValidatedTextRevision, Span Span, string Role, Payload Payload, string Status);
    private sealed record Clause(Span Span, GroceryQuantity Amount, string Role, Span? AnnotationSpan = null);
    private sealed record RemainderSequence(RecipeIngredientLineDto Row, RecipeInstructionStepDto Prior,
        Clause PriorClause, RecipeInstructionStepDto Final, Span FinalSpan);

    public static CanonicalRecipeContent Discover(CanonicalRecipeContent content, CanonicalRecipeContent? previous = null)
        => DiscoverWithIdentities(content, previous, _ => Guid.NewGuid());

    private sealed record CreationKey(Guid StepId, Guid IngredientLineId, string Kind, int Start, int End);
    private static CanonicalRecipeContent DiscoverWithIdentities(CanonicalRecipeContent content, CanonicalRecipeContent? previous,
        Func<CreationKey, Guid> createIdentity)
    {
        try { return DiscoverBounded(content, previous, createIdentity); }
        catch (RegexMatchTimeoutException)
        {
            return content with
            {
                InstructionSections = content.InstructionSections.Select(section => section with
                { Steps = section.Steps.Select(step => step with { Bindings = step.Bindings.Where(x => !Owned(x)).ToArray() }).ToArray() }).ToArray()
            };
        }
    }

    private static CanonicalRecipeContent DiscoverBounded(CanonicalRecipeContent content, CanonicalRecipeContent? previous, Func<CreationKey, Guid> createIdentity)
    {
        var steps = content.InstructionSections.SelectMany(x => x.Steps).ToArray();
        var remainders = DiscoverRemainders(content, previous, steps, createIdentity);
        return content with
        {
            InstructionSections = content.InstructionSections.Select(section => section with
            {
                Steps = section.Steps.Select(step =>
                {
                    var foreign = step.Bindings.Where(x => !Owned(x)).ToArray();
                    // Never reinterpret or overlap another role's proof, including
                    // retained uncertain proof owned by the existing projector.
                    if (foreign.Length != 0) return step with { Bindings = foreign };
                    var perItem = DiscoverPerItem(content, previous, steps, step, createIdentity);
                    if (perItem is not null) return step with { Bindings = perItem };
                    if (step.Bindings.Count > 1) return step with { Bindings = [] };
                    if (remainders.TryGetValue(step.Id, out var remainder)) return step with { Bindings = [remainder] };
                    var candidates = content.IngredientLines
                        .Where(row => Unambiguous(content, steps, row, previous))
                        .Select(row => (Row: row, Clause: Parse(step.Text, row)))
                        .Where(x => x.Clause is not null).ToArray();
                    if (candidates.Length != 1) return step with { Bindings = [] };
                    var (row, clause) = candidates[0];
                    // A corrected total below its explicit use is contradictory;
                    // retain the wording without redistribution or numeric proof.
                    if (clause!.Role == "absolute" && LegacyGroceryQuantity.SubtractScalar(row.Amount, clause.Amount) is null)
                        return step with { Bindings = [] };
                    var prior = Carry(previous, content, step, row, clause);
                    if (prior is not null)
                        return step with { Bindings = [Write(prior with { ValidatedContentRevision = content.ContentRevision })] };
                    if (clause!.Role switch
                    {
                        "whole" => clause.Amount != row.Amount,
                        "fraction" => !HalfAmount(row, clause.Amount),
                        "fixed" => !FixedAmount(row, clause.Amount),
                        _ => !PartialAmount(row, clause.Amount)
                    })
                        return step with { Bindings = [] };
                    var existing = step.Bindings.Select(Read).SingleOrDefault(binding =>
                        binding is not null && Matches(binding, content, step, row, clause));
                    var binding = new Binding(existing?.Id ?? createIdentity(new(step.Id, row.Id, clause.Role, clause.Span.Start, clause.Span.End)), row.Id, step.Id, content.ContentRevision,
                        step.TextRevision, clause.Span, clause.Role,
                        new(new(1, Rule(clause.Role), content.SourceRevision, clause.Amount),
                            clause.Role is "absolute" or "fixed" ? clause.Amount : null, clause.Role is "absolute" or "fixed" ? row.Unit : null,
                            clause.Role == "fraction" ? Half : null, clause.AnnotationSpan), "validated");
                    return step with { Bindings = [Write(binding)] };
                }).ToArray()
            }).ToArray()
        };
    }

    // Called at the fresh-publication fence. Independently derive every expected
    // relationship from captured facts; supplied IDs/status/evidence are not proof.
    public static void ValidateFresh(CanonicalRecipeContent content)
    {
        var stripped = content with
        {
            InstructionSections = content.InstructionSections.Select(section => section with
            { Steps = section.Steps.Select(step => step with { Bindings = [] }).ToArray() }).ToArray()
        };
        var expected = Discover(stripped).InstructionSections.SelectMany(x => x.Steps).ToArray();
        var actual = content.InstructionSections.SelectMany(x => x.Steps).ToArray();
        var ids = new Dictionary<Guid, Guid>();
        var groups = new Dictionary<Guid, Guid>();
        var groupSources = new Dictionary<Guid, Guid>();
        for (var index = 0; index < actual.Length; index++)
        {
            // Missing independent proof remains a readable fallback. A supplied
            // allocation graph must include every referenced member below.
            if (actual[index].Bindings.Count > expected[index].Bindings.Count)
                throw new InvalidDataException("Fresh relationship evidence differs from saved original facts.");
            for (var use = 0; use < actual[index].Bindings.Count; use++)
            {
                var binding = Read(actual[index].Bindings[use]);
                var proof = Read(expected[index].Bindings[use])!;
                if (binding is null || binding.Id == Guid.Empty || !ids.TryAdd(binding.Id, proof.Id))
                    throw new InvalidDataException("Fresh relationship identity is invalid.");
                if (binding.Payload?.AllocationGroup is { } suppliedGroup && proof.Payload.AllocationGroup is { } expectedGroup)
                {
                    if (suppliedGroup.Id == Guid.Empty || groups.TryGetValue(suppliedGroup.Id, out var mapped) && mapped != expectedGroup.Id ||
                        groupSources.TryGetValue(expectedGroup.Id, out var source) && source != suppliedGroup.Id)
                        throw new InvalidDataException("Fresh relationship allocation identity is inconsistent.");
                    groups[suppliedGroup.Id] = expectedGroup.Id;
                    groupSources[expectedGroup.Id] = suppliedGroup.Id;
                }
            }
        }
        for (var index = 0; index < actual.Length; index++)
        {
            for (var use = 0; use < actual[index].Bindings.Count; use++)
            {
                var proof = Read(expected[index].Bindings[use])!;
                var binding = Read(actual[index].Bindings[use])!;
                if (binding.Payload?.AllocationGroup is { } groupProof &&
                    (groupProof.BindingIds is null || groupProof.BindingIds.Any(member => !ids.ContainsKey(member))) ||
                    binding.Payload?.Predecessors is { } predecessors && predecessors.Any(member => !ids.ContainsKey(member)) ||
                    binding.Payload?.AllocationGroupId is { } allocationId && !groups.ContainsKey(allocationId) ||
                    binding.Payload?.CountBindingId is { } countId && !ids.ContainsKey(countId))
                    throw new InvalidDataException("Fresh relationship allocation references are missing.");
                var supplied = JsonNode.Parse(actual[index].Bindings[use].GetRawText()) as JsonObject;
                if (supplied is null) throw new InvalidDataException("Fresh relationship evidence is invalid.");
                RewriteId(supplied, "id", ids);
                if (supplied["payload"] is JsonObject payload)
                {
                    RewriteId(payload, "allocationGroupId", groups);
                    RewriteId(payload, "countBindingId", ids);
                    RewriteIds(payload["predecessors"], ids);
                    if (payload["allocationGroup"] is JsonObject group)
                    {
                        RewriteId(group, "id", groups);
                        RewriteIds(group["bindingIds"], ids);
                    }
                }
                if (!JsonElement.DeepEquals(JsonSerializer.SerializeToElement(supplied, Json), Write(proof)))
                    throw new InvalidDataException("Fresh relationship evidence is not independently validated.");
            }
        }
    }

    private static void RewriteId(JsonObject node, string property, Dictionary<Guid, Guid> identities)
    {
        if (node[property] is JsonValue value && value.TryGetValue<Guid>(out var id) && identities.TryGetValue(id, out var replacement))
            node[property] = replacement;
    }

    private static void RewriteIds(JsonNode? node, Dictionary<Guid, Guid> identities)
    {
        if (node is not JsonArray array) return;
        for (var index = 0; index < array.Count; index++)
            if (array[index] is JsonValue value && value.TryGetValue<Guid>(out var id) && identities.TryGetValue(id, out var replacement))
                array[index] = replacement;
    }

    private static Dictionary<Guid, JsonElement> DiscoverRemainders(CanonicalRecipeContent content,
        CanonicalRecipeContent? previous, RecipeInstructionStepDto[] steps, Func<CreationKey, Guid> createIdentity)
    {
        var result = new Dictionary<Guid, JsonElement>();
        foreach (var row in content.IngredientLines)
        {
            var sequence = Remainder(content, steps, row, previous);
            if (sequence is null) continue;
            var prior = Carry(previous, content, sequence.Prior, row, sequence.PriorClause, true) ??
                sequence.Prior.Bindings.Select(Read).SingleOrDefault(binding => binding is not null &&
                    Matches(binding, content, sequence.Prior, row, sequence.PriorClause, true));
            var priorId = prior?.Id ?? createIdentity(new(sequence.Prior.Id, row.Id, "absolute", sequence.PriorClause.Span.Start, sequence.PriorClause.Span.End));
            var priorGroup = prior?.Payload.AllocationGroup;
            var groupId = priorGroup is { Id: var id, BindingIds: { Length: 2 } members } && id != Guid.Empty && members[0] == priorId
                ? id : createIdentity(new(sequence.Prior.Id, row.Id, "allocationGroup", sequence.PriorClause.Span.Start, sequence.PriorClause.Span.End));
            var final = sequence.Final.Bindings.Select(Read).SingleOrDefault();
            var finalId = final?.Id ?? createIdentity(new(sequence.Final.Id, row.Id, "remainder", sequence.FinalSpan.Start, sequence.FinalSpan.End));
            var bindings = SequenceBindings(content, sequence, priorId, finalId, groupId);
            if (final is null || !JsonElement.DeepEquals(Write(final), bindings.Final))
                bindings = SequenceBindings(content, sequence, priorId, createIdentity(new(sequence.Final.Id, row.Id, "remainder", sequence.FinalSpan.Start, sequence.FinalSpan.End)), groupId);
            result[sequence.Prior.Id] = bindings.Prior;
            result[sequence.Final.Id] = bindings.Final;
        }
        return result;
    }

    private static (JsonElement Prior, JsonElement Final) SequenceBindings(CanonicalRecipeContent content,
        RemainderSequence sequence, Guid priorId, Guid finalId, Guid groupId)
    {
        var group = new AllocationGroup(groupId, true, [priorId, finalId]);
        var prior = new Binding(priorId, sequence.Row.Id, sequence.Prior.Id, content.ContentRevision,
            sequence.Prior.TextRevision, sequence.PriorClause.Span, "absolute",
            new(new(1, AbsoluteRule, content.SourceRevision, sequence.PriorClause.Amount), sequence.PriorClause.Amount,
                sequence.Row.Unit, AllocationGroup: group), "validated");
        var final = new Binding(finalId, sequence.Row.Id, sequence.Final.Id, content.ContentRevision,
            sequence.Final.TextRevision, sequence.FinalSpan, "remainder",
            new(new(1, RemainderRule, content.SourceRevision, sequence.PriorClause.Amount),
                AllocationGroup: group, AllocationGroupId: groupId, Predecessors: [priorId]), "validated");
        return (Write(prior), Write(final));
    }

    // The literal final clause supplies exhaustive intent. Only its complete
    // source-bound two-step graph can introduce an allocation group.
    private static RemainderSequence? Remainder(CanonicalRecipeContent content, RecipeInstructionStepDto[] steps,
        RecipeIngredientLineDto row, CanonicalRecipeContent? previous)
    {
        if (!UsableRow(content, row) || PartialOrConditional.IsMatch(row.Description) ||
            row.Amount is not { Kind: "scalar" } || row.Unit is null ||
            GroceryUnit.Read(row.Unit.Text).Bucket is not ("g" or "ml" or "cup" or "tsp" or "tbsp") ||
            string.IsNullOrEmpty(content.SourceRevision) || string.IsNullOrEmpty(content.ContentRevision)) return null;
        var mention = new Regex(@"(?<![\p{L}\p{N}])" + Regex.Escape(row.Description) + @"(?![\p{L}\p{N}])", Options, MatchTimeout);
        var mentions = steps.Where(step => mention.IsMatch(step.Text)).ToArray();
        if (mentions.Length != 2 || mentions.Any(step => mention.Matches(step.Text).Count != 1 || step.Id == Guid.Empty ||
            steps.Count(other => other.Id == step.Id) != 1 || string.IsNullOrEmpty(step.TextRevision) ||
            step.Bindings.Count > 1 || step.Bindings.Any(raw => !Owned(raw)))) return null;
        var prior = Parse(mentions[0].Text, row);
        var final = ParseFinalRemainder(mentions[1].Text, row);
        if (prior is not { Role: "absolute", Amount.Kind: "scalar", Amount.Value.N: not "0" } || final is null ||
            LegacyGroceryQuantity.SubtractScalar(row.Amount, prior.Amount) is null ||
            steps.Any(step => step.Id != mentions[0].Id && step.Id != mentions[1].Id &&
                !IndependentRemainderStep(content, row, step.Text, previous))) return null;
        return new(row, mentions[0], prior, mentions[1], final);
    }

    // Every additional clause must have a closed, independently understood
    // subject or the one bounded neutral procedure. Unknown prose cannot prove
    // the absence of a conditional branch in this exhaustive sequence.
    private static bool IndependentRemainderStep(CanonicalRecipeContent content, RecipeIngredientLineDto selected, string text, CanonicalRecipeContent? previous) =>
        NeutralRemainderStep.IsMatch(text) || IndependentPerItemStep(content, selected, text, previous) || content.IngredientLines
            .Where(row => row.Id != selected.Id && row.Id != Guid.Empty && !string.IsNullOrWhiteSpace(row.Description) &&
                !PartialOrConditional.IsMatch(row.Description) && content.IngredientLines.Count(other => other.Id == row.Id) == 1 &&
                content.IngredientLines.Count(other => string.Equals(other.Description, row.Description, StringComparison.OrdinalIgnoreCase)) == 1)
            .Any(row => Parse(text, row) is not null || ParseFinalRemainder(text, row) is not null);

    private static Span? ParseFinalRemainder(string text, RecipeIngredientLineDto row)
    {
        var noun = Regex.Escape(row.Description);
        var pattern = @"\A[ \t]*(?:Finally,[ \t]+(?:use|add)[ \t]+all[ \t]+the[ \t]+(?<remainder>remaining)[ \t]+" + noun +
            @"|Enfin,[ \t]+(?:utilisez|ajoutez)[ \t]+tout[ \t]+le[ \t]+(?<remainder>reste)[ \t]+(?:de[ \t]+|d['’])" + noun + @")\.?[ \t]*\z";
        var match = Regex.Match(text, pattern, Options, MatchTimeout);
        if (!match.Success) return null;
        var span = match.Groups["remainder"];
        return new(span.Index, span.Index + span.Length, span.Value);
    }

    private static bool UsableRow(CanonicalRecipeContent content, RecipeIngredientLineDto row) =>
        row.Id != Guid.Empty && content.IngredientLines.Count(other => other.Id == row.Id) == 1 &&
        row.Amount is not null && LegacyGroceryQuantity.IsCanonical(row.Amount) && row.Scaling == "proportional" && row.Package is null &&
        !string.IsNullOrWhiteSpace(row.Description) && row.Description.IndexOfAny(['\r', '\n', '.', ';', ':', '!', '?']) < 0 &&
        content.IngredientLines.Count(other => string.Equals(other.Description, row.Description, StringComparison.OrdinalIgnoreCase)) == 1;

    private static bool Unambiguous(CanonicalRecipeContent content, RecipeInstructionStepDto[] steps, RecipeIngredientLineDto row, CanonicalRecipeContent? previous)
    {
        if (!UsableRow(content, row) && !UsableFixedRow(content, row)) return false;
        var mention = new Regex(@"(?<![\p{L}\p{N}])" + Regex.Escape(row.Description) + @"(?![\p{L}\p{N}])", Options, MatchTimeout);
        var mentions = steps.Select(step => (Step: step, Count: mention.Matches(step.Text).Count))
            .Where(item => item.Count != 0).ToArray();
        var fixedUse = mentions.Length == 1 && mentions[0].Count == 1 && Parse(mentions[0].Step.Text, row)?.Role == "fixed";
        if (fixedUse ? !UsableFixedRow(content, row) || mentions[0].Step.Id == Guid.Empty ||
            steps.Count(step => step.Id == mentions[0].Step.Id) != 1 || string.IsNullOrEmpty(mentions[0].Step.TextRevision) ||
            string.IsNullOrEmpty(content.SourceRevision) || string.IsNullOrEmpty(content.ContentRevision) : !UsableRow(content, row)) return false;
        // Repetition is not ambiguity when every mentioning step independently
        // states one closed absolute use. It proves neither a whole use nor an
        // exhaustive allocation, even when the explicit amounts sum to the total.
        var independent = mentions.Length == 1 && mentions[0].Count == 1 ||
            mentions.Length > 1 && mentions.All(item => item.Count == 1 && Parse(item.Step.Text, row)?.Role == "absolute");
        return independent && steps.All(step => !PartialOrConditional.IsMatch(step.Text) ||
            Parse(step.Text, row)?.Role == "fraction" || IndependentPartial(content, row, step.Text, previous));
    }

    // A partial clause with no established subject can affect this row. A closed
    // clause explicitly naming another unique saved row does not. This does not
    // create or validate that other row's partial allocation.
    private static bool IndependentPartial(CanonicalRecipeContent content, RecipeIngredientLineDto selected, string text, CanonicalRecipeContent? previous) =>
        IndependentPerItemStep(content, selected, text, previous) || content.IngredientLines.Where(row => row.Id != selected.Id && !string.IsNullOrWhiteSpace(row.Description) &&
            content.IngredientLines.Count(other => string.Equals(other.Description, row.Description, StringComparison.OrdinalIgnoreCase)) == 1)
        .Any(row => Parse(text, row)?.Role == "fraction" || ParseFinalRemainder(text, row) is not null || Regex.IsMatch(text,
            @"\A[ \t]*(?:(?:Add|Use|Reserve)[ \t]+(?:half[ \t]+(?:of[ \t]+)?(?:the[ \t]+)?|some[ \t]+(?:of[ \t]+the[ \t]+)?|the[ \t]+remaining[ \t]+)|(?:Ajouter|Ajoutez|Réserver|Réservez)[ \t]+la moitié[ \t]+(?:de la[ \t]+|du[ \t]+|des[ \t]+|de l['’]))" +
            Regex.Escape(row.Description) + @"\.?[ \t]*\z", Options, MatchTimeout));

    private static Clause? Parse(string text, RecipeIngredientLineDto row)
    {
        if (text.IndexOfAny(['\r', '\n']) >= 0) return null;
        var fixedClause = ParseFixed(text, row);
        if (fixedClause is not null) return fixedClause;
        const string amount = @"(?<amount>[0-9¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞][0-9¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞/.,–\- \t]*)";
        var measurement = @"(?<measurement>" + amount + (row.Unit is null ? "" : @"[ \t]+" + Regex.Escape(row.Unit.Text)) + ")";
        var noun = Regex.Escape(row.Description);
        var halfPatterns = new[]
        {
            @"\A[ \t]*(?:Add|Use|Cook|Boil|Mix)[ \t]+(?<relative>half)[ \t]+(?:of[ \t]+)?the[ \t]+" + noun + @"[ \t]+\(" + measurement + @"\)\.?[ \t]*\z",
            @"\A[ \t]*(?:Ajouter|Ajoutez|Utiliser|Utilisez|Cuire|Faire cuire|Faites cuire|Mélanger|Mélangez)[ \t]+la[ \t]+(?<relative>moitié)[ \t]+(?:de la[ \t]+|du[ \t]+|des[ \t]+|de l['’])" + noun + @"[ \t]+\(" + measurement + @"\)\.?[ \t]*\z"
        };
        foreach (var pattern in halfPatterns)
        {
            var match = Regex.Match(text, pattern, Options, MatchTimeout);
            if (!match.Success) continue;
            var quantity = LegacyGroceryQuantity.Parse(match.Groups["amount"].Value.Trim());
            if (quantity is null || !LegacyGroceryQuantity.IsCanonical(quantity)) return null;
            var relative = match.Groups["relative"];
            var annotation = match.Groups["measurement"];
            return new(new(relative.Index, relative.Index + relative.Length, relative.Value), quantity, "fraction",
                new(annotation.Index, annotation.Index + annotation.Length, annotation.Value));
        }
        var patterns = new (string Role, string Pattern)[]
        {
            ("whole", @"\A[ \t]*(?:Add|Use|Cook|Boil|Mix)[ \t]+all[ \t]+" + measurement + @"[ \t]+(?:of[ \t]+)?" + noun + @"\.?[ \t]*\z"),
            ("whole", @"\A[ \t]*(?:Ajouter|Ajoutez|Utiliser|Utilisez|Cuire|Faire cuire|Faites cuire|Mélanger|Mélangez)[ \t]+(?:tous les|toutes les|la totalité des)[ \t]+" + measurement + @"[ \t]+(?:de[ \t]+|d['’])?" + noun + @"\.?[ \t]*\z"),
            ("absolute", @"\A[ \t]*(?:Add|Use|Cook|Boil|Mix)[ \t]+" + measurement + @"[ \t]+(?:of[ \t]+)?" + noun + @"\.?[ \t]*\z"),
            ("absolute", @"\A[ \t]*(?:Ajouter|Ajoutez|Utiliser|Utilisez|Cuire|Faire cuire|Faites cuire|Mélanger|Mélangez)[ \t]+" + measurement + @"[ \t]+(?:de[ \t]+|d['’])?" + noun + @"\.?[ \t]*\z")
        };
        foreach (var (role, pattern) in patterns)
        {
            var match = Regex.Match(text, pattern, Options, MatchTimeout);
            if (!match.Success) continue;
            var quantity = LegacyGroceryQuantity.Parse(match.Groups["amount"].Value.Trim());
            if (quantity is null || !LegacyGroceryQuantity.IsCanonical(quantity)) return null;
            var span = match.Groups["measurement"];
            return new(new(span.Index, span.Index + span.Length, span.Value), quantity, role);
        }
        return null;
    }

    // A closed affirmative measured-use clause establishes an absolute role,
    // never a whole role from numeric equality. Initial partial proof is bounded
    // to a positive scalar use below a known scalar total with the saved unit.
    private static string Rule(string role) => role switch { "whole" => WholeRule, "fraction" => HalfRule, "fixed" => FixedRule, _ => AbsoluteRule };

    private static bool HalfAmount(RecipeIngredientLineDto row, GroceryQuantity amount) =>
        row.Unit is not null && row.Amount is { Kind: "scalar", Value.N: not "0" } &&
        amount is { Kind: "scalar", Value.N: not "0" } &&
        LegacyGroceryQuantity.Multiply(row.Amount, Half) == amount;

    private static bool PartialAmount(RecipeIngredientLineDto row, GroceryQuantity amount) =>
        row.Unit is not null && row.Amount is { Kind: "scalar" } && amount is { Kind: "scalar", Value.N: not "0" } &&
        LegacyGroceryQuantity.SubtractScalar(row.Amount, amount) is { Value.N: not "0" };

    private static Binding? Carry(CanonicalRecipeContent? previous, CanonicalRecipeContent content,
        RecipeInstructionStepDto step, RecipeIngredientLineDto row, Clause clause, bool allocation = false)
    {
        if (previous is null || previous.SourceRevision != content.SourceRevision) return null;
        var oldStep = previous.InstructionSections.SelectMany(x => x.Steps).SingleOrDefault(x => x.Id == step.Id);
        var oldRow = previous.IngredientLines.SingleOrDefault(x => x.Id == row.Id);
        if (oldStep is null || oldRow is null || oldStep.Text != step.Text || oldStep.TextRevision != step.TextRevision ||
            oldRow.Description != row.Description || oldRow.Unit != row.Unit || oldRow.Scaling != row.Scaling ||
            oldRow.Package != row.Package || oldRow.Shopping != row.Shopping) return null;
        // The only authority for carrying the original proof is the previously
        // persisted canonical snapshot passed by the guarded store, never an inlet.
        var prior = oldStep.Bindings.Select(Read).Where(binding => binding is not null &&
            Matches(binding, previous, oldStep, oldRow, clause, allocation)).ToArray();
        if (prior.Length != 1 || !step.Bindings.Select(Read).Any(binding => binding is not null && binding.Id == prior[0]!.Id &&
            Matches(binding, content, step, row, clause, allocation))) return null;
        return prior[0];
    }

    private static bool Matches(Binding binding, CanonicalRecipeContent content, RecipeInstructionStepDto step,
        RecipeIngredientLineDto row, Clause clause, bool allocation = false) => binding.Id != Guid.Empty && binding.IngredientLineId == row.Id &&
        binding.StepId == step.Id && binding.ValidatedContentRevision == content.ContentRevision && binding.ValidatedTextRevision == step.TextRevision &&
        binding.Span == clause.Span && binding.Role == clause.Role && binding.Status == "validated" &&
        binding.Payload?.RelationshipEvidence is { Version: 1 } evidence &&
        evidence.Rule == (Rule(clause.Role)) &&
        evidence.SourceRevision == content.SourceRevision && evidence.OriginalAmount == clause.Amount &&
        binding.Payload.Dose is null && binding.Payload.CountBindingId is null &&
        (allocation || binding.Payload.AllocationGroup is null && binding.Payload.AllocationGroupId is null && binding.Payload.Predecessors is null) &&
        (clause.Role switch
        {
            "whole" => binding.Payload.Amount is null && binding.Payload.Unit is null && binding.Payload.Fraction is null && binding.Payload.AnnotationSpan is null,
            "fraction" => binding.Payload.Amount is null && binding.Payload.Unit is null && binding.Payload.Fraction == Half && binding.Payload.AnnotationSpan == clause.AnnotationSpan,
            _ => binding.Payload.Amount == clause.Amount && binding.Payload.Unit == row.Unit && binding.Payload.Fraction is null && binding.Payload.AnnotationSpan is null
        });

    private static bool Owned(JsonElement raw) => raw.ValueKind == JsonValueKind.Object &&
        raw.TryGetProperty("payload", out var payload) && payload.ValueKind == JsonValueKind.Object &&
        payload.TryGetProperty("relationshipEvidence", out _);
    private static Binding? Read(JsonElement raw)
    {
        try { return raw.Deserialize<Binding>(Json); }
        catch (JsonException) { return null; }
    }
    private static JsonElement Write(Binding binding) => JsonSerializer.SerializeToElement(binding, Json);
}
