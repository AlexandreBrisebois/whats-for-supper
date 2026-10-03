using Microsoft.AspNetCore.Mvc;
using RecipeApi.Dto;
using RecipeApi.Infrastructure;
using RecipeApi.Services;

namespace RecipeApi.Controllers;

[ApiController]
[Route("api/feature-flags")]
public class FeatureFlagsController(FeatureFlagService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetSnapshot(
        [ModelBinder(BinderType = typeof(FamilyMemberIdModelBinder))] Guid? familyMemberId,
        CancellationToken cancellationToken)
    {
        if (familyMemberId is null)
            return Unauthorized(new { message = "Family member identity is required." });
        if (!await service.MemberExistsAsync(familyMemberId.Value, cancellationToken))
            return NotFound(new { message = "Family member not found." });
        return Ok(new FeatureFlagListDto(await service.GetSnapshotAsync(familyMemberId.Value, cancellationToken)));
    }

    [HttpPatch("{key}")]
    public async Task<IActionResult> Update(
        string key,
        [FromBody] UpdateFeatureFlagRequest request,
        [ModelBinder(BinderType = typeof(FamilyMemberIdModelBinder))] Guid? familyMemberId,
        CancellationToken cancellationToken)
    {
        if (familyMemberId is null)
            return Unauthorized(new { message = "Family member identity is required." });
        try
        {
            var result = await service.SetOverrideAsync(familyMemberId.Value, key, request.Enabled, cancellationToken);
            return result is null ? NotFound(new { message = "Feature flag not found." }) : Ok(result);
        }
        catch (FeatureFlagNotOptInException)
        {
            return Conflict(new { message = "Feature is not available for opt-in." });
        }
    }
}
