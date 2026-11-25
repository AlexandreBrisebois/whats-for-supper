import { apiClient } from './api-client';

export type CaptureFailure = {
  id: string;
  workflowInstanceId: string;
  recipeId?: string | null;
  familyMemberId?: string | null;
  sourceWorkflowId: string;
  sourceType: string;
  previewText?: string | null;
  friendlyReason: string;
  failureCode?: string | null;
  failedStep?: string | null;
  status: string;
  retryCount: number;
  isReady: boolean;
  createdAt: string;
  lastFailedAt: string;
};

export type CaptureFailureDetails = {
  workflowInstanceId: string;
  recipeId?: string | null;
  sourceWorkflowId: string;
  sourceType: string;
  failedStep?: string | null;
  friendlyReason: string;
  errorMessage?: string | null;
  stackTrace?: string | null;
  retryCount: number;
  lastFailedAt: string;
};

export type CaptureActivityStage =
  'failed' | 'preparing' | 'indexing' | 'enriching' | 'enrichment_paused';

export type CaptureActivityItem = {
  id: string;
  workflowInstanceId?: string | null;
  recipeId?: string | null;
  stage: CaptureActivityStage;
  title: string;
  sourceWorkflowId?: string | null;
  sourceType?: string | null;
  stepName?: string | null;
  stepLabel?: string | null;
  previewText?: string | null;
  friendlyReason?: string | null;
  retryCount: number;
  isReady: boolean;
  isSuspectedDuplicate: boolean;
  updatedAt: string;
};

export async function getCaptureFailures(): Promise<CaptureFailure[]> {
  const result = await apiClient.api.captures.failures.get();
  const items = (result?.data as { items?: unknown[] } | null | undefined)?.items ?? [];
  return items.map((item: unknown) => {
    const f = item as Record<string, unknown>;
    return {
      id: (f.id as string) || '',
      workflowInstanceId: (f.workflowInstanceId as string) || (f.id as string) || '',
      recipeId: (f.recipeId as string | null) ?? null,
      familyMemberId: (f.familyMemberId as string | null) ?? null,
      sourceWorkflowId: (f.sourceWorkflowId as string) || '',
      sourceType: (f.sourceType as string) || '',
      previewText: (f.previewText as string | null) ?? null,
      friendlyReason: (f.friendlyReason as string) || '',
      failureCode: (f.failureCode as string | null) ?? null,
      failedStep: (f.failedStep as string | null) ?? null,
      status: (f.status as string) || '',
      retryCount: (f.retryCount as number) ?? 0,
      isReady: Boolean(f.isReady),
      createdAt:
        f.createdAt instanceof Date ? f.createdAt.toISOString() : (f.createdAt as string) || '',
      lastFailedAt:
        f.lastFailedAt instanceof Date
          ? f.lastFailedAt.toISOString()
          : (f.lastFailedAt as string) || '',
    };
  });
}

export async function getCaptureFailureDetails(id: string): Promise<CaptureFailureDetails> {
  const result = await apiClient.api.captures.failures.byId(id as any).details.get();
  const d = (result?.data as Record<string, unknown> | null | undefined) ?? {};
  return {
    workflowInstanceId: (d.workflowInstanceId as string) || id,
    recipeId: (d.recipeId as string | null) ?? null,
    sourceWorkflowId: (d.sourceWorkflowId as string) || '',
    sourceType: (d.sourceType as string) || '',
    failedStep: (d.failedStep as string | null) ?? null,
    friendlyReason: (d.friendlyReason as string) || '',
    errorMessage: (d.errorMessage as string | null) ?? null,
    stackTrace: (d.stackTrace as string | null) ?? null,
    retryCount: (d.retryCount as number) ?? 0,
    lastFailedAt:
      d.lastFailedAt instanceof Date
        ? d.lastFailedAt.toISOString()
        : (d.lastFailedAt as string) || '',
  };
}

export async function getCaptureActivity(): Promise<CaptureActivityItem[]> {
  const result = await apiClient.api.captures.activity.get();
  const items = (result?.data as { items?: unknown[] } | null | undefined)?.items ?? [];
  return items.map((item: unknown) => {
    const a = item as Record<string, unknown>;
    return {
      id: (a.id as string) || '',
      workflowInstanceId: (a.workflowInstanceId as string | null) ?? null,
      recipeId: (a.recipeId as string | null) ?? null,
      stage: ((a.stage as string) || 'preparing') as CaptureActivityStage,
      title: (a.title as string) || '',
      sourceWorkflowId: (a.sourceWorkflowId as string | null) ?? null,
      sourceType: (a.sourceType as string | null) ?? null,
      stepName: (a.stepName as string | null) ?? null,
      stepLabel: (a.stepLabel as string | null) ?? null,
      previewText: (a.previewText as string | null) ?? null,
      friendlyReason: (a.friendlyReason as string | null) ?? null,
      retryCount: (a.retryCount as number) ?? 0,
      isReady: Boolean(a.isReady),
      isSuspectedDuplicate: Boolean(a.isSuspectedDuplicate),
      updatedAt:
        a.updatedAt instanceof Date ? a.updatedAt.toISOString() : (a.updatedAt as string) || '',
    };
  });
}

export async function retryCaptureFailure(id: string): Promise<{ queued: boolean }> {
  const result = await apiClient.api.captures.failures.byId(id as any).retry.post();
  const data = result?.data as { queued?: boolean } | null | undefined;
  return { queued: data?.queued ?? false };
}

export async function clearCaptureFailure(
  id: string
): Promise<{ cleared: boolean; cleanupCommandId: string }> {
  const result = await apiClient.api.captures.failures.byId(id as any).delete();
  const data = result?.data as { cleared?: boolean; cleanupCommandId?: string } | null | undefined;
  return {
    cleared: data?.cleared ?? false,
    cleanupCommandId: data?.cleanupCommandId ?? '',
  };
}
