using System.Text.Json;
using System.Text.RegularExpressions;
using RecipeApi.Dto;

namespace RecipeApi.Services;

public static partial class CookingStepRelationshipProducer
{
    private const string PerItemRule = "explicit-per-item-clause";
    private sealed record Dose(GroceryQuantity Amount, RecipeUnitDto Unit);
    private sealed record PerItemClause(RecipeIngredientLineDto Count, RecipeIngredientLineDto Ingredient,
        Clause CountClause, Clause DoseClause, RecipeUnitDto DoseUnit);

    // Closed ordinary language supplies both all-item and each-item intent. The
    // two named ingredient rows, rather than numeric proximity, establish the edge.
    private static PerItemClause? ParsePerItem(string text, RecipeIngredientLineDto count,
        RecipeIngredientLineDto ingredient)
    {
        if (text.IndexOfAny(['\r', '\n']) >= 0 || count.Unit is null) return null;
        const string number = @"[0-9¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞][0-9¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞/.,–\- \t]*";
        var countMeasurement = @"(?<count>(?<countAmount>" + number + @")[ \t]+" + Regex.Escape(count.Unit.Text) + ")";
        var doseMeasurement = @"(?<dose>(?<doseAmount>" + number + @")[ \t]+(?<doseUnit>[\p{L}][\p{L}.]*(?:[ \t]+[\p{L}][\p{L}.]*)*))";
        var countName = Regex.Escape(count.Description); var doseName = Regex.Escape(ingredient.Description);
        var pattern = count.Unit.Text switch
        {
            "pieces" => @"\A[ \t]*For[ \t]+all[ \t]+" + countMeasurement + @"[ \t]+of[ \t]+" + countName +
                @",[ \t]+use[ \t]+exactly[ \t]+" + doseMeasurement + @"[ \t]+of[ \t]+" + doseName + @"[ \t]+on[ \t]+each[ \t]+piece\.?[ \t]*\z",
            "morceaux" => @"\A[ \t]*Pour[ \t]+tous[ \t]+les[ \t]+" + countMeasurement + @"[ \t]+de[ \t]+" + countName +
                @",[ \t]+utilisez[ \t]+exactement[ \t]+" + doseMeasurement + @"[ \t]+(?:de[ \t]+|d['’])" + doseName + @"[ \t]+sur[ \t]+chaque[ \t]+morceau\.?[ \t]*\z",
            _ => null
        };
        if (pattern is null) return null;
        var match = Regex.Match(text, pattern, Options, MatchTimeout);
        if (!match.Success) return null;
        var countAmount = LegacyGroceryQuantity.Parse(match.Groups["countAmount"].Value.Trim());
        var doseAmount = LegacyGroceryQuantity.Parse(match.Groups["doseAmount"].Value.Trim());
        if (countAmount is not { Kind: "scalar" } || doseAmount is not { Kind: "scalar" } ||
            !LegacyGroceryQuantity.IsCanonical(countAmount) || !LegacyGroceryQuantity.IsCanonical(doseAmount)) return null;
        var sourceUnit = match.Groups["doseUnit"].Value;
        if (PartialOrConditional.IsMatch(sourceUnit)) return null;
        // The literal token identifies source wording, not a current ingredient
        // unit. Only exact declared-unit agreement below can validate a dose.
        var doseUnit = ingredient.Unit is { } unit && string.Equals(unit.Text, sourceUnit, StringComparison.OrdinalIgnoreCase)
            ? unit : new RecipeUnitDto(sourceUnit, null);
        var countSpan = match.Groups["count"]; var doseSpan = match.Groups["dose"];
        return new(count, ingredient, new(new(countSpan.Index, countSpan.Index + countSpan.Length, countSpan.Value), countAmount, "whole"),
            new(new(doseSpan.Index, doseSpan.Index + doseSpan.Length, doseSpan.Value), doseAmount, "perItem"), doseUnit);
    }

    private static bool PerItemNamedRow(CanonicalRecipeContent content, RecipeIngredientLineDto row) =>
        row.Id != Guid.Empty && content.IngredientLines.Count(other => other.Id == row.Id) == 1 &&
        !string.IsNullOrWhiteSpace(row.Description) && row.Description.IndexOfAny(['\r', '\n', '.', ';', ':', '!', '?']) < 0 &&
        !PartialOrConditional.IsMatch(row.Description) &&
        content.IngredientLines.Count(other => string.Equals(other.Description, row.Description, StringComparison.OrdinalIgnoreCase)) == 1;

    private static PerItemClause[] PerItemCandidates(CanonicalRecipeContent content, string text) =>
        content.IngredientLines.Where(row => PerItemNamedRow(content, row) && row.Unit?.Text is "pieces" or "morceaux")
            .SelectMany(count => content.IngredientLines.Where(row => row.Id != count.Id && PerItemNamedRow(content, row))
                .Select(row => ParsePerItem(text, count, row)))
            .Where(clause => clause is not null).Cast<PerItemClause>().ToArray();

