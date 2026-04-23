namespace RecipeApi.Dto;

public record ScheduleDayDto(string Day, string Date, ScheduleRecipeDto? Recipe);
public record ScheduleRecipeDto(Guid Id, string? Name, string Image, int? VoteCount = null);
public record ScheduleDays(int WeekOffset, bool Locked, List<ScheduleDayDto> Days);
