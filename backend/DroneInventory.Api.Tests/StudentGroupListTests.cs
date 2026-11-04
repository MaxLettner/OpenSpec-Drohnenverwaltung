using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace DroneInventory.Api.Tests;

/// <summary>REQ-003 "Show student groups" (specs/student-group). Each test gets its own empty database.</summary>
public class StudentGroupListTests
{
    [Fact]
    public async Task REQ_003_Groups_are_listable_for_loan_selection()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        await client.PostAsJsonAsync("/api/student-groups", new { name = "Group 3" });
        await client.PostAsJsonAsync("/api/student-groups", new { name = "Group 1" });

        var response = await client.GetAsync("/api/student-groups");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var groups = await response.Content.ReadFromJsonAsync<JsonElement[]>();
        Assert.NotNull(groups);
        Assert.Equal(["Group 1", "Group 3"], groups.Select(g => g.GetProperty("name").GetString()));
        Assert.All(groups, g => Assert.True(g.GetProperty("id").GetInt32() > 0));
    }

    [Fact]
    public async Task REQ_003_No_groups_gives_an_empty_list()
    {
        using var factory = new ApiFactory();

        var response = await factory.CreateClient().GetAsync("/api/student-groups");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var groups = await response.Content.ReadFromJsonAsync<JsonElement[]>();
        Assert.NotNull(groups);
        Assert.Empty(groups);
    }

    [Fact]
    public async Task REQ_003_List_is_ordered_by_name_ignoring_case()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        foreach (var name in new[] { "beta", "Gamma", "Alpha" })
        {
            await client.PostAsJsonAsync("/api/student-groups", new { name });
        }

        var groups = await client.GetFromJsonAsync<JsonElement[]>("/api/student-groups");

        Assert.Equal(["Alpha", "beta", "Gamma"], groups!.Select(g => g.GetProperty("name").GetString()));
    }
}
