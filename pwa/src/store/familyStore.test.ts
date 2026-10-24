import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMocks = vi.hoisted(() => ({
  updateMemberPreferences: vi.fn(),
}));

vi.mock('@/lib/api/family', () => ({
  getFamilyMembers: vi.fn(),
  getCurrentFamilyMember: vi.fn(),
  createFamilyMember: vi.fn(),
  updateFamilyMember: vi.fn(),
  updateFamilyMemberPreferences: (...args: unknown[]) => apiMocks.updateMemberPreferences(...args),
  deleteFamilyMember: vi.fn(),
}));

import { useFamilyStore } from './familyStore';

const alex = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Alex',
  browseViewMode: 'stack' as const,
  preferredLanguage: 'en',
  cookingViewMode: 'step-by-step' as const,
};
type TestMember = Omit<typeof alex, 'cookingViewMode'> & {
  cookingViewMode: 'step-by-step' | 'all-steps';
};

describe('familyStore cooking preferences', () => {
  beforeEach(() => {
    apiMocks.updateMemberPreferences.mockReset();
    useFamilyStore.setState({
      familyMembers: [alex],
      selectedFamilyMemberId: alex.id,
      error: null,
    });
  });

  it('does not save against a missing or guessed member', async () => {
    const result = await useFamilyStore
      .getState()
      .updateMemberPreferences('22222222-2222-4222-8222-222222222222', {
        cookingViewMode: 'all-steps',
      });

    expect(result).toBeNull();
    expect(apiMocks.updateMemberPreferences).not.toHaveBeenCalled();
  });

  it('ignores a late response from an older preference generation', async () => {
    let resolveFirst!: (value: TestMember) => void;
    let resolveSecond!: (value: TestMember) => void;
    apiMocks.updateMemberPreferences
      .mockReturnValueOnce(new Promise((resolve) => (resolveFirst = resolve)))
      .mockReturnValueOnce(new Promise((resolve) => (resolveSecond = resolve)));

    const first = useFamilyStore
      .getState()
      .updateMemberPreferences(alex.id, { cookingViewMode: 'all-steps' });
    const second = useFamilyStore
      .getState()
      .updateMemberPreferences(alex.id, { cookingViewMode: 'step-by-step' });
    resolveSecond({ ...alex, cookingViewMode: 'step-by-step' });
    await second;
    resolveFirst({ ...alex, cookingViewMode: 'all-steps' });
    await first;

    expect(useFamilyStore.getState().familyMembers[0].cookingViewMode).toBe('step-by-step');
  });

  it('rolls back only the failed field and does not show the error under another member', async () => {
    let rejectSave!: (reason: Error) => void;
    apiMocks.updateMemberPreferences.mockReturnValueOnce(
      new Promise((_resolve, reject) => (rejectSave = reject))
    );

    const save = useFamilyStore
      .getState()
      .updateMemberPreferences(alex.id, { cookingViewMode: 'all-steps' });
    useFamilyStore.setState((state) => ({
      familyMembers: state.familyMembers.map((member) => ({ ...member, name: 'Renamed' })),
      selectedFamilyMemberId: '22222222-2222-4222-8222-222222222222',
    }));
    rejectSave(new Error('offline'));
    await save;

    expect(useFamilyStore.getState().familyMembers[0]).toMatchObject({
      name: 'Renamed',
      cookingViewMode: 'step-by-step',
    });
    expect(useFamilyStore.getState().error).toBeNull();
  });
});
