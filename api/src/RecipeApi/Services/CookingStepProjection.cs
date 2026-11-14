using System.Text.Json;
using System.Numerics;
using System.Text.Json.Nodes;
using RecipeApi.Dto;

namespace RecipeApi.Services;

/// <summary>Substitutes only confirmed revision-bound spans. It never discovers uses or contributes grocery demand.</summary>
public static class CookingStepProjection
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    private sealed record Span(int Start, int End, string ExpectedText);
    private sealed record Binding(Guid Id, Guid IngredientLineId, Guid StepId, string ValidatedContentRevision,
        string ValidatedTextRevision, Span Span, string Role, JsonElement Payload, string Status);

    private static Binding? Read(JsonElement raw)
    {
        try { return raw.Deserialize<Binding>(Json); }
        catch (JsonException) { return null; }
    }

    private static bool Boundary(string text, int offset) => offset >= 0 && offset <= text.Length &&
        !(offset > 0 && offset < text.Length && char.IsHighSurrogate(text[offset - 1]) && char.IsLowSurrogate(text[offset]));

    private static bool Valid(CanonicalRecipeContent content, RecipeInstructionStepDto step, Binding? binding)
    {
        if (binding is not { Span: { } span, Status: "validated" } || binding.Id == Guid.Empty ||
            binding.Payload.ValueKind != JsonValueKind.Object || binding.StepId != step.Id || binding.ValidatedContentRevision != content.ContentRevision ||
            binding.ValidatedTextRevision != step.TextRevision || span.End <= span.Start ||
            !Boundary(step.Text, span.Start) || !Boundary(step.Text, span.End) ||
            step.Text[span.Start..span.End] != span.ExpectedText ||
            content.IngredientLines.Count(x => x.Id == binding.IngredientLineId) != 1) return false;
        var row = content.IngredientLines.Single(x => x.Id == binding.IngredientLineId);
        if (binding.Role == "whole") return row.Amount is not null && LegacyGroceryQuantity.IsCanonical(row.Amount);
        if (binding.Role == "fraction") return FractionAmount(row, binding) is not null && AnnotationValid(step, binding);
        if (binding.Role == "remainder") return true;
        if (binding.Role == "perItem") return content.InstructionSections.SelectMany(x => x.Steps)
            .SelectMany(x => x.Bindings).Select(Read).Count(x => x?.Id == binding.Id) == 1 &&
            DoseValid(row, binding) && CountProof(content, binding) is not null;
        if (binding.Role == "fixed" && (
            binding.Payload.TryGetProperty("allocationGroup", out _) || binding.Payload.TryGetProperty("allocationGroupId", out _) ||
            content.InstructionSections.SelectMany(x => x.Steps).SelectMany(x => x.Bindings).Select(Read).Count(x => x?.Id == binding.Id) != 1)) return false;
        if (binding.Role is not ("absolute" or "fixed")) return false;
        try
        {
            return binding.Payload.TryGetProperty("amount", out var amount) && LegacyGroceryQuantity.IsCanonical(amount.Deserialize<GroceryQuantity>(Json)) &&
                binding.Payload.TryGetProperty("unit", out var unit) && unit.Deserialize<RecipeUnitDto>(Json) == row.Unit;
        }
        catch (JsonException) { return false; }
    }

    private static bool DoseValid(RecipeIngredientLineDto row, Binding binding)
    {
        try
        {
            return binding.Payload.TryGetProperty("dose", out var dose) && dose.ValueKind == JsonValueKind.Object &&
                dose.TryGetProperty("amount", out var raw) && raw.Deserialize<GroceryQuantity>(Json) is { Kind: "scalar" } amount &&
                LegacyGroceryQuantity.IsCanonical(amount) && dose.TryGetProperty("unit", out var unit) &&
                unit.Deserialize<RecipeUnitDto>(Json) is { } doseUnit && doseUnit == row.Unit;
        }
        catch (JsonException) { return false; }
    }

    // The explicit link proves item-count meaning. Do not infer it from a number,
    // unit label or nearby prose. Restrict this edge to a whole count: no cycles.
    private static (RecipeInstructionStepDto Step, Binding Use, RecipeIngredientLineDto Row)? CountProof(CanonicalRecipeContent content, Binding dose)
    {
        if (!dose.Payload.TryGetProperty("countBindingId", out var raw) || raw.ValueKind != JsonValueKind.String ||
            !raw.TryGetGuid(out var id) || id == Guid.Empty) return null;
        var matches = content.InstructionSections.SelectMany(x => x.Steps).SelectMany(step =>
            step.Bindings.Select(Read).Where(use => use?.Id == id).Select(use => (Step: step, Use: use!))).ToArray();
        if (matches.Length != 1) return null;
        var (step, use) = matches[0];
        if (use.Role != "whole" || use.IngredientLineId == dose.IngredientLineId ||
            !Eligible(content, step, use, step.Bindings.Select(Read).ToArray()) ||
            use.Payload.TryGetProperty("allocationGroup", out _)) return null;
        var row = content.IngredientLines.Single(x => x.Id == use.IngredientLineId);
        return row is { Amount.Kind: "scalar", Scaling: "proportional" } ? (step, use, row) : null;
    }

    private static bool SameRowDependencies(RecipeIngredientLineDto before, RecipeIngredientLineDto after) =>
        before.Description == after.Description && before.Unit == after.Unit && before.Scaling == after.Scaling &&
        before.Package == after.Package && before.Shopping == after.Shopping;

    private static bool CountCanCarry(CanonicalRecipeContent before, CanonicalRecipeContent after, Binding binding)
    {
        if (binding.Role != "perItem") return true;
        if (CountProof(before, binding) is not { } proof) return false;
        var step = after.InstructionSections.SelectMany(x => x.Steps).SingleOrDefault(x => x.Id == proof.Step.Id);
        var row = after.IngredientLines.SingleOrDefault(x => x.Id == proof.Row.Id);
        return step is not null && row is not null && step.Text == proof.Step.Text && step.TextRevision == proof.Step.TextRevision &&
            SameRowDependencies(proof.Row, row) && row.Amount is { Kind: "scalar" } && LegacyGroceryQuantity.IsCanonical(row.Amount) &&
            step.Bindings.Count(raw => Read(raw)?.Id == proof.Use.Id &&
                proof.Step.Bindings.Any(old => JsonElement.DeepEquals(old, raw))) == 1;
    }

    private static GroceryQuantity? FractionAmount(RecipeIngredientLineDto row, Binding binding)
    {
        try
        {
            if (!binding.Payload.TryGetProperty("fraction", out var raw) ||
                raw.Deserialize<GroceryRational>(Json) is not { } fraction ||
                !LegacyGroceryQuantity.IsCanonical(new("scalar", fraction)) ||
                BigInteger.Parse(fraction.N) > BigInteger.Parse(fraction.D)) return null;
            return LegacyGroceryQuantity.Multiply(row.Amount, fraction);
        }
        catch (JsonException) { return null; }
    }

    private static GroceryQuantity? OriginalUse(RecipeIngredientLineDto row, Binding binding) => binding.Role switch
    {
        "whole" => row.Amount,
        "fraction" => FractionAmount(row, binding),
        _ => binding.Payload.GetProperty("amount").Deserialize<GroceryQuantity>(Json)
    };

    private static Span? Annotation(Binding binding)
    {
        try
        {
            return binding.Role == "fraction" && binding.Payload.ValueKind == JsonValueKind.Object &&
                binding.Payload.TryGetProperty("annotationSpan", out var raw)
                ? raw.Deserialize<Span>(Json) : null;
        }
        catch (JsonException) { return null; }
    }

    // Annotated halves preserve exact arithmetic. Prefer a finite decimal only
    // when division terminates within the supported source-token bound; otherwise
    // retain the existing rational rendering without rounding.
    private static string? AnnotationAmount(GroceryQuantity quantity)
    {
        if (quantity is not { Kind: "scalar", Value: { } value }) return null;
        var denominator = BigInteger.Parse(value.D);
        var integer = BigInteger.DivRem(BigInteger.Parse(value.N), denominator, out var remainder);
        if (remainder.IsZero) return integer.ToString(System.Globalization.CultureInfo.InvariantCulture);
        var digits = new System.Text.StringBuilder();
        while (!remainder.IsZero && digits.Length < 256)
        {
            var digit = BigInteger.DivRem(remainder * 10, denominator, out remainder);
            digits.Append((char)('0' + (int)digit));
        }
        return remainder.IsZero ? integer.ToString(System.Globalization.CultureInfo.InvariantCulture) + "." + digits : null;
    }

    private static bool SpanOverlap(Span first, Span second) => first.Start < second.End && second.Start < first.End;

    private static bool AnnotationValid(RecipeInstructionStepDto step, Binding binding)
    {
        if (!binding.Payload.TryGetProperty("annotationSpan", out _)) return true;
        return Annotation(binding) is { } span && span.End > span.Start &&
            Boundary(step.Text, span.Start) && Boundary(step.Text, span.End) &&
            step.Text[span.Start..span.End] == span.ExpectedText && !SpanOverlap(binding.Span, span);
    }

    private static bool Overlap(Binding binding, Binding? other)
    {
        if (other?.Span is not { } span) return false;
        var annotation = Annotation(binding);
        var otherAnnotation = Annotation(other);
        return SpanOverlap(binding.Span, span) ||
            annotation is not null && SpanOverlap(annotation, span) ||
            otherAnnotation is not null && SpanOverlap(binding.Span, otherAnnotation) ||
            annotation is not null && otherAnnotation is not null && SpanOverlap(annotation, otherAnnotation);
    }

    private static bool Eligible(CanonicalRecipeContent content, RecipeInstructionStepDto step, Binding? binding, Binding?[] bindings) =>
        Valid(content, step, binding) && bindings.Count(x => x?.Id == binding!.Id) == 1 &&
        !bindings.Any(x => x?.Id != binding!.Id && Overlap(binding!, x));

    private sealed record AllocationGroup(Guid Id, bool Exhaustive, Guid[] BindingIds);

    private static AllocationGroup? Group(Binding? binding)
    {
        try
        {
            return binding?.Payload.ValueKind == JsonValueKind.Object &&
            binding.Payload.TryGetProperty("allocationGroup", out var group) ? group.Deserialize<AllocationGroup>(Json) : null;
        }
        catch (JsonException) { return null; }
    }

    // Membership is explicit and closed. A terminal remainder is total minus its
    // exact ordered predecessors, never a sum inferred from ingredient mentions.
    private static Dictionary<Guid, GroceryQuantity>? ResolveGroup(CanonicalRecipeContent content, Binding binding)
    {
        var group = Group(binding);
        if (group is not { Id: var id, Exhaustive: true, BindingIds: { Length: > 0 } ids } ||
            id == Guid.Empty || ids.Distinct().Count() != ids.Length || !ids.Contains(binding.Id)) return null;
        var all = content.InstructionSections.SelectMany(section => section.Steps).SelectMany(step =>
            step.Bindings.Select(Read).Select(use => (Step: step, Use: use))).ToArray();
        var members = all.Where(x => Group(x.Use)?.Id == id).ToArray();
        if (!members.Select(x => x.Use!.Id).SequenceEqual(ids)) return null;
        var row = content.IngredientLines.Single(x => x.Id == binding.IngredientLineId);
        if (!LegacyGroceryQuantity.IsCanonical(row.Amount)) return null;
        var amounts = new Dictionary<Guid, GroceryQuantity>();
        var sum = LegacyGroceryQuantity.Parse("0");
        var fractions = LegacyGroceryQuantity.Parse("0");
        var absolutes = LegacyGroceryQuantity.Parse("0");
        for (var index = 0; index < ids.Length; index++)
        {
            var matches = all.Where(x => x.Use?.Id == ids[index]).ToArray();
            if (matches.Length != 1) return null;
            var (step, use) = matches[0];
            var proof = Group(use);
            if (use is null || use.Role is "perItem" or "fixed" || proof is null || proof.Id != id || !proof.Exhaustive ||
                proof.BindingIds is null || !proof.BindingIds.SequenceEqual(ids) || use.IngredientLineId != row.Id ||
                !Eligible(content, step, use, step.Bindings.Select(Read).ToArray()) ||
                (use.Role == "whole" && ids.Length != 1)) return null;
            if (use.Role == "remainder")
            {
                try
                {
                    if (index == 0 || index != ids.Length - 1 ||
                        !use.Payload.TryGetProperty("allocationGroupId", out var groupId) || groupId.GetGuid() != id ||
                        !use.Payload.TryGetProperty("predecessors", out var predecessors) ||
                        predecessors.Deserialize<Guid[]>(Json) is not { } prior || !prior.SequenceEqual(ids.Take(index))) return null;
                }
                catch (Exception error) when (error is JsonException or InvalidOperationException or FormatException) { return null; }
                // Fractions share the canonical total. Subtract that coefficient
                // first, then known scalar uses: no independent interval subtraction.
                var coefficient = LegacyGroceryQuantity.SubtractScalar(LegacyGroceryQuantity.Parse("1"), fractions);
                var remainder = coefficient is null ? null : LegacyGroceryQuantity.SubtractScalar(
                    LegacyGroceryQuantity.Multiply(row.Amount, coefficient.Value!), absolutes);
                if (remainder is null) return null;
                amounts[use.Id] = remainder;
                return amounts;
            }
            var amount = OriginalUse(row, use);
            if (!LegacyGroceryQuantity.IsCanonical(amount)) return null;
            amounts[use.Id] = amount!;
            if (use.Role == "fraction")
            {
                var fraction = use.Payload.GetProperty("fraction").Deserialize<GroceryRational>(Json)!;
                fractions = LegacyGroceryQuantity.Add(fractions, new("scalar", fraction));
                if (fractions is null) return null;
            }
            else
            {
                if (amount!.Kind != "scalar") return null;
                absolutes = LegacyGroceryQuantity.Add(absolutes, amount);
                if (absolutes is null) return null;
            }
            sum = LegacyGroceryQuantity.Add(sum, amount);
            if (sum is null) return null;
        }
        return row.Amount is { Kind: "scalar" } && sum == row.Amount ? amounts : null;
    }

    private static bool GroupValid(CanonicalRecipeContent content, Binding binding) =>
        binding.Payload.TryGetProperty("allocationGroup", out _) ? binding.Role != "perItem" && ResolveGroup(content, binding) is not null : binding.Role != "remainder";

    public static InstructionProjectionDto Read(CanonicalRecipeContent content, int? target)
    {
        var valid = 0;
        var uncertain = 0;
        var sections = content.InstructionSections.Select(section => new InstructionProjectionSectionDto(section.Id, section.Name,
            section.Steps.Select(step =>
            {
                var text = step.Text;
                var bindings = step.Bindings.Select(Read).ToArray();
                var replacements = new List<(int Start, int End, string Text)>();
                foreach (var binding in bindings)
                {
                    if (!Eligible(content, step, binding, bindings) || !GroupValid(content, binding!)) { uncertain++; continue; }
                    var row = content.IngredientLines.Single(x => x.Id == binding!.IngredientLineId);
                    if (binding!.Role == "perItem")
                    {
                        var count = CountProof(content, binding)!.Value.Row.Amount;
                        if (target is not null && (content.Servings is not > 0 ||
                            LegacyGroceryQuantity.Scale(count, target.Value, content.Servings.Value) is null)) { uncertain++; continue; }
                        valid++;
                        continue; // Fixed dose and per-item prose remain byte-for-byte original.
                    }
                    // A fixed use owns its original amount and wording independently of the
                    // ingredient row policy and serving basis. It never adds demand.
                    if (binding.Role == "fixed") { valid++; continue; }
                    var amount = binding!.Role == "remainder" ? ResolveGroup(content, binding)![binding.Id] : OriginalUse(row, binding);
                    var scaled = target is null || row.Scaling == "fixed" ? amount
                        : content.Servings is > 0 ? LegacyGroceryQuantity.Scale(amount, target.Value, content.Servings.Value) : null;
                    if (scaled is null) { uncertain++; continue; }
                    // Relative wording is already the correct instruction at every target.
                    // Replace an existing proved numeric annotation only; never invent one.
                    if (binding!.Role == "fraction")
                    {
                        if (Annotation(binding) is { } annotation)
                        {
                            var annotated = CanonicalRecipeContentStore.Render(row with { Amount = scaled, AmountText = AnnotationAmount(scaled), Description = "" }).TrimEnd();
                            replacements.Add((annotation.Start, annotation.End, annotated));
                        }
                        valid++;
                        continue;
                    }
                    var rendered = CanonicalRecipeContentStore.Render(row with { Amount = scaled, AmountText = null, Description = "" }).TrimEnd();
                    replacements.Add((binding.Span.Start, binding.Span.End, binding.Role == "remainder" ? $"{binding.Span.ExpectedText} ({rendered})" : rendered));
                    valid++;
                }
                foreach (var replacement in replacements.OrderByDescending(x => x.Start))
                    text = text[..replacement.Start] + replacement.Text + text[replacement.End..];
                return new InstructionProjectionStepDto(step.Id, step.TextRevision, step.Text, text);
            }).ToArray())).ToArray();
        return new(sections, valid, uncertain);
    }

    // Only a previously proved use may cross an ingredient-total edit. Changing its
    // identity, unit, policy, package, source or wording leaves the old proof stale.
    public static CanonicalRecipeContent Revalidate(CanonicalRecipeContent before, CanonicalRecipeContent after) => after with
    {
        InstructionSections = after.InstructionSections.Select(section => section with
        {
            Steps = section.Steps.Select(step => step with
            {
                Bindings = step.Bindings.Select(raw =>
                {
                    var binding = Read(raw);
                    var prior = before.InstructionSections.SelectMany(x => x.Steps).SingleOrDefault(x => x.Id == step.Id);
                    if (prior is null || prior.Text != step.Text || prior.TextRevision != step.TextRevision ||
                        !Eligible(before, prior, binding, prior.Bindings.Select(Read).ToArray()) || !GroupValid(before, binding!)) return raw;
                    var oldRow = before.IngredientLines.Single(x => x.Id == binding!.IngredientLineId);
                    var newRow = after.IngredientLines.SingleOrDefault(x => x.Id == oldRow.Id);
                    if (newRow is null || !SameRowDependencies(oldRow, newRow) ||
                        before.SourceRevision != after.SourceRevision || !CountCanCarry(before, after, binding!)) return raw;
                    var node = JsonNode.Parse(raw.GetRawText())!;
                    node["validatedContentRevision"] = after.ContentRevision;
                    return JsonSerializer.SerializeToElement(node, Json);
                }).ToArray()
            }).ToArray()
        }).ToArray()
    };
}
