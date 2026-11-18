namespace DroneInventory.Api.Domain;

public enum LoanItemType
{
    Battery,
    Propeller,
}

/// <summary>The most items of a type one loan may hold (REQ-006, design D6 of manage-drones-and-groups).</summary>
public static class LoanItemLimits
{
    public const int MaxBatteries = 10;
    public const int MaxPropellers = 20;

    public static int Max(LoanItemType type) => type == LoanItemType.Battery ? MaxBatteries : MaxPropellers;
}