    private static bool IndependentPerItemStep(CanonicalRecipeContent content, RecipeIngredientLineDto selected,
        string text, CanonicalRecipeContent? previous = null)
    {
        var clauses = PerItemCandidates(content, text);
        if (clauses.Length == 1 && clauses[0].Count.Id != selected.Id && clauses[0].Ingredient.Id != selected.Id) return true;
        var steps = content.InstructionSections.SelectMany(section => section.Steps).ToArray();
        var matching = steps.Where(step => step.Text == text).ToArray();
        if (matching.Length != 1 || CarryIndependentPerItemCount(previous, content, steps, matching[0]) is not { } count ||
            count.IngredientLineId == selected.Id) return false;
        // The unchanged, previously proved clause has its own subject. Do not
        // treat a newly named current row as independent if its name is in it.
        return !Regex.IsMatch(text, @"(?<![\p{L}\p{N}])" + Regex.Escape(selected.Description) + @"(?![\p{L}\p{N}])", Options, MatchTimeout) &&
            PreservesIndependentPerItemRow(previous!, content, selected);
    }

    // An unresolved former dose subject cannot authorize a new exhaustive
    // allocation merely because its current name no longer occurs in the clause.
    // This fallback preserves already-proved unrelated steps, not fresh graphs.
    private static bool PreservesIndependentPerItemRow(CanonicalRecipeContent previous, CanonicalRecipeContent content,
        RecipeIngredientLineDto selected)
    {
        var oldRows = previous.IngredientLines.Where(row => row.Id == selected.Id).ToArray();
        if (oldRows.Length != 1 || !PerItemSameRow(oldRows[0], selected)) return false;
        var mention = new Regex(@"(?<![\p{L}\p{N}])" + Regex.Escape(selected.Description) + @"(?![\p{L}\p{N}])", Options, MatchTimeout);
        var steps = content.InstructionSections.SelectMany(section => section.Steps).Where(step => mention.IsMatch(step.Text)).ToArray();
        return steps.Length != 0 && steps.All(step =>
        {
            var oldSteps = previous.InstructionSections.SelectMany(section => section.Steps).Where(old => old.Id == step.Id).ToArray();
            if (oldSteps.Length != 1 || oldSteps[0].Text != step.Text || oldSteps[0].TextRevision != step.TextRevision) return false;
            return oldSteps[0].Bindings.Any(raw =>
            {
                var proof = Read(raw);
                return proof is { Status: "validated" } && proof.Id != Guid.Empty && proof.IngredientLineId == selected.Id &&
                    proof.StepId == step.Id && proof.ValidatedContentRevision == previous.ContentRevision &&
                    proof.ValidatedTextRevision == step.TextRevision &&
                    proof.Payload?.RelationshipEvidence?.Rule is WholeRule or AbsoluteRule or HalfRule or FixedRule or RemainderRule &&
                    JsonElement.DeepEquals(raw, Write(proof)) &&
                    step.Bindings.Count(current => JsonElement.DeepEquals(current, Write(proof with { ValidatedContentRevision = content.ContentRevision }))) == 1;
            });
        });
    }

