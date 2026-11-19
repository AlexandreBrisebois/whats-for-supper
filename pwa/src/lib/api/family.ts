import { apiClient } from './api-client';
import type { FamilyPostRequestBody } from './generated/api/family/index';
import type { PreferencesPutRequestBody } from './generated/api/family/item/preferences/index';
import { Locale, DEFAULT_LOCALE } from '@/lib/i18n';

export type FamilyMember = {
  id: string;
  name: string;
  browseViewMode: 'stack' | 'list';
  cookingViewMode: 'step-by-step' | 'all-steps' | null;
  preferredLanguage: string;
  contrastMode: 'standard' | 'high' | null;
};

function toBrowseViewMode(value: unknown): 'stack' | 'list' {
  return value === 'list' ? 'list' : 'stack';
}

function toCookingViewMode(value: unknown): 'step-by-step' | 'all-steps' | null {
  return value === 'step-by-step' || value === 'all-steps' ? value : null;
}

function toContrastMode(value: unknown): 'standard' | 'high' | null {
  return value === 'standard' || value === 'high' ? value : null;
}

export async function getFamilyMembers(): Promise<FamilyMember[]> {
  const result = await apiClient.api.family.get();
  // Map generated model to local FamilyMember type
  return (
    (result?.data as any[])?.map((m) => ({
      id: m.id || '',
      name: m.name || '',
      browseViewMode: toBrowseViewMode(m.browseViewMode),
      cookingViewMode: toCookingViewMode(m.cookingViewMode),
      preferredLanguage: m.preferredLanguage || '',
      contrastMode: toContrastMode(m.contrastMode),
    })) || []
  );
}

export async function getCurrentFamilyMember(): Promise<FamilyMember | null> {
  try {
    const result = await apiClient.api.family.me.get();
    if (!result?.data?.id) return null;
    return {
      id: result.data.id,
      name: result.data.name || '',
      browseViewMode: toBrowseViewMode(result.data.browseViewMode),
      cookingViewMode: toCookingViewMode(result.data.cookingViewMode),
      preferredLanguage: result.data.preferredLanguage || '',
      contrastMode: toContrastMode(result.data.contrastMode),
    };
  } catch (err) {
    return null;
  }
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
    cookingViewMode: toCookingViewMode(result.data.cookingViewMode),
    preferredLanguage: result.data.preferredLanguage || '',
    contrastMode: toContrastMode(result.data.contrastMode),
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
    cookingViewMode: toCookingViewMode(result.data.cookingViewMode),
    preferredLanguage: result.data.preferredLanguage || '',
    contrastMode: toContrastMode(result.data.contrastMode),
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
    cookingViewMode: toCookingViewMode(result.data.cookingViewMode),
    preferredLanguage: result.data.preferredLanguage || '',
    contrastMode: toContrastMode(result.data.contrastMode),
  };
}

export async function deleteFamilyMember(id: string): Promise<void> {
  await apiClient.api.family.byId(id).delete();
}
