using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace DroneInventory.Api.Tests;

/// <summary>Student-group spec "Show student group details" (REQ-003, REQ-007, REQ-010); today is <see cref="ApiFactory.Today"/>.</summary>
public class StudentGroupDetailsTests
{
    private static async Task<JsonElement> GetAsync(HttpClient client, string groupName)
    {
        var groups = await client.GetFromJsonAsync<JsonElement[]>("/api/student-groups");
        var id = groups!.Single(g => g.GetProperty("name").GetString() == groupName).GetProperty("id").GetInt32();
        var response = await client.GetAsync($"/api/student-groups/{id}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }

    [Fact]
    public async Task REQ_007_Details_of_a_group_with_loans()
    {
        using var factory = new ApiFactory();
        var seeds = new List<LoanSeed>
        {
            new("TELLO-02", "Group 1", new(2026, 3, 10), null, Batteries: 2, Propellers: 4),
            new("TELLO-04", "Group 1", new(2026, 3, 12), null),
            new("TELLO-09", "Group 2", new(2026, 3, 1), null),
        };
        for (var n = 0; n < 6; n++)
        {
            seeds.Add(new("TELLO-07", "Group 1", new(2026, 2, 1 + n), new(2026, 2, 2 + n)));
        }
        var ids = await TestApi.SeedLoansAsync(factory, [.. seeds]);
        var client = factory.CreateClient();

        var details = await GetAsync(client, "Group 1");

        Assert.Equal("Group 1", details.GetProperty("name").GetString());
        var active = details.GetProperty("activeLoans").EnumerateArray().ToArray();
        Assert.Equal(["TELLO-02", "TELLO-04"], active.Select(l => l.GetProperty("drone").GetString()));
        var first = active[0];
        Assert.Equal(ids[0], first.GetProperty("id").GetInt32());
        Assert.Equal("2026-03-10", first.GetProperty("loanDate").GetString());
        Assert.Equal(5, first.GetProperty("daysOut").GetInt32());
        Assert.Equal(2, first.GetProperty("batteries").GetInt32());
        Assert.Equal(4, first.GetProperty("propellers").GetInt32());
        Assert.True(first.GetProperty("droneId").GetInt32() > 0);
        var returnDates = details.GetProperty("recentLoans").EnumerateArray()
            .Select(l => l.GetProperty("returnDate").GetString()).ToArray();
        Assert.Equal(["2026-02-07", "2026-02-06", "2026-02-05", "2026-02-04", "2026-02-03"], returnDates);
        Assert.Equal("TELLO-07", details.GetProperty("recentLoans")[0].GetProperty("drone").GetString());
    }

    [Fact]
    public async Task REQ_008_Return_from_the_group_dialog_moves_the_loan_to_the_returned_loans()
    {
        using var factory = new ApiFactory();
        var ids = await TestApi.SeedLoansAsync(factory, new LoanSeed("TELLO-02", "Group 1", new(2026, 3, 10), null));
        var client = factory.CreateClient();

        var response = await client.PostAsync($"/api/loans/{ids[0]}/return", null);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var details = await GetAsync(client, "Group 1");
        Assert.Empty(details.GetProperty("activeLoans").EnumerateArray());
        Assert.Equal(ids[0], Assert.Single(details.GetProperty("recentLoans").EnumerateArray()).GetProperty("id").GetInt32());
    }

    [Fact]
    public async Task REQ_010_Details_of_a_retired_group()
    {
        using var factory = new ApiFactory();
        await TestApi.SeedLoansAsync(factory, new LoanSeed("TELLO-07", "Group 9", new(2026, 3, 1), new(2026, 3, 2)));
        var client = factory.CreateClient();
        var before = await GetAsync(client, "Group 9");
        var id = before.GetProperty("id").GetInt32();
        Assert.False(before.GetProperty("retired").GetBoolean());

        Assert.Equal(HttpStatusCode.NoContent, (await client.PostAsync($"/api/student-groups/{id}/retire", null)).StatusCode);

        var after = await client.GetFromJsonAsync<JsonElement>($"/api/student-groups/{id}");
        Assert.Equal("Group 9", after.GetProperty("name").GetString());
        Assert.True(after.GetProperty("retired").GetBoolean());
        Assert.Single(after.GetProperty("recentLoans").EnumerateArray());
    }

    [Fact]
    public async Task REQ_003_Unknown_group_is_not_found()
    {
        using var factory = new ApiFactory();

        var response = await factory.CreateClient().GetAsync("/api/student-groups/999");

        await TestApi.AssertProblemAsync(response, HttpStatusCode.NotFound);
    }
}
