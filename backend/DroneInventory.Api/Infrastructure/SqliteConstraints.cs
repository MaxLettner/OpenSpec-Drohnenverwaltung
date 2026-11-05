using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace DroneInventory.Api.Infrastructure;

/// <summary>
/// Recognizes the constraints the database enforces (design D4), so that a rejected SaveChanges turns
/// into the matching rejection instead of reporting every constraint as the same thing.
/// </summary>
public static class SqliteConstraints
{
    private const int Constraint = 19;
    private const int UniqueConstraint = 2067;

    /// <summary>A UNIQUE index (name, or the active loan of a drone) refused the row.</summary>
    public static bool IsUniqueViolation(DbUpdateException ex) =>
        ex.InnerException is SqliteException
        {
            SqliteErrorCode: Constraint,
            SqliteExtendedErrorCode: UniqueConstraint,
        };
}
