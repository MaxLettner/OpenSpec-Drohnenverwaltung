namespace DroneInventory.Api.Domain;

/// <summary>Aggregate root: one drone lent to one student group, with optional accessories.</summary>
public class Loan
{
    public int Id { get; set; }

    public int DroneId { get; set; }

    public int StudentGroupId { get; set; }

    public DateOnly LoanDate { get; set; }

    public DateOnly? ReturnDate { get; set; }

    public LoanStatus Status { get; set; }

    public List<LoanItem> Items { get; set; } = [];
}
