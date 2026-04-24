import { apiClient } from './api-client';
import type { FamilyGetResponse_data, FamilyPostRequestBody } from './generated/api/family/index';

export type FamilyMember = {
  id: string;
  name: string;
};

export async function getFamilyMembers(): Promise<FamilyMember[]> {
  const result = await apiClient.api.family.get();
  // Map generated model to local FamilyMember type
  return (
    result?.data?.map((m: FamilyGetResponse_data) => ({
      id: m.id || '',
      name: m.name || '',
    })) || []
  );
}

export async function createFamilyMember(payload: FamilyPostRequestBody): Promise<FamilyMember> {
  const result = await apiClient.api.family.post(payload);
  return {
    id: result?.data?.id || '',
    name: result?.data?.name || '',
  };
}

export async function updateFamilyMember(
  id: string,
  payload: { name: string }
): Promise<FamilyMember> {
  const result = await apiClient.api.family.byId(id).put(payload);
  return {
    id: result?.data?.id || '',
    name: result?.data?.name || '',
  };
}

export async function deleteFamilyMember(id: string): Promise<void> {
  await apiClient.api.family.byId(id).delete();
}
