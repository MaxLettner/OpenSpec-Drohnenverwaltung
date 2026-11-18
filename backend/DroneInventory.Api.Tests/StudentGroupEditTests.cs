using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace DroneInventory.Api.Tests;

/// <summary>REQ-003 "Edit a student group" (specs/student-group). Each test gets its own empty database.</summary>
public class StudentGroupEditTests
{
    private static Task<HttpResponseMessage> PutAsync(HttpClient client, int id, object body) =>
        client.PutAsJsonAsync($"/api/student-groups/{id}", body);

    [Fact]
    public async Task REQ_003_Rename_a_group()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        await TestApi.SeedLoansAsync(factory, new LoanSeed("TELLO-07", "Group 3", new(2026, 3, 10), null));
        var id = (await client.GetFromJsonAsync<JsonElement[]>("/api/student-groups"))![0].GetProperty("id").GetInt32();

        var response = await PutAsync(client, id, new { name = "Group 3a" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var updated = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(id, updated.GetProperty("id").GetInt32());
        Assert.Equal("Group 3a", updated.GetProperty("name").GetString());
        var groups = await client.GetFromJsonAsync<JsonElement[]>("/api/student-groups");
        Assert.Equal("Group 3a", Assert.Single(groups!).GetProperty("name").GetString());
        var loans = await client.GetFromJsonAsync<JsonElement[]>("/api/loans/active");
        Assert.Equal("Group 3a", Assert.Single(loans!).GetProperty("group").GetString());
    }

    [Fact]
    public async Task REQ_003_Name_taken_by_another_group()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        await TestApi.CreateAsync(client, "/api/student-groups", new { name = "Group 1" });
        var other = await TestApi.CreateAsync(client, "/api/student-groups", new { name = "Group 3" });

        var response = await PutAsync(client, other, new { name = "group 1" });

        await TestApi.AssertProblemAsync(response, HttpStatusCode.Conflict);
        var groups = await client.GetFromJsonAsync<JsonElement[]>("/api/student-groups");
        Assert.Equal(["Group 1", "Group 3"], groups!.Select(g => g.GetProperty("name").GetString()));
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    public async Task REQ_003_Invalid_name_is_rejected_on_edit(string? name)
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var id = await TestApi.CreateAsync(client, "/api/student-groups", new { name = "Group 3" });

        var response = await PutAsync(client, id, new { name });

        await TestApi.AssertProblemAsync(response, HttpStatusCode.BadRequest);
        var group = Assert.Single((await client.GetFromJsonAsync<JsonElement[]>("/api/student-groups"))!);
        Assert.Equal("Group 3", group.GetProperty("name").GetString());
    }

    [Fact]
    public async Task REQ_003_Edit_an_unknown_group_is_not_found()
    {
        using var factory = new ApiFactory();

        var response = await PutAsync(factory.CreateClient(), 999, new { name = "Group 99" });

        await TestApi.AssertProblemAsync(response, HttpStatusCode.NotFound);
    }
}
