import { useFamilyStore } from '@/store/familyStore';
import { getFamilyMemberIdCookie } from '@/lib/identity/cookie';

export interface InventoryCaptureResult {
  snapshotId: string;
  inferredIngredients: string[];
  confidence: number;
}

export interface InventoryCaptureBusy {
  busy: true;
  retryAfterSeconds: number;
  message: string;
}

export interface PhotoSearchResult {
  intent: 'recipe' | 'inventory';
  query: string;
  inferredIngredients: string[];
  confidence: number;
  pantrySnapshotId: string | null;
}

export type PhotoSearchResponse = PhotoSearchResult | InventoryCaptureBusy;

function readBusyResponse(body: any): InventoryCaptureBusy {
  return {
    busy: true,
    retryAfterSeconds: body?.data?.retryAfterSeconds ?? body?.retryAfterSeconds ?? 30,
    message:
      body?.data?.message ??
      body?.message ??
      "We're processing a lot right now. Try again in a moment.",
  };
}

export async function submitInventoryCapture(
  files: File[]
): Promise<InventoryCaptureResult | InventoryCaptureBusy> {
  const formData = new FormData();
  for (const file of files) {
    formData.append('photos', file);
  }

  const familyMemberId =
    useFamilyStore.getState().selectedFamilyMemberId || getFamilyMemberIdCookie();

  const res = await fetch('/api/inventory-captures', {
    method: 'POST',
    headers: {
      ...(familyMemberId ? { 'X-Family-Member-Id': familyMemberId } : {}),
    },
    body: formData,
  });

  if (res.status === 202) {
    const body = await res.json();
    return readBusyResponse(body);
  }

  const body = await res.json();
  return body?.data as InventoryCaptureResult;
}

export async function submitPhotoSearch(files: File[]): Promise<PhotoSearchResponse> {
  const formData = new FormData();
  for (const file of files) {
    formData.append('photos', file);
  }

  const familyMemberId =
    useFamilyStore.getState().selectedFamilyMemberId || getFamilyMemberIdCookie();

  const res = await fetch('/api/photo-search', {
    method: 'POST',
    headers: {
      ...(familyMemberId ? { 'X-Family-Member-Id': familyMemberId } : {}),
    },
    body: formData,
  });

  const body = await res.json();
  if (res.status === 202) {
    return readBusyResponse(body);
  }

  if (!res.ok) {
    throw new Error(`Photo search failed with status ${res.status}`);
  }

  return body?.data as PhotoSearchResult;
}
