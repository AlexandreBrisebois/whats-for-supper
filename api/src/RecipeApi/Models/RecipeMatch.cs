using System;

namespace RecipeApi.Models;

public class RecipeMatch
{
    public Guid RecipeId { get; set; }
    public int LikeCount { get; set; }
}
