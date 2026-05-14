using Microsoft.AspNetCore.Mvc;
using RecipeApi.Dto;
using RecipeApi.Infrastructure;
using RecipeApi.Services;

namespace RecipeApi.Controllers;

[ApiController]
[Route("api/family")]
public class FamilyController(FamilyService familyService, DemoModeOptions demoMode) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var members = await familyService.GetAllFamilyMembers();
        var dtos = members.Select(ToDto).ToList();
        return Ok(dtos);
    }

    [HttpGet("me")]
    public async Task<IActionResult> GetMe([ModelBinder(BinderType = typeof(FamilyMemberIdModelBinder))] Guid? familyMemberId)
    {
        if (familyMemberId == null)
            return Unauthorized(new { message = "No family member identity found in headers or cookies." });

        var members = await familyService.GetAllFamilyMembers();
        var member = members.FirstOrDefault(m => m.Id == familyMemberId);

        if (member == null)
            return NotFound(new { message = "Family member not found." });

        return Ok(ToDto(member));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateFamilyMemberDto dto)
    {
        if (demoMode.Enabled)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "New user creation is restricted in Demo Mode." });
        }

        var member = await familyService.CreateFamilyMember(dto.Name);
        var result = ToDto(member);
        return CreatedAtAction(nameof(GetAll), null, result);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateFamilyMemberDto dto)
    {
        var member = await familyService.UpdateFamilyMember(id, dto.Name);
        return Ok(ToDto(member));
    }

    [HttpPut("{id:guid}/preferences")]
    public async Task<IActionResult> UpdatePreferences(
        Guid id,
        [FromBody] UpdateFamilyMemberPreferencesDto dto)
    {
        var member = await familyService.UpdateFamilyMemberPreferences(id, dto.BrowseViewMode, dto.PreferredLanguage);
        return Ok(ToDto(member));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await familyService.DeleteFamilyMember(id);
        return NoContent();
    }

    private static FamilyMemberDto ToDto(RecipeApi.Models.FamilyMember member) => new()
    {
        Id = member.Id,
        Name = member.Name,
        BrowseViewMode = member.BrowseViewMode,
        PreferredLanguage = member.PreferredLanguage,
        CreatedAt = member.CreatedAt,
        UpdatedAt = member.UpdatedAt
    };
}
