import { apiClient } from './client';

import type { FamilyMember } from '@/types/domain';

export async function getFamilyMembers(): Promise<FamilyMember[]> {
  const { data } = await apiClient.get<{ data: FamilyMember[] }>('/family');
  return data.data;
}

export async function createFamilyMember(
  payload: Pick<FamilyMember, 'name'>
): Promise<FamilyMember> {
  const { data } = await apiClient.post<{ data: FamilyMember }>('/family', payload);
  return data.data;
}

export async function updateFamilyMember(
  id: string,
  payload: Pick<FamilyMember, 'name'>
): Promise<FamilyMember> {
  const { data } = await apiClient.put<{ data: FamilyMember }>(`/family/${id}`, payload);
  return data.data;
}

export async function deleteFamilyMember(id: string): Promise<void> {
  await apiClient.delete(`/family/${id}`);
}
