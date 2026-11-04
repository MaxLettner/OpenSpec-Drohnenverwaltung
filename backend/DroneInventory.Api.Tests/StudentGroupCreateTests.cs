using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using DroneInventory.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace DroneInventory.Api.Tests;

/// <summary>REQ-003 "Create a student group" (specs/student-group).</summary>
public class StudentGroupCreateTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private async Task<int> CountAsync(string? nameFilter = null)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return nameFilter is null
            ? await db.StudentGroups.CountAsync()
            : await db.StudentGroups.CountAsync(g => g.Name == nameFilter);
    }

    private Task<HttpResponseMessage> PostAsync(object body) =>
        factory.CreateClient().PostAsJsonAsync("/api/student-groups", body);

    [Fact]
    public async Task REQ_003_Create_a_student_group()
    {
        var response = await PostAsync(new { name = "Group 3" });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("id").GetInt32();
        Assert.True(id > 0);
        Assert.Equal("Group 3", created.GetProperty("name").GetString());
        Assert.Equal($"/api/student-groups/{id}", response.Headers.Location?.ToString());
        Assert.Equal(1, await CountAsync("Group 3"));
    }

    [Fact]
    public async Task REQ_003_Name_is_trimmed()
    {
        var response = await PostAsync(new { name = "  Group 4 " });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Group 4", created.GetProperty("name").GetString());
        Assert.Equal(1, await CountAsync("Group 4"));
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    public async Task REQ_003_Blank_name_is_rejected(string? name)
    {
        var before = await CountAsync();

        var response = await PostAsync(new { name });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        Assert.Equal(before, await CountAsync());
    }

    [Fact]
    public async Task REQ_003_Too_long_name_is_rejected()
    {
        var before = await CountAsync();

        var response = await PostAsync(new { name = new string('x', 101) });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(before, await CountAsync());
    }

    [Fact]
    public async Task REQ_003_Name_of_100_characters_is_accepted()
    {
        var response = await PostAsync(new { name = new string('y', 100) });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Theory]
    [InlineData("Group 5", "Group 5")]
    [InlineData("Group 6", "GROUP 6")]
    [InlineData("Group 7", " group 7 ")]
    public async Task REQ_003_Duplicate_name_is_rejected_ignoring_case(string first, string second)
    {
        Assert.Equal(HttpStatusCode.Created, (await PostAsync(new { name = first })).StatusCode);
        var before = await CountAsync();

        var response = await PostAsync(new { name = second });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        Assert.Equal(before, await CountAsync());
        Assert.Equal(1, await CountAsync(first));
    }
}
