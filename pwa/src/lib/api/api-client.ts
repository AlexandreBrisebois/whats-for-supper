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

// Set the base URL from the environment variable, defaulting to "" (relative, same-origin via Traefik)
// Note: API routes already include the /api prefix (e.g. /api/schedule), so the base URL should not add it again.
// Using "/" here would result in "//api/..." which browsers interpret as a protocol-relative URL to hostname "api".
requestAdapter.baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

// Create and export the API client
export const apiClient: ApiClient = createApiClient(requestAdapter);
