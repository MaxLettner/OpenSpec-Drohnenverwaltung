using System.Net;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace DroneInventory.Api.Tests;

/// <summary>deployment spec: the web app and the REST API from one address (REQ-002, REQ-007, REQ-010).</summary>
public sealed class AppServingTests : IDisposable
{
    private const string AppHtml = "<!doctype html><html><body><app-root></app-root></body></html>";

    private readonly string _webRoot = Directory.CreateTempSubdirectory("droneinventory-wwwroot-").FullName;
    private readonly ApiFactory _baseFactory = new();
    private readonly WebApplicationFactory<Program> _factory;

    public AppServingTests()
    {
        File.WriteAllText(Path.Combine(_webRoot, "index.html"), AppHtml);
        _factory = _baseFactory.WithWebHostBuilder(builder => builder.UseSetting(WebHostDefaults.WebRootKey, _webRoot));
    }

    public void Dispose()
    {
        _factory.Dispose();
        _baseFactory.Dispose();
        Directory.Delete(_webRoot, recursive: true);
    }

    private async Task AssertAppAsync(string url)
    {
        var response = await _factory.CreateClient().GetAsync(url);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("text/html", response.Content.Headers.ContentType?.MediaType);
        Assert.Equal(AppHtml, await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public Task Open_the_root_address_returns_the_app() => AssertAppAsync("/");

    [Fact]
    public Task Open_a_page_directly_returns_the_app() => AssertAppAsync("/loans");

    [Fact]
    public async Task API_next_to_the_app_returns_the_drone_list_as_JSON()
    {
        var response = await _factory.CreateClient().GetAsync("/api/drones");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("application/json", response.Content.Headers.ContentType?.MediaType);
        Assert.Equal("[]", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Unknown_API_address_is_a_404_and_not_the_app()
    {
        var response = await _factory.CreateClient().GetAsync("/api/unknown");

        var problem = await TestApi.AssertProblemAsync(response, HttpStatusCode.NotFound);
        Assert.DoesNotContain("app-root", problem.ToString());
    }
}
