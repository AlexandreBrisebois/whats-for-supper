namespace WhatsForSupper.Api.DTOs;

public class SupperOptionDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public string CreatedBy { get; set; } = string.Empty;
    public int VoteCount { get; set; }
}

public class CreateSupperOptionDto
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string CreatedBy { get; set; } = string.Empty;
}

public class VoteDto
{
    public int Id { get; set; }
    public int SupperOptionId { get; set; }
    public string FamilyMember { get; set; } = string.Empty;
    public DateTime VotedAt { get; set; }
}

public class CreateVoteDto
{
    public int SupperOptionId { get; set; }
    public string FamilyMember { get; set; } = string.Empty;
}

public class VotingResultDto
{
    public SupperOptionDto Option { get; set; } = null!;
    public int VoteCount { get; set; }
    public List<string> Voters { get; set; } = new();
}