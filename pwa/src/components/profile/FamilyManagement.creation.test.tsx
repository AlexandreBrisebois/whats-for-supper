import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { MOCK_IDS } from '@/testing/mock-ids';

const { fetchMock, setCookie } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  setCookie: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  setFamilyMemberCookie: setCookie,
  clearFamilyMemberCookie: vi.fn(),
  getInviteLink: vi.fn(),
}));
vi.mock('@/lib/api/api-client', async () => {
  const { FetchRequestAdapter, HttpClient } = await import('@microsoft/kiota-http-fetchlibrary');
  const { createApiClient } = await import('@/lib/api/generated/apiClient');
  const adapter = new FetchRequestAdapter(
    { authenticateRequest: async () => {} },
    undefined,
    undefined,
    new HttpClient(fetchMock)
  );
  adapter.baseUrl = 'https://family.test';
  return { apiClient: createApiClient(adapter) };
});

import { FamilyManagement } from './FamilyManagement';
import { useFamilyStore } from '@/store/familyStore';
import { useOnboardingStore } from '@/store/onboardingStore';

beforeEach(() => {
  vi.clearAllMocks();
  useFamilyStore.setState({
    familyMembers: [
      { id: MOCK_IDS.MEMBER_ALEX, name: 'Alex', browseViewMode: 'stack', preferredLanguage: 'en' },
    ],
    selectedFamilyMemberId: MOCK_IDS.MEMBER_ALEX,
    isLoading: false,
    error: null,
    hasLoaded: true,
  });
  useOnboardingStore.setState({ hasCompletedOnboarding: false });
});

it('displays a 201-created member through the real store/client without changing Settings identity', async () => {
  fetchMock.mockResolvedValue(
    new Response(
      JSON.stringify({
        data: {
          id: MOCK_IDS.MEMBER_TEST,
          name: 'cAsEy',
          browseViewMode: 'stack',
          preferredLanguage: null,
          createdAt: '2026-10-15T12:00:00Z',
          updatedAt: '2026-10-15T12:00:00Z',
        },
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    )
  );
  render(<FamilyManagement />);
  fireEvent.click(screen.getByTestId('add-member-trigger'));
  fireEvent.change(screen.getByTestId('family-name-input'), { target: { value: ' cAsEy ' } });
  fireEvent.click(screen.getByTestId('add-member-submit'));

  await waitFor(() =>
    expect(screen.getByTestId(`family-member-${MOCK_IDS.MEMBER_TEST}`)).toHaveTextContent('cAsEy')
  );
  expect(screen.getByTestId(`family-member-${MOCK_IDS.MEMBER_ALEX}`)).toHaveTextContent(
    'Selected family member'
  );
  expect(screen.getByTestId(`family-member-${MOCK_IDS.MEMBER_TEST}`)).not.toHaveTextContent(
    'Selected family member'
  );
  await waitFor(() => expect(screen.getByTestId('family-name-input')).toHaveValue(''));
  expect(useFamilyStore.getState().selectedFamilyMemberId).toBe(MOCK_IDS.MEMBER_ALEX);
  expect(useOnboardingStore.getState().hasCompletedOnboarding).toBe(false);
  expect(setCookie).not.toHaveBeenCalled();
  const [url, request] = fetchMock.mock.calls[0];
  expect(String(url)).toBe('https://family.test/api/family');
  expect(request.method).toBe('POST');
  expect(JSON.parse(new TextDecoder().decode(request.body))).toEqual({ name: 'cAsEy' });
});

it('rejects duplicate member creation with 409 without changing members or identity', async () => {
  fetchMock.mockResolvedValue(
    new Response(
      JSON.stringify({
        status: 409,
        message: 'A family member with this name already exists.',
      }),
      { status: 409, headers: { 'Content-Type': 'application/json' } }
    )
  );
  render(<FamilyManagement />);
  fireEvent.click(screen.getByTestId('add-member-trigger'));
  fireEvent.change(screen.getByTestId('family-name-input'), { target: { value: ' alex ' } });
  fireEvent.click(screen.getByTestId('add-member-submit'));

  await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
  expect(useFamilyStore.getState().familyMembers).toHaveLength(1);
  expect(useFamilyStore.getState().selectedFamilyMemberId).toBe(MOCK_IDS.MEMBER_ALEX);
  expect(screen.getByTestId(`family-member-${MOCK_IDS.MEMBER_ALEX}`)).toHaveTextContent(
    'Selected family member'
  );
  expect(setCookie).not.toHaveBeenCalled();
});

it('loads the full family list on mount when identity recovery has restored only the current member', async () => {
  useFamilyStore.setState({
    familyMembers: [
      { id: MOCK_IDS.MEMBER_ALEX, name: 'Alex', browseViewMode: 'stack', preferredLanguage: 'en' },
    ],
    selectedFamilyMemberId: MOCK_IDS.MEMBER_ALEX,
    isLoading: false,
    error: null,
    hasLoaded: false,
  });

  fetchMock.mockResolvedValue(
    new Response(
      JSON.stringify({
        data: [
          {
            id: MOCK_IDS.MEMBER_ALEX,
            name: 'Alex',
            browseViewMode: 'stack',
            preferredLanguage: 'en',
          },
          {
            id: MOCK_IDS.MEMBER_JORDAN,
            name: 'Jordan',
            browseViewMode: 'stack',
            preferredLanguage: 'en',
          },
        ],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  );

  render(<FamilyManagement />);

  await waitFor(() =>
    expect(screen.getByTestId(`family-member-${MOCK_IDS.MEMBER_JORDAN}`)).toHaveTextContent(
      'Jordan'
    )
  );
  expect(screen.getByTestId(`family-member-${MOCK_IDS.MEMBER_ALEX}`)).toHaveTextContent(
    'Selected family member'
  );
  const [url, request] = fetchMock.mock.calls[0];
  expect(String(url)).toBe('https://family.test/api/family');
  expect(request.method).toBe('GET');
});
