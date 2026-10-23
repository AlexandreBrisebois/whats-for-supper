using System.Text.Json.Serialization;

namespace RecipeApi.Dto;

public sealed record VotingSessionSnapshot
{
    [JsonPropertyName("incarnationId")]
    public required Guid IncarnationId { get; init; }

    [JsonPropertyName("revision")]
    public required long Revision { get; init; }

    [JsonPropertyName("roundId")]
    public required Guid? RoundId { get; init; }

    [JsonPropertyName("weekStartDate")]
    public required DateOnly? WeekStartDate { get; init; }

    [JsonPropertyName("phase")]
    public required string Phase { get; init; }

    [JsonPropertyName("requiredSlots")]
    public required int? RequiredSlots { get; init; }

    [JsonPropertyName("coveredSlots")]
    public required int? CoveredSlots { get; init; }

    [JsonPropertyName("candidateCount")]
    public required int? CandidateCount { get; init; }

    [JsonPropertyName("smartDefaults")]
    public required SmartDefaultsDto? SmartDefaults { get; init; }
}
