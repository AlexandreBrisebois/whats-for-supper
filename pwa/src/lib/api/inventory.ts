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

export async function submitInventoryCapture(
  files: File[]
): Promise<InventoryCaptureResult | InventoryCaptureBusy> {
  const formData = new FormData();
  for (const file of files) {
    formData.append('photos', file);
  }

  const res = await fetch('/api/inventory-captures', {
    method: 'POST',
    body: formData,
  });

  if (res.status === 202) {
    const body = await res.json();
    return {
      busy: true,
      retryAfterSeconds: body?.data?.retryAfterSeconds ?? 30,
      message: body?.data?.message ?? "We're processing a lot right now. Try again in a moment.",
    };
  }

  const body = await res.json();
  return body?.data as InventoryCaptureResult;
}
