using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace DroneInventory.Api.Tests;

/// <summary>Creating a resource through the API, which most endpoint tests need before they can test their behavior.</summary>
internal static class TestApi
{
    /// <summary>
    /// POSTs <paramref name="body"/> to <paramref name="url"/>, requires the 201 Created of a new
    /// drone, student group or loan and returns the `Id` the backend assigned.
    /// </summary>
    public static async Task<int> CreateAsync(HttpClient client, string url, object body)
    {
        var response = await client.PostAsJsonAsync(url, body);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();
    }
}
