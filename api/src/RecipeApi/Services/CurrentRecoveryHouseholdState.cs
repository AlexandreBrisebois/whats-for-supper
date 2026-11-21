using System.Text.Json;
using System.Text.Json.Serialization;
using RecipeApi.Infrastructure;
using RecipeApi.Models;

namespace RecipeApi.Services;

// Explicit supported wire facts, without entity initializers, navigation properties
// or default identities. Every nullable constructor member must also be present.
public sealed record CurrentRecoveryMember(Guid Id, string Name, string BrowseViewMode, string? PreferredLanguage,
    string? CookingViewMode, DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt);
public sealed record CurrentRecoveryReport(Guid RecipeId, string[] Reasons, string? Note, RecipeImportReportStatus Status,
    Guid? ReportedBy, Guid? UpdatedBy, DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt, Guid? LastWorkflowInstanceId,
    DateTimeOffset? LastAttemptAt, DateTimeOffset? ReimportedAt, string? LastError);
public sealed record CurrentRecoveryExtra(Guid Id, Guid LineageId, Guid? PredecessorId, DateOnly WeekStartDate,
    string Name, string? CreationName, string NormalizedKey, string GrocerySection, bool Checked, DateTimeOffset? RemovedAt,
    int Version, DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt);
public sealed record CurrentRecoveryExtras(int Version, CurrentRecoveryExtra[] Occurrences);
public sealed record CurrentRecoveryServingDay(DateOnly Date, int? OverrideServings, int? InheritedServings, Guid Version,
    DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt);
public sealed record CurrentRecoveryServings(int Version, int? DefaultServings, Guid? DefaultVersion,
    DateTimeOffset? DefaultUpdatedAt, CurrentRecoveryServingDay[] Days);
public sealed record CurrentRecoveryInterestRow(DateOnly WeekStartDate, Guid RecipeId, int PositiveCount, bool Selected,
    DateTimeOffset CapturedAt, Guid CloseId);
public sealed record CurrentRecoveryInterest(int Version, Guid Generation, CurrentRecoveryInterestRow[] Rows);
public sealed record CurrentRecoveryCalendarEvent(Guid Id, Guid? RecipeId, DateOnly Date, CalendarEventStatus Status,
    short MealSlot, string? NonCookingKind, string? NonCookingLabel, DateOnly? PreparedOn, DateTimeOffset? PreparedAtUtc,
    int? PreparedServings, int? PreparedOriginalServings, string? PreparationPlanToken, string? PreparationServingVersion,
    int? VoteCount, Guid[]? CandidateIds);
public sealed record CurrentRecoveryCategory(string NormalizedKey, string GrocerySection, double Confidence, string Source,
    DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt);

