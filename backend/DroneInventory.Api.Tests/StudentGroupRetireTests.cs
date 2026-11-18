using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using DroneInventory.Api.Domain;

namespace DroneInventory.Api.Tests;

/// <summary>REQ-003, REQ-004, REQ-010: retire and restore a student group; the Home figures (specs/student-group, loan, dashboard).</summary>
public class StudentGroupRetireTests
{
    private static Task<HttpResponseMessage> RetireAsync(HttpClient client, int id) =>
        client.PostAsync($"/api/student-groups/{id}/retire", null);

    private static Task<HttpResponseMessage> RestoreAsync(HttpClient client, int id) =>
        client.PostAsync($"/api/student-groups/{id}/restore", null);

    private static async Task<string[]> ListedNamesAsync(HttpClient client) =>
        (await client.GetFromJsonAsync<JsonElement[]>("/api/student-groups"))!
            .Select(g => g.GetProperty("name").GetString()!).ToArray();

    [Fact]
    public async Task REQ_003_Retire_a_group_without_active_loans()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var (droneId, groupId) = await TestApi.CreateDroneAndGroupAsync(client);
        var loanId = await TestApi.CreateLoanAsync(client, droneId, groupId);
        Assert.Equal(HttpStatusCode.OK, (await client.PostAsync($"/api/loans/{loanId}/return", null)).StatusCode);

        var response = await RetireAsync(client, groupId);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Empty(await ListedNamesAsync(client));
        var history = await client.GetFromJsonAsync<JsonElement[]>("/api/loans/history");
        Assert.Equal("Group 3", Assert.Single(history!).GetProperty("group").GetString());
    }

    [Fact]
    public async Task REQ_003_Group_with_an_active_loan_cannot_be_retired()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var (droneId, groupId) = await TestApi.CreateDroneAndGroupAsync(client);
        await TestApi.CreateLoanAsync(client, droneId, groupId);

        var response = await RetireAsync(client, groupId);

        await TestApi.AssertProblemAsync(response, HttpStatusCode.Conflict);
        Assert.Equal(["Group 3"], await ListedNamesAsync(client));
    }

    [Fact]
    public async Task REQ_003_Retire_a_group_that_is_already_retired_is_a_conflict()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var id = await TestApi.CreateAsync(client, "/api/student-groups", new { name = "Group 9" });
        await RetireAsync(client, id);

        await TestApi.AssertProblemAsync(await RetireAsync(client, id), HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task REQ_003_Retire_an_unknown_group_is_not_found()
    {
        using var factory = new ApiFactory();

        await TestApi.AssertProblemAsync(await RetireAsync(factory.CreateClient(), 999), HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task REQ_003_Restore_a_group()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var id = await TestApi.CreateAsync(client, "/api/student-groups", new { name = "Group 9" });
        await RetireAsync(client, id);

        var response = await RestoreAsync(client, id);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal(["Group 9"], await ListedNamesAsync(client));
    }

    [Fact]
    public async Task REQ_003_Restore_a_group_that_is_not_retired()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var id = await TestApi.CreateAsync(client, "/api/student-groups", new { name = "Group 1" });

        await TestApi.AssertProblemAsync(await RestoreAsync(client, id), HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task REQ_003_Restore_an_unknown_group_is_not_found()
    {
        using var factory = new ApiFactory();

        await TestApi.AssertProblemAsync(await RestoreAsync(factory.CreateClient(), 999), HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task REQ_003_Retired_groups_are_not_listed()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var retired = await TestApi.CreateAsync(client, "/api/student-groups", new { name = "Group 9" });
        await TestApi.CreateAsync(client, "/api/student-groups", new { name = "Group 1" });
        await RetireAsync(client, retired);

        Assert.Equal(["Group 1"], await ListedNamesAsync(client));
    }

    [Fact]
    public async Task REQ_003_Names_stay_unique_across_retired_groups()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var retired = await TestApi.CreateAsync(client, "/api/student-groups", new { name = "Group 9" });
        await RetireAsync(client, retired);

        var response = await client.PostAsJsonAsync("/api/student-groups", new { name = "group 9" });

        await TestApi.AssertProblemAsync(response, HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task REQ_003_Edit_a_retired_group_is_a_conflict_and_an_unknown_one_not_found()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var retired = await TestApi.CreateAsync(client, "/api/student-groups", new { name = "Group 9" });
        await RetireAsync(client, retired);

        var unknown = await client.PutAsJsonAsync("/api/student-groups/999", new { name = "X" });
        var edit = await client.PutAsJsonAsync($"/api/student-groups/{retired}", new { name = "Group 9a" });

        await TestApi.AssertProblemAsync(unknown, HttpStatusCode.NotFound);
        await TestApi.AssertProblemAsync(edit, HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task REQ_004_Loan_to_a_retired_group()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var (droneId, groupId) = await TestApi.CreateDroneAndGroupAsync(client);
        await RetireAsync(client, groupId);

        var response = await client.PostAsJsonAsync("/api/loans", new { droneId, studentGroupId = groupId });

        await TestApi.AssertProblemAsync(response, HttpStatusCode.Conflict);
        Assert.Equal(0, await TestApi.CountAsync<Loan>(factory));
    }

    [Fact]
    public async Task REQ_002_Retired_drones_and_groups_do_not_count()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var drones = new List<int>();
        foreach (var name in new[] { "TELLO-05", "TELLO-07", "TELLO-08" })
        {
            drones.Add(await TestApi.CreateAsync(client, "/api/drones", new { name }));
        }

        var groups = new List<int>();
        foreach (var name in new[] { "Group 1", "Group 9" })
        {
            groups.Add(await TestApi.CreateAsync(client, "/api/student-groups", new { name }));
        }

        Assert.Equal(HttpStatusCode.NoContent, (await client.PostAsync($"/api/drones/{drones[0]}/retire", null)).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await RetireAsync(client, groups[1])).StatusCode);

        var dashboard = await client.GetFromJsonAsync<JsonElement>("/api/dashboard");

        Assert.Equal(2, dashboard.GetProperty("drones").GetProperty("total").GetInt32());
        Assert.Equal(2, dashboard.GetProperty("drones").GetProperty("available").GetInt32());
        Assert.Equal(1, dashboard.GetProperty("studentGroups").GetInt32());
    }

    [Fact]
    public async Task REQ_003_Delete_stays_unmapped()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var id = await TestApi.CreateAsync(client, "/api/student-groups", new { name = "Group 9" });

        var response = await client.DeleteAsync($"/api/student-groups/{id}");

        Assert.Equal(HttpStatusCode.MethodNotAllowed, response.StatusCode);
    }
}
