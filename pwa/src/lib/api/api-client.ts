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

// Set the base URL.
// Production: Use relative /api (handled by Traefik)
// Development: Use absolute http://localhost:9001/api (direct connection)
const isProd = process.env.NODE_ENV === 'production';
requestAdapter.baseUrl = isProd ? '/api' : 'http://localhost:9001/api';

// Create and export the API client
export const apiClient: ApiClient = createApiClient(requestAdapter);
