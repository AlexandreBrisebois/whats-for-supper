using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using RecipeApi.Infrastructure;
using RecipeApi.Services;

namespace RecipeApi.Controllers;

/// <summary>
/// Handles the persistent SSE connection for real-time schedule push events.
///
/// Auth note (BS-4): EventSource cannot send custom request headers, so
/// X-Family-Member-Id cannot be used here. The family member ID is read from
/// Request.Cookies["x-family-member-id"] instead. Session auth continues to
/// use the h_access cookie validated by HearthAuthenticationHandler.
/// </summary>
[ApiController]
[Route("api/stream")]
[SkipWrapping]
public class StreamController(SseConnectionManager manager, ScheduleService scheduleService) : ControllerBase
{
    private readonly SseConnectionManager _manager = manager;
    private readonly ScheduleService _scheduleService = scheduleService;

    [HttpGet]
    public async Task Stream(CancellationToken cancellationToken)
    {
        // BS-4: EventSource cannot send custom headers — read member ID from cookie.
        if (!Request.Cookies.TryGetValue("x-family-member-id", out var memberIdStr)
            || !Guid.TryParse(memberIdStr, out _))
        {
            Response.StatusCode = 400;
            await Response.WriteAsync("x-family-member-id cookie is required", cancellationToken);
            return;
        }

        Response.Headers["Content-Type"] = "text/event-stream";
        Response.Headers["Cache-Control"] = "no-cache";
        Response.Headers["Connection"] = "keep-alive";
        Response.Headers["X-Accel-Buffering"] = "no";

        var connectionId = _manager.AddConnection(Response);

        try
        {
            // Send connected event with current schedule snapshot for weekOffset=0.
            var schedule = await _scheduleService.GetScheduleAsync(0);
            var connectedPayload = JsonSerializer.Serialize(
                new { type = "connected", schedule },
                new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
            var connectedMessage = $"event: connected\ndata: {connectedPayload}\n\n";
            await Response.WriteAsync(connectedMessage, cancellationToken);
            await Response.Body.FlushAsync(cancellationToken);

            // Heartbeat loop — keeps the connection alive through proxies that
            // would otherwise close idle persistent connections.
            using var timer = new PeriodicTimer(TimeSpan.FromSeconds(15));
            while (!cancellationToken.IsCancellationRequested)
            {
                await timer.WaitForNextTickAsync(cancellationToken);
                await Response.WriteAsync(": ping\n\n", cancellationToken);
                await Response.Body.FlushAsync(cancellationToken);
            }
        }
        catch (OperationCanceledException)
        {
            // Client disconnected — normal teardown path.
        }
        finally
        {
            _manager.RemoveConnection(connectionId);
        }
    }
}
