using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using RecipeApi.Dto;

namespace RecipeApi.Services;

// A bounded write-time inlet. Neither provider labels nor the projector establish
// ingredient-use semantics. Unsupported language remains ordinary readable text.
public static class CookingStepRelationshipProducer
{
    private const string WholeRule = "explicit-whole-clause";
    private const string AbsoluteRule = "explicit-absolute-clause";
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    private const RegexOptions Options = RegexOptions.CultureInvariant | RegexOptions.IgnoreCase;
    private static readonly TimeSpan MatchTimeout = TimeSpan.FromMilliseconds(100);
    private static readonly Regex PartialOrConditional = new(
        @"(?<![\p{L}\p{N}])(half|remaining|remainder|rest|reserve|reserved|except|unless|some|part|divided|each|per|alternatively|or|if|not|never|moitié|reste|restant|restante|réserver|réservez|sauf|chaque|par|ou|si|pas|jamais)(?![\p{L}\p{N}])", Options, MatchTimeout);
    private sealed record Span(int Start, int End, string ExpectedText);
    private sealed record Evidence(int Version, string Rule, string SourceRevision, GroceryQuantity OriginalAmount);
    private sealed record Payload(Evidence RelationshipEvidence,
        [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] GroceryQuantity? Amount = null,
        [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] RecipeUnitDto? Unit = null);
    private sealed record Binding(Guid Id, Guid IngredientLineId, Guid StepId, string ValidatedContentRevision,
        string ValidatedTextRevision, Span Span, string Role, Payload Payload, string Status);
    private sealed record Clause(Span Span, GroceryQuantity Amount, string Role);

    public static CanonicalRecipeContent Discover(CanonicalRecipeContent content, CanonicalRecipeContent? previous = null)
    {
        try { return DiscoverBounded(content, previous); }
        catch (RegexMatchTimeoutException)
        {
            return content with
            {
                InstructionSections = content.InstructionSections.Select(section => section with
                { Steps = section.Steps.Select(step => step with { Bindings = step.Bindings.Where(x => !Owned(x)).ToArray() }).ToArray() }).ToArray()
            };
        }
    }

    private static CanonicalRecipeContent DiscoverBounded(CanonicalRecipeContent content, CanonicalRecipeContent? previous)
    {
        var steps = content.InstructionSections.SelectMany(x => x.Steps).ToArray();
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
                    if (step.Bindings.Count > 1) return step with { Bindings = [] };
                    var candidates = content.IngredientLines
                        .Where(row => Unambiguous(content, steps, row))
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
                    if (clause!.Role == "whole" ? clause.Amount != row.Amount : !PartialAmount(row, clause.Amount))
                        return step with { Bindings = [] };
                    var existing = step.Bindings.Select(Read).SingleOrDefault(binding =>
                        binding is not null && Matches(binding, content, step, row, clause));
                    var binding = new Binding(existing?.Id ?? Guid.NewGuid(), row.Id, step.Id, content.ContentRevision,
                        step.TextRevision, clause.Span, clause.Role,
                        new(new(1, clause.Role == "whole" ? WholeRule : AbsoluteRule, content.SourceRevision, clause.Amount),
                            clause.Role == "absolute" ? clause.Amount : null, clause.Role == "absolute" ? row.Unit : null), "validated");
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
        var ids = new HashSet<Guid>();
        for (var index = 0; index < actual.Length; index++)
        {
            // A staged older export may have no relationships. Missing proof is
            // safe readable fallback; only supplied proof needs validation here.
            if (actual[index].Bindings.Count > expected[index].Bindings.Count)
                throw new InvalidDataException("Fresh relationship evidence differs from saved original facts.");
            for (var use = 0; use < actual[index].Bindings.Count; use++)
            {
                var binding = Read(actual[index].Bindings[use]);
                var proof = Read(expected[index].Bindings[use])!;
                var supplied = JsonNode.Parse(actual[index].Bindings[use].GetRawText()) as JsonObject;
                if (supplied is not null) supplied["id"] = proof.Id;
                if (binding is null || binding.Id == Guid.Empty || !ids.Add(binding.Id) || supplied is null ||
                    !JsonElement.DeepEquals(JsonSerializer.SerializeToElement(supplied, Json), Write(proof)))
                    throw new InvalidDataException("Fresh relationship evidence is not independently validated.");
            }
        }
    }

