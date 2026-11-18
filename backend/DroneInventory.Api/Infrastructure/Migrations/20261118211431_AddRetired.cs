using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DroneInventory.Api.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddRetired : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "Retired",
                table: "StudentGroups",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "Retired",
                table: "Drones",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Retired",
                table: "StudentGroups");

            migrationBuilder.DropColumn(
                name: "Retired",
                table: "Drones");
        }
    }
}
