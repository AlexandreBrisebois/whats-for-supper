using Microsoft.EntityFrameworkCore;
using WhatsForSupper.Api.Data;
using WhatsForSupper.Api.Models;
using WhatsForSupper.Api.DTOs;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddDbContext<VotingContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection") ?? "Data Source=voting.db"));

// Add CORS for React frontend
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp", policy =>
    {
        policy.WithOrigins("http://localhost:5173", "http://localhost:3000") // Vite and CRA default ports
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("AllowReactApp");

// Ensure database is created
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<VotingContext>();
    context.Database.EnsureCreated();
}

// API Endpoints

// Get all supper options with vote counts
app.MapGet("/api/supper-options", async (VotingContext context) =>
{
    var options = await context.SupperOptions
        .Include(o => o.Votes)
        .Select(o => new SupperOptionDto
        {
            Id = o.Id,
            Name = o.Name,
            Description = o.Description,
            CreatedAt = o.CreatedAt,
            CreatedBy = o.CreatedBy,
            VoteCount = o.Votes.Count
        })
        .ToListAsync();
    
    return Results.Ok(options);
})
.WithName("GetSupperOptions")
.WithOpenApi();

// Get a specific supper option
app.MapGet("/api/supper-options/{id}", async (int id, VotingContext context) =>
{
    var option = await context.SupperOptions
        .Include(o => o.Votes)
        .Where(o => o.Id == id)
        .Select(o => new SupperOptionDto
        {
            Id = o.Id,
            Name = o.Name,
            Description = o.Description,
            CreatedAt = o.CreatedAt,
            CreatedBy = o.CreatedBy,
            VoteCount = o.Votes.Count
        })
        .FirstOrDefaultAsync();
    
    return option is not null ? Results.Ok(option) : Results.NotFound();
})
.WithName("GetSupperOption")
.WithOpenApi();

// Create a new supper option
app.MapPost("/api/supper-options", async (CreateSupperOptionDto dto, VotingContext context) =>
{
    var option = new SupperOption
    {
        Name = dto.Name,
        Description = dto.Description,
        CreatedBy = dto.CreatedBy,
        CreatedAt = DateTime.UtcNow
    };
    
    context.SupperOptions.Add(option);
    await context.SaveChangesAsync();
    
    var optionDto = new SupperOptionDto
    {
        Id = option.Id,
        Name = option.Name,
        Description = option.Description,
        CreatedAt = option.CreatedAt,
        CreatedBy = option.CreatedBy,
        VoteCount = 0
    };
    
    return Results.Created($"/api/supper-options/{option.Id}", optionDto);
})
.WithName("CreateSupperOption")
.WithOpenApi();

// Vote for a supper option
app.MapPost("/api/votes", async (CreateVoteDto dto, VotingContext context) =>
{
    // Check if option exists
    var optionExists = await context.SupperOptions.AnyAsync(o => o.Id == dto.SupperOptionId);
    if (!optionExists)
    {
        return Results.BadRequest("Supper option not found");
    }
    
    // Check if user already voted for this option
    var existingVote = await context.Votes
        .FirstOrDefaultAsync(v => v.SupperOptionId == dto.SupperOptionId && v.FamilyMember == dto.FamilyMember);
    
    if (existingVote != null)
    {
        return Results.Conflict("Family member has already voted for this option");
    }
    
    var vote = new Vote
    {
        SupperOptionId = dto.SupperOptionId,
        FamilyMember = dto.FamilyMember,
        VotedAt = DateTime.UtcNow
    };
    
    context.Votes.Add(vote);
    await context.SaveChangesAsync();
    
    var voteDto = new VoteDto
    {
        Id = vote.Id,
        SupperOptionId = vote.SupperOptionId,
        FamilyMember = vote.FamilyMember,
        VotedAt = vote.VotedAt
    };
    
    return Results.Created($"/api/votes/{vote.Id}", voteDto);
})
.WithName("CreateVote")
.WithOpenApi();

// Get voting results
app.MapGet("/api/voting-results", async (VotingContext context) =>
{
    var results = await context.SupperOptions
        .Include(o => o.Votes)
        .Select(o => new VotingResultDto
        {
            Option = new SupperOptionDto
            {
                Id = o.Id,
                Name = o.Name,
                Description = o.Description,
                CreatedAt = o.CreatedAt,
                CreatedBy = o.CreatedBy,
                VoteCount = o.Votes.Count
            },
            VoteCount = o.Votes.Count,
            Voters = o.Votes.Select(v => v.FamilyMember).ToList()
        })
        .OrderByDescending(r => r.VoteCount)
        .ToListAsync();
    
    return Results.Ok(results);
})
.WithName("GetVotingResults")
.WithOpenApi();

// Remove a vote
app.MapDelete("/api/votes/{familyMember}/{supperOptionId}", async (string familyMember, int supperOptionId, VotingContext context) =>
{
    var vote = await context.Votes
        .FirstOrDefaultAsync(v => v.FamilyMember == familyMember && v.SupperOptionId == supperOptionId);
    
    if (vote == null)
    {
        return Results.NotFound();
    }
    
    context.Votes.Remove(vote);
    await context.SaveChangesAsync();
    
    return Results.NoContent();
})
.WithName("RemoveVote")
.WithOpenApi();

// Health check endpoint
app.MapGet("/health", () => Results.Ok(new { status = "healthy", timestamp = DateTime.UtcNow }))
.WithName("HealthCheck")
.WithOpenApi();

app.Run();
