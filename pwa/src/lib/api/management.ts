import { apiClient } from './api-client';
import type { ManagementSearchStatusResponse } from './generated/models';

export interface SearchIndexStatus {
  totalReadyRecipes: number;
  searchableRecipes: number;
  enrichedRecipes: number;
  activeIndexingJobs: number;
  demoMode: boolean;
}

function mapSearchStatus(dto: ManagementSearchStatusResponse | undefined): SearchIndexStatus {
  if (
    dto?.totalReadyRecipes == null ||
    dto.searchableRecipes == null ||
    dto.enrichedRecipes == null ||
    dto.activeIndexingJobs == null
  ) {
    throw new Error('Search status unavailable');
  }
  return {
    totalReadyRecipes: dto.totalReadyRecipes,
    searchableRecipes: dto.searchableRecipes,
    enrichedRecipes: dto.enrichedRecipes,
    activeIndexingJobs: dto.activeIndexingJobs,
    demoMode: Boolean(dto.demoMode),
  };
}

export async function getSearchIndexStatus(): Promise<SearchIndexStatus> {
  const response = await apiClient.api.management.searchStatus.get();
  return mapSearchStatus(response);
}

export async function triggerSearchBackfill(force = false): Promise<{ message: string }> {
  const response = await apiClient.api.management.backfillSearch.post({ force });
  return {
    message: response?.message ?? 'Search index backfill triggered in the background.',
  };
}
