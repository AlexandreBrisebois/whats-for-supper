using RecipeApi.Services;

namespace RecipeApi.Tests.Infrastructure;

internal static class BoundedVocabularyInput
{
    internal const string Revision = "three-anchor-reviewed-2026-11-14.1";
    internal const string Sha256 = "9a73124844fd93422d00bda2a287169317377f69ef2a1a66f6b405e101e8274b";
    internal static readonly Guid Onion = Guid.Parse("ac9818ee-4c30-4f91-a4ea-0aa4fc7265ee");
    internal static readonly Guid Tomato = Guid.Parse("d9940182-48c9-4823-a820-1c7c54869d5f");
    internal static readonly Guid CannedTomato = Guid.Parse("031a0c4b-2d73-4a70-88aa-8ad3dd680ebb");
    internal static string PathFor(string suffix) => Path.Combine(Integration.DeploymentCalendarPostgresTests.RepositoryRoot(),
        "docs/data/food-vocabulary", Revision + suffix);
    internal static byte[] Bytes() => File.ReadAllBytes(PathFor(".json"));
    internal static FoodVocabularyReference Reference => new(Revision, Sha256);
    internal static string ReviewIdentity => $"wfs-bounded-vocabulary:{Revision}:{Sha256}";
}
