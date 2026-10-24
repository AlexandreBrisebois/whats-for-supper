using Microsoft.AspNetCore.Mvc;
using RecipeApi.Dto;
using RecipeApi.Infrastructure;
using RecipeApi.Services;

namespace RecipeApi.Controllers;

[ApiController]
[Route("api/grocery-extras")]
[SkipWrapping]
public sealed class GroceryExtrasController(GroceryExtraService service) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Create(CreateGroceryExtraRequest request, CancellationToken ct)
    {
        try
        {
            var result = await service.CreateAsync(request, ConnectionId(), ct);
            return result.Created ? StatusCode(StatusCodes.Status201Created, result.Extra) : Ok(result.Extra);
        }
        catch (GroceryExtraValidationException ex) { return BadRequest(new { message = ex.Message }); }
        catch (GroceryExtraConflictException ex) { return Conflict(Conflict(ex)); }
    }

    [HttpGet("suggestions")]
    public async Task<IActionResult> Suggest([FromQuery] string query, CancellationToken ct)
    {
        try { return Ok(new GroceryExtraSuggestionResponse(await service.SuggestAsync(query, ct))); }
        catch (GroceryExtraValidationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpPatch("{occurrenceId:guid}")]
    public async Task<IActionResult> Update(Guid occurrenceId, UpdateGroceryExtraRequest request, CancellationToken ct)
    {
        try { return Ok(await service.UpdateAsync(occurrenceId, request, ConnectionId(), ct)); }
        catch (GroceryExtraValidationException ex) { return BadRequest(new { message = ex.Message }); }
        catch (GroceryExtraNotFoundException) { return NotFound(); }
        catch (GroceryExtraConflictException ex) { return Conflict(Conflict(ex)); }
    }

    [HttpDelete("{occurrenceId:guid}")]
    public async Task<IActionResult> Delete(Guid occurrenceId, [FromQuery] DateOnly weekStartDate,
        [FromQuery] int expectedVersion, CancellationToken ct)
    {
        if (expectedVersion < 1) return BadRequest(new { message = "expectedVersion must be positive." });
        try { await service.DeleteAsync(occurrenceId, weekStartDate, expectedVersion, ConnectionId(), ct); return NoContent(); }
        catch (GroceryExtraNotFoundException) { return NotFound(); }
        catch (GroceryExtraConflictException ex) { return Conflict(Conflict(ex)); }
    }

    private static GroceryExtraConflictResponse Conflict(GroceryExtraConflictException ex) =>
        new(ex.Message, ex.Current is null, ex.Current);
    private string? ConnectionId() => Request.Headers["X-SSE-Connection-ID"].FirstOrDefault();
}
