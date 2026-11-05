using DroneInventory.Api.Application;
using DroneInventory.Api.Domain;
using DroneInventory.Api.Infrastructure;
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
        group.MapGet("/", ListAsync);
    }

    // REQ-002: the derived availability comes from the query, not from a stored column (design D2).
    private static async Task<IResult> ListAsync(AppDbContext db) =>
        Results.Ok(await db.GetDronesAsync());

    private static async Task<IResult> CreateAsync(CreateDroneRequest request, AppDbContext db)
    {
        var (name, nameErrors) = NameValidation.Validate(request.Name, Drone.NameMaxLength);
        if (name is null)
        {
            return ApiResults.ValidationErrors(nameErrors);
        }

        var (description, descriptionError) = ValidateDescription(request.Description);
        if (descriptionError is not null)
        {
            return ApiResults.ValidationError("description", descriptionError);
        }

        var drone = new Drone { Name = name, Description = description };
        db.Drones.Add(drone);
        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (SqliteConstraints.IsUniqueViolation(ex))
        {
            // The unique index is the single enforcement point, so simultaneous requests are safe too.
            return ApiResults.DuplicateName("drone", name);
        }

        return Results.Created($"/api/drones/{drone.Id}", new DroneResponse(drone.Id, drone.Name, drone.Description));
    }

    /// <summary>REQ-001: the description is optional, trimmed, stored as null when blank and at most 500 characters.</summary>
    private static (string? Description, string? Error) ValidateDescription(string? value)
    {
        var description = value?.Trim();
        if (string.IsNullOrEmpty(description))
        {
            return (null, null);
        }

        return description.Length > Drone.DescriptionMaxLength
            ? (null, $"The description must not be longer than {Drone.DescriptionMaxLength} characters.")
            : (description, null);
    }
}
