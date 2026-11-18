namespace DroneInventory.Api.Domain;

public class StudentGroup
{
    public const int NameMaxLength = 100;

    public int Id { get; set; }

    public required string Name { get; set; }

    /// <summary>Retired groups are kept for the loan history but are not listed, edited or given loans (design D1).</summary>
    public bool Retired { get; set; }
}
