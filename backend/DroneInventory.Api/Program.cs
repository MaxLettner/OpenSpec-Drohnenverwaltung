using DroneInventory.Api.Api;
using DroneInventory.Api.Application;
using DroneInventory.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();

builder.Services.AddApiErrorHandling();

// The one place the database location comes from: appsettings.json sets the connection string.
var connectionString = builder.Configuration.GetConnectionString("Default")
    ?? throw new InvalidOperationException("The connection string \"Default\" is not configured.");
builder.Services.AddDbContext<AppDbContext>(options => options.UseSqlite(connectionString));

builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddScoped<LoanService>();

var app = builder.Build();

app.UseApiErrorHandling();

// The built Angular app in wwwroot (only in the container image; in development ng serve serves it).
app.UseDefaultFiles();
app.UseStaticFiles();

// Creates the database file on first start and applies new migrations, in every environment (deployment spec).
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();

    // Off in appsettings.json, on in appsettings.Development.json; the test factory sets it (sample-data spec).
    if (app.Configuration.GetValue<bool>("SampleData:SeedWhenEmpty"))
    {
        await SampleData.SeedIfEmptyAsync(db);
    }
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.MapStudentGroupEndpoints();
app.MapDroneEndpoints();
app.MapLoanEndpoints();
app.MapLoanQueryEndpoints();

// deployment spec: every address outside /api that names no file opens the app. /api stays out, so an
// unknown API address remains a 404 and a wrong method on an API route remains a 405.
app.MapFallbackToFile("{*path:nonfile:regex(^(?!api(/|$)))}", "index.html");

app.Run();

// Makes the entry point visible to WebApplicationFactory in the test project.
public partial class Program;
