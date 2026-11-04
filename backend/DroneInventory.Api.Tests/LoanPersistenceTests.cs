using DroneInventory.Api.Domain;
using DroneInventory.Api.Infrastructure;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace DroneInventory.Api.Tests;

/// <summary>
/// Database constraints behind the loan rules (task 4.1): REQ-005 (one active loan per drone),
/// REQ-006 (one item per type, quantity >= 0) and REQ-010 (history survives, nothing is deleted by side effect).
/// Runs against real in-memory SQLite so the partial index and check constraint are exercised.
/// </summary>
public class LoanPersistenceTests
{
    private static readonly DateOnly Day = new(2026, 11, 4);

    private static (ApiFactory Factory, IServiceScope Scope, AppDbContext Db) Open()
    {
        var factory = new ApiFactory();
        var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return (factory, scope, db);
    }

    private static async Task<(Drone Drone, StudentGroup Group)> SeedAsync(AppDbContext db)
    {
        var drone = new Drone { Name = "Mavic" };
        var group = new StudentGroup { Name = "Group 1" };
        db.AddRange(drone, group);
        await db.SaveChangesAsync();
        return (drone, group);
    }

    private static Loan NewLoan(Drone drone, StudentGroup group, LoanStatus status) => new()
    {
        DroneId = drone.Id,
        StudentGroupId = group.Id,
        LoanDate = Day,
        ReturnDate = status == LoanStatus.Returned ? Day : null,
        Status = status,
    };

    [Fact]
    public async Task REQ_005_Second_active_loan_for_one_drone_is_rejected_by_the_database()
    {
        var (factory, scope, db) = Open();
        using var _f = factory;
        using var _s = scope;
        var (drone, group) = await SeedAsync(db);
        db.Loans.Add(NewLoan(drone, group, LoanStatus.Active));
        await db.SaveChangesAsync();

        db.Loans.Add(NewLoan(drone, group, LoanStatus.Active));

        await Assert.ThrowsAsync<DbUpdateException>(() => db.SaveChangesAsync());
    }

    [Fact]
    public async Task REQ_005_Two_returned_loans_for_one_drone_are_allowed()
    {
        var (factory, scope, db) = Open();
        using var _f = factory;
        using var _s = scope;
        var (drone, group) = await SeedAsync(db);

        db.Loans.AddRange(NewLoan(drone, group, LoanStatus.Returned), NewLoan(drone, group, LoanStatus.Returned));
        await db.SaveChangesAsync();

        Assert.Equal(2, await db.Loans.CountAsync(l => l.DroneId == drone.Id));
    }

    [Fact]
    public async Task REQ_005_Active_and_returned_loan_for_one_drone_are_allowed()
    {
        var (factory, scope, db) = Open();
        using var _f = factory;
        using var _s = scope;
        var (drone, group) = await SeedAsync(db);

        db.Loans.AddRange(NewLoan(drone, group, LoanStatus.Returned), NewLoan(drone, group, LoanStatus.Active));
        await db.SaveChangesAsync();

        Assert.Equal(2, await db.Loans.CountAsync(l => l.DroneId == drone.Id));
    }

    [Fact]
    public async Task REQ_005_Status_and_item_type_are_stored_as_strings()
    {
        var (factory, scope, db) = Open();
        using var _f = factory;
        using var _s = scope;
        var (drone, group) = await SeedAsync(db);
        var loan = NewLoan(drone, group, LoanStatus.Active);
        loan.Items.Add(new LoanItem { Type = LoanItemType.Propeller, Quantity = 4 });
        db.Loans.Add(loan);
        await db.SaveChangesAsync();

        var status = await db.Database.SqlQueryRaw<string>("SELECT \"Status\" AS \"Value\" FROM \"Loans\"").SingleAsync();
        var type = await db.Database.SqlQueryRaw<string>("SELECT \"Type\" AS \"Value\" FROM \"LoanItems\"").SingleAsync();

        Assert.Equal("Active", status);
        Assert.Equal("Propeller", type);
    }

    [Fact]
    public async Task REQ_006_Duplicate_item_type_in_one_loan_is_rejected_by_the_database()
    {
        var (factory, scope, db) = Open();
        using var _f = factory;
        using var _s = scope;
        var (drone, group) = await SeedAsync(db);
        var loan = NewLoan(drone, group, LoanStatus.Active);
        loan.Items.Add(new LoanItem { Type = LoanItemType.Battery, Quantity = 1 });
        loan.Items.Add(new LoanItem { Type = LoanItemType.Battery, Quantity = 2 });
        db.Loans.Add(loan);

        await Assert.ThrowsAsync<DbUpdateException>(() => db.SaveChangesAsync());
    }

