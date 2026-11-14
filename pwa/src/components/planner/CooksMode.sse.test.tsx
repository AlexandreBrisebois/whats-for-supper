import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { calendarTime } from '@/lib/deployment-calendar';
const api = vi.hoisted(() => ({ recipe: vi.fn(), projection: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/home',
}));
vi.mock('@/components/ui/SolarLoader', () => ({ SolarLoader: () => <div>Loading</div> }));
vi.mock('@/hooks/useMediaQuery', () => ({ useMediaQuery: () => true }));
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => children,
}));
vi.mock('next/image', () => ({ default: () => null }));
vi.mock('@/lib/api/recipes', () => ({
  getRecipe: api.recipe,
  getIngredientProjection: api.projection,
}));
vi.mock('@/lib/api/discovery', () => ({
  getVotingSession: vi.fn().mockRejectedValue(new Error('offline')),
}));
vi.mock('@/components/recipes/RecipeDetailSheet', () => ({ RecipeDetailSheet: () => null }));
import { CooksMode } from './CooksMode';
import { useScheduleStream } from '@/hooks/useScheduleStream';
import { useTodayStore } from '@/store/todayStore';
import { useWeekStore } from '@/store/weekStore';
import { usePlannerStore } from '@/store/plannerStore';
import { builders } from '@/testing/builders';
import { MOCK_IDS } from '@/testing/mock-ids';

const recipe = builders.scheduleRecipe({ id: MOCK_IDS.RECIPE_CARBONARA, name: 'Pasta' });
const context = {
  context: 'assigned' as const,
  supperDate: '2026-05-04',
  occurrenceId: MOCK_IDS.SUPPER_OCCURRENCE,
};
const projected = (count: number) => ({
  recipeId: recipe.id,
  ...context,
  version: String(count),
  servingVersion: String(count),
  baseServings: 2,
  targetServings: count,
  factor: count / 2,
  status: 'scaled',
  lines: [
    {
      originalText: '200 g pasta',
      name: 'pasta',
      quantity: count * 100,
      unitText: 'g',
      status: 'scaled',
    },
  ],
});
class Source {
  static current: Source;
  listeners = new Map<string, (e: MessageEvent) => void>();
  constructor() {
    Source.current = this;
  }
  addEventListener(name: string, fn: (e: MessageEvent) => void) {
    this.listeners.set(name, fn);
  }
  close() {}
  emit(schedule = builders.scheduleDays()) {
    Object.assign(schedule.days[0], { recipe, occurrenceId: MOCK_IDS.SUPPER_OCCURRENCE });
    this.listeners.get('week_updated')?.(
      new MessageEvent('week_updated', { data: JSON.stringify({ schedule }) })
    );
  }
}
function HomeCooking({
  ingredientContext = context,
}: {
  ingredientContext?: import('@/lib/api/recipes').IngredientContext;
}) {
  useScheduleStream();
  return (
    <CooksMode
      recipe={{ id: String(recipe.id), name: 'Pasta', image: '' }}
      ingredientContext={ingredientContext}
      onClose={() => {}}
    />
  );
}
beforeEach(() => {
  vi.stubGlobal('EventSource', Source);
  api.recipe.mockReset().mockResolvedValue({
    id: recipe.id,
    name: 'Pasta',
    ingredients: ['200 g pasta'],
    recipeInstructions: ['Add 200 g pasta.'],
  });
  api.projection.mockReset();
  useTodayStore.setState({
    calendar: builders.deploymentCalendar(),
    calendarAnchor: { receivedAtElapsed: calendarTime.elapsed(), expiresAfterMs: 43200000 },
    currentRecipe: recipe,
    occurrenceId: MOCK_IDS.SUPPER_OCCURRENCE,
    status: 0,
    optimisticWriteAt: null,
  });
  useWeekStore.setState({
    weekStartDate: '2026-05-11',
    weekOffset: 1,
    schedule: [],
    calendar: builders.deploymentCalendar(),
  });
  usePlannerStore.setState({ currentWeekOffset: 1, cookProgress: {} });
});
afterEach(() => vi.unstubAllGlobals());
it('notices Today quantities through the actual event owner while Planner retains a different week', async () => {
  api.projection.mockResolvedValue(projected(4));
  render(<HomeCooking />);
  expect(await screen.findByText('400 g pasta')).toBeVisible();
  api.projection.mockResolvedValue(projected(6));
  act(() => Source.current.emit());
  expect(await screen.findByTestId('cooking-quantities-available')).toBeVisible();
  expect(screen.getByTestId('cooking-portion-context')).toHaveTextContent('4 portions');
  expect(useWeekStore.getState().weekStartDate).toBe('2026-05-11');
  expect(usePlannerStore.getState().currentWeekOffset).toBe(1);
});
it('rechecks an invalidation received while the initial dated projection read is pending', async () => {
  let resolve!: (value: unknown) => void;
  api.projection
    .mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        })
    )
    .mockResolvedValue(projected(6));
  render(<HomeCooking />);
  await waitFor(() => expect(api.projection).toHaveBeenCalledTimes(1));
  act(() => Source.current.emit());
  await act(async () => resolve(projected(4)));
  expect(await screen.findByTestId('cooking-quantities-available')).toBeVisible();
  expect(screen.getByTestId('cooking-portion-context')).toHaveTextContent('4 portions');
});

it('notices a future proposed supper update without replacing the displayed Planner week or relying on Today', async () => {
  const future = { context: 'proposed' as const, supperDate: '2026-05-20' };
  api.projection.mockResolvedValue({ ...projected(4), ...future, occurrenceId: null });
  render(<HomeCooking ingredientContext={future} />);
  expect(await screen.findByText('400 g pasta')).toBeVisible();
  api.projection.mockResolvedValue({ ...projected(6), ...future, occurrenceId: null });
  const incoming = builders.scheduleDays(2);
  incoming.weekStartDate = '2026-05-18' as any;
  act(() => Source.current.emit(incoming));
  expect(await screen.findByTestId('cooking-quantities-available')).toBeVisible();
  expect(screen.getByTestId('cooking-portion-context')).toHaveTextContent('4 portions');
  expect(useWeekStore.getState().weekStartDate).toBe('2026-05-11');
  expect(useTodayStore.getState().calendar?.today).toBe('2026-05-04');
});

it('probes a future proposed date after a global default hint from another empty week, without false unrelated notices', async () => {
  const future = { context: 'proposed' as const, supperDate: '2026-05-20' };
  api.projection.mockResolvedValue({ ...projected(4), ...future, occurrenceId: null });
  render(<HomeCooking ingredientContext={future} />);
  expect(await screen.findByText('400 g pasta')).toBeVisible();
  const beforeReads = api.projection.mock.calls.length;
  act(() => Source.current.emit(builders.scheduleDays()));
  await waitFor(() => expect(api.projection.mock.calls.length).toBeGreaterThan(beforeReads));
  expect(screen.queryByTestId('cooking-quantities-available')).not.toBeInTheDocument();
  api.projection.mockResolvedValue({ ...projected(5), ...future, occurrenceId: null });
  act(() => Source.current.emit(builders.scheduleDays()));
  expect(await screen.findByTestId('cooking-quantities-available')).toBeVisible();
  expect(screen.getByTestId('cooking-portion-context')).toHaveTextContent('4 portions');
  expect(useWeekStore.getState().weekStartDate).toBe('2026-05-11');
});
