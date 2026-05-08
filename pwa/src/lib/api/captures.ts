import { apiClient } from './api-client';

export type CaptureFailure = {
  id: string;
  familyMemberId?: string | null;
  sourceType: string;
  previewText?: string | null;
  friendlyReason: string;
  failureCode?: string | null;
  status: string;
  retryCount: number;
  createdAt: string;
  lastFailedAt: string;
};

export async function getCaptureFailures(): Promise<CaptureFailure[]> {
  const result = await apiClient.api.captures.failures.get();
  const items = (result?.data as { items?: unknown[] } | null | undefined)?.items ?? [];
  return items.map((item: unknown) => {
    const f = item as Record<string, unknown>;
    return {
      id: (f.id as string) || '',
      familyMemberId: (f.familyMemberId as string | null) ?? null,
      sourceType: (f.sourceType as string) || '',
      previewText: (f.previewText as string | null) ?? null,
      friendlyReason: (f.friendlyReason as string) || '',
      failureCode: (f.failureCode as string | null) ?? null,
      status: (f.status as string) || '',
      retryCount: (f.retryCount as number) ?? 0,
      createdAt:
        f.createdAt instanceof Date ? f.createdAt.toISOString() : (f.createdAt as string) || '',
      lastFailedAt:
        f.lastFailedAt instanceof Date
          ? f.lastFailedAt.toISOString()
          : (f.lastFailedAt as string) || '',
    };
  });
}

export async function retryCaptureFailure(id: string): Promise<{ queued: boolean }> {
  const result = await apiClient.api.captures.failures.byId(id as any).retry.post();
  const data = result?.data as { queued?: boolean } | null | undefined;
  return { queued: data?.queued ?? false };
}
