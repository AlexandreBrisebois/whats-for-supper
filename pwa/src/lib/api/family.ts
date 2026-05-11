import { apiClient } from './api-client';
import type { FamilyPostRequestBody } from './generated/api/family/index';
import type { PreferencesPutRequestBody } from './generated/api/family/item/preferences/index';
import { Locale, DEFAULT_LOCALE } from '@/lib/i18n';

export type FamilyMember = {
  id: string;
  name: string;
  browseViewMode: 'stack' | 'list';
  preferredLanguage: string;
};

function toBrowseViewMode(value: unknown): 'stack' | 'list' {
  return value === 'list' ? 'list' : 'stack';
}

export async function getFamilyMembers(): Promise<FamilyMember[]> {
  const result = await apiClient.api.family.get();
  // Map generated model to local FamilyMember type
  return (
    (result?.data as any[])?.map((m) => ({
      id: m.id || '',
      name: m.name || '',
      browseViewMode: toBrowseViewMode(m.browseViewMode),
      preferredLanguage: m.preferredLanguage || '',
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
    preferredLanguage: result.data.preferredLanguage || '',
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
    preferredLanguage: result.data.preferredLanguage || '',
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
    preferredLanguage: result.data.preferredLanguage || '',
  };
}

export async function deleteFamilyMember(id: string): Promise<void> {
  await apiClient.api.family.byId(id).delete();
}
