using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Controllers;

public class FamilyControllerTests : IAsyncLifetime
{
    private TestWebApplicationFactory _factory = null!;
    private HttpClient _client = null!;

    public async Task InitializeAsync()
    {
        _factory = await TestWebApplicationFactory.CreateAsync();
        _client  = _factory.CreateClient();
    }

    public async Task DisposeAsync()
    {
        _client.Dispose();
        await _factory.DisposeAsync();
    }

    // ── GET /api/family ───────────────────────────────────────────────────────

    [Fact]
    public async Task GetAll_Returns_Ok_With_Array()
    {
        var response = await _client.GetAsync("/api/family");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        Assert.Equal(JsonValueKind.Array, doc.RootElement.GetProperty("data").ValueKind);
    }

    // ── POST /api/family ──────────────────────────────────────────────────────

    [Fact]
    public async Task Create_Returns_Created_With_Member()
    {
        var response = await _client.PostAsJsonAsync("/api/family", new { name = "Test Member" });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var data = doc.RootElement.GetProperty("data");
        Assert.Equal("Test Member", data.GetProperty("name").GetString());
        Assert.NotEqual(Guid.Empty, data.GetProperty("id").GetGuid());
    }

    [Fact]
    public async Task Create_Appears_In_Subsequent_GetAll()
    {
        var uniqueName = $"Member_{Guid.NewGuid():N}";

        await _client.PostAsJsonAsync("/api/family", new { name = uniqueName });

        var listResponse = await _client.GetAsync("/api/family");
        var json = await listResponse.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);

        var names = doc.RootElement.GetProperty("data").EnumerateArray()
            .Select(e => e.GetProperty("name").GetString())
            .ToList();
        Assert.Contains(uniqueName, names);
    }

    // ── PUT /api/family/{id} ──────────────────────────────────────────────────
    
    [Fact]
    public async Task Update_Returns_Ok_With_Updated_Name()
    {
        // Arrange
        var createResponse = await _client.PostAsJsonAsync("/api/family", new { name = "Initial Name" });
        var createJson = await createResponse.Content.ReadAsStringAsync();
        using var createDoc = JsonDocument.Parse(createJson);
        var id = createDoc.RootElement.GetProperty("data").GetProperty("id").GetGuid();

        // Act
        var updateResponse = await _client.PutAsJsonAsync($"/api/family/{id}", new { name = "Updated Name" });

        // Assert
        Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);
        var updateJson = await updateResponse.Content.ReadAsStringAsync();
        using var updateDoc = JsonDocument.Parse(updateJson);
        Assert.Equal("Updated Name", updateDoc.RootElement.GetProperty("data").GetProperty("name").GetString());
    }

    [Fact]
    public async Task Update_Empty_Name_Returns_BadRequest()
    {
        var createResponse = await _client.PostAsJsonAsync("/api/family", new { name = "Valid Name" });
        var createJson = await createResponse.Content.ReadAsStringAsync();
        using var createDoc = JsonDocument.Parse(createJson);
        var id = createDoc.RootElement.GetProperty("data").GetProperty("id").GetGuid();

        var response = await _client.PutAsJsonAsync($"/api/family/{id}", new { name = "" });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Update_NonExistent_Returns_NotFound()
    {
        var response = await _client.PutAsJsonAsync($"/api/family/{Guid.NewGuid()}", new { name = "Anyone" });
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // ── DELETE /api/family/{id} ───────────────────────────────────────────────

    [Fact]
    public async Task Delete_Returns_NoContent_And_Member_Is_Gone()
    {
        // Arrange: create a member to delete
        var createResponse = await _client.PostAsJsonAsync("/api/family", new { name = "ToDelete" });
        var createJson = await createResponse.Content.ReadAsStringAsync();
        using var createDoc = JsonDocument.Parse(createJson);
        var id = createDoc.RootElement.GetProperty("data").GetProperty("id").GetGuid();

        // Act
        var deleteResponse = await _client.DeleteAsync($"/api/family/{id}");

        // Assert
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        var listResponse = await _client.GetAsync("/api/family");
        var listJson = await listResponse.Content.ReadAsStringAsync();
        using var listDoc = JsonDocument.Parse(listJson);
        var ids = listDoc.RootElement.GetProperty("data").EnumerateArray()
            .Select(e => e.GetProperty("id").GetGuid())
            .ToList();
        Assert.DoesNotContain(id, ids);
    }

    [Fact]
    public async Task Delete_NonExistent_Returns_NotFound()
    {
        var response = await _client.DeleteAsync($"/api/family/{Guid.NewGuid()}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
