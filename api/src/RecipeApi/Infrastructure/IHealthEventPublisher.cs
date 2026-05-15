namespace RecipeApi.Infrastructure;

public interface IHealthEventPublisher
{
    Task PublishRecipeChangedAsync(Guid recipeId, CancellationToken ct);
    Task PublishWeekChangedAsync(DateOnly monday, CancellationToken ct);
}
