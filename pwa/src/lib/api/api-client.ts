import {
  type AuthenticationProvider,
  type RequestInformation,
} from '@microsoft/kiota-abstractions';
import { FetchRequestAdapter, HttpClient } from '@microsoft/kiota-http-fetchlibrary';

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

// Set the base URL. In a real app, this would come from env vars.
// For development against the mock API, we use the prism default port 5001
requestAdapter.baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

// Create and export the API client
export const apiClient: ApiClient = createApiClient(requestAdapter);
