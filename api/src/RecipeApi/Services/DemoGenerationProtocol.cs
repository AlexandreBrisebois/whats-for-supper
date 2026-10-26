using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;

namespace RecipeApi.Services;

public static class DemoGenerationProtocol
{
    public const string Header = "X-Demo-Generation";
    public const string MediaQuery = "demoGeneration";
    public const string ResetCode = "DEMO_RESET_REQUIRED";
    public static async Task<Guid> CurrentAsync(RecipeDbContext db, CancellationToken ct)
        => await db.RecoveryPublications.AsNoTracking().Select(p => (Guid?)p.OperationId).SingleOrDefaultAsync(ct) ?? Guid.Empty;
}
