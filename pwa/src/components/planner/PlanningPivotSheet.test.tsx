import {
  observeOpening,
  presentationChanged,
  registerPlannerPresentation,
} from '@/lib/telemetry/opening';
import type { BrowserObservation } from '@/lib/telemetry/navigation';
vi.mock('next/navigation', () => ({ usePathname: () => '/planner' }));
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

const localeMock = vi.hoisted(() => {
  let language: 'en' | 'fr' = 'en';
  const dictionary: Record<string, { en: string; fr: string }> = {
    'planner.choosePathTitle': {
      en: 'Change this recipe',
      fr: 'Changer cette recette',
    },
    'planner.choosePathSubtitle': {
      en: 'Choose how to replace or remove this recipe',
      fr: 'Choisissez comment remplacer ou retirer cette recette',
    },
    'planner.quickFindAction': { en: 'Quick replace', fr: 'Remplacement rapide' },
    'planner.searchLibraryAction': { en: 'Search library', fr: 'Chercher dans la bibliothèque' },
    'planner.removeRecipeAction': { en: 'Remove recipe', fr: 'Retirer la recette' },
    'home.saveForNextWeek': {
      en: 'Save for Next Week',
      fr: 'Garder pour la semaine prochaine',
    },
    'home.moveFirstSlot': {
      en: 'Moves to the first open slot',
      fr: 'Déplace au premier créneau libre',
    },
  };

  return {
    setLanguage: (next: 'en' | 'fr') => {
      language = next;
    },
    translate: (key: string, fallback: string) => dictionary[key]?.[language] ?? fallback,
  };
});

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/locales', () => ({
  t: (key: string, fallback: string) => localeMock.translate(key, fallback),
  getLocale: () => 'en',
}));

import { PlanningPivotSheet } from './PlanningPivotSheet';

function renderSheet({
  hasRecipe = true,
  onPlanLater = vi.fn(),
}: {
  hasRecipe?: boolean;
  onPlanLater?: () => void;
} = {}) {
  const onClose = vi.fn();
  const props = {
    isOpen: true,
    onClose,
    dayIndex: 2,
    onQuickFind: vi.fn(),
    onSearchLibrary: vi.fn(),
    onRemoveRecipe: vi.fn(),
    onPlanLater,
    hasRecipe,
  };

  render(<PlanningPivotSheet {...props} />);
  return { onClose, props };
}

