using System.Text.Json;
using RecipeApi.Dto;
using RecipeApi.Infrastructure;
using RecipeApi.Models;

namespace RecipeApi.Services;

public sealed partial class CanonicalRecipeContentStore
{
    internal static CanonicalRecipeExport PrepareContentRepair(RecipePublicationFields captured, string raw,
        string[] reasons, CanonicalRecipeContent? originalSteps, string revision, CanonicalRecipeContent? recorded = null)
    {
        var current = Read(new Recipe { Id = captured.Id, CanonicalContent = captured.CanonicalContent })
            ?? throw new InvalidDataException("Content repair requires captured canonical facts.");
        var prepared = reasons.Contains("ingredients") ? PreparePhotoIngredientRepair(captured, raw, revision)
            : new CanonicalRecipeExport(captured.Id, current with { ContentRevision = revision }, captured.RawMetadata);
        var content = prepared.Content;
        if (reasons.Contains("steps") && originalSteps is not null && SameOriginalSteps(current, originalSteps))
        {
            // A complete source-owned sequence may be replaced. Partial/reordered
            // human sequences have no proven correspondence and remain untouched.
            var sections = new Queue<Guid>(recorded?.InstructionSections.Select(x => x.Id) ?? []);
            var stepIds = new Queue<Guid>(recorded?.InstructionSections.SelectMany(x => x.Steps).Select(x => x.Id) ?? []);
            var revisions = new Queue<string>(recorded?.InstructionSections.SelectMany(x => x.Steps).Select(x => x.TextRevision) ?? []);
            var generated = ConvertInstructions(raw, () => recorded is null ? Guid.NewGuid() : sections.Dequeue(),
                () => recorded is null ? Guid.NewGuid() : stepIds.Dequeue(),
                () => recorded is null ? NewRevision() : revisions.Dequeue());
            var oldSteps = current.InstructionSections.SelectMany(x => x.Steps).ToArray();
            var newSteps = generated.SelectMany(x => x.Steps).ToArray();
            content = content with
            {
                InstructionSections = generated.Select(section =>
                {
                    var matching = current.InstructionSections.Where(x => x.Name == section.Name).ToArray();
                    var reuseSection = matching.Length == 1 && generated.Count(x => x.Name == section.Name) == 1;
                    return section with
                    {
                        Id = reuseSection ? matching[0].Id : section.Id,
                        Steps = section.Steps.Select(step =>
                        {
                            var same = oldSteps.Where(x => x.Text == step.Text).ToArray();
                            return same.Length == 1 && newSteps.Count(x => x.Text == step.Text) == 1 ? same[0] : step;
                        }).ToArray()
                    };
                }).ToArray()
            };
            if (recorded is not null && (sections.Count != 0 || stepIds.Count != 0 || revisions.Count != 0))
                throw new InvalidDataException("Recorded instruction identities differ from selected source steps.");
        }
        content = CookingStepProjection.Revalidate(current, content);
        content = recorded is null ? CookingStepRelationshipProducer.Discover(content, current)
            : CookingStepRelationshipProducer.DiscoverRecorded(content, current, recorded);
        return prepared with { Content = content };
    }

    internal static bool SameOriginalSteps(CanonicalRecipeContent current, CanonicalRecipeContent original) =>
        JsonSerializer.Serialize(current.InstructionSections.Select(section => new
        { section.Id, section.Name, Steps = section.Steps.Select(step => new { step.Id, step.Text, step.TextRevision }) }), Json)
        == JsonSerializer.Serialize(original.InstructionSections.Select(section => new
        { section.Id, section.Name, Steps = section.Steps.Select(step => new { step.Id, step.Text, step.TextRevision }) }), Json);
}
