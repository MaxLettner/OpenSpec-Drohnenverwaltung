using DroneInventory.Api.Domain;
using DroneInventory.Api.Infrastructure;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace DroneInventory.Api.Api;

public record CreateStudentGroupRequest(string? Name);

public record StudentGroupResponse(int Id, string Name);

public static class StudentGroupEndpoints
{
    public static void MapStudentGroupEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/student-groups");
        group.MapPost("/", CreateAsync);
    }

    private static async Task<IResult> CreateAsync(CreateStudentGroupRequest request, AppDbContext db)
    {
        var name = request.Name?.Trim();
        if (string.IsNullOrEmpty(name))
        {
            return Results.ValidationProblem(new Dictionary<string, string[]>
            {
                ["name"] = ["The name must not be blank."],
            });
        }

        if (name.Length > StudentGroup.NameMaxLength)
        {
            return Results.ValidationProblem(new Dictionary<string, string[]>
            {
                ["name"] = [$"The name must not be longer than {StudentGroup.NameMaxLength} characters."],
            });
        }

        var studentGroup = new StudentGroup { Name = name };
        db.StudentGroups.Add(studentGroup);
        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ex.InnerException is SqliteException { SqliteErrorCode: 19 })
        {
            // The unique index is the single enforcement point, so simultaneous requests are safe too.
            return Results.Problem(
                statusCode: StatusCodes.Status409Conflict,
                detail: $"A student group named \"{name}\" already exists.");
        }

        return Results.Created(
            $"/api/student-groups/{studentGroup.Id}",
            new StudentGroupResponse(studentGroup.Id, studentGroup.Name));
    }
}