/// <summary>
/// Typed preflight of the supported household relationships over frozen input.
/// This is not full household recovery: cross-owner workflow,
/// binding/evidence semantics and publication have additional owners.
/// No publication or normalization of interrupted work is performed here.
/// </summary>
public sealed partial class CurrentRecoveryHouseholdState
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        PropertyNameCaseInsensitive = false,
        UnmappedMemberHandling = JsonUnmappedMemberHandling.Disallow,
        RespectRequiredConstructorParameters = true
    };
    private readonly CurrentRecoveryArchive _inventory;
    private readonly Dictionary<string, string> _paths;

    private CurrentRecoveryHouseholdState(CurrentRecoveryArchive inventory, CurrentRecoveryManifest manifest)
    {
        _inventory = inventory;
        _paths = manifest.Artifacts.Where(x => CurrentRecoveryArchive.HouseholdArtifactKinds.Contains(x.Kind))
            .ToDictionary(x => x.Kind, x => x.Path, StringComparer.Ordinal);
    }

    // Return independent objects; callers cannot alter the validated stage.
    public CurrentRecoveryMember[] ReadMembers() => Read<CurrentRecoveryMember[]>("family-members");
    public CurrentRecoveryReport[] ReadReports() => Read<CurrentRecoveryReport[]>("recipe-import-reports");
    public CurrentRecoveryExtras ReadExtras() => Read<CurrentRecoveryExtras>("grocery-extras");
    public CurrentRecoveryServings ReadServings() => Read<CurrentRecoveryServings>("supper-servings");
    public CurrentRecoveryInterest ReadInterest() => Read<CurrentRecoveryInterest>("weekly-household-interest");
    public CurrentRecoveryCalendarEvent[] ReadCalendar() => Read<CurrentRecoveryCalendarEvent[]>("calendar-events");
    public CurrentRecoveryCategory[] ReadCategories() => Read<CurrentRecoveryCategory[]>("ingredient-categories");

    private T Read<T>(string kind)
    {
        using var input = _inventory.OpenRead(_paths[kind]);
        return JsonSerializer.Deserialize<T>(input, Json) ?? throw new InvalidDataException();
    }

    public static CurrentRecoveryHouseholdState Stage(CurrentRecoveryArchive inventory, CurrentRecoveryRecipes recipes,
        CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(inventory);
        ArgumentNullException.ThrowIfNull(recipes);
        ct.ThrowIfCancellationRequested();
        using var document = inventory.ReadManifest();
        var manifest = document.RootElement.Deserialize<CurrentRecoveryManifest>(Json)!;
        var stage = new CurrentRecoveryHouseholdState(inventory, manifest);
        var errors = new List<CurrentRecoveryDiagnostic>();
        T? Inspect<T>(string kind, Func<T> read, Action<T> validate) where T : class
        {
            ct.ThrowIfCancellationRequested();
            try { var value = read(); validate(value); return value; }
            catch (Exception ex) when (ex is JsonException or InvalidDataException or ArgumentException or OverflowException)
            { errors.Add(new(stage._paths[kind], "invalid-current-" + kind)); return null; }
        }
        void Check(bool valid) { if (!valid) throw new InvalidDataException(); }
        void Rows<T, TKey>(T[]? rows, Func<T, TKey> key, Action<T> validate) where T : class
        {
            Check(rows is not null);
            var keys = new HashSet<TKey>();
            foreach (var row in rows!) { ct.ThrowIfCancellationRequested(); Check(row is not null); Check(keys.Add(key(row!))); validate(row!); }
        }
        static bool Text(string? text, int max = int.MaxValue) => !string.IsNullOrWhiteSpace(text) && text.Length <= max;
        static bool Chronology(DateTimeOffset created, DateTimeOffset updated) => created != default && updated >= created;
        static bool Monday(DateOnly date) => date != default && date.DayOfWeek == DayOfWeek.Monday;
        var recipeIds = manifest.Recipes.Select(x => x.RecipeId).ToHashSet();
        Check(recipeIds.SetEquals(recipes.RecipeIds));
        var members = Inspect("family-members", stage.ReadMembers, rows => Rows(rows, x => x.Id, x => Check(
            x.Id != Guid.Empty && Text(x.Name, 100) && x.BrowseViewMode is "stack" or "list"
            && x.PreferredLanguage is null or "en" or "fr" && x.CookingViewMode is null or "step-by-step" or "all-steps"
            && Chronology(x.CreatedAt, x.UpdatedAt))));
        var memberIds = members?.Select(x => x.Id).ToHashSet();
        bool Member(Guid? id) => id is null || memberIds is not null && memberIds.Contains(id.Value);
        // Do not use destination membership or manufacture recovered placeholders.
        // If the roster itself is invalid, retain its diagnostic rather than guess.
        if (memberIds is not null)
            foreach (var id in recipes.RecipeIds)
            {
                ct.ThrowIfCancellationRequested();
                var metadata = recipes.ReadMetadata(id);
                if (!Member(metadata.AddedBy) || !Member(metadata.DeletedBy))
                    errors.Add(new(stage._paths["family-members"], "missing-recipe-member-reference"));
            }
        Inspect("recipe-import-reports", stage.ReadReports, rows => Rows(rows, x => x.RecipeId, x => Check(
            recipeIds.Contains(x.RecipeId) && x.Reasons is { Length: > 0 }
            && x.Reasons.All(r => r is "ingredients" or "steps" or "duplicate") && x.Reasons.Distinct().Count() == x.Reasons.Length
            && x.Note?.Length is not > 500 && x.LastError?.Length is not > 2000 && Enum.IsDefined(x.Status)
            && (memberIds is null || Member(x.ReportedBy) && Member(x.UpdatedBy))
            && x.ReportedBy != Guid.Empty && x.UpdatedBy != Guid.Empty && x.LastWorkflowInstanceId != Guid.Empty
            && Chronology(x.CreatedAt, x.UpdatedAt) && (x.LastAttemptAt is null || x.LastAttemptAt >= x.CreatedAt)
            && (x.ReimportedAt is null || x.ReimportedAt >= x.CreatedAt))));
        Inspect("ingredient-categories", stage.ReadCategories, rows => Rows(rows, x => x.NormalizedKey, x => Check(
            Text(x.NormalizedKey) && GrocerySections.IsCanonicalName(x.GrocerySection) && double.IsFinite(x.Confidence)
            && x.Confidence is >= 0 and <= 1 && x.Source is "llm" or "manual" or "keyword" && Chronology(x.CreatedAt, x.UpdatedAt))));
        Inspect("grocery-extras", stage.ReadExtras, value =>
        {
            Check(value.Version == 1);
            Rows(value.Occurrences, x => x.Id, x => Check(x.WeekStartDate != default && Chronology(x.CreatedAt, x.UpdatedAt)
                && (x.RemovedAt is null || x.RemovedAt >= x.CreatedAt) && (x.CreationName is null || Text(x.CreationName, 200))));
            // Reuse the existing complete lineage owner: roots, one successor,
            // contiguous weeks, no carry from checked or removed occurrences.
            ManagementService.ValidateGroceryExtraHistory(value.Occurrences.Select(x => new GroceryExtraOccurrence
            {
                Id = x.Id,
                LineageId = x.LineageId,
                PredecessorId = x.PredecessorId,
                WeekStartDate = x.WeekStartDate,
                Name = x.Name,
                CreationName = x.CreationName,
                NormalizedKey = x.NormalizedKey,
                GrocerySection = x.GrocerySection,
                Checked = x.Checked,
                RemovedAt = x.RemovedAt,
                Version = x.Version,
                CreatedAt = x.CreatedAt,
                UpdatedAt = x.UpdatedAt
            }).ToArray());
        });
        var servings = Inspect("supper-servings", stage.ReadServings, value =>
        {
            Check(value.Version == 1 && value.DefaultServings is not <= 0 && value.DefaultVersion != Guid.Empty
                && (value.DefaultVersion is null) == (value.DefaultUpdatedAt is null)
                && value.DefaultUpdatedAt != default(DateTimeOffset)
                && (value.DefaultVersion is not null || value.DefaultServings is null));
            Rows(value.Days, x => x.Date, x => Check(x.Date != default && x.OverrideServings is not <= 0
                && x.InheritedServings is not <= 0 && x.Version != Guid.Empty && Chronology(x.CreatedAt, x.UpdatedAt)));
        });
        Inspect("weekly-household-interest", stage.ReadInterest, value =>
        {
            Check(value.Version == 1 && value.Generation != Guid.Empty);
            Rows(value.Rows, x => (x.WeekStartDate, x.RecipeId), x => Check(Monday(x.WeekStartDate)
                && recipeIds.Contains(x.RecipeId) && x.PositiveCount > 0 && x.CapturedAt != default && x.CloseId != Guid.Empty));
            // Strict records intentionally cannot carry member/voter identities.
        });
        var events = Inspect("calendar-events", stage.ReadCalendar, rows => Rows(rows, x => x.Id, x =>
        {
            Check(x.Id != Guid.Empty && x.Date != default && Enum.IsDefined(x.Status) && x.MealSlot >= 0
                && (x.RecipeId is null || recipeIds.Contains(x.RecipeId.Value)) && x.VoteCount is not < 0
                && (x.CandidateIds is null || x.CandidateIds.Distinct().Count() == x.CandidateIds.Length && x.CandidateIds.All(recipeIds.Contains)));
            Check(x.NonCookingKind is null ? x.NonCookingLabel is null : x.RecipeId is null && x.Status == CalendarEventStatus.Skipped
                && (x.NonCookingKind switch
                {
                    "order_in" or "eating_out" => x.NonCookingLabel is null || Text(x.NonCookingLabel, 80),
                    "mystery" => x.NonCookingLabel is null,
                    "custom" => Text(x.NonCookingLabel, 80),
                    _ => false
                }));
            var prepared = x.PreparedOn is not null || x.PreparedAtUtc is not null || x.PreparedServings is not null
                || x.PreparedOriginalServings is not null || x.PreparationPlanToken is not null || x.PreparationServingVersion is not null;
            // Legacy Cooked without evidence remains Cooked, with no invented date.
            if (prepared) Check(x.RecipeId is not null && x.NonCookingKind is null && x.MealSlot == 0
                && x.Status is CalendarEventStatus.Planned or CalendarEventStatus.Locked or CalendarEventStatus.Cooked
                && x.PreparedOn is not null && x.PreparedOn != default(DateOnly) && x.PreparedAtUtc is not null
                && x.PreparedAtUtc != default(DateTimeOffset) && x.PreparedServings is not <= 0 && x.PreparedOriginalServings is not <= 0
                && Text(x.PreparationPlanToken) && Text(x.PreparationServingVersion));
        }));
        // Both keys are independently meaningful: the occurrence identity and the
        // date/meal-slot uniqueness must survive exact recovery.
        if (events is not null && events.Select(x => (x.Date, x.MealSlot)).Distinct().Count() != events.Length)
            errors.Add(new(stage._paths["calendar-events"], "duplicate-current-calendar-slot"));
        stage.ValidatePlannerState(recipeIds, servings, errors, ct);
        stage.ValidateDictionaryState(manifest, recipes, errors, ct);
        stage.ValidateObligations(recipes, errors, ct);
        ct.ThrowIfCancellationRequested();
        if (errors.Count != 0) throw new CurrentRecoveryPreflightException(errors.AsReadOnly());
        return stage;
    }
}