    private static bool Unambiguous(CanonicalRecipeContent content, RecipeInstructionStepDto[] steps, RecipeIngredientLineDto row)
    {
        if (row.Amount is null || !LegacyGroceryQuantity.IsCanonical(row.Amount) || row.Scaling != "proportional" || row.Package is not null ||
            string.IsNullOrWhiteSpace(row.Description) || row.Description.IndexOfAny(['\r', '\n', '.', ';', ':', '!', '?']) >= 0 ||
            content.IngredientLines.Count(x => string.Equals(x.Description, row.Description, StringComparison.OrdinalIgnoreCase)) != 1) return false;
        var mention = new Regex(@"(?<![\p{L}\p{N}])" + Regex.Escape(row.Description) + @"(?![\p{L}\p{N}])", Options, MatchTimeout);
        return steps.Sum(step => mention.Matches(step.Text).Count) == 1 &&
            steps.All(step => !PartialOrConditional.IsMatch(step.Text) || IndependentPartial(content, row, step.Text));
    }

    // A partial clause with no established subject can affect this row. A closed
    // clause explicitly naming another unique saved row does not. This does not
    // create or validate that other row's partial allocation.
    private static bool IndependentPartial(CanonicalRecipeContent content, RecipeIngredientLineDto selected, string text) =>
        content.IngredientLines.Where(row => row.Id != selected.Id && !string.IsNullOrWhiteSpace(row.Description) &&
            content.IngredientLines.Count(other => string.Equals(other.Description, row.Description, StringComparison.OrdinalIgnoreCase)) == 1)
        .Any(row => Regex.IsMatch(text,
            @"\A[ \t]*(?:(?:Add|Use|Reserve)[ \t]+(?:half[ \t]+(?:of[ \t]+)?(?:the[ \t]+)?|some[ \t]+(?:of[ \t]+the[ \t]+)?|the[ \t]+remaining[ \t]+)|(?:Ajouter|Ajoutez|Réserver|Réservez)[ \t]+la moitié[ \t]+(?:de la[ \t]+|du[ \t]+|des[ \t]+|de l['’]))" +
            Regex.Escape(row.Description) + @"\.?[ \t]*\z", Options, MatchTimeout));

    private static Clause? Parse(string text, RecipeIngredientLineDto row)
    {
        if (text.IndexOfAny(['\r', '\n']) >= 0) return null;
        const string amount = @"(?<amount>[0-9¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞][0-9¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞/.,–\- \t]*)";
        var measurement = @"(?<measurement>" + amount + (row.Unit is null ? "" : @"[ \t]+" + Regex.Escape(row.Unit.Text)) + ")";
        var noun = Regex.Escape(row.Description);
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
    private static bool PartialAmount(RecipeIngredientLineDto row, GroceryQuantity amount) =>
        row.Unit is not null && row.Amount is { Kind: "scalar" } && amount is { Kind: "scalar", Value.N: not "0" } &&
        LegacyGroceryQuantity.SubtractScalar(row.Amount, amount) is { Value.N: not "0" };

    private static Binding? Carry(CanonicalRecipeContent? previous, CanonicalRecipeContent content,
        RecipeInstructionStepDto step, RecipeIngredientLineDto row, Clause clause)
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
            Matches(binding, previous, oldStep, oldRow, clause)).ToArray();
        if (prior.Length != 1 || !step.Bindings.Select(Read).Any(binding => binding is not null && binding.Id == prior[0]!.Id &&
            Matches(binding, content, step, row, clause))) return null;
        return prior[0];
    }

    private static bool Matches(Binding binding, CanonicalRecipeContent content, RecipeInstructionStepDto step,
        RecipeIngredientLineDto row, Clause clause) => binding.Id != Guid.Empty && binding.IngredientLineId == row.Id &&
        binding.StepId == step.Id && binding.ValidatedContentRevision == content.ContentRevision && binding.ValidatedTextRevision == step.TextRevision &&
        binding.Span == clause.Span && binding.Role == clause.Role && binding.Status == "validated" &&
        binding.Payload?.RelationshipEvidence is { Version: 1 } evidence &&
        evidence.Rule == (clause.Role == "whole" ? WholeRule : AbsoluteRule) &&
        evidence.SourceRevision == content.SourceRevision && evidence.OriginalAmount == clause.Amount &&
        (clause.Role == "whole" || binding.Payload.Amount == clause.Amount && binding.Payload.Unit == row.Unit);

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