    // The dose depends on its upstream whole count, never the reverse. Once a
    // guarded Save removes/renames the dose row, the exact retained count proof
    // can cross later saves without reconstructing a missing row or dose edge.
    private static Binding? CarryIndependentPerItemCount(CanonicalRecipeContent? previous, CanonicalRecipeContent content,
        RecipeInstructionStepDto[] steps, RecipeInstructionStepDto step)
    {
        if (previous is null || previous.SourceRevision != content.SourceRevision || step.Id == Guid.Empty ||
            steps.Count(other => other.Id == step.Id) != 1 || string.IsNullOrEmpty(content.ContentRevision)) return null;
        var oldSteps = previous.InstructionSections.SelectMany(section => section.Steps).Where(old => old.Id == step.Id).ToArray();
        if (oldSteps.Length != 1 || oldSteps[0].Text != step.Text || oldSteps[0].TextRevision != step.TextRevision) return null;
        var oldStep = oldSteps[0];
        var current = step.Bindings.Select(Read).ToArray();
        if (current.Length is < 1 or > 2 || current.Any(binding => binding is null || binding.Payload?.RelationshipEvidence?.Rule != PerItemRule) ||
            current[0]!.Role != "whole" || current.Length == 2 && current[1]!.Role != "perItem") return null;
        var matches = new List<Binding>();
        foreach (var raw in oldStep.Bindings)
        {
            var prior = Read(raw);
            if (prior is not { Role: "whole", Status: "validated", Payload.RelationshipEvidence: { Version: 1, Rule: PerItemRule } evidence } ||
                prior.Id == Guid.Empty || prior.StepId != step.Id || prior.ValidatedContentRevision != previous.ContentRevision ||
                prior.ValidatedTextRevision != step.TextRevision || evidence.SourceRevision != content.SourceRevision ||
                evidence.OriginalAmount is not { Kind: "scalar" } || !LegacyGroceryQuantity.IsCanonical(evidence.OriginalAmount)) continue;
            var oldRows = previous.IngredientLines.Where(row => row.Id == prior.IngredientLineId).ToArray();
            var rows = content.IngredientLines.Where(row => row.Id == prior.IngredientLineId).ToArray();
            if (oldRows.Length != 1 || rows.Length != 1 || !PerItemNamedRow(content, rows[0]) ||
                !PerItemSameRow(oldRows[0], rows[0]) || rows[0].Amount is null || !LegacyGroceryQuantity.IsCanonical(rows[0].Amount) ||
                rows[0].Unit?.Text is not ("pieces" or "morceaux")) continue;
            var row = rows[0];
            var prefix = row.Unit.Text == "pieces" ? @"For[ \t]+all" : @"Pour[ \t]+tous[ \t]+les";
            var article = row.Unit.Text == "pieces" ? "of" : "de";
            var action = row.Unit.Text == "pieces" ? @"use[ \t]+exactly" : @"utilisez[ \t]+exactement";
            var pattern = @"\A[ \t]*" + prefix + @"[ \t]+(?<count>[0-9¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞/., \t]+[ \t]+" +
                Regex.Escape(row.Unit.Text) + @")[ \t]+" + article + @"[ \t]+" + Regex.Escape(row.Description) + @",[ \t]+" + action + @"[ \t]+";
            var measurement = Regex.Match(step.Text, pattern, Options, MatchTimeout).Groups["count"];
            if (!measurement.Success || prior.Span != new Span(measurement.Index, measurement.Index + measurement.Length, measurement.Value) ||
                LegacyGroceryQuantity.Parse(measurement.Value[..^(row.Unit.Text.Length)].Trim()) != evidence.OriginalAmount) continue;
            var mention = new Regex(@"(?<![\p{L}\p{N}])" + Regex.Escape(row.Description) + @"(?![\p{L}\p{N}])", Options, MatchTimeout);
            if (steps.Sum(other => mention.Matches(other.Text).Count) != 1) continue;
            var original = prior with { Payload = new(evidence) };
            var carried = original with { ValidatedContentRevision = content.ContentRevision };
            if (!JsonElement.DeepEquals(raw, Write(original)) ||
                previous.InstructionSections.SelectMany(section => section.Steps).SelectMany(other => other.Bindings).Count(binding => Read(binding)?.Id == prior.Id) != 1 ||
                steps.SelectMany(other => other.Bindings).Count(binding => Read(binding)?.Id == prior.Id) != 1 ||
                step.Bindings.Count(binding => JsonElement.DeepEquals(binding, Write(carried))) != 1) continue;
            matches.Add(carried);
        }
        return matches.Count == 1 ? matches[0] : null;
    }

    private static Binding PerItemBinding(CanonicalRecipeContent content, RecipeInstructionStepDto step,
        PerItemClause clause, bool count, Guid id, Guid countId) => new(id,
            count ? clause.Count.Id : clause.Ingredient.Id, step.Id, content.ContentRevision, step.TextRevision,
            count ? clause.CountClause.Span : clause.DoseClause.Span, count ? "whole" : "perItem",
            new(new(1, PerItemRule, content.SourceRevision, count ? clause.CountClause.Amount : clause.DoseClause.Amount),
                Dose: count ? null : new(clause.DoseClause.Amount, clause.DoseUnit), CountBindingId: count ? null : countId), "validated");

    private static bool PerItemSameRow(RecipeIngredientLineDto before, RecipeIngredientLineDto after) =>
        before.Id == after.Id && before.Description == after.Description && before.Unit == after.Unit &&
        before.Scaling == after.Scaling && before.Package == after.Package && before.Shopping == after.Shopping;

    private static Binding? PerItemExisting(CanonicalRecipeContent content, RecipeInstructionStepDto step,
        PerItemClause clause, bool count, Guid countId)
    {
        var matches = step.Bindings.Select(raw => (Raw: raw, Binding: Read(raw)))
            .Where(item => item.Binding is { Id: var id } && id != Guid.Empty &&
                content.InstructionSections.SelectMany(section => section.Steps).SelectMany(other => other.Bindings)
                    .Count(raw => Read(raw)?.Id == id) == 1 &&
                JsonElement.DeepEquals(item.Raw, Write(PerItemBinding(content, step, clause, count, id, countId))))
            .ToArray();
        return matches.Length == 1 ? matches[0].Binding : null;
    }

