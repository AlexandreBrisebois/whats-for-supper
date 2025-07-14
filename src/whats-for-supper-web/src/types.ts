export interface SupperOption {
  id: number;
  name: string;
  description: string;
  createdAt: string;
  createdBy: string;
  voteCount: number;
}

export interface CreateSupperOption {
  name: string;
  description: string;
  createdBy: string;
}

export interface Vote {
  id: number;
  supperOptionId: number;
  familyMember: string;
  votedAt: string;
}

export interface CreateVote {
  supperOptionId: number;
  familyMember: string;
}

export interface VotingResult {
  option: SupperOption;
  voteCount: number;
  voters: string[];
}