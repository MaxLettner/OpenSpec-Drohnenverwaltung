using DroneInventory.Api.Infrastructure;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace DroneInventory.Api.Tests;

/// <summary>
/// Runs the real API pipeline against an in-memory SQLite database.
/// The connection stays open for the factory's lifetime, otherwise the database vanishes.
/// </summary>
public class ApiFactory : WebApplicationFactory<Program>
{
    /// <summary>The date the API sees as today in every test.</summary>
    public static readonly DateOnly Today = new(2026, 3, 15);

    private readonly SqliteConnection _connection = new("Data Source=:memory:");

    public ApiFactory()
    {
        _connection.Open();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        builder.ConfigureServices(services =>
        {
            var existing = services.Where(d =>
                d.ServiceType == typeof(DbContextOptions<AppDbContext>)).ToList();
            foreach (var descriptor in existing)
            {
                services.Remove(descriptor);
            }

            services.AddDbContext<AppDbContext>(options => options.UseSqlite(_connection));
            services.AddSingleton<TimeProvider>(new FixedTimeProvider(Today));
        });
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (disposing)
        {
            _connection.Dispose();
        }
    }
}

/// <summary>A clock that always shows noon UTC on a fixed date.</summary>
public sealed class FixedTimeProvider(DateOnly date) : TimeProvider
{
    public override DateTimeOffset GetUtcNow() => new(date.ToDateTime(new TimeOnly(12, 0)), TimeSpan.Zero);

    public override TimeZoneInfo LocalTimeZone => TimeZoneInfo.Utc;
}