    private static Binding? CarryPerItem(CanonicalRecipeContent? previous, CanonicalRecipeContent content,
        RecipeInstructionStepDto step, PerItemClause clause, bool count, Guid countId)
    {
        if (previous is null || previous.SourceRevision != content.SourceRevision) return null;
        var oldSteps = previous.InstructionSections.SelectMany(section => section.Steps).Where(other => other.Id == step.Id).ToArray();
        if (oldSteps.Length != 1 || oldSteps[0].Text != step.Text || oldSteps[0].TextRevision != step.TextRevision) return null;
        var oldStep = oldSteps[0];
        var oldCounts = previous.IngredientLines.Where(row => row.Id == clause.Count.Id).ToArray();
        var oldDoses = previous.IngredientLines.Where(row => row.Id == clause.Ingredient.Id).ToArray();
        if (oldCounts.Length != 1 || !PerItemSameRow(oldCounts[0], clause.Count) ||
            !count && (oldDoses.Length != 1 || !PerItemSameRow(oldDoses[0], clause.Ingredient))) return null;
        // The guarded previous snapshot and its current revalidated counterpart
        // are the authority for crossing a total correction, before fresh equality.
        var prior = PerItemExisting(previous, oldStep, clause, count, countId);
        var current = PerItemExisting(content, step, clause, count, countId);
        return prior is not null && current?.Id == prior.Id ? current : null;
    }

    private static JsonElement[]? DiscoverPerItem(CanonicalRecipeContent content, CanonicalRecipeContent? previous,
        RecipeInstructionStepDto[] steps, RecipeInstructionStepDto step)
    {
        var clauses = PerItemCandidates(content, step.Text);
        var independentCount = CarryIndependentPerItemCount(previous, content, steps, step);
        if (clauses.Length == 0) return independentCount is null ? null : [Write(independentCount)];
        if (clauses.Length != 1 || step.Id == Guid.Empty || steps.Count(other => other.Id == step.Id) != 1 ||
            string.IsNullOrEmpty(step.TextRevision) || string.IsNullOrEmpty(content.SourceRevision) || string.IsNullOrEmpty(content.ContentRevision)) return [];
        var supplied = step.Bindings.Select(Read).ToArray();
        if (supplied.Length > 2 || supplied.Any(binding => binding is null || binding.Id == Guid.Empty) ||
            supplied.Select(binding => binding!.Id).Distinct().Count() != supplied.Length ||
            supplied.Length == 2 && (supplied[0]!.Role != "whole" || supplied[1]!.Role != "perItem" ||
                supplied.Any(binding => binding!.Payload?.RelationshipEvidence?.Rule != PerItemRule))) return [];
        var clause = clauses[0];
        if (clause.Count.Package is not null || clause.Ingredient.Package is not null ||
            clause.Count.Amount is null || !LegacyGroceryQuantity.IsCanonical(clause.Count.Amount) ||
            clause.Count.Scaling is not ("proportional" or "fixed")) return [];
        foreach (var row in new[] { clause.Count, clause.Ingredient })
        {
            var mention = new Regex(@"(?<![\p{L}\p{N}])" + Regex.Escape(row.Description) + @"(?![\p{L}\p{N}])", Options, MatchTimeout);
            if (steps.Sum(other => mention.Matches(other.Text).Count) != 1) return [];
        }
        var count = CarryPerItem(previous, content, step, clause, true, Guid.Empty);
        if (count is null)
        {
            // A fresh clause with a missing or incompatible saved dose unit is
            // not this inlet. Only authoritative prior count proof can survive
            // that dependency change; source tokens never repair the saved unit.
            if (clause.Count.Amount != clause.CountClause.Amount || clause.Ingredient.Unit != clause.DoseUnit) return [];
            count = PerItemExisting(content, step, clause, true, Guid.Empty) ??
                PerItemBinding(content, step, clause, true, Guid.NewGuid(), Guid.Empty);
        }
        var countRaw = Write(count);
        // A whole count is independent of whether the fixed-dose edge remains
        // supported. An explicitly cleared dose total does not clear its dosage.
        if (clause.Count is not { Amount.Kind: "scalar", Scaling: "proportional" } ||
            clause.Ingredient.Unit != clause.DoseUnit || clause.Ingredient.Scaling is not ("proportional" or "fixed")) return [countRaw];
        var dose = CarryPerItem(previous, content, step, clause, false, count.Id) ??
            PerItemExisting(content, step, clause, false, count.Id) ??
            PerItemBinding(content, step, clause, false, Guid.NewGuid(), count.Id);
        return [countRaw, Write(dose)];
    }
}
