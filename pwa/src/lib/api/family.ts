import { apiClient } from './client';

import type { FamilyMember } from '@/types/domain';
import type { ApiResponse } from '@/types/api';

export async function getFamilyMembers(): Promise<FamilyMember[]> {
  const { data } = await apiClient.get<ApiResponse<FamilyMember[]>>('/api/family');
  return data.data;
}

export async function createFamilyMember(
  payload: Pick<FamilyMember, 'name'>
): Promise<FamilyMember> {
  const { data } = await apiClient.post<ApiResponse<FamilyMember>>('/api/family', payload);
  return data.data;
}

export async function deleteFamilyMember(id: string): Promise<void> {
  await apiClient.delete(`/api/family/${id}`);
}
