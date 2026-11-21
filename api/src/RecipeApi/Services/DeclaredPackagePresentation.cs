using System.Text.Json;
using RecipeApi.Dto;

namespace RecipeApi.Services;

// Declared package facts qualify a purchase and its displayed ingredient. They
// never convert capacity to demand or supply a missing ingredient unit/count.
internal static class DeclaredPackagePresentation
{
    internal static string? Key(RecipePackageDto? package) => package is null ? null : JsonSerializer.Serialize(package);

    internal static string Append(string text, RecipePackageDto? package) => package is null ? text
        : $"{text} ({CanonicalRecipeContentStore.Format(package.Capacity.Amount)} {package.Capacity.Unit.Text} / {package.CountUnit.Text}; {package.Basis})";
}
