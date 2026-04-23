namespace RecipeApi.Dto;

public record AssignScheduleDto(int WeekOffset, int DayIndex, Guid RecipeId);