    [Fact]
    public async Task REQ_006_Same_item_type_in_different_loans_is_allowed()
    {
        var (factory, scope, db) = Open();
        using var _f = factory;
        using var _s = scope;
        var (drone, group) = await SeedAsync(db);
        var first = NewLoan(drone, group, LoanStatus.Returned);
        first.Items.Add(new LoanItem { Type = LoanItemType.Battery, Quantity = 1 });
        var second = NewLoan(drone, group, LoanStatus.Active);
        second.Items.Add(new LoanItem { Type = LoanItemType.Battery, Quantity = 1 });
        db.Loans.AddRange(first, second);

        await db.SaveChangesAsync();

        Assert.Equal(2, await db.LoanItems.CountAsync());
    }

    [Fact]
    public async Task REQ_006_Negative_quantity_is_rejected_by_the_database()
    {
        var (factory, scope, db) = Open();
        using var _f = factory;
        using var _s = scope;
        var (drone, group) = await SeedAsync(db);
        var loan = NewLoan(drone, group, LoanStatus.Active);
        loan.Items.Add(new LoanItem { Type = LoanItemType.Battery, Quantity = -1 });
        db.Loans.Add(loan);

        await Assert.ThrowsAsync<DbUpdateException>(() => db.SaveChangesAsync());
    }

    [Fact]
    public async Task REQ_006_Zero_quantity_is_allowed()
    {
        var (factory, scope, db) = Open();
        using var _f = factory;
        using var _s = scope;
        var (drone, group) = await SeedAsync(db);
        var loan = NewLoan(drone, group, LoanStatus.Active);
        loan.Items.Add(new LoanItem { Type = LoanItemType.Battery, Quantity = 0 });
        db.Loans.Add(loan);

        await db.SaveChangesAsync();

        Assert.Equal(1, await db.LoanItems.CountAsync());
    }

    [Fact]
    public async Task REQ_010_Deleting_a_drone_with_a_loan_is_restricted()
    {
        var (factory, scope, db) = Open();
        using var _f = factory;
        using var _s = scope;
        var (drone, group) = await SeedAsync(db);
        db.Loans.Add(NewLoan(drone, group, LoanStatus.Returned));
        await db.SaveChangesAsync();

        // Raw SQL, so the database (not EF's change tracker) is what refuses the delete.
        var ex = await Assert.ThrowsAsync<SqliteException>(() =>
            db.Database.ExecuteSqlRawAsync("DELETE FROM \"Drones\" WHERE \"Id\" = {0}", drone.Id));

        Assert.Contains("FOREIGN KEY", ex.Message);
    }

    [Fact]
    public async Task REQ_010_Deleting_a_student_group_with_a_loan_is_restricted()
    {
        var (factory, scope, db) = Open();
        using var _f = factory;
        using var _s = scope;
        var (drone, group) = await SeedAsync(db);
        db.Loans.Add(NewLoan(drone, group, LoanStatus.Returned));
        await db.SaveChangesAsync();

        var ex = await Assert.ThrowsAsync<SqliteException>(() =>
            db.Database.ExecuteSqlRawAsync("DELETE FROM \"StudentGroups\" WHERE \"Id\" = {0}", group.Id));

        Assert.Contains("FOREIGN KEY", ex.Message);
    }

    [Fact]
    public async Task REQ_010_Deleting_a_loan_that_has_items_is_restricted()
    {
        var (factory, scope, db) = Open();
        using var _f = factory;
        using var _s = scope;
        var (drone, group) = await SeedAsync(db);
        var loan = NewLoan(drone, group, LoanStatus.Returned);
        loan.Items.Add(new LoanItem { Type = LoanItemType.Battery, Quantity = 2 });
        db.Loans.Add(loan);
        await db.SaveChangesAsync();

        var ex = await Assert.ThrowsAsync<SqliteException>(() =>
            db.Database.ExecuteSqlRawAsync("DELETE FROM \"Loans\" WHERE \"Id\" = {0}", loan.Id));

        Assert.Contains("FOREIGN KEY", ex.Message);
    }
}
