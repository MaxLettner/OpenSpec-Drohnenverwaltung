namespace DroneInventory.Api.Domain;

/// <summary>An accessory lent together with a drone. At most one item per type per loan.</summary>
public class LoanItem
{
    public int Id { get; set; }

    public int LoanId { get; set; }

    public LoanItemType Type { get; set; }

    public int Quantity { get; set; }
}
