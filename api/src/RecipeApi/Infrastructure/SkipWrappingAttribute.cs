using Microsoft.AspNetCore.Mvc.Filters;

namespace RecipeApi.Infrastructure;

/// <summary>
/// Decorate an action or controller with this attribute to prevent the
/// SuccessWrappingFilter from wrapping the response in a { data: ... } object.
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public class SkipWrappingAttribute : Attribute, IFilterMetadata
{
}
