using Microsoft.AspNetCore.Mvc;
using RecipeApi.Dto;
using RecipeApi.Services;

namespace RecipeApi.Controllers;

[ApiController]
[Route("api/family")]
public class FamilyController(FamilyService familyService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var members = await familyService.GetAllFamilyMembers();
        var dtos = members.Select(m => new FamilyMemberDto
        {
            Id = m.Id,
            Name = m.Name,
            CompletedTours = m.CompletedTours,
            CreatedAt = m.CreatedAt
        }).ToList();
        return Ok(new { data = dtos });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateFamilyMemberDto dto)
    {
        var member = await familyService.CreateFamilyMember(dto.Name);
        var result = new FamilyMemberDto
        {
            Id = member.Id,
            Name = member.Name,
            CompletedTours = member.CompletedTours,
            CreatedAt = member.CreatedAt
        };
        return CreatedAtAction(nameof(GetAll), new { data = result });
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await familyService.DeleteFamilyMember(id);
        return NoContent();
    }
}
