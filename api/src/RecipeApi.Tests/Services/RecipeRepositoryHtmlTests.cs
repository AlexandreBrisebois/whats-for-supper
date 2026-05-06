using System.Text;
using FsCheck;
using FsCheck.Xunit;
using RecipeApi.Infrastructure;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Services;

/// <summary>
/// Tests for RecipeRepository.SaveContentHtmlAsync and GetContentHtmlAsync.
/// </summary>
public class RecipeRepositoryHtmlTests
{
    private static (InMemoryStorageProvider storage, RecipeRepository repo) CreateSut()
    {
        var storage = new InMemoryStorageProvider();
        var repo = new RecipeRepository(storage);
        return (storage, repo);
    }

    // ── Unit tests ────────────────────────────────────────────────────────────

    [Fact]
    public async Task SaveContentHtmlAsync_WritesToCorrectPath()
    {
        var (storage, repo) = CreateSut();
        var recipeId = Guid.NewGuid();
        const string html = "<html><body>Hello</body></html>";

        await repo.SaveContentHtmlAsync(recipeId, html, CancellationToken.None);

        var bytes = await storage.LoadAsync("recipes", $"{recipeId}/original/content.html");
        Assert.NotNull(bytes);
        Assert.Equal(html, Encoding.UTF8.GetString(bytes));
    }

    [Fact]
    public async Task GetContentHtmlAsync_ReturnsNull_WhenFileDoesNotExist()
    {
        var (_, repo) = CreateSut();
        var recipeId = Guid.NewGuid();

        var result = await repo.GetContentHtmlAsync(recipeId, CancellationToken.None);

        Assert.Null(result);
    }

    [Fact]
    public async Task GetContentHtmlAsync_ReturnsSavedString_WhenFileExists()
    {
        var (_, repo) = CreateSut();
        var recipeId = Guid.NewGuid();
        const string html = "<html><body>Bonjour</body></html>";

        await repo.SaveContentHtmlAsync(recipeId, html, CancellationToken.None);
        var result = await repo.GetContentHtmlAsync(recipeId, CancellationToken.None);

        Assert.Equal(html, result);
    }

    [Fact]
    public async Task SaveContentHtmlAsync_WritesNoBom()
    {
        var (storage, repo) = CreateSut();
        var recipeId = Guid.NewGuid();
        const string html = "<html/>";

        await repo.SaveContentHtmlAsync(recipeId, html, CancellationToken.None);

        var bytes = await storage.LoadAsync("recipes", $"{recipeId}/original/content.html");
        Assert.NotNull(bytes);
        // UTF-8 BOM is 0xEF 0xBB 0xBF — must not be present
        Assert.False(bytes.Length >= 3 && bytes[0] == 0xEF && bytes[1] == 0xBB && bytes[2] == 0xBF,
            "File must not start with a UTF-8 BOM");
    }

    // ── Property-based test ───────────────────────────────────────────────────

    // Feature: url-import-html-capture, Property 1: HTML round-trip integrity
    /// <summary>
    /// For any non-null string (including Unicode, empty, special chars, large strings):
    /// SaveContentHtmlAsync followed by GetContentHtmlAsync returns the identical string.
    /// </summary>
    /// <remarks>
    /// Validates: Requirements 7.1, 7.2, 1.4, 1.5
    /// </remarks>
    [Property(MaxTest = 100)]
    public bool HtmlRoundTrip_ReturnsIdenticalString(NonNull<string> nonNullHtml)
    {
        var html = nonNullHtml.Get;
        var (_, repo) = CreateSut();
        var recipeId = Guid.NewGuid();

        repo.SaveContentHtmlAsync(recipeId, html, CancellationToken.None).GetAwaiter().GetResult();
        var result = repo.GetContentHtmlAsync(recipeId, CancellationToken.None).GetAwaiter().GetResult();

        return result == html;
    }
}
