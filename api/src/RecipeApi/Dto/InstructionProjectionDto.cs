namespace RecipeApi.Dto;

public sealed record InstructionProjectionDto(
    IReadOnlyList<InstructionProjectionSectionDto> Sections, int ValidatedUses, int UncertainUses);
public sealed record InstructionProjectionSectionDto(Guid SectionId, string? Name, IReadOnlyList<InstructionProjectionStepDto> Steps);
public sealed record InstructionProjectionStepDto(Guid StepId, string TextRevision, string OriginalText, string Text);
