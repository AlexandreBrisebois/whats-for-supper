using System.Collections.Concurrent;
using System.Security.Cryptography;
using RecipeApi.Dto;

namespace RecipeApi.Services;

/// <summary>Bounded, process-local continuation state for recipe search.</summary>
public sealed class RecipeSearchContinuationStore
{
    private const int Capacity = 1_000;
    private static readonly TimeSpan Lifetime = TimeSpan.FromMinutes(10);
    private readonly ConcurrentDictionary<string, SearchContinuation> _entries = new(StringComparer.Ordinal);

    public string StoreRanked(string fingerprint, IReadOnlyList<RecipeSearchResultDto> results, RecipeSearchResponseDto response)
        => Store(new RankedContinuation(fingerprint, results.Select(Clone).ToList(), Clone(response), DateTimeOffset.UtcNow.Add(Lifetime)));

    public string StoreBrowse(string fingerprint, BrowsePosition position, Guid? topPickId, RecipeSearchResponseDto response)
        => Store(new BrowseContinuation(fingerprint, position, topPickId, Clone(response), DateTimeOffset.UtcNow.Add(Lifetime)));

    public SearchContinuation Get(string token, string fingerprint)
    {
        if (!_entries.TryGetValue(token, out var entry) || entry.ExpiresAt <= DateTimeOffset.UtcNow || entry.Fingerprint != fingerprint)
        {
            _entries.TryRemove(token, out _);
            throw new RecipeSearchContinuationExpiredException();
        }

        return entry;
    }

    private string Store(SearchContinuation continuation)
    {
        foreach (var expired in _entries.Where(entry => entry.Value.ExpiresAt <= DateTimeOffset.UtcNow).Select(entry => entry.Key))
            _entries.TryRemove(expired, out _);
        while (_entries.Count >= Capacity && _entries.TryRemove(_entries.Keys.FirstOrDefault() ?? string.Empty, out _)) { }

        var token = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
        _entries[token] = continuation;
        return token;
    }

    public abstract record SearchContinuation(string Fingerprint, RecipeSearchResponseDto Response, DateTimeOffset ExpiresAt);
    public sealed record RankedContinuation(string Fingerprint, IReadOnlyList<RecipeSearchResultDto> Results, RecipeSearchResponseDto Response, DateTimeOffset ExpiresAt)
        : SearchContinuation(Fingerprint, Response, ExpiresAt);
    public sealed record BrowseContinuation(string Fingerprint, BrowsePosition Position, Guid? TopPickId, RecipeSearchResponseDto Response, DateTimeOffset ExpiresAt)
        : SearchContinuation(Fingerprint, Response, ExpiresAt);
    public sealed record BrowsePosition(DateTimeOffset? LastCookedDate, DateTimeOffset CreatedAt, Guid Id);

    public static RecipeSearchResultDto Clone(RecipeSearchResultDto result) => new()
    {
        Id = result.Id,
        Name = result.Name,
        Description = result.Description,
        Score = result.Score,
        ImageUrl = result.ImageUrl,
        TotalTime = result.TotalTime,
        Rating = result.Rating,
        IsDiscoverable = result.IsDiscoverable,
        Notes = result.Notes,
        PlannerFitNote = result.PlannerFitNote,
        ImportIssueStatus = result.ImportIssueStatus,
        Reasons = result.Reasons.Select(reason => new RecipeSearchReasonDto { Source = reason.Source, Label = reason.Label }).ToList()
    };

    public static RecipeSearchResponseDto Clone(RecipeSearchResponseDto response) => new()
    {
        TopPick = response.TopPick is null ? null : Clone(response.TopPick),
        Results = response.Results.Select(Clone).ToList(),
        AppliedFilters = response.AppliedFilters,
        SearchMode = response.SearchMode,
        ResultPath = response.ResultPath,
        NextCursor = response.NextCursor
    };
}

public sealed class RecipeSearchContinuationExpiredException : Exception
{
}
