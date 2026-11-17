using System.Reflection;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using RecipeApi.Data;

namespace RecipeApi.Services;

/// <summary>
/// Publishes the embedded household bilingual food vocabulary on startup when no
/// active vocabulary exists in <c>family_settings</c>.
/// </summary>
public sealed class FoodVocabularySeeder(
    RecipeDbContext db,
    FoodVocabularyStore store,
    ILogger<FoodVocabularySeeder>? logger = null)
{
    public const string ResourceName = "RecipeApi.Resources.base-household-vocabulary.json";
    private const string MembershipKey = "food_vocabulary_publication";

    private readonly ILogger<FoodVocabularySeeder> _logger = logger ?? NullLogger<FoodVocabularySeeder>.Instance;

    public static byte[] LoadBaselineBytes()
    {
        var assembly = Assembly.GetExecutingAssembly();
        using var stream = assembly.GetManifestResourceStream(ResourceName)
            ?? throw new FileNotFoundException($"Embedded food vocabulary resource '{ResourceName}' not found.");
        using var buffer = new MemoryStream();
        stream.CopyTo(buffer);
        return buffer.ToArray();
    }

    public static Guid ComputeDeterministicOperationId(byte[] bytes)
    {
        ArgumentNullException.ThrowIfNull(bytes);
        var digest = FoodVocabularyDefinitions.Sha256(bytes);
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes("wfs-food-vocabulary-seed:" + digest));
        Span<byte> guidBytes = stackalloc byte[16];
        hash.AsSpan(0, 16).CopyTo(guidBytes);
        guidBytes[6] = (byte)((guidBytes[6] & 0x0F) | 0x50);
        guidBytes[8] = (byte)((guidBytes[8] & 0x3F) | 0x80);
        var id = new Guid(guidBytes, bigEndian: true);
        return id == Guid.Empty ? throw new InvalidOperationException("Deterministic vocabulary seed operation ID cannot be empty.") : id;
    }

    public async Task<FoodVocabularyPublicationOutcome?> EnsureSeededAsync(CancellationToken ct = default)
    {
        var bytes = LoadBaselineBytes();
        var definitions = FoodVocabularyDefinitions.Read(bytes);
        var sha256 = FoodVocabularyDefinitions.Sha256(bytes);
        var baselineRef = new FoodVocabularyReference(definitions.Revision, sha256);
        var operationId = ComputeDeterministicOperationId(bytes);
        var reviewIdentity = $"wfs-household-baseline:{definitions.Revision}:{sha256}";

        var existingMember = await db.FamilySettings.AsNoTracking()
            .SingleOrDefaultAsync(x => x.Key == MembershipKey, ct);

        if (existingMember is not null)
        {
            var inspection = FoodVocabularyStore.InspectMembership(existingMember.Value.GetRawText());
            if (inspection.HasPrepared && inspection.ActiveRef is null
                && inspection.References.Count == 1 && inspection.References[0] == baselineRef)
            {
                _logger.LogInformation(
                    "Resuming interrupted baseline vocabulary publication {Revision} ({OperationId})",
                    definitions.Revision, operationId);
                return await store.PublishReviewedAsync(bytes, null, operationId, reviewIdentity, ct);
            }
        }

        var active = await store.CaptureActiveAsync(ct);
        if (active is not null)
        {
            _logger.LogDebug(
                "Skipping baseline vocabulary seed; active vocabulary {Revision} is already installed",
                active.Reference.Revision);
            return null;
        }

        var outcome = await store.PublishReviewedAsync(bytes, null, operationId, reviewIdentity, ct);
        _logger.LogInformation(
            "Seeded baseline bilingual food vocabulary {Revision} ({Sha256})",
            outcome.NewHead.Revision, outcome.NewHead.Sha256);
        return outcome;
    }
}
