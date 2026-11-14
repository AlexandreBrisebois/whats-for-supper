using RecipeApi.Models;

namespace RecipeApi.Services;

public sealed record MaintenanceCommandObservation(Guid Id, string CommandType, string Status, string Payload,
    string? Result, int Attempts, Guid? RequestedBy, DateTimeOffset CreatedAt, DateTimeOffset? ScheduledFor,
    DateTimeOffset? StartedAt, DateTimeOffset? CompletedAt, string? LastError)
{
    internal static MaintenanceCommandObservation From(MaintenanceCommand command) => new(command.Id, command.CommandType,
        command.Status, command.Payload, command.Result, command.Attempts, command.RequestedBy, command.CreatedAt,
        command.ScheduledFor, command.StartedAt, command.CompletedAt, command.LastError);
}
