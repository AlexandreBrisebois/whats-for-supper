namespace RecipeApi.Dto;

public record IngredientProjectionDto
{
    public string ContentRevision { get; set; } = "";
    public string ContextKey { get; set; } = "";
    public InstructionProjectionDto? InstructionProjection { get; set; }
    public required Guid RecipeId { get; set; }
    public required DateOnly SupperDate { get; set; }
    public required string Context { get; set; }
    public required Guid? OccurrenceId { get; set; }
    public required int? BaseServings { get; set; }
    public required int? TargetServings { get; set; }
    public required double? Factor { get; set; }
    public required string ServingVersion { get; set; }
    public string? PreparationPlanToken { get; set; }
    public string? PreparationServingVersion { get; set; }
    public SupperPreparationDto? Preparation { get; set; }
    public required string Version { get; set; }
    public required bool Editable { get; set; }
    public required string Status { get; set; }
    public required List<IngredientProjectionLineDto> Lines { get; set; }
}
