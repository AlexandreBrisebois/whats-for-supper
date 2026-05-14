using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace RecipeApi.Infrastructure;

/// <summary>
/// Binds a Guid? parameter from either the 'X-Family-Member-Id' header 
/// or the 'x-family-member-id' cookie.
/// This allows controllers to remain agnostic of whether the identity is
/// passed via a manual header or an HttpOnly cookie (BS-PWA-PERSISTENCE).
/// </summary>
public class FamilyMemberIdModelBinder : IModelBinder
{
    public Task BindModelAsync(ModelBindingContext bindingContext)
    {
        if (bindingContext == null)
        {
            throw new ArgumentNullException(nameof(bindingContext));
        }

        // 1. Try Header (Canonical for API consumers)
        var headerValue = bindingContext.HttpContext.Request.Headers["X-Family-Member-Id"].FirstOrDefault();
        if (!string.IsNullOrEmpty(headerValue) && Guid.TryParse(headerValue, out var headerGuid))
        {
            bindingContext.Result = ModelBindingResult.Success(headerGuid);
            return Task.CompletedTask;
        }

        // 2. Try Cookie (Canonical for PWA/Browser consumers)
        if (bindingContext.HttpContext.Request.Cookies.TryGetValue("x-family-member-id", out var cookieValue) &&
            !string.IsNullOrEmpty(cookieValue) &&
            Guid.TryParse(cookieValue, out var cookieGuid))
        {
            bindingContext.Result = ModelBindingResult.Success(cookieGuid);
            return Task.CompletedTask;
        }

        // No value found — result remains null (bindingContext.Result is None by default)
        return Task.CompletedTask;
    }
}

public class FamilyMemberIdModelBinderProvider : IModelBinderProvider
{
    public IModelBinder? GetBinder(ModelBinderProviderContext context)
    {
        if (context == null)
        {
            throw new ArgumentNullException(nameof(context));
        }

        // Apply this binder to any Guid or Guid? parameter named 'familyMemberId' (case-insensitive)
        var name = context.Metadata.Name ?? context.Metadata.ParameterName;
        if ((context.Metadata.ModelType == typeof(Guid) || context.Metadata.ModelType == typeof(Guid?)) &&
            string.Equals(name, "familyMemberId", StringComparison.OrdinalIgnoreCase))
        {
            return new FamilyMemberIdModelBinder();
        }

        return null;
    }
}
