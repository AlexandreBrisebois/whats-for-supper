using RecipeApi.Dto;

namespace RecipeApi.Services;

public static partial class CookingStepRelationshipProducer
{
    // Opaque newly created IDs are recorded facts, not semantic proof. Historical
    // V2 derivation supplies them at the exact same allocation sites while every
    // relationship field and graph edge is still independently reconstructed.
    internal static CanonicalRecipeContent DiscoverRecorded(CanonicalRecipeContent content, CanonicalRecipeContent previous,
        CanonicalRecipeContent recorded)
    {
        var priorBindings = previous.InstructionSections.SelectMany(x => x.Steps).SelectMany(x => x.Bindings)
            .Where(Owned).Select(Read).Where(x => x is not null).Select(x => x!).ToArray();
        var reserved = previous.IngredientLines.Select(x => x.Id)
            .Concat(previous.InstructionSections.Select(x => x.Id))
            .Concat(previous.InstructionSections.SelectMany(x => x.Steps).Select(x => x.Id))
            .Concat(recorded.IngredientLines.Select(x => x.Id))
            .Concat(recorded.InstructionSections.Select(x => x.Id))
            .Concat(recorded.InstructionSections.SelectMany(x => x.Steps).Select(x => x.Id))
            .Concat(previous.InstructionSections.SelectMany(x => x.Steps).SelectMany(x => x.Bindings)
                .Where(raw => raw.ValueKind == System.Text.Json.JsonValueKind.Object && raw.TryGetProperty("id", out var id) && id.TryGetGuid(out _))
                .Select(raw => raw.GetProperty("id").GetGuid()))
            .Concat(priorBindings.Where(x => x.Payload?.AllocationGroup is not null).Select(x => x.Payload.AllocationGroup!.Id))
            .ToHashSet();
        var recordedBindings = recorded.InstructionSections.SelectMany(x => x.Steps).SelectMany(x => x.Bindings)
            .Where(Owned).Select(raw => Read(raw) ?? throw new InvalidDataException("Recorded relationship identity is malformed.")).ToArray();
        if (recordedBindings.Any(x => x.Id == Guid.Empty || x.Span is null)
            || recordedBindings.Select(x => x.Id).Distinct().Count() != recordedBindings.Length)
            throw new InvalidDataException("Recorded relationship identities are not unique.");
        var bindings = recordedBindings.ToDictionary(x => new CreationKey(x.StepId, x.IngredientLineId, x.Role, x.Span.Start, x.Span.End));
        var allocations = new Dictionary<CreationKey, Guid>();
        var owners = new Dictionary<Guid, CreationKey>();
        Guid Allocate(CreationKey key)
        {
            if (allocations.TryGetValue(key, out var retained)) return retained;
            var lookup = key.Kind == "allocationGroup" ? key with { Kind = "absolute" } : key;
            if (!bindings.TryGetValue(lookup, out var binding))
                throw new InvalidDataException("Recorded relationship allocation is absent.");
            var id = key.Kind == "allocationGroup" ? binding.Payload?.AllocationGroup?.Id ?? Guid.Empty : binding.Id;
            if (id == Guid.Empty || reserved.Contains(id) || !owners.TryAdd(id, key))
                throw new InvalidDataException("Recorded new relationship identity reuses another identity.");
            allocations.Add(key, id);
            return id;
        }
        return DiscoverWithIdentities(content, previous, Allocate);
    }
}
