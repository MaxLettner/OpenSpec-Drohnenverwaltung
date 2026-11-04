using DroneInventory.Api.Domain;
using DroneInventory.Api.Infrastructure;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace DroneInventory.Api.Api;

public record CreateDroneRequest(string? Name, string? Description);

public record DroneResponse(int Id, string Name, string? Description);

public static class DroneEndpoints
{
    public static void MapDroneEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/drones");
        group.MapPost("/", CreateAsync);
    }

    private static async Task<IResult> CreateAsync(CreateDroneRequest request, AppDbContext db)
    {
        var name = request.Name?.Trim();
        if (string.IsNullOrEmpty(name))
        {
            return ValidationError("name", "The name must not be blank.");
        }

        if (name.Length > Drone.NameMaxLength)
        {
            return ValidationError("name", $"The name must not be longer than {Drone.NameMaxLength} characters.");
        }

        var description = request.Description?.Trim();
        if (string.IsNullOrEmpty(description))
        {
            description = null;
        }
        else if (description.Length > Drone.DescriptionMaxLength)
        {
            return ValidationError(
                "description",
                $"The description must not be longer than {Drone.DescriptionMaxLength} characters.");
        }

        var drone = new Drone { Name = name, Description = description };
        db.Drones.Add(drone);
        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ex.InnerException is SqliteException { SqliteErrorCode: 19 })
        {
            // The unique index is the single enforcement point, so simultaneous requests are safe too.
            return Results.Problem(
                statusCode: StatusCodes.Status409Conflict,
                detail: $"A drone named \"{name}\" already exists.");
        }

        return Results.Created($"/api/drones/{drone.Id}", new DroneResponse(drone.Id, drone.Name, drone.Description));
    }

    private static IResult ValidationError(string field, string message) =>
        Results.ValidationProblem(new Dictionary<string, string[]> { [field] = [message] });
}
