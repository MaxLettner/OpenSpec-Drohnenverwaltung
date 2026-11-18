using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;

namespace DroneInventory.Api.Tests;

/// <summary>A temp folder for a real SQLite file; deleted with all its files on dispose.</summary>
public sealed class TempDatabaseFolder : IDisposable
{
    public string Path { get; } = Directory.CreateTempSubdirectory("droneinventory-").FullName;

    public string DatabaseFile => System.IO.Path.Combine(Path, "droneinventory.db");

    public string ConnectionString => $"Data Source={DatabaseFile}";

    public void Dispose()
    {
        // Pooled connections keep the file open, so release them before deleting it.
        SqliteConnection.ClearAllPools();
        Directory.Delete(Path, recursive: true);
    }
}

/// <summary>
/// Runs the real API, startup included, on a SQLite file in Production, like a container does.
/// Unlike <see cref="ApiFactory"/> it keeps the app's own DbContext registration.
/// </summary>
public sealed class FileDatabaseFactory(string connectionString) : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Production");
        builder.UseSetting("ConnectionStrings:Default", connectionString);
    }
}
