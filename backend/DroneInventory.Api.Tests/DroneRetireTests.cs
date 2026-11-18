using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace DroneInventory.Api.Tests;

/// <summary>REQ-001, REQ-002, REQ-004, REQ-010: retire and restore a drone (specs/drone, specs/loan).</summary>
public class DroneRetireTests
{
    private static Task<HttpResponseMessage> RetireAsync(HttpClient client, int id) =>
        client.PostAsync($"/api/drones/{id}/retire", null);

    private static Task<HttpResponseMessage> RestoreAsync(HttpClient client, int id) =>
        client.PostAsync($"/api/drones/{id}/restore", null);

    private static async Task<string[]> ListedNamesAsync(HttpClient client) =>
        (await client.GetFromJsonAsync<JsonElement[]>("/api/drones"))!
            .Select(d => d.GetProperty("name").GetString()!).ToArray();

    [Fact]
    public async Task REQ_001_Retire_an_available_drone()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var (droneId, groupId) = await TestApi.CreateDroneAndGroupAsync(client);
        var loanId = await TestApi.CreateLoanAsync(client, droneId, groupId);
        Assert.Equal(HttpStatusCode.OK, (await client.PostAsync($"/api/loans/{loanId}/return", null)).StatusCode);

        var response = await RetireAsync(client, droneId);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Empty(await ListedNamesAsync(client));
        var history = await client.GetFromJsonAsync<JsonElement[]>("/api/loans/history");
        Assert.Equal("TELLO-07", Assert.Single(history!).GetProperty("drone").GetString());
    }

    [Fact]
    public async Task REQ_001_Loaned_drone_cannot_be_retired()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var (droneId, groupId) = await TestApi.CreateDroneAndGroupAsync(client);
        await TestApi.CreateLoanAsync(client, droneId, groupId);

        var response = await RetireAsync(client, droneId);

        await TestApi.AssertProblemAsync(response, HttpStatusCode.Conflict);
        Assert.Equal(["TELLO-07"], await ListedNamesAsync(client));
    }

    [Fact]
    public async Task REQ_001_Retire_a_drone_that_is_already_retired_is_a_conflict()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var id = await TestApi.CreateAsync(client, "/api/drones", new { name = "TELLO-05" });
        Assert.Equal(HttpStatusCode.NoContent, (await RetireAsync(client, id)).StatusCode);

        await TestApi.AssertProblemAsync(await RetireAsync(client, id), HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task REQ_001_Retire_an_unknown_drone_is_not_found()
    {
        using var factory = new ApiFactory();

        await TestApi.AssertProblemAsync(await RetireAsync(factory.CreateClient(), 999), HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task REQ_001_Restore_a_drone()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var id = await TestApi.CreateAsync(client, "/api/drones", new { name = "TELLO-05" });
        await RetireAsync(client, id);

        var response = await RestoreAsync(client, id);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        var drone = Assert.Single((await client.GetFromJsonAsync<JsonElement[]>("/api/drones"))!);
        Assert.Equal("TELLO-05", drone.GetProperty("name").GetString());
        Assert.Equal("Available", drone.GetProperty("availability").GetString());
    }

    [Fact]
    public async Task REQ_001_Restore_a_drone_that_is_not_retired()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var id = await TestApi.CreateAsync(client, "/api/drones", new { name = "TELLO-07" });

        await TestApi.AssertProblemAsync(await RestoreAsync(client, id), HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task REQ_001_Restore_an_unknown_drone_is_not_found()
    {
        using var factory = new ApiFactory();

        await TestApi.AssertProblemAsync(await RestoreAsync(factory.CreateClient(), 999), HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task REQ_002_Retired_drones_are_not_listed()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var retired = await TestApi.CreateAsync(client, "/api/drones", new { name = "TELLO-05" });
        await TestApi.CreateAsync(client, "/api/drones", new { name = "TELLO-07" });
        await RetireAsync(client, retired);

        Assert.Equal(["TELLO-07"], await ListedNamesAsync(client));
    }

    [Fact]
    public async Task REQ_001_Names_stay_unique_across_retired_drones()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var retired = await TestApi.CreateAsync(client, "/api/drones", new { name = "TELLO-05" });
        await RetireAsync(client, retired);

        var response = await client.PostAsJsonAsync("/api/drones", new { name = "tello-05" });

        await TestApi.AssertProblemAsync(response, HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task REQ_001_Edit_a_retired_drone_is_a_conflict_and_an_unknown_one_not_found()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var retired = await TestApi.CreateAsync(client, "/api/drones", new { name = "TELLO-05" });
        await RetireAsync(client, retired);

        var unknown = await client.PutAsJsonAsync("/api/drones/999", new { name = "X" });
        var edit = await client.PutAsJsonAsync($"/api/drones/{retired}", new { name = "TELLO-05B" });

        await TestApi.AssertProblemAsync(unknown, HttpStatusCode.NotFound);
        await TestApi.AssertProblemAsync(edit, HttpStatusCode.Conflict);
        var details = await client.GetFromJsonAsync<JsonElement>($"/api/drones/{retired}");
        Assert.Equal("TELLO-05", details.GetProperty("name").GetString());
    }

    [Fact]
    public async Task REQ_002_Details_of_a_retired_drone_are_still_available_and_flag_it()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var id = await TestApi.CreateAsync(client, "/api/drones", new { name = "TELLO-05" });
        var before = await client.GetFromJsonAsync<JsonElement>($"/api/drones/{id}");
        await RetireAsync(client, id);

        var after = await client.GetFromJsonAsync<JsonElement>($"/api/drones/{id}");

        Assert.False(before.GetProperty("retired").GetBoolean());
        Assert.True(after.GetProperty("retired").GetBoolean());
        Assert.Equal("TELLO-05", after.GetProperty("name").GetString());
    }

    [Fact]
    public async Task REQ_004_Loan_a_retired_drone()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var (droneId, groupId) = await TestApi.CreateDroneAndGroupAsync(client);
        await RetireAsync(client, droneId);

        var response = await client.PostAsJsonAsync("/api/loans", new { droneId, studentGroupId = groupId });

        await TestApi.AssertProblemAsync(response, HttpStatusCode.Conflict);
        Assert.Empty((await client.GetFromJsonAsync<JsonElement[]>("/api/loans/active"))!);
        Assert.Equal(0, await TestApi.CountAsync<DroneInventory.Api.Domain.Loan>(factory));
    }

    [Fact]
    public async Task REQ_001_Delete_stays_unmapped()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var id = await TestApi.CreateAsync(client, "/api/drones", new { name = "TELLO-05" });

        var response = await client.DeleteAsync($"/api/drones/{id}");

        Assert.Equal(HttpStatusCode.MethodNotAllowed, response.StatusCode);
    }
}