describe('PlanningPivotSheet', () => {
  it.each([
    { hasRecipe: false, isNonCooking: false },
    { hasRecipe: true, isNonCooking: false },
    { hasRecipe: true, isNonCooking: true },
  ])('orders the final actions for slot state %j', ({ hasRecipe, isNonCooking }) => {
    localeMock.setLanguage('en');
    render(
      <PlanningPivotSheet
        isOpen
        onClose={vi.fn()}
        dayIndex={0}
        hasRecipe={hasRecipe}
        isNonCooking={isNonCooking}
        onNoCooking={vi.fn()}
        onPlanLater={vi.fn()}
        onQuickFind={vi.fn()}
        onSearchLibrary={vi.fn()}
      />
    );

    const otherPlans = screen.getByTestId('pivot-no-cooking');
    if (isNonCooking) {
      const remove = screen.getByTestId('pivot-remove-recipe');
      expect(remove.parentElement?.lastElementChild).toBe(remove);
      expect(remove.previousElementSibling).toBe(otherPlans);
    } else {
      expect(otherPlans.parentElement?.lastElementChild).toBe(otherPlans);
    }
  });

  it.each([false, true])('uses supper context for an empty or marked day (%s)', (isNonCooking) => {
    localeMock.setLanguage('en');
    render(
      <PlanningPivotSheet
        isOpen
        onClose={vi.fn()}
        dayIndex={0}
        date="2026-10-12"
        hasRecipe={isNonCooking}
        isNonCooking={isNonCooking}
        onNoCooking={vi.fn()}
        onQuickFind={vi.fn()}
        onSearchLibrary={vi.fn()}
      />
    );
    expect(
      screen.getByText(isNonCooking ? 'Change supper plans' : 'Plan supper')
    ).toBeInTheDocument();
    expect(screen.getByText('Monday, October 12')).toBeInTheDocument();
    expect(screen.queryByText('Change this recipe')).not.toBeInTheDocument();
    if (isNonCooking) {
      expect(
        screen.getByRole('button', { name: 'Remove supper plan Leave this day unplanned' })
      ).toBeInTheDocument();
      expect(screen.queryByText('Remove recipe')).not.toBeInTheDocument();
    }
    expect(screen.getByTestId('pivot-no-cooking')).toHaveTextContent(
      isNonCooking ? 'Edit supper plan' : 'Other plans'
    );
  });
  it('renders explicit recipe-change copy in English', () => {
    localeMock.setLanguage('en');
    renderSheet();

    expect(screen.getByText('Change this recipe')).toBeInTheDocument();
    expect(screen.getByText('Choose how to replace or remove this recipe')).toBeInTheDocument();
    expect(screen.getByText('Quick replace')).toBeInTheDocument();
    expect(screen.getByText('Search library')).toBeInTheDocument();
    expect(screen.getByText('Remove recipe')).toBeInTheDocument();
  });

  it('renders explicit recipe-change copy in French', () => {
    localeMock.setLanguage('fr');
    renderSheet();

    expect(screen.getByText('Changer cette recette')).toBeInTheDocument();
    expect(
      screen.getByText('Choisissez comment remplacer ou retirer cette recette')
    ).toBeInTheDocument();
    expect(screen.getByText('Remplacement rapide')).toBeInTheDocument();
    expect(screen.getByText('Chercher dans la bibliothèque')).toBeInTheDocument();
    expect(screen.getByText('Retirer la recette')).toBeInTheDocument();
    expect(screen.queryByText(/repas/i)).not.toBeInTheDocument();
  });

  it('renders an explicit close button', () => {
    renderSheet();

    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
  });

  it('calls onClose when the close button is pressed', () => {
    const { onClose } = renderSheet();

    fireEvent.click(screen.getByRole('button', { name: /close/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the backdrop is pressed', () => {
    const { onClose } = renderSheet();

    fireEvent.click(screen.getByTestId('pivot-sheet-backdrop'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders slot actions without whole-week voting controls', () => {
    renderSheet();

    expect(screen.getByTestId('pivot-quick-find')).toBeInTheDocument();
    expect(screen.getByTestId('pivot-search-library')).toBeInTheDocument();
    expect(screen.getByTestId('pivot-remove-recipe')).toBeInTheDocument();
    expect(screen.queryByTestId('pivot-ask-family')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pivot-nudge-family')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pivot-nudge-dialog')).not.toBeInTheDocument();
  });

  it('hides remove recipe when the selected slot has no recipe', () => {
    renderSheet({ hasRecipe: false });

    expect(screen.queryByTestId('pivot-remove-recipe')).not.toBeInTheDocument();
  });

  it('renders plan-later option when hasRecipe is true', () => {
    localeMock.setLanguage('en');
    const onPlanLater = vi.fn();
    renderSheet({ hasRecipe: true, onPlanLater });

    const planLaterBtn = screen.getByTestId('pivot-plan-later');
    expect(planLaterBtn).toBeInTheDocument();
    expect(screen.getByText('Save for Next Week')).toBeInTheDocument();
    expect(screen.getByText('Moves to the first open slot')).toBeInTheDocument();

    fireEvent.click(planLaterBtn);
    expect(onPlanLater).toHaveBeenCalledTimes(1);
  });

  it('hides plan-later option when hasRecipe is false', () => {
    renderSheet({ hasRecipe: false });

    expect(screen.queryByTestId('pivot-plan-later')).not.toBeInTheDocument();
  });
});

// Run the real declaration/coordinator path rather than mocking the observation hook.
function startPresentationStream() {
  const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
  const releasePlanner = registerPlannerPresentation(document, 'planner', false);
  const submit = vi.fn<(event: BrowserObservation) => Promise<void>>().mockResolvedValue();
  const observe = () => observeOpening(document, true, '/planner', submit);
  observe();
  submit.mockClear();
  document.addEventListener(presentationChanged, observe);
  return {
    observe,
    visibility,
    events: () => submit.mock.calls.map(([event]) => [event.eventName, event.screen]),
    raw: () => submit.mock.calls.map(([event]) => event),
    stop: () => {
      document.removeEventListener(presentationChanged, observe);
      releasePlanner();
      visibility.mockRestore();
    },
  };
}

it('observes pivot open, dismissal and reopen without collecting its date or option', async () => {
  const stream = startPresentationStream();
  const props = {
    isOpen: false,
    onClose: vi.fn(),
    dayIndex: 1,
    date: '2026-10-12',
    onQuickFind: vi.fn(),
    onSearchLibrary: vi.fn(),
    hasRecipe: true,
  };
  const view = render(<PlanningPivotSheet {...props} />);
  try {
    expect(stream.events()).toEqual([]);
    view.rerender(<PlanningPivotSheet {...props} isOpen />);
    fireEvent.click(screen.getByTestId('pivot-quick-find'));
    view.rerender(<PlanningPivotSheet {...props} isOpen dayIndex={3} date="2026-10-14" />);
    expect(stream.events()).toEqual([['pwa.surface.opened', 'planning.pivot']]);
    fireEvent.click(screen.getByTestId('pivot-sheet-backdrop'));
    expect(props.onClose).toHaveBeenCalledOnce();
    view.rerender(<PlanningPivotSheet {...props} />);
    await Promise.resolve();
    view.rerender(<PlanningPivotSheet {...props} isOpen />);
    expect(stream.events()).toEqual([
      ['pwa.surface.opened', 'planning.pivot'],
      ['pwa.surface.closed', 'planning.pivot'],
      ['pwa.surface.opened', 'planning.pivot'],
    ]);
    expect(JSON.stringify(stream.raw())).not.toMatch(/2026-10|Quick|dayIndex/);
  } finally {
    view.unmount();
    stream.stop();
  }
});

it('does not introduce a hidden pivot that closes before the document can report', async () => {
  const stream = startPresentationStream();
  stream.visibility.mockReturnValue('hidden');
  const props = {
    isOpen: true,
    onClose: vi.fn(),
    dayIndex: 0,
    hasRecipe: false,
    onQuickFind: vi.fn(),
    onSearchLibrary: vi.fn(),
  };
  const view = render(<PlanningPivotSheet {...props} />);
  try {
    view.rerender(<PlanningPivotSheet {...props} isOpen={false} />);
    await Promise.resolve();
    stream.visibility.mockReturnValue('visible');
    stream.observe();
    expect(stream.events()).toEqual([]);
  } finally {
    view.unmount();
    stream.stop();
  }
});
