using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using DroneInventory.Api.Domain;

namespace DroneInventory.Api.Tests;

/// <summary>REQ-003 "Create a student group" (specs/student-group). Each test gets its own empty database.</summary>
public class StudentGroupCreateTests
{
    private static Task<HttpResponseMessage> PostAsync(HttpClient client, object body) =>
        client.PostAsJsonAsync("/api/student-groups", body);

    [Fact]
    public async Task REQ_003_Create_a_student_group()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();

        var response = await PostAsync(client, new { name = "Group 3" });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("id").GetInt32();
        Assert.True(id > 0);
        Assert.Equal("Group 3", created.GetProperty("name").GetString());
        Assert.Equal($"/api/student-groups/{id}", response.Headers.Location?.ToString());
        Assert.Equal(1, await TestApi.CountAsync<StudentGroup>(factory, "Group 3"));
    }

    [Fact]
    public async Task REQ_003_Name_is_trimmed()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();

        var response = await PostAsync(client, new { name = "  Group 4 " });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Group 4", created.GetProperty("name").GetString());
        Assert.Equal(1, await TestApi.CountAsync<StudentGroup>(factory, "Group 4"));
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    public async Task REQ_003_Blank_name_is_rejected(string? name)
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var before = await TestApi.CountAsync<StudentGroup>(factory);

        var response = await PostAsync(client, new { name });

        await TestApi.AssertProblemAsync(response, HttpStatusCode.BadRequest);
        Assert.Equal(before, await TestApi.CountAsync<StudentGroup>(factory));
    }

    [Fact]
    public async Task REQ_003_Too_long_name_is_rejected()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var before = await TestApi.CountAsync<StudentGroup>(factory);

        var response = await PostAsync(client, new { name = new string('x', 101) });

        await TestApi.AssertProblemAsync(response, HttpStatusCode.BadRequest);
        Assert.Equal(before, await TestApi.CountAsync<StudentGroup>(factory));
    }

    [Fact]
    public async Task REQ_003_Name_of_100_characters_is_accepted()
    {
        using var factory = new ApiFactory();

        var response = await PostAsync(factory.CreateClient(), new { name = new string('y', 100) });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Theory]
    [InlineData("Group 5", "Group 5")]
    [InlineData("Group 6", "GROUP 6")]
    [InlineData("Group 7", " group 7 ")]
    public async Task REQ_003_Duplicate_name_is_rejected_ignoring_case(string first, string second)
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        Assert.Equal(HttpStatusCode.Created, (await PostAsync(client, new { name = first })).StatusCode);
        var before = await TestApi.CountAsync<StudentGroup>(factory);

        var response = await PostAsync(client, new { name = second });

        await TestApi.AssertProblemAsync(response, HttpStatusCode.Conflict);
        Assert.Equal(before, await TestApi.CountAsync<StudentGroup>(factory));
        Assert.Equal(1, await TestApi.CountAsync<StudentGroup>(factory, first));
    }
}
