import {
  type AuthenticationProvider,
  type RequestInformation,
} from '@microsoft/kiota-abstractions';
import { FetchRequestAdapter } from '@microsoft/kiota-http-fetchlibrary';

import { createApiClient, type ApiClient } from './generated/apiClient';
import { useFamilyStore } from '@/store/familyStore';
import { usePlannerStore } from '@/store/plannerStore';

/**
 * Custom AuthenticationProvider to inject necessary headers for identity
 * and SSE echo suppression.
 */
class HearthAuthProvider implements AuthenticationProvider {
  public authenticateRequest(request: RequestInformation): Promise<void> {
    // 1. Inject Family Member ID for identity gating
    const familyMemberId = useFamilyStore.getState().selectedFamilyMemberId;
    if (familyMemberId) {
      request.headers.add('X-Family-Member-Id', familyMemberId);
    }

    // 2. Inject SSE Connection ID for echo suppression (BS-11)
    // This tells the server not to broadcast the resulting event back to this client.
    const sseConnectionId = usePlannerStore.getState().sseConnectionId;
    if (sseConnectionId) {
      request.headers.add('X-SSE-Connection-ID', sseConnectionId);
    }

    // 3. Inject the pending move sequence number so the server can echo it back
    // in the week_updated SSE payload. applySnapshot uses this to identify its
    // own echoes instead of relying on a wall-clock window.
    const { localMoveSeq, confirmedMoveSeq } = usePlannerStore.getState();
    if (localMoveSeq > confirmedMoveSeq) {
      request.headers.add('X-Move-Seq', String(localMoveSeq));
    }

    return Promise.resolve();
  }
}

// Create our custom authentication provider
const authProvider = new HearthAuthProvider();

// Create the request adapter using the custom auth provider
export const requestAdapter = new FetchRequestAdapter(authProvider);

// Set the base URL from the environment variable, defaulting to "" (relative, same-origin via Traefik)
// Note: API routes already include the /api prefix (e.g. /api/schedule), so the base URL should not add it again.
requestAdapter.baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

// Create and export the API client
export const apiClient: ApiClient = createApiClient(requestAdapter);
