using Microsoft.AspNetCore.Mvc;
using RecipeApi.Dto;
using RecipeApi.Services;

namespace RecipeApi.Controllers;

[ApiController]
[Route("api/goto")]
public class GoToController(GoToService goToService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetList()
    {
        var result = await goToService.GetGoToListAsync();
        return Ok(new { data = result });
    }

    [HttpPut]
    public async Task<IActionResult> UpdateList([FromBody] GoToListDto dto)
    {
        var result = await goToService.SaveGoToListAsync(dto);
        return Ok(new { data = result });
    }

    [HttpGet("active")]
    public async Task<IActionResult> GetActive()
    {
        var result = await goToService.GetActiveGoToAsync();
        if (result == null)
            return NotFound(new { message = "No ready GOTO recipes found." });

        return Ok(new { data = result });
    }
}
