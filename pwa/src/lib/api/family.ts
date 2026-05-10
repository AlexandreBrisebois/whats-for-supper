import { apiClient } from './api-client';
import type { FamilyGetResponse_data, FamilyPostRequestBody } from './generated/api/family/index';
import type { PreferencesPutRequestBody } from './generated/api/family/item/preferences/index';

export type FamilyMember = {
  id: string;
  name: string;
  browseViewMode: 'stack' | 'list';
};

function toBrowseViewMode(value: unknown): 'stack' | 'list' {
  return value === 'list' ? 'list' : 'stack';
}

export async function getFamilyMembers(): Promise<FamilyMember[]> {
  const result = await apiClient.api.family.get();
  // Map generated model to local FamilyMember type
  return (
    result?.data?.map((m: FamilyGetResponse_data) => ({
      id: m.id || '',
      name: m.name || '',
      browseViewMode: toBrowseViewMode(m.browseViewMode),
    })) || []
  );
}

export async function createFamilyMember(payload: FamilyPostRequestBody): Promise<FamilyMember> {
  const result = await apiClient.api.family.post(payload);
  if (!result?.data?.id) {
    throw new Error('Failed to create family member: Invalid response from server');
  }
  return {
    id: result.data.id,
    name: result.data.name || '',
    browseViewMode: toBrowseViewMode(result.data.browseViewMode),
  };
}

export async function updateFamilyMember(
  id: string,
  payload: { name: string }
): Promise<FamilyMember> {
  const result = await apiClient.api.family.byId(id).put(payload);
  if (!result?.data?.id) {
    throw new Error('Failed to update family member: Invalid response from server');
  }
  return {
    id: result.data.id,
    name: result.data.name || '',
    browseViewMode: toBrowseViewMode(result.data.browseViewMode),
  };
}

export async function updateFamilyMemberPreferences(
  id: string,
  payload: PreferencesPutRequestBody
): Promise<FamilyMember> {
  const result = await apiClient.api.family.byId(id).preferences.put(payload);
  if (!result?.data?.id) {
    throw new Error('Failed to update family member preferences: Invalid response from server');
  }
  return {
    id: result.data.id,
    name: result.data.name || '',
    browseViewMode: toBrowseViewMode(result.data.browseViewMode),
  };
}

export async function deleteFamilyMember(id: string): Promise<void> {
  await apiClient.api.family.byId(id).delete();
}
