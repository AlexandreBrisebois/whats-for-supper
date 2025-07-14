import axios from 'axios';
import { SupperOption, CreateSupperOption, CreateVote, VotingResult } from './types';

const BASE_URL = 'http://localhost:5223/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const apiService = {
  // Get all supper options
  getSupperOptions: async (): Promise<SupperOption[]> => {
    const response = await api.get('/supper-options');
    return response.data;
  },

  // Get a specific supper option
  getSupperOption: async (id: number): Promise<SupperOption> => {
    const response = await api.get(`/supper-options/${id}`);
    return response.data;
  },

  // Create a new supper option
  createSupperOption: async (option: CreateSupperOption): Promise<SupperOption> => {
    const response = await api.post('/supper-options', option);
    return response.data;
  },

  // Vote for a supper option
  vote: async (vote: CreateVote): Promise<void> => {
    await api.post('/votes', vote);
  },

  // Remove a vote
  removeVote: async (familyMember: string, supperOptionId: number): Promise<void> => {
    await api.delete(`/votes/${encodeURIComponent(familyMember)}/${supperOptionId}`);
  },

  // Get voting results
  getVotingResults: async (): Promise<VotingResult[]> => {
    const response = await api.get('/voting-results');
    return response.data;
  },
};