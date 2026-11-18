using DroneInventory.Api.Application;
using DroneInventory.Api.Domain;
using DroneInventory.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace DroneInventory.Api.Api;

public record CreateStudentGroupRequest(string? Name);

public record UpdateStudentGroupRequest(string? Name);

public record StudentGroupResponse(int Id, string Name);

public static class StudentGroupEndpoints
{
    public static void MapStudentGroupEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/student-groups");
        group.MapPost("/", CreateAsync);
        group.MapGet("/", ListAsync);
        group.MapGet("/{id:int}", GetAsync);
        group.MapPut("/{id:int}", UpdateAsync);
        group.MapPost("/{id:int}/retire", RetireAsync);
        group.MapPost("/{id:int}/restore", RestoreAsync);
    }

    // Student-group spec "Show student group details" (design D3); "today" is the UTC date the loans use.
    private static async Task<IResult> GetAsync(int id, AppDbContext db, TimeProvider timeProvider)
    {
        var today = DateOnly.FromDateTime(timeProvider.GetUtcNow().UtcDateTime);
        var details = await db.GetStudentGroupDetailsAsync(id, today);
        return details is null
            ? ApiResults.NotFound($"No student group with the Id {id} exists.")
            : Results.Ok(details);
    }

    // Fixed order by name (design D10); the NOCASE collation makes it case-insensitive.
    private static async Task<IResult> ListAsync(AppDbContext db) =>
        Results.Ok(await db.StudentGroups
            .AsNoTracking()
            .Where(g => !g.Retired)
            .OrderBy(g => g.Name)
            .Select(g => new StudentGroupResponse(g.Id, g.Name))
            .ToListAsync());

    private static async Task<IResult> CreateAsync(CreateStudentGroupRequest request, AppDbContext db)
    {
        var (name, nameErrors) = NameValidation.Validate(request.Name, StudentGroup.NameMaxLength);
        if (name is null)
        {
            return ApiResults.ValidationErrors(nameErrors);
        }

        var studentGroup = new StudentGroup { Name = name };
        db.StudentGroups.Add(studentGroup);
        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (SqliteConstraints.IsUniqueViolation(ex))
        {
            // The unique index is the single enforcement point, so simultaneous requests are safe too.
            return ApiResults.DuplicateName("student group", name);
        }

        return Results.Created(
            $"/api/student-groups/{studentGroup.Id}",
            new StudentGroupResponse(studentGroup.Id, studentGroup.Name));
    }

    // REQ-003: the same validation as create; the name stays unique ignoring case (design D2).
    private static async Task<IResult> UpdateAsync(int id, UpdateStudentGroupRequest request, AppDbContext db)
    {
        var studentGroup = await db.StudentGroups.SingleOrDefaultAsync(g => g.Id == id);
        if (studentGroup is null)
        {
            return ApiResults.NotFound($"No student group with the Id {id} exists.");
        }

        if (studentGroup.Retired)
        {
            return ApiResults.Conflict($"Student group {id} is retired and cannot be edited.");
        }

        var (name, nameErrors) = NameValidation.Validate(request.Name, StudentGroup.NameMaxLength);
        if (name is null)
        {
            return ApiResults.ValidationErrors(nameErrors);
        }

        studentGroup.Name = name;
        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (SqliteConstraints.IsUniqueViolation(ex))
        {
            return ApiResults.DuplicateName("student group", name);
        }

        return Results.Ok(new StudentGroupResponse(studentGroup.Id, studentGroup.Name));
    }

    // REQ-003, REQ-010: retiring keeps the group and its loans; only a group without active loans can retire.
    private static async Task<IResult> RetireAsync(int id, AppDbContext db)
    {
        var studentGroup = await db.StudentGroups.SingleOrDefaultAsync(g => g.Id == id);
        if (studentGroup is null)
        {
            return ApiResults.NotFound($"No student group with the Id {id} exists.");
        }

        if (studentGroup.Retired)
        {
            return ApiResults.Conflict($"Student group {id} is already retired.");
        }

        if (await db.Loans.AnyAsync(l => l.StudentGroupId == id && l.Status == LoanStatus.Active))
        {
            return ApiResults.Conflict($"Student group {id} has an active loan and cannot be retired.");
        }

        studentGroup.Retired = true;
        await db.SaveChangesAsync();
        return Results.NoContent();
    }

    // REQ-003: backend only; the group is listed and can borrow again.
    private static async Task<IResult> RestoreAsync(int id, AppDbContext db)
    {
        var studentGroup = await db.StudentGroups.SingleOrDefaultAsync(g => g.Id == id);
        if (studentGroup is null)
        {
            return ApiResults.NotFound($"No student group with the Id {id} exists.");
        }

        if (!studentGroup.Retired)
        {
            return ApiResults.Conflict($"Student group {id} is not retired.");
        }

        studentGroup.Retired = false;
        await db.SaveChangesAsync();
        return Results.NoContent();
    }
}
