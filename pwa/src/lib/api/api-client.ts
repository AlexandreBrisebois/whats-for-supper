import {
  type AuthenticationProvider,
  type RequestInformation,
} from '@microsoft/kiota-abstractions';
import { FetchRequestAdapter } from '@microsoft/kiota-http-fetchlibrary';

import { createApiClient, type ApiClient } from './generated/apiClient';
import { useFamilyStore } from '@/store/familyStore';

/**
 * Custom AuthenticationProvider to inject the X-Family-Member-Id header.
 */
class FamilyMemberAuthProvider implements AuthenticationProvider {
  public authenticateRequest(request: RequestInformation): Promise<void> {
    const familyMemberId = useFamilyStore.getState().selectedFamilyMemberId;
    if (familyMemberId) {
      request.headers.add('X-Family-Member-Id', familyMemberId);
    }
    return Promise.resolve();
  }
}

// Create our custom authentication provider
const authProvider = new FamilyMemberAuthProvider();

// Create the request adapter using the custom auth provider
export const requestAdapter = new FetchRequestAdapter(authProvider);

// Set the base URL to /backend. Kiota URI templates already include /api/, so /backend + /api/family = /backend/api/family
// Next.js rewrites /backend/:path* to API_INTERNAL_URL/:path*, so /backend/api/family → http://localhost:9001/api/family
requestAdapter.baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '/backend';

// Create and export the API client
export const apiClient: ApiClient = createApiClient(requestAdapter);
