using System.Text.Json;
using RecipeApi.Dto;
using Xunit;

namespace RecipeApi.Tests.Services;

public class VotingSessionSnapshotTests
{
    private const string Unowned = """
        {"incarnationId":"00000000-0000-4000-8000-000000000001","revision":1,"roundId":null,"weekStartDate":null,"phase":"unowned","requiredSlots":null,"coveredSlots":null,"candidateCount":null,"smartDefaults":null}
        """;

    [Fact]
    public void UnownedSnapshot_AllowsExplicitNullCapacity()
    {
        var snapshot = JsonSerializer.Deserialize<VotingSessionSnapshot>(Unowned)!;
        Assert.Equal("unowned", snapshot.Phase);
        Assert.Null(snapshot.RequiredSlots);
        Assert.Null(snapshot.SmartDefaults);
    }

    [Fact]
    public void Snapshot_RequiresNullableFieldsToBePresent()
    {
        var missing = Unowned.Replace("\"roundId\":null,", "");
        Assert.Throws<JsonException>(() => JsonSerializer.Deserialize<VotingSessionSnapshot>(missing));
    }
}
