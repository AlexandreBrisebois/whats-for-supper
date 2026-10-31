import { type Page, type Route } from '@playwright/test';
import type { CalendarContext } from '../src/lib/deployment-calendar';
import {
  type RecipeDto,
  type RecoveryResult,
  type RecipeImportIssueDto,
  type RecipeImportIssueRequest,
  RecipeImportIssueReasonObject,
  RecipeImportIssueStatusObject,
  type RecipeShareBundleDto,
  RecipeDto_sourceType,
  RecipeDto_sourceTypeObject,
  type ScheduleRecipeDto,
  type ScheduleDays,
  type SmartDefaultsDto,
  type VotingSessionSnapshot,
  WorkflowInstanceDetailDto_statusObject,
} from '../src/lib/api/generated/models/index';
import {
  type FamilyGetResponse,
  type FamilyGetResponse_data,
} from '../src/lib/api/generated/api/family/index';
import type { FeatureFlagDto } from '../src/lib/api/generated/models/index';
import { type UntypedNode } from '@microsoft/kiota-abstractions';
import { MOCK_IDS } from '../src/testing/mock-ids';
import { REALISTIC_RECIPES, REALISTIC_SCHEDULE_RECIPES } from '../src/testing/realistic-recipes';
import { builders, currentMonday, toDateStr } from '../src/testing/builders';

export { MOCK_IDS, builders, currentMonday, toDateStr };

const FIXED_E2E_TIMESTAMP = '2026-05-04T12:00:00.000Z';

const FILTER_MAIN_IDS = {
  BEEF: 'beef',
  POULTRY: 'poultry',
  PORK: 'pork',
  FISH: 'fish',
  PASTA: 'pasta',
  VEGETARIAN: 'vegetarian',
} as const;

const ACTIVE_SEARCH_BOOLEAN_FILTERS = [
  'newRecipes',
  'neverCooked',
  'familyFavorite',
  'quickOnly',
  'vegetarianOnly',
  'notCookedInLongTime',
  'reportedOnly',
  'readyToReviewOnly',
  'discoverableOnly',
  'gotoOnly',
] as const;

function mockSearchMode(requestBody: unknown): 'discovery' | 'explicit' | 'similar' {
  const request = (requestBody ?? {}) as Record<string, unknown>;
  if (request.similarToRecipeId) return 'similar';
  if (typeof request.query === 'string' && request.query.trim()) return 'explicit';

  const preferences = (request.preferences ?? {}) as Record<string, unknown>;
  if (
    Array.isArray(preferences.concepts) &&
    preferences.concepts.some((concept) => typeof concept === 'string' && concept.trim())
  ) {
    return 'explicit';
  }

  const filters = (request.filters ?? {}) as Record<string, unknown>;
  const hasSelection = ['cuisines', 'mealTypes'].some(
    (key) =>
      Array.isArray(filters[key]) &&
      filters[key].some((value) => typeof value === 'string' && value.trim())
  );
  const hasTrueFlag = ACTIVE_SEARCH_BOOLEAN_FILTERS.some((key) => filters[key] === true);
  return hasSelection || hasTrueFlag ? 'explicit' : 'discovery';
}

// ---------------------------------------------------------------------------
// SSE helpers — internal
// ---------------------------------------------------------------------------

/**
 * Builds a single SSE message frame.
 * Format: "event: <type>\ndata: <json>\n\n"
 */
function buildSseFrame(eventType: string, payload: object): string {
  return `event: ${eventType}\ndata: ${JSON.stringify(payload)}\n\n`;
}

/**
 * Builds a full SSE response body from an array of pre-formatted frames.
 */
function buildSseBody(frames: string[]): string {
  return frames.join('');
}

function buildDefaultConnectedSchedule(): ScheduleDays {
  return builders.scheduleDays() as unknown as ScheduleDays;
}

/**
 * Builds the default `connected` event payload with a 7-day empty schedule
 * anchored to the fixed test Monday (2026-05-04).
 */
function buildConnectedEvent(schedule: ScheduleDays = buildDefaultConnectedSchedule()): string {
  return buildSseFrame('connected', { type: 'connected', schedule });
}

export async function mockSseWithConnectedSchedule(
  page: Page,
  schedule: ScheduleDays
): Promise<void> {
  await page.route(/\/([^/]+\/)?api\/stream/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      headers: {
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
      body: buildSseBody([buildConnectedEvent(schedule)]),
    });
  });
}

/**
 * Stateful feature-flag API mock. PATCH updates the selected member's override,
 * and subsequent GET requests return the confirmed effective state.
 */
export async function mockFeatureFlags(
  page: Page,
  initialFlags: FeatureFlagDto[] = []
): Promise<void> {
  const definitions = new Map(
    initialFlags.filter((flag) => flag.key).map((flag) => [flag.key as string, { ...flag }])
  );
  const overrides = new Map<string, Map<string, boolean>>();

  const memberIdFor = (request: { headers(): Record<string, string> }) =>
    request.headers()['x-family-member-id'] || MOCK_IDS.MEMBER_ALEX;

  const snapshotFor = (memberId: string) =>
    [...definitions.values()].map((definition) => {
      if (definition.mode === 'on') return { ...definition, enabled: true };
      if (definition.mode === 'off') return { ...definition, enabled: false };
      const memberEnabled =
        overrides.get(memberId)?.get(definition.key as string) ?? definition.memberEnabled ?? false;
      return { ...definition, enabled: memberEnabled, memberEnabled };
    });

  await page.route('**/api/feature-flags/*', async (route) => {
    if (route.request().method() !== 'PATCH') return route.fallback();
    const key = decodeURIComponent(new URL(route.request().url()).pathname.split('/').pop() ?? '');
    const definition = definitions.get(key);
    if (!definition) {
      return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
    }
    if (definition.mode !== 'opt-in') {
      return route.fulfill({ status: 409, contentType: 'application/json', body: '{}' });
    }

    const body = route.request().postDataJSON() as { enabled?: unknown };
    if (typeof body.enabled !== 'boolean') {
      return route.fulfill({ status: 400, contentType: 'application/json', body: '{}' });
    }

    const memberId = memberIdFor(route.request());
    const memberOverrides = overrides.get(memberId) ?? new Map<string, boolean>();
    memberOverrides.set(key, body.enabled);
    overrides.set(memberId, memberOverrides);
    const updated = snapshotFor(memberId).find((flag) => flag.key === key);
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: updated }),
    });
  });

  await page.route('**/api/recipes/capture-pdf', async (route) => {
    const request = route.request();
    if (request.method() !== 'POST') return route.fallback();
    const reject = (status: number, message: string) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify({ status, message }),
      });
    const memberId = request.headers()['x-family-member-id'];
    if (!memberId || ![MOCK_IDS.MEMBER_ALEX, MOCK_IDS.MEMBER_JORDAN].includes(memberId))
      return reject(400, 'An established family member is required.');
    if (!request.headers()['content-type']?.startsWith('multipart/form-data'))
      return reject(415, 'Choose a PDF file.');
    try {
      const payload = request.postDataBuffer();
      const form = await new Response(payload ? new Uint8Array(payload) : null, {
        headers: { 'content-type': request.headers()['content-type'] },
      }).formData();
      const files = [...form.values()].filter((value) => typeof value !== 'string');
      const file = form.get('file');
      if (
        files.length !== 1 ||
        !file ||
        typeof file === 'string' ||
        form.getAll('file').length !== 1
      )
        return reject(400, 'Choose exactly one PDF.');
      if (file.size > 20971520) return reject(413, 'Choose a PDF up to 20 MiB.');
      if (!file.size) return reject(400, 'Choose a PDF file.');
      if (
        !file.name.toLowerCase().endsWith('.pdf') ||
        file.type.toLowerCase() !== 'application/pdf'
      )
        return reject(415, 'Choose a PDF file.');
      if (
        [...form.keys()].some((key) => !['file', 'rating', 'notes'].includes(key)) ||
        form.getAll('rating').length > 1 ||
        form.getAll('notes').length > 1
      )
        return reject(400, 'The upload metadata is invalid.');
      const raw = form.get('rating');
      if (
        raw !== null &&
        (typeof raw !== 'string' ||
          !/^[+-]?\d+$/.test(raw.trim()) ||
          Number(raw) < 0 ||
          Number(raw) > 3)
      )
        return reject(400, 'Choose a rating between 0 and 3.');
      return route.fulfill({
        status: 202,
        contentType: 'application/json',
        body: JSON.stringify({ data: { id: MOCK_IDS.RECIPE_LASAGNA } }),
      });
    } catch {
      return reject(400, 'The upload form is invalid.');
    }
  });

  await page.route('**/api/feature-flags', async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    const items = snapshotFor(memberIdFor(route.request()));
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { items } }),
    });
  });
}

/**
 * Setup common API routes with sane defaults.
 */
export async function setupCommonRoutes(
  page: Page,
  calendarContext?: CalendarContext,
  recoveryOptions: {
    busy?: boolean;
    demoMode?: boolean;
    demoManagementTaskIds?: string[];
    demoGeneration?: () => string;
  } = {}
) {
  let gotoItems: any[] = [];
  const browseRecipes = [
    builders.recipe({ id: MOCK_IDS.RECIPE_LASAGNA, isReady: true, isDiscoverable: true }),
    builders.recipe({ id: MOCK_IDS.RECIPE_CARBONARA, isReady: true, isDiscoverable: false }),
    builders.recipe({ id: MOCK_IDS.RECIPE_CHICKEN, isReady: true, isDiscoverable: true }),
  ];
  const searchContinuations = new Map<
    string,
    { fingerprint: string; ids: string[]; filters: any; searchMode: string }
  >();
  let searchSequence = 0;
  const generation = () =>
    recoveryOptions.demoMode
      ? (recoveryOptions.demoGeneration?.() ?? '00000000-0000-0000-0000-000000000000')
      : undefined;
  const fulfill = (route: Route, options: Parameters<Route['fulfill']>[0]) =>
    route.fulfill({
      ...options,
      headers: {
        ...options?.headers,
        ...(generation() ? { 'X-Demo-Generation': generation()! } : {}),
      },
    });
  const scheduleEntries = new Map<
    string,
    { recipe: ScheduleRecipeDto | null; status: number; nonCooking?: any }
  >();
  const weekStatuses = new Map<string, number>();
  let roundSequence = 1;
  let historyGeneration = 1;
  const recipeUpdates = new Map<string, Partial<RecipeDto>>();
  let activeRoundId: string = MOCK_IDS.VOTING_ROUND;
  let activeRoundWeek: string | null = null;
  const roundIds = new Map<string, string>();
  const closeReceipts = new Map<string, string>();
  const requiresIdentity = new Set<string>();
  const liveVotes = new Map<string, { recipeId: string; vote: number }>();
  const history = new Map<
    string,
    { recipeId: string; week: string; count: number; selected: boolean }
  >();
  const scheduleCalendar = calendarContext ?? builders.deploymentCalendar();
  type MockExtra = {
    id: string;
    lineageId: string;
    name: string;
    normalizedKey: string;
    grocerySection: string;
    checked: boolean;
    occurrenceWeekStartDate: string;
    readOnly: boolean;
    source: string;
    version: number;
    removed?: boolean;
  };
  const groceryChecks = new Map<string, Record<string, boolean>>();
  const groceryExtras = new Map<string, MockExtra>();
  const extraSubmissions = new Map<string, { id: string; name: string; week: string }>();
  const extraHistory: string[] = [];
  function readReference(url: URL): string | null {
    const reference =
      url.searchParams.get('referenceWeekStartDate') ?? scheduleCalendar.referenceWeekStartDate;
    const date = new Date(`${reference}T00:00:00Z`);
    return /^\d{4}-\d{2}-\d{2}$/.test(reference) &&
      Number.isFinite(date.getTime()) &&
      toDateStr(date) === reference &&
      date.getUTCDay() === 1
      ? reference
      : null;
  }
  const addDays = (date: string, days: number) =>
    toDateStr(new Date(Date.parse(`${date}T00:00:00Z`) + days * 86400000));
  const makeSchedule = (weekOffset: number, reference: string) => {
    const schedule = builders.scheduleDays(weekOffset, {
      ...scheduleCalendar,
      referenceWeekStartDate: reference,
    });
    schedule.groceryState = { ...(groceryChecks.get(schedule.weekStartDate) ?? {}) };
    schedule.status = weekStatuses.get(schedule.weekStartDate) ?? 0;
    schedule.locked = schedule.status === 2;
    schedule.votingRoundId =
      roundIds.get(schedule.weekStartDate) ??
      closeReceipts.get(schedule.weekStartDate) ??
      (!activeRoundWeek || activeRoundWeek === schedule.weekStartDate ? activeRoundId : null);
    for (const day of schedule.days) {
      const entry = scheduleEntries.get(day.date);
      if (entry) Object.assign(day, entry);
    }
    const selectedMonday = addDays(reference, weekOffset * 7);
    const currentMonday = scheduleCalendar.currentWeekStartDate;
    (schedule as typeof schedule & { groceryExtras: MockExtra[] }).groceryExtras = [
      ...groceryExtras.values(),
    ]
      .filter((extra) => {
        if (extra.removed) return false;
        if (selectedMonday === currentMonday)
          return extra.occurrenceWeekStartDate === currentMonday;
        if (selectedMonday > currentMonday)
          return extra.occurrenceWeekStartDate === currentMonday && !extra.checked;
        return extra.occurrenceWeekStartDate === selectedMonday;
      })
      .map((extra) => ({
        ...extra,
        readOnly: selectedMonday < currentMonday,
      })) as any;
    return schedule;
  };
  let sessionRevision = 0;
  let convergedRoundId: string | null = null;
  const readSmartDefaults = (
    offset: number,
    reference: string
  ): Omit<SmartDefaultsDto, 'weekStartDate'> & { weekStartDate: string } => {
    const schedule = makeSchedule(offset, reference);
    const selected = new Set(
      schedule.days.flatMap((day) => (day.recipe?.id ? [day.recipe.id] : []))
    );
    const counts = new Map<string, number>();
    for (const vote of liveVotes.values()) {
      if (vote.vote === 1) counts.set(vote.recipeId, (counts.get(vote.recipeId) ?? 0) + 1);
    }
    const threshold = Math.floor(familyMembers.length / 2) + 1;
    const candidates = [...counts].filter(([id, count]) => count >= threshold && !selected.has(id));
    candidates.sort(
      (left, right) =>
        Number(right[1] === familyMembers.length) - Number(left[1] === familyMembers.length)
    );
    const empty = schedule.days.flatMap((day, dayIndex) =>
      scheduleEntries.has(day.date) ? [] : [dayIndex]
    );
    return {
      weekOffset: offset,
      weekStartDate: schedule.weekStartDate,
      familySize: familyMembers.length,
      consensusThreshold: threshold,
      consensusRecipesCount: candidates.length,
      preSelectedRecipes: candidates.slice(0, empty.length).map(([recipeId, voteCount], index) => ({
        dayIndex: empty[index],
        recipeId,
        name: REALISTIC_RECIPES[recipeId]?.name ?? builders.recipe({ id: recipeId }).name,
        voteCount,
        unanimousVote: voteCount === familyMembers.length,
        isLocked: false,
      })),
      openSlots: empty.slice(candidates.length).map((dayIndex) => ({ dayIndex })),
    };
  };
  const readSession = (): Omit<VotingSessionSnapshot, 'weekStartDate' | 'smartDefaults'> & {
    weekStartDate: string | null;
    smartDefaults: ReturnType<typeof readSmartDefaults> | null;
  } => {
    if (!activeRoundWeek)
      return {
        incarnationId: MOCK_IDS.MEMBER_TEST,
        revision: sessionRevision,
        roundId: activeRoundId,
        weekStartDate: null,
        phase: 'unowned',
        requiredSlots: null,
        coveredSlots: null,
        candidateCount: null,
        smartDefaults: null,
      };
    const offset = Math.round(
      (Date.parse(activeRoundWeek) - Date.parse(scheduleCalendar.referenceWeekStartDate)) /
        (7 * 86400000)
    );
    const smartDefaults = readSmartDefaults(offset, scheduleCalendar.referenceWeekStartDate);
    const requiredSlots = makeSchedule(offset, scheduleCalendar.referenceWeekStartDate).days.filter(
      (day) => !scheduleEntries.has(day.date)
    ).length;
    const candidateCount = smartDefaults.consensusRecipesCount ?? 0;
    if (candidateCount >= requiredSlots) convergedRoundId = activeRoundId;
    return {
      incarnationId: MOCK_IDS.MEMBER_TEST,
      revision: sessionRevision,
      roundId: activeRoundId,
      weekStartDate: activeRoundWeek,
      phase: convergedRoundId === activeRoundId ? 'converged' : 'collecting',
      requiredSlots,
      coveredSlots: Math.min(requiredSlots, candidateCount),
      candidateCount,
      smartDefaults,
    };
  };
  const emitSession = async () => {
    sessionRevision++;
    const session = readSession();
    try {
      await page.evaluate((snapshot) => {
        const source = (window as any).__sseSource as EventSource | undefined;
        source?.dispatchEvent(
          new MessageEvent('voting_session_updated', {
            data: JSON.stringify({ type: 'voting_session_updated', session: snapshot }),
          })
        );
      }, session);
    } catch (error) {
      // Navigation may drop a post-commit notification; the next session GET
      // still observes the saved state and revision, as on the real stream.
      const message =
        error instanceof Error ? error.message.split('\n', 1)[0].replace(/\.$/, '') : '';
      if (
        message !==
          'page.evaluate: Execution context was destroyed, most likely because of a navigation' &&
        message !== 'page.evaluate: Target page, context or browser has been closed'
      )
        throw error;
    }
  };
  const emitSchedule = async (weekOffset: number, reference: string) => {
    await page.evaluate(
      (schedule) => {
        const source = (window as any).__sseSource as EventSource | undefined;
        source?.dispatchEvent(
          new MessageEvent('week_updated', {
            data: JSON.stringify({ type: 'week_updated', schedule }),
          })
        );
      },
      makeSchedule(weekOffset, reference)
    );
    if (!activeRoundWeek || activeRoundWeek === addDays(reference, weekOffset * 7))
      await emitSession();
  };
  const emitExtras = async () => {
    const weekStartDate = scheduleCalendar.currentWeekStartDate;
    const visible = [...groceryExtras.values()].filter((extra) => !extra.removed);
    await page.evaluate(
      ({ week, extras }) => {
        const source = (window as any).__sseSource as EventSource | undefined;
        source?.dispatchEvent(
          new MessageEvent('grocery_extras_updated', {
            data: JSON.stringify({
              type: 'grocery_extras_updated',
              weekStartDate: week,
              groceryExtras: extras,
            }),
          })
        );
      },
      { week: weekStartDate, extras: visible }
    );
  };
  let activeImportIssue: RecipeImportIssueDto | null = null;
  let activeImportId: string | null = null;
  let importStatusReads = 0;

  await mockFeatureFlags(page);

  // Stateful family creation: POST 201 is visible in subsequent GETs.
  const familyMembers = [
    builders.familyMember({ name: 'Alex' }),
    builders.familyMember({ id: MOCK_IDS.MEMBER_JORDAN, name: 'Jordan' }),
  ];
  let createdMemberCount = 0;
  // GET /api/family
  await page.route('**/api/family', async (route) => {
    if (route.request().method() === 'GET') {
      await fulfill(route, {
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: familyMembers,
        }),
      });
    } else if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON() as { name: string };
      const trimmed = (body.name || '').trim();
      const normalized = trimmed.toLowerCase();
      const duplicate = familyMembers.some(
        (m) => (m.name ?? '').trim().toLowerCase() === normalized
      );
      if (duplicate) {
        await fulfill(route, {
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 409,
            message: 'A family member with this name already exists.',
          }),
        });
        return;
      }
      // Deterministic distinct GUIDs based on the shared test-member namespace.
      const id =
        MOCK_IDS.MEMBER_TEST.slice(0, -12) +
        String(Number(MOCK_IDS.MEMBER_TEST.slice(-12)) + createdMemberCount++).padStart(12, '0');
      const member = builders.familyMember({
        id,
        name: trimmed,
        preferredLanguage: null,
      });
      familyMembers.push(member);
      await fulfill(route, {
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ data: member }),
      });
    } else {
      await route.fallback();
    }
  });

  // GET /api/family/me - Dynamic based on cookie
  await page.route('**/api/family/me', async (route) => {
    const cookies = await page.context().cookies();
    const cookie = cookies.find((c) => c.name === 'x-family-member-id');
    const memberId = cookie?.value || MOCK_IDS.MEMBER_ALEX;
    const member = familyMembers.find((candidate) => candidate.id === memberId);

    await fulfill(route, {
      status: 200,
      contentType: 'application/json',
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
      body: JSON.stringify({ data: member ?? builders.familyMember({ id: memberId }) }),
    });
  });

  // PUT /api/family/{id}/preferences
  await page.route('**/api/family/*/preferences', async (route) => {
    if (route.request().method() === 'PUT') {
      const body = route.request().postDataJSON() as {
        browseViewMode?: 'stack' | 'list';
        preferredLanguage?: string;
        cookingViewMode?: 'step-by-step' | 'all-steps';
      };
      const id = new URL(route.request().url()).pathname.split('/').at(-2);
      const current = familyMembers.find((member) => member.id === id);
      if (!current) {
        await fulfill(route, { status: 404 });
        return;
      }
      const updated = {
        ...current,
        ...(body.browseViewMode === undefined ? {} : { browseViewMode: body.browseViewMode }),
        ...(body.preferredLanguage === undefined
          ? {}
          : { preferredLanguage: body.preferredLanguage as any }),
        ...(body.cookingViewMode === undefined ? {} : { cookingViewMode: body.cookingViewMode }),
        updatedAt: new Date(),
      };
      Object.assign(current, updated);
      await fulfill(route, {
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: updated,
        }),
      });
    } else {
      await route.continue();
    }
  });

  // PUT /api/family/{id} and DELETE /api/family/{id}
  await page.route('**/api/family/*', async (route) => {
    if (route.request().method() === 'PUT') {
      await fulfill(route, {
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: builders.familyMember() }),
      });
    } else if (route.request().method() === 'DELETE') {
      await fulfill(route, { status: 204 });
    } else if (route.request().method() === 'GET') {
      await fulfill(route, {
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: builders.familyMember() }),
      });
    } else {
      await route.continue();
    }
  });

  // GET /api/discovery/categories
  await page.route('**/api/discovery/categories', async (route) => {
    await fulfill(route, {
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: ['Italian', 'Asian', 'Mexican'] }),
    });
  });

  // GET /api/discovery
  await page.route('**/api/discovery', async (route) => {
    await fulfill(route, {
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    });
  });

  await page.route('**/api/discovery/session', async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    await fulfill(route, { json: { data: readSession() } });
  });

  // POST /api/discovery/{id}/vote
  await page.route('**/api/discovery/*/vote', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    const recipeId = new URL(route.request().url()).pathname.split('/')[3];
    const member = route.request().headers()['x-family-member-id'] ?? MOCK_IDS.MEMBER_ALEX;
    liveVotes.set(`${recipeId}:${member}`, { recipeId, vote: route.request().postDataJSON().vote });
    await fulfill(route, {
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { message: 'Vote recorded' } }),
    });
    await emitSession();
  });

  // GET /api/schedule (default empty week) — predicate used to match URLs with query strings (e.g. ?weekOffset=0)
  await page.route(
    (url) => url.pathname === '/api/schedule',
    async (route) => {
      if (route.request().method() === 'GET') {
        const url = new URL(route.request().url());
        const reference = readReference(url);
        if (!reference)
          return fulfill(route, {
            status: 400,
            json: { message: 'referenceWeekStartDate must be a yyyy-MM-dd Monday.' },
          });
        const weekOffset = Number(url.searchParams.get('weekOffset') ?? 0);
        const schedule = makeSchedule(weekOffset, reference);
        await fulfill(route, { json: { data: schedule } });
      } else {
        await route.continue();
      }
    }
  );

  // POST /api/schedule/day/{date} (Assign/Validate recipe)
  await page.route('**/api/schedule/day/*', async (route) => {
    if (route.request().method() === 'POST') {
      await fulfill(route, {
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { message: 'Day updated' } }),
      });
    } else {
      await route.continue();
    }
  });

  // GET /api/recipes/library-summary — registered AFTER the wildcard so LIFO gives it priority
  await page.route('**/api/recipes/library-summary', async (route) => {
    await fulfill(route, {
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          total: 3,
          neverCooked: 1,
          ratings: { love: 1, like: 1, dislike: 0, unrated: 1 },
        },
      }),
    });
  });

  // GET /api/recipes/recommendations
  await page.route('**/api/recipes/recommendations', async (route) => {
    await fulfill(route, {
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { topPick: null, results: [] } }),
    });
  });

  // POST /api/recipes/search
  await page.route('**/api/recipes/search', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    const request = route.request().postDataJSON();
    const searchMode = mockSearchMode(request);
    const filters = request.filters ?? {};
    const canonicalFilters = Object.fromEntries(
      Object.entries(filters)
        .filter(([, value]) => value === true || (Array.isArray(value) && value.length > 0))
        .sort(([left], [right]) => left.localeCompare(right))
    );
    const fingerprint = JSON.stringify({
      query: request.query?.trim() ?? '',
      concepts: (request.preferences?.concepts ?? [])
        .map((value: string) => value.trim())
        .filter(Boolean)
        .sort(),
      filters: canonicalFilters,
      similarToRecipeId: request.similarToRecipeId ?? null,
      weekOffset: request.weekOffset ?? null,
      dayIndex: request.dayIndex ?? null,
      searchMode,
    });
    const previous = request.continuationToken
      ? searchContinuations.get(request.continuationToken)
      : null;
    if (request.continuationToken && (!previous || previous.fingerprint !== fingerprint))
      return fulfill(route, {
        status: 409,
        json: { message: 'Search changed. Restart from the first page.' },
      });
    const membership = new Set(gotoItems.map((item) => item.recipeId));
    const matches =
      filters.gotoOnly === true
        ? browseRecipes.filter(
            (recipe) =>
              membership.has(recipe.id) &&
              recipe.isReady &&
              !recipe.deletedAt &&
              (filters.discoverableOnly !== true || recipe.isDiscoverable) &&
              (filters.familyFavorite !== true ||
                ((recipe.rating ?? 0) >= 2 && (recipe.isDiscoverable || recipe.notes))) &&
              (!request.query?.trim() ||
                recipe.name?.toLowerCase().includes(request.query.trim().toLowerCase())) &&
              recipe.id !== request.similarToRecipeId
          )
        : [];
    const byId = new Map(matches.map((recipe) => [recipe.id!, recipe]));
    const ordered = previous
      ? previous.ids.filter((id) => byId.has(id))
      : matches.map((recipe) => recipe.id!);
    const topId = previous ? undefined : ordered.shift();
    const limit = Math.max(1, Math.min(50, request.limit ?? 12));
    const pageIds = ordered.slice(0, limit);
    const remaining = ordered.slice(limit);
    const nextCursor = remaining.length ? `mock-search-${++searchSequence}` : null;
    if (nextCursor)
      searchContinuations.set(nextCursor, { fingerprint, ids: remaining, filters, searchMode });
    const result = (id: string) => ({ ...byId.get(id)!, isPromotionEligible: false, reasons: [] });
    await fulfill(route, {
      json: {
        data: {
          topPick: topId ? result(topId) : null,
          results: pageIds.map(result),
          appliedFilters: filters,
          searchMode,
          nextCursor,
          resultPath:
            searchMode === 'similar'
              ? 'similar'
              : searchMode === 'discovery' || !request.query?.trim()
                ? 'browse'
                : 'lexical-only',
        },
      },
    });
  });

  // GET /api/recipes/search/filters — materialized metadata fallback
  await page.route('**/api/recipes/search/filters', async (route) => {
    await fulfill(route, {
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        generatedAt: null,
        main: [
          { id: FILTER_MAIN_IDS.BEEF, concept: 'beef', label: null },
          { id: FILTER_MAIN_IDS.POULTRY, concept: 'poultry', label: null },
          { id: FILTER_MAIN_IDS.PORK, concept: 'pork', label: null },
          { id: FILTER_MAIN_IDS.FISH, concept: 'fish', label: null },
          { id: FILTER_MAIN_IDS.PASTA, concept: 'pasta', label: null },
          { id: FILTER_MAIN_IDS.VEGETARIAN, concept: 'vegetarian', label: null },
        ],
        mealTypes: ['Supper', 'Lunch', 'Breakfast', 'Dessert'],
        cuisines: { promoted: [], all: [] },
      }),
    });
  });

  // POST /api/recipes/describe
  await page.route('**/api/recipes/describe', async (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON() as { name?: string; description?: string };
      await fulfill(route, {
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: builders.recipe({
            id: MOCK_IDS.RECIPE_GOTO_STUB,
            name: body?.name ?? 'Described Recipe',
            description: body?.description ?? null,
            imageUrl: null,
          }),
        }),
      });
    }
  });

  // GET /api/recipes/import-status
  await page.route('**/api/recipes/import-status', async (route) => {
    await fulfill(route, {
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ importedCount: 0, queueCount: 0, failedCount: 0 }),
    });
  });

  // POST /api/recipes/imports/bulk
  await page.route('**/api/recipes/imports/bulk', async (route) => {
    await fulfill(route, {
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ queuedCount: 0, instanceIds: [] }),
    });
  });

  // GET /api/recipes/{id}/status
  await page.route('**/api/recipes/*/status', async (route) => {
    if (route.request().method() === 'GET') {
      const id =
        route
          .request()
          .url()
          .match(/\/recipes\/([0-9a-f-]+)\/status/)?.[1] ?? MOCK_IDS.RECIPE_GOTO_STUB;
      await fulfill(route, {
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id,
            name: 'Mock Recipe',
            status: 'ready',
            imageCount: 1,
          },
        }),
      });
    }
  });

  // GET /api/recipes/{id}/hero
  await page.route('**/api/recipes/*/hero', async (route) => {
    await fulfill(route, { status: 200, contentType: 'image/jpeg', body: Buffer.from([]) });
  });

  // POST /api/recipes/{id}/import
  await page.route('**/api/recipes/*/import', async (route) => {
    if (route.request().method() === 'POST') {
      await fulfill(route, {
        status: 202,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'queued' }),
      });
    } else {
      await route.fallback();
    }
  });

  // POST /api/recipes/{id}/originals
  await page.route('**/api/recipes/*/originals', async (route) => {
    if (route.request().method() === 'POST') {
      await fulfill(route, {
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ id: MOCK_IDS.PHOTO_NEW }),
      });
    } else {
      await route.fallback();
    }
  });

  // POST /api/recipes/{id}/hero/regenerate
  await page.route('**/api/recipes/*/hero/regenerate', async (route) => {
    if (route.request().method() === 'POST') {
      await fulfill(route, {
        status: 202,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'queued' }),
      });
    } else {
      await route.fallback();
    }
  });

  // GET /api/recipes/{id}/share
  await page.route('**/api/recipes/*/share', async (route) => {
    if (route.request().method() === 'GET') {
      const id =
        route
          .request()
          .url()
          .match(/\/recipes\/([0-9a-f-]+)\/share/)?.[1] ?? MOCK_IDS.RECIPE_LASAGNA;
      await fulfill(route, {
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: builders.recipeShareBundle({
            recipe: {
              ...builders.recipeShareBundle().recipe,
              name: REALISTIC_RECIPES[id]?.name ?? 'Mock Recipe',
            },
          }),
        }),
      });
    } else {
      await route.fallback();
    }
  });

  // GET /api/recipes/{recipeId}/original/{photoIndex}
  await page.route('**/api/recipes/*/original/*', async (route) => {
    await fulfill(route, { status: 200, contentType: 'image/jpeg', body: Buffer.from([]) });
  });

  // GET /api/recipes (List) — registered BEFORE **/api/recipes/* to take priority
  await page.route(
    (url) => url.pathname.endsWith('/api/recipes'),
    async (route) => {
      const url = new URL(route.request().url());
      const order = url.searchParams.get('order');
      const requestedPage = Number(url.searchParams.get('page') ?? '1');

      if (route.request().method() === 'POST') {
        await fulfill(route, {
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ recipe: builders.recipe(), updatedAt: new Date().toISOString() }),
        });
      } else if (route.request().method() === 'GET') {
        const suppliedGeneration = url.searchParams.get('historyGeneration');
        if (
          order === 'explore' &&
          ((requestedPage > 1 && !suppliedGeneration) ||
            (suppliedGeneration && suppliedGeneration !== `mock-history-${historyGeneration}`))
        )
          return fulfill(route, {
            status: 409,
            json: {
              code: 'history_generation_expired',
              message: 'Recipe order changed. Restart Explore.',
            },
          });
        const isDiscoverableOnly = url.searchParams.get('discoverableOnly') === 'true';
        if (url.searchParams.get('gotoOnly') === 'true') {
          const membership = new Set(gotoItems.map((item) => item.recipeId));
          const eligible = browseRecipes
            .map((recipe) => ({ ...recipe, ...recipeUpdates.get(recipe.id!) }))
            .filter(
              (recipe) =>
                membership.has(recipe.id) &&
                recipe.isReady &&
                !recipe.deletedAt &&
                (!isDiscoverableOnly || recipe.isDiscoverable) &&
                (!url.searchParams.get('id') || recipe.id === url.searchParams.get('id')) &&
                (!url.searchParams.get('name') ||
                  recipe.name?.toLowerCase() ===
                    url.searchParams.get('name')!.trim().toLowerCase()) &&
                (!url.searchParams.get('url') ||
                  recipe.sourceUrl?.toLowerCase() ===
                    url.searchParams.get('url')!.trim().toLowerCase())
            );
          const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit') ?? 20)));
          return fulfill(route, {
            json: {
              updatedAt: FIXED_E2E_TIMESTAMP,
              historyGeneration:
                order === 'explore' ? `mock-history-${historyGeneration}` : undefined,
              recipes: eligible.slice((requestedPage - 1) * limit, requestedPage * limit),
              pagination: { page: requestedPage, limit, total: eligible.length },
            },
          });
        }
        await fulfill(route, {
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            recipes:
              order === 'explore'
                ? [
                    builders.recipe({
                      id: isDiscoverableOnly ? MOCK_IDS.RECIPE_GOTO_STUB : MOCK_IDS.RECIPE_LASAGNA,
                      name: isDiscoverableOnly ? 'Discoverable Recipe' : 'Mock Recipe',
                    }),
                  ]
                : [],
            updatedAt: new Date().toISOString(),
            pagination: { page: 1, limit: 20, total: order === 'explore' ? 1 : 0 },
            historyGeneration:
              order === 'explore' ? `mock-history-${historyGeneration}` : undefined,
          }),
        });
      } else await route.fallback();
    }
  );

  // GET /api/recipes/library-summary — registered BEFORE **/api/recipes/* to take priority
  await page.route(
    (url) => url.pathname.endsWith('/api/recipes/library-summary'),
    async (route) => {
      await fulfill(route, {
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            total: 1,
            neverCooked: 1,
            ratings: { love: 0, like: 0, dislike: 0, unrated: 1 },
          },
        }),
      });
    }
  );

  // GET /api/recipes/{id}, PATCH /api/recipes/{id}, DELETE /api/recipes/{id}
  await page.route('**/api/recipes/*', async (route) => {
    if (!/^\/api\/recipes\/[0-9a-f-]{36}$/.test(new URL(route.request().url()).pathname))
      return route.fallback();
    if (route.request().method() === 'DELETE') {
      const id =
        route
          .request()
          .url()
          .match(/\/recipes\/([0-9a-f-]+)$/)?.[1] ?? MOCK_IDS.RECIPE_LASAGNA;
      await fulfill(route, {
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: builders.recipe({ id, deletedAt: new Date() }),
        }),
      });
    } else if (route.request().method() === 'PATCH') {
      const id = new URL(route.request().url()).pathname.split('/')[3];
      const changes = route.request().postDataJSON() as Partial<RecipeDto>;
      if (
        changes.isDiscoverable === true &&
        changes.mealTypes?.length &&
        !changes.mealTypes.includes('Supper')
      )
        return fulfill(route, {
          status: 400,
          json: { message: 'Choose Supper in meal types before turning on Ask the Family.' },
        });
      recipeUpdates.set(id, { ...recipeUpdates.get(id), ...changes });
      await fulfill(route, {
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          recipe: builders.recipe({ id, ...recipeUpdates.get(id) }),
          updatedAt: new Date().toISOString(),
        }),
      });
    } else {
      const id =
        route
          .request()
          .url()
          .match(/\/recipes\/([0-9a-f-]+)$/)?.[1] ?? MOCK_IDS.RECIPE_LASAGNA;
      await fulfill(route, {
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          recipe: builders.recipe({
            id,
            createdAt: new Date(FIXED_E2E_TIMESTAMP),
            importIssue: activeImportIssue,
            ...recipeUpdates.get(id),
          }),
          updatedAt: FIXED_E2E_TIMESTAMP,
        }),
      });
    }
  });

  // POST/DELETE /api/recipes/{id}/import-report — registered after the recipe wildcard for priority
  await page.route('**/api/recipes/*/import-report', async (route) => {
    const request = route.request();
    const method = request.method();
    const id =
      request.url().match(/\/recipes\/([0-9a-f-]+)\/import-report/)?.[1] ?? MOCK_IDS.RECIPE_LASAGNA;

    if (method === 'POST') {
      const body = request.postDataJSON() as RecipeImportIssueRequest;
      const reasons = body.reasons ?? [];
      const note = body.note?.trim() || null;
      const contentOnly =
        reasons.length > 0 &&
        reasons.every(
          (reason) =>
            reason === RecipeImportIssueReasonObject.Ingredients ||
            reason === RecipeImportIssueReasonObject.Steps
        );
      const reimportStarted =
        builders.recipe({ id }).canReimport === true && contentOnly && note !== null;
      activeImportIssue = {
        reasons,
        note,
        isReimporting: reimportStarted,
        status: RecipeImportIssueStatusObject.Reported,
      };
      activeImportId = reimportStarted ? MOCK_IDS.PHOTO_NEW : null;
      importStatusReads = 0;
    } else if (method === 'DELETE') {
      activeImportIssue = null;
      activeImportId = null;
    } else {
      await route.fallback();
      return;
    }

    await fulfill(route, {
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        updatedAt: FIXED_E2E_TIMESTAMP,
        recipe: builders.recipe({ id, importIssue: activeImportIssue }),
        reimportStarted: activeImportId !== null,
        ...(activeImportId ? { importId: activeImportId } : {}),
        reimportLaunchFailed: false,
      }),
    });
  });

  // GET /api/recipe-imports/{importId} — deterministic pending then completed polling.
  await page.route('**/api/recipe-imports/*', async (route) => {
    if (route.request().method() !== 'GET' || activeImportId === null) {
      await route.fallback();
      return;
    }

    importStatusReads += 1;
    const completed = importStatusReads > 1;
    if (completed && activeImportIssue) {
      activeImportIssue = {
        ...activeImportIssue,
        isReimporting: false,
        status: RecipeImportIssueStatusObject.ReadyToReview,
      };
    }

    await fulfill(route, {
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: activeImportId,
        workflowId: 'recipe-import',
        status: completed
          ? WorkflowInstanceDetailDto_statusObject.Completed
          : WorkflowInstanceDetailDto_statusObject.Processing,
        tasks: [],
        createdAt: FIXED_E2E_TIMESTAMP,
        updatedAt: FIXED_E2E_TIMESTAMP,
      }),
    });
  });

  // POST /api/recipes/import-bundle — registered AFTER **/api/recipes/* so LIFO gives it priority
  await page.route('**/api/recipes/import-bundle', async (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON() as RecipeShareBundleDto;
      await fulfill(route, {
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: builders.recipe({
            id: MOCK_IDS.RECIPE_GOTO_STUB,
            name: body.recipe?.name ?? 'Imported Recipe',
            description: body.recipe?.description ?? null,
            imageUrl: null,
            ingredients: body.recipe?.ingredients ?? [],
            sourceUrl: body.recipe?.sourceUrl ?? null,
            sourceType: body.recipe?.sourceUrl
              ? RecipeDto_sourceTypeObject.Url
              : RecipeDto_sourceTypeObject.Synthesized,
            canReimport: false,
            isReady: true,
          }),
        }),
      });
    } else {
      await route.fallback();
    }
  });

  // GET /api/recipes/trash — registered AFTER the wildcard so LIFO gives it priority
  await page.route('**/api/recipes/trash', async (route) => {
    await fulfill(route, {
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { items: [] } }),
    });
  });

  // POST /api/recipes/*/restore — registered AFTER the wildcard so LIFO gives it priority
  await page.route('**/api/recipes/*/restore', async (route) => {
    await fulfill(route, {
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: builders.recipe() }),
    });
  });

  // DELETE /api/recipes/*/purge
  await page.route('**/api/recipes/*/purge', async (route) => {
    await fulfill(route, {
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { purged: true } }),
    });
  });

  await mockFeatureFlags(page);

  // POST /api/recipes/capture-url — registered AFTER the wildcard so LIFO gives it priority
  await page.route('**/api/recipes/capture-url', async (route) => {
    if (route.request().method() === 'POST') {
      await fulfill(route, {
        status: 202,
        contentType: 'application/json',
        body: JSON.stringify({ data: { id: MOCK_IDS.RECIPE_LASAGNA } }),
      });
    } else {
      await route.continue();
    }
  });

  // POST /api/schedule/assign
  await page.route('**/api/schedule/assign**', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    const reference = readReference(new URL(route.request().url()));
    if (!reference)
      return fulfill(route, {
        status: 400,
        json: { message: 'referenceWeekStartDate must be a yyyy-MM-dd Monday.' },
      });
    const body = route.request().postDataJSON();
    const schedule = builders.scheduleDays(body.weekOffset, {
      ...scheduleCalendar,
      referenceWeekStartDate: reference,
    });
    const day = schedule.days[body.dayIndex];
    if (!day) return fulfill(route, { status: 400, json: { message: 'Invalid dayIndex.' } });
    const existing = scheduleEntries.get(day.date);
    if (
      body.requireEmpty &&
      !new URL(route.request().url()).searchParams.has('referenceWeekStartDate')
    )
      return fulfill(route, {
        status: 400,
        json: { message: 'An explicit reference Monday is required.' },
      });
    if (body.requireEmpty && existing)
      return fulfill(route, { status: 409, json: { message: 'That supper slot changed.' } });
    let displacedRecipe = null;
    if (body.dayIndex === 6 && existing?.recipe) {
      const nextWeek = builders.scheduleDays(body.weekOffset + 1, {
        ...scheduleCalendar,
        referenceWeekStartDate: reference,
      });
      scheduleEntries.set(nextWeek.days[0].date, existing);
      displacedRecipe = {
        id: existing.recipe.id,
        name: existing.recipe.name,
        movedToWeekOffset: body.weekOffset + 1,
        movedToDayIndex: 0,
      };
    }
    scheduleEntries.set(day.date, {
      recipe: builders.scheduleRecipe({ id: body.recipeId }),
      status: 0,
    });
    await fulfill(route, { json: { data: { message: 'Recipe assigned', displacedRecipe } } });
    for (const slot of schedule.days) {
      const entry = scheduleEntries.get(slot.date);
      if (entry) Object.assign(slot, entry);
    }
    await page.evaluate((snapshot) => {
      const source = (window as any).__sseSource as EventSource | undefined;
      source?.dispatchEvent(
        new MessageEvent('week_updated', {
          data: JSON.stringify({ type: 'week_updated', schedule: snapshot }),
        })
      );
    }, schedule);
    await emitSession();
  });

  const setWeekStatus = (status: number) => async (route: Route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    const url = new URL(route.request().url());
    const reference = readReference(url);
    if (!reference)
      return fulfill(route, {
        status: 400,
        json: { message: 'Invalid referenceWeekStartDate.' },
      });
    const offset = Number(url.searchParams.get('weekOffset') ?? 0);
    const schedule = makeSchedule(offset, reference);
    const week = schedule.weekStartDate;
    const requestedRound = url.searchParams.get('votingRoundId');
    const replay =
      status === 2 &&
      closeReceipts.has(week) &&
      (requestedRound === closeReceipts.get(week) ||
        (!requestedRound && weekStatuses.get(week) === 2));
    if (
      !replay &&
      ((activeRoundWeek && activeRoundWeek !== week) ||
        (status === 2 &&
          ((requestedRound && requestedRound !== activeRoundId) ||
            (!requestedRound && requiresIdentity.has(week)))))
    )
      return fulfill(route, {
        status: 409,
        json: { message: 'Voting changed. Refresh the planner.' },
      });
    if (replay) return fulfill(route, { json: { data: { message: 'Schedule locked' } } });
    if (status === 1) {
      if (weekStatuses.get(week) === 2) requiresIdentity.add(week);
      activeRoundWeek = week;
      roundIds.set(week, activeRoundId);
    } else {
      for (const recipeId of new Set([...liveVotes.values()].map((vote) => vote.recipeId))) {
        const count = [...liveVotes.values()].filter(
          (vote) => vote.recipeId === recipeId && vote.vote === 1
        ).length;
        const key = `${week}:${recipeId}`;
        if (count)
          history.set(key, {
            recipeId,
            week,
            count,
            selected: schedule.days.some(
              (day) => day.recipe?.id === recipeId && [0, 1, 2].includes(day.status)
            ),
          });
        else history.delete(key);
      }
      liveVotes.clear();
      closeReceipts.set(week, activeRoundId);
      roundIds.delete(week);
      activeRoundWeek = null;
      activeRoundId =
        MOCK_IDS.VOTING_ROUND.slice(0, -12) + String(++roundSequence).padStart(12, '0');
    }
    historyGeneration++;
    weekStatuses.set(schedule.weekStartDate, status);
    if (status === 2)
      for (const day of schedule.days) {
        const entry = scheduleEntries.get(day.date);
        if (entry?.recipe && entry.status === 0) entry.status = 1;
      }
    await fulfill(route, {
      json: { data: { message: status === 2 ? 'Schedule locked' : 'Voting opened' } },
    });
    await emitSchedule(offset, reference);
  };
  await page.route('**/api/schedule/lock**', setWeekStatus(2));
  await page.route('**/api/schedule/voting/open**', setWeekStatus(1));

  await page.route('**/api/schedule/move**', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    const reference = readReference(new URL(route.request().url()));
    if (!reference)
      return fulfill(route, { status: 400, json: { message: 'Invalid referenceWeekStartDate.' } });
    const body = route.request().postDataJSON();
    if (body.intent === 'tomorrow') {
      const sourceDate = addDays(reference, body.weekOffset * 7 + body.fromIndex);
      const destination = addDays(
        reference,
        (body.targetWeekOffset ?? body.weekOffset) * 7 + body.toIndex
      );
      if (
        !Number.isInteger(body.fromIndex) ||
        body.fromIndex < 0 ||
        body.fromIndex > 6 ||
        !Number.isInteger(body.toIndex) ||
        body.toIndex < 0 ||
        body.toIndex > 6 ||
        destination !== addDays(sourceDate, 1) ||
        (body.sourceDisposition != null && body.sourceDisposition !== 'order_in')
      )
        return fulfill(route, {
          status: 400,
          json: { message: 'Choose a valid source and its next day.' },
        });
      const source = scheduleEntries.get(sourceDate);
      const chain: string[] = [];
      let empty = destination;
      while (scheduleEntries.has(empty)) {
        chain.push(empty);
        empty = addDays(empty, 1);
      }
      if (
        !source ||
        source.recipe?.id !== body.recipeId ||
        [source, ...chain.map((date) => scheduleEntries.get(date)!)].some(
          (entry) => entry.status === 2 || entry.status === 4
        )
      )
        return fulfill(route, {
          status: 409,
          json: { message: 'A completed meal or changed plan blocks this move.' },
        });
      const changedDates = [
        sourceDate,
        destination,
        ...chain,
        ...chain.map((date) => addDays(date, 1)),
      ];
      for (const date of chain.reverse()) {
        scheduleEntries.set(addDays(date, 1), scheduleEntries.get(date)!);
        scheduleEntries.delete(date);
      }
      if (body.sourceDisposition === 'order_in' || source.status === 3) {
        scheduleEntries.set(sourceDate, {
          ...source,
          recipe: null,
          status: 3,
          ...(body.sourceDisposition
            ? { nonCooking: { kind: 'order_in', customLabel: null } }
            : {}),
        });
        scheduleEntries.set(destination, { recipe: source.recipe, status: 0 });
      } else {
        scheduleEntries.delete(sourceDate);
        scheduleEntries.set(destination, source);
      }
      const offsets = [
        ...new Set(
          changedDates.map((date) =>
            Math.floor(
              (Date.parse(date + 'T00:00:00Z') - Date.parse(reference + 'T00:00:00Z')) / 604800000
            )
          )
        ),
      ].sort((a, b) => a - b);
      await fulfill(route, {
        json: {
          data: builders.tomorrowMoveResult(
            sourceDate,
            destination,
            offsets.map((offset) => addDays(reference, offset * 7))
          ),
        },
      });
      for (const offset of offsets) {
        await emitSchedule(offset, reference);
        await page.evaluate(
          ({ weekOffset, weekStartDate }) => {
            (window as any).__sseSource?.dispatchEvent(
              new MessageEvent('fill_the_gap_invalidated', {
                data: JSON.stringify({
                  type: 'fill_the_gap_invalidated',
                  weekOffset,
                  weekStartDate,
                }),
              })
            );
          },
          { weekOffset: offset, weekStartDate: addDays(reference, offset * 7) }
        );
      }
      return;
    }
    if (body.sourceDisposition != null)
      return fulfill(route, {
        status: 400,
        json: { message: 'Source disposition requires Tomorrow.' },
      });
    const monday = addDays(reference, body.weekOffset * 7);
    const targetOffset = body.targetWeekOffset ?? body.weekOffset;
    let sourceDate = body.fromIndex == null ? undefined : addDays(monday, body.fromIndex);
    if (!sourceDate || !scheduleEntries.has(sourceDate))
      sourceDate = [...scheduleEntries].find(
        ([date, entry]) =>
          entry.recipe?.id === body.recipeId &&
          (targetOffset !== body.weekOffset || (date >= monday && date <= addDays(monday, 6)))
      )?.[0];
    const source = sourceDate ? scheduleEntries.get(sourceDate) : undefined;
    if (sourceDate && source && source.recipe?.id === body.recipeId) {
      let destination = addDays(reference, targetOffset * 7 + body.toIndex);
      let canMove = true;
      if (targetOffset !== body.weekOffset) {
        let index = body.toIndex;
        while (index < 7 && scheduleEntries.has(addDays(reference, targetOffset * 7 + index)))
          index++;
        canMove = index < 7;
        destination = addDays(reference, targetOffset * 7 + index);
      } else if (body.intent === 'push') {
        let index = body.toIndex;
        while (index < 14 && scheduleEntries.has(addDays(monday, index))) index++;
        if (index < 14) {
          for (let position = index; position > body.toIndex; position--) {
            const previous = addDays(monday, position - 1);
            const entry = scheduleEntries.get(previous);
            if (entry) {
              scheduleEntries.delete(previous);
              scheduleEntries.set(addDays(monday, position), entry);
            }
          }
        } else {
          const occupied = scheduleEntries.get(destination);
          if (occupied) scheduleEntries.set(sourceDate, occupied);
        }
      } else {
        const occupied = scheduleEntries.get(destination);
        if (occupied) scheduleEntries.set(sourceDate, occupied);
      }
      if (canMove) {
        for (const [date, entry] of scheduleEntries)
          if (entry === source) scheduleEntries.delete(date);
        if (source.status === 3) {
          scheduleEntries.set(sourceDate, { ...source, recipe: null });
          scheduleEntries.set(destination, { recipe: source.recipe, status: 0 });
        } else scheduleEntries.set(destination, source);
        if (targetOffset !== body.weekOffset) {
          await fulfill(route, {
            json: {
              data: {
                message: 'Recipe moved',
                moved: true,
                sourceDate,
                destinationDate: destination,
                affectedWeekStartDates: [monday, addDays(reference, targetOffset * 7)],
                refreshComplete: true,
              },
            },
          });
          await emitSchedule(body.weekOffset, reference);
          await emitSchedule(targetOffset, reference);
          return;
        }
      }
    }
    await fulfill(route, { json: { data: { message: 'Recipe moved' } } });
    await emitSchedule(body.weekOffset, reference);
  });

  await page.route('**/api/schedule/defer**', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    const url = new URL(route.request().url());
    const reference = readReference(url);
    if (!reference)
      return fulfill(route, { status: 400, json: { message: 'Invalid referenceWeekStartDate.' } });
    const rawOffset = url.searchParams.get('targetWeekOffset');
    const targetOffset = rawOffset === null ? 1 : Number(rawOffset);
    const destinationTime = Date.parse(`${reference}T00:00:00Z`) + targetOffset * 7 * 86400000;
    if (
      (rawOffset !== null && !/^[+-]?\d+$/.test(rawOffset)) ||
      !Number.isInteger(targetOffset) ||
      targetOffset < -2147483648 ||
      targetOffset > 2147483647 ||
      !Number.isFinite(destinationTime) ||
      destinationTime < Date.parse('0001-01-01T00:00:00Z') ||
      destinationTime > Date.parse('9999-12-31T00:00:00Z')
    )
      return fulfill(route, { status: 400, json: { message: 'Invalid targetWeekOffset.' } });
    const start = toDateStr(new Date(destinationTime));
    const body = route.request().postDataJSON();
    const source = scheduleEntries.get(body.sourceDate);
    if (!source || !source.recipe || source.recipe.id !== body.recipeId)
      return fulfill(route, { status: 404, json: { message: 'Scheduled recipe not found.' } });
    if (source.status === 4)
      return fulfill(route, {
        status: 409,
        json: { message: 'Meals awaiting consensus cannot be deferred.' },
      });
    let destination = start;
    while (scheduleEntries.has(destination)) destination = addDays(destination, 1);
    if (source.status === 3) scheduleEntries.set(body.sourceDate, { ...source, recipe: null });
    else scheduleEntries.delete(body.sourceDate);
    scheduleEntries.set(destination, { recipe: source.recipe, status: 0 });
    const destinationOffset = Math.floor(
      (Date.parse(destination) - Date.parse(reference)) / (7 * 86400000)
    );
    await fulfill(route, {
      json: {
        data: {
          scheduledDate: destination,
          scheduledWeekOffset: destinationOffset,
          message: `${destinationOffset > targetOffset ? 'Next week is full. ' : ''}Moved meal to ${destination}.`,
        },
      },
    });
    await emitSchedule(
      Math.floor((Date.parse(body.sourceDate) - Date.parse(reference)) / (7 * 86400000)),
      reference
    );
    await emitSchedule(destinationOffset, reference);
  });

  await page.route('**/api/schedule/fill-the-gap**', async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    if (!readReference(new URL(route.request().url())))
      return fulfill(route, { status: 400, json: { message: 'Invalid referenceWeekStartDate.' } });
    const url = new URL(route.request().url());
    const schedule = makeSchedule(
      Number(url.searchParams.get('weekOffset') ?? 0),
      readReference(url)!
    );
    const assigned = new Set(schedule.days.map((day) => day.recipe?.id));
    const likes = new Map<string, number>();
    for (const vote of liveVotes.values())
      if (vote.vote === 1) likes.set(vote.recipeId, (likes.get(vote.recipeId) ?? 0) + 1);
    const current = scheduleCalendar.currentWeekStartDate;
    const cutoff = new Date(Date.parse(current) - 28 * 86400000).toISOString().slice(0, 10);
    const historical = [...history.values()]
      .filter(
        (row) =>
          !row.selected && row.week >= cutoff && row.week < current && row.week !== activeRoundWeek
      )
      .map((row) => row.recipeId);
    const ids = [
      ...new Set(
        [...likes.keys()]
          .sort((a, b) => likes.get(b)! - likes.get(a)! || a.localeCompare(b))
          .concat(historical.sort())
      ),
    ]
      .filter((id) => !assigned.has(id))
      .slice(0, 5);
    await fulfill(route, {
      json: {
        data: ids.map((id) => ({
          id,
          name: REALISTIC_RECIPES[id]?.name ?? 'Mock Recipe',
          image: `/api/recipes/${id}/hero`,
          voteCount: likes.get(id) ?? null,
        })),
      },
    });
  });

  await page.route('**/api/schedule/day/*/remove', async (route) => {
    if (route.request().method() !== 'DELETE') return route.fallback();
    const date = new URL(route.request().url()).pathname.split('/')[4];
    const removed = scheduleEntries.delete(date);
    await fulfill(route, { status: 204 });
    if (removed)
      await emitSchedule(
        Math.floor(
          (Date.parse(date) - Date.parse(scheduleCalendar.referenceWeekStartDate)) / (7 * 86400000)
        ),
        scheduleCalendar.referenceWeekStartDate
      );
  });

  await page.route(
    (url) => /^\/api\/schedule\/day\/[^/]+\/validate$/.test(url.pathname),
    async (route) => {
      if (route.request().method() !== 'POST') return route.fallback();
      const date = new URL(route.request().url()).pathname.split('/')[4];
      const body = route.request().postDataJSON();
      const previous = scheduleEntries.get(date);
      if (body.nonCooking && previous && (previous.recipe || previous.status !== 3))
        return fulfill(route, { status: 409, json: { status: 409, message: 'Day occupied' } });
      const viewedId = body.recipeId ?? previous?.recipe?.id;
      if (body.status === 2) {
        const knownRecipe = Object.entries(MOCK_IDS).some(
          ([key, id]) => key.startsWith('RECIPE_') && id === viewedId
        );
        if (!knownRecipe)
          return fulfill(route, { status: 404, json: { message: 'Recipe not found' } });
      }
      const mealMarkedCooked = body.status === 2 && previous?.recipe?.id === viewedId;
      if (body.status !== 2 || mealMarkedCooked) {
        const entry = {
          recipe: previous?.recipe ?? null,
          status: body.status,
          nonCooking:
            body.status === 3 && !previous?.recipe
              ? (body.nonCooking ?? previous?.nonCooking ?? { kind: 'order_in', customLabel: null })
              : null,
        };
        scheduleEntries.set(date, entry);
      }
      await fulfill(route, {
        json: { data: { message: 'Cooking status updated', mealMarkedCooked } },
      });
      const entry = scheduleEntries.get(date);
      if (body.status !== 2 || mealMarkedCooked)
        await page.evaluate(
          (payload) => {
            const source = (window as any).__sseSource as EventSource | undefined;
            source?.dispatchEvent(
              new MessageEvent('slot_updated', { data: JSON.stringify(payload) })
            );
          },
          {
            date,
            recipe: entry?.recipe ?? null,
            status: body.status,
            nonCooking: entry?.nonCooking ?? null,
          }
        );
      await emitSession();
    }
  );

  await page.route('**/api/schedule/*/smart-defaults**', async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    const url = new URL(route.request().url());
    const reference = readReference(url);
    if (!reference)
      return fulfill(route, { status: 400, json: { message: 'Invalid referenceWeekStartDate.' } });
    const offset = Number(url.pathname.split('/')[3]);
    await fulfill(route, { json: { data: readSmartDefaults(offset, reference) } });
  });

  // Recipe-derived checks share processing/publication order within this mock host.
  let groceryWrites = Promise.resolve();
  const processGroceryWrite = (operation: () => Promise<void>) => {
    const next = groceryWrites.then(operation);
    groceryWrites = next.catch(() => {});
    return next;
  };
  const groceryWeek = (route: Route) =>
    addDays(
      scheduleCalendar.currentWeekStartDate,
      Number(new URL(route.request().url()).pathname.split('/')[3]) * 7
    );
  const emitGroceryChecks = async (route: Route, checks: Record<string, boolean>) => {
    await page.evaluate(
      ({ weekOffset, weekStartDate, groceryState }) => {
        const source = (window as any).__sseSource as EventSource | undefined;
        source?.dispatchEvent(
          new MessageEvent('grocery_updated', {
            data: JSON.stringify({
              type: 'grocery_updated',
              weekOffset,
              weekStartDate,
              groceryState,
            }),
          })
        );
      },
      {
        weekOffset: Number(new URL(route.request().url()).pathname.split('/')[3]),
        weekStartDate: groceryWeek(route),
        groceryState: checks,
      }
    );
  };
  await page.route('**/api/schedule/*/grocery/item', async (route) => {
    if (route.request().method() !== 'PATCH') return route.fallback();
    await processGroceryWrite(async () => {
      const body = route.request().postDataJSON() as { ingredientName: string; checked: boolean };
      const week = groceryWeek(route);
      const checks = { ...(groceryChecks.get(week) ?? {}), [body.ingredientName]: body.checked };
      groceryChecks.set(week, checks);
      await fulfill(route, { status: 204 });
      await emitGroceryChecks(route, checks);
    });
  });

  await page.route('**/api/schedule/*/grocery', async (route) => {
    if (route.request().method() !== 'PATCH') return route.fallback();
    await processGroceryWrite(async () => {
      const checks = { ...(route.request().postDataJSON() as Record<string, boolean>) };
      groceryChecks.set(groceryWeek(route), checks);
      await fulfill(route, { status: 200, json: { data: checks } });
      await emitGroceryChecks(route, checks);
    });
  });

  // Stateful everyday grocery extras. These handlers intentionally preserve distinct
  // same-name occurrences and expose writes through subsequent schedule reads.
  await page.route(
    (url) => url.pathname === '/api/grocery-extras/suggestions',
    async (route) => {
      if (route.request().method() !== 'GET') return route.fallback();
      const query =
        new URL(route.request().url()).searchParams.get('query')?.trim().toLowerCase() ?? '';
      if (query.length < 2)
        return fulfill(route, { status: 400, json: { message: 'Enter two characters.' } });
      const outstanding = new Set(
        [...groceryExtras.values()]
          .filter((x) => !x.removed && !x.checked)
          .map((x) => x.normalizedKey)
      );
      const latestByName = new Map<string, MockExtra>();
      for (const occurrence of groceryExtras.values()) {
        const latest = latestByName.get(occurrence.normalizedKey);
        if (!latest || occurrence.version >= latest.version)
          latestByName.set(occurrence.normalizedKey, occurrence);
      }
      const seen = new Set<string>();
      const names = extraHistory
        .filter((name) => {
          const key = name.trim().toLowerCase().replace(/\s+/g, ' ');
          if (
            seen.has(key) ||
            outstanding.has(key) ||
            latestByName.get(key)?.removed ||
            !key.includes(query)
          )
            return false;
          seen.add(key);
          return true;
        })
        .sort(
          (a, b) =>
            Number(!a.toLowerCase().startsWith(query)) - Number(!b.toLowerCase().startsWith(query))
        )
        .slice(0, 3);
      await fulfill(route, { status: 200, json: { names } });
    }
  );
  await page.route('**/api/grocery-extras/*', async (route) => {
    const requestUrl = new URL(route.request().url());
    if (requestUrl.pathname.endsWith('/suggestions')) return route.fallback();

    const request = route.request();
    const id = decodeURIComponent(requestUrl.pathname.split('/').at(-1) ?? '');
    const current = groceryExtras.get(id);
    if (current?.removed)
      return fulfill(route, { status: 409, json: { message: 'Already removed.', absent: true } });
    if (!current) return fulfill(route, { status: 404, json: { message: 'Not found.' } });
    if (request.method() === 'PATCH') {
      const body = request.postDataJSON() as Record<string, unknown>;
      const fields = ['name', 'checked', 'grocerySection'].filter(
        (field) => body[field] !== undefined
      );
      if (
        fields.length !== 1 ||
        !Number.isInteger(body.expectedVersion) ||
        Number(body.expectedVersion) < 1 ||
        (fields[0] === 'name' &&
          (typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 200)) ||
        (fields[0] === 'grocerySection' &&
          ![
            'Produce',
            'Deli',
            'Bakery',
            'Meat',
            'Seafood',
            'Dairy & Eggs',
            'Frozen',
            'Pantry',
            'Beverages',
            'Grocery',
          ].includes(String(body.grocerySection)))
      )
        return fulfill(route, {
          status: 400,
          json: { message: 'Supply one valid current-week change.' },
        });
      if (
        body.weekStartDate !== current.occurrenceWeekStartDate ||
        current.occurrenceWeekStartDate !== scheduleCalendar.currentWeekStartDate ||
        body.expectedVersion !== current.version
      )
        return fulfill(route, {
          status: 409,
          json: { message: 'Changed elsewhere.', absent: false, current },
        });
      const updated = { ...current, version: current.version + 1 };
      if (typeof body.name === 'string') {
        updated.name = body.name.trim();
        updated.normalizedKey = updated.name.toLowerCase().replace(/\s+/g, ' ');
        extraHistory.unshift(updated.name);
      }
      if (typeof body.checked === 'boolean') updated.checked = body.checked;
      if (typeof body.grocerySection === 'string') updated.grocerySection = body.grocerySection;
      groceryExtras.set(id, updated);
      await emitExtras();
      return fulfill(route, { status: 200, json: updated });
    }
    if (request.method() === 'DELETE') {
      const url = new URL(request.url());
      const expected = Number(url.searchParams.get('expectedVersion'));
      if (!Number.isInteger(expected) || expected < 1)
        return fulfill(route, {
          status: 400,
          json: { message: 'expectedVersion must be positive.' },
        });
      if (
        url.searchParams.get('weekStartDate') !== current.occurrenceWeekStartDate ||
        current.occurrenceWeekStartDate !== scheduleCalendar.currentWeekStartDate
      )
        return fulfill(route, {
          status: 409,
          json: { message: 'Current occurrence required.', absent: false, current },
        });
      if (expected !== current.version)
        return fulfill(route, { status: 409, json: { message: 'Changed elsewhere.', current } });
      groceryExtras.set(id, { ...current, removed: true, version: current.version + 1 });
      await emitExtras();
      return fulfill(route, { status: 204 });
    }
    return route.fallback();
  });
  await page.route('**/api/grocery-extras', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    const body = route.request().postDataJSON() as {
      clientId?: string;
      name?: string;
      weekStartDate?: string;
    };
    const name = body.name?.trim() ?? '';
    if (
      !name ||
      name.length > 200 ||
      !body.clientId ||
      body.weekStartDate !== scheduleCalendar.currentWeekStartDate
    )
      return fulfill(route, {
        status: 400,
        json: { message: 'Current week and name are required.' },
      });
    const replay = body.clientId && extraSubmissions.get(body.clientId);
    if (replay) {
      if (replay.name !== name || replay.week !== body.weekStartDate)
        return fulfill(route, {
          status: 409,
          json: {
            message: 'Client identity belongs to another submission.',
            current: groceryExtras.get(replay.id),
          },
        });
      if (groceryExtras.get(replay.id)?.removed)
        return fulfill(route, {
          status: 409,
          json: { message: 'The extra was removed.', absent: true, current: null },
        });
      return fulfill(route, { status: 200, json: groceryExtras.get(replay.id) });
    }
    const id = body.clientId ?? crypto.randomUUID();
    const extra: MockExtra = {
      id,
      lineageId: id,
      name,
      normalizedKey: name.toLowerCase().replace(/\s+/g, ' '),
      grocerySection: 'Grocery',
      checked: false,
      occurrenceWeekStartDate: body.weekStartDate,
      readOnly: false,
      source: 'extra',
      version: 1,
    };
    groceryExtras.set(id, extra);
    if (body.clientId) extraSubmissions.set(body.clientId, { id, name, week: body.weekStartDate });
    extraHistory.unshift(name);
    await emitExtras();
    await fulfill(route, { status: 201, json: extra });
  });

  // Exact recovery is separate from the legacy merge mocks. Persist supported mock
  // facts, not live round identities; ordinary reads observe restored membership.
  type SavedRecovery = {
    members: typeof familyMembers;
    updates: Array<[string, Partial<RecipeDto>]>;
    schedule: Array<
      [string, { recipe: ScheduleRecipeDto | null; status: number; nonCooking?: any }]
    >;
    weeks: Array<[string, number]>;
    interest: Array<[string, { recipeId: string; week: string; count: number; selected: boolean }]>;
  };
  const recoverySnapshots = new Map<string, SavedRecovery>();
  let recoverySequence = 0;
  let restoredSnapshot: string | undefined;
  const recoveryReply = (route: Route, status: number, body: RecoveryResult) =>
    route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  const recoveryBusy = (route: Route) =>
    recoveryReply(route, 409, {
      state: 'busy',
      message: 'Recovery is coordinating household operations.',
    });

  await page.route('**/api/management/recovery/snapshots', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    if (recoveryOptions.busy) return recoveryBusy(route);
    const snapshotId =
      MOCK_IDS.RECOVERY_SNAPSHOT.slice(0, -12) + String(++recoverySequence).padStart(12, '0');
    recoverySnapshots.set(
      snapshotId,
      structuredClone({
        members: familyMembers,
        updates: [...recipeUpdates],
        schedule: [...scheduleEntries],
        weeks: [...weekStatuses],
        interest: [...history],
      })
    );
    return recoveryReply(route, 200, {
      state: 'completed',
      message: 'Independent snapshot published.',
      snapshotId,
    });
  });
  await page.route('**/api/management/recovery/restore/*', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    if (recoveryOptions.demoMode) return refuseDemoManagement(route);
    if (route.request().method() !== 'POST') return route.fallback();
    if (recoveryOptions.busy) return recoveryBusy(route);
    const id = new URL(route.request().url()).pathname.split('/').pop()!;
    const saved = recoverySnapshots.get(id);
    if (!saved)
      return recoveryReply(route, 400, {
        state: 'invalid',
        message: 'Snapshot manifest is missing.',
      });
    const restored = structuredClone(saved);
    familyMembers.splice(0, familyMembers.length, ...restored.members);
    recipeUpdates.clear();
    restored.updates.forEach(([key, value]) => recipeUpdates.set(key, value));
    scheduleEntries.clear();
    restored.schedule.forEach(([key, value]) => scheduleEntries.set(key, value));
    weekStatuses.clear();
    restored.weeks.forEach(([key, value]) => weekStatuses.set(key, value));
    history.clear();
    restored.interest.forEach(([key, value]) => history.set(key, value));
    liveVotes.clear();
    roundIds.clear();
    closeReceipts.clear();
    requiresIdentity.clear();
    activeRoundId = MOCK_IDS.VOTING_ROUND.slice(0, -12) + String(++roundSequence).padStart(12, '0');
    activeRoundWeek = null;
    historyGeneration++;
    const openWeeks = [...weekStatuses.values()].filter((status) => status === 1).length;
    for (const [week, status] of weekStatuses) {
      requiresIdentity.add(week);
      if (status === 1 && openWeeks === 1) {
        activeRoundWeek = week;
        roundIds.set(week, activeRoundId);
      }
    }
    restoredSnapshot = id;
    return recoveryReply(route, 200, {
      state: 'completed',
      message: 'Exact state restored.',
      snapshotId: id,
    });
  });
  await page.route('**/api/management/recovery/resume', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    if (recoveryOptions.busy) return recoveryBusy(route);
    return recoveryReply(route, 200, {
      state: 'available',
      message: 'No interrupted restore.',
      snapshotId: restoredSnapshot,
    });
  });
  await page.route('**/api/management/recovery/status', async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    return recoveryReply(route, 200, {
      state: 'available',
      message: 'Online recovery configured.',
      snapshotId: restoredSnapshot,
    });
  });
  if (recoveryOptions.busy) {
    await page.route('**/api/**', async (route) => {
      if (
        ['GET', 'HEAD'].includes(route.request().method()) ||
        new URL(route.request().url()).pathname.startsWith('/api/management/recovery/')
      )
        return route.fallback();
      return fulfill(route, {
        status: 503,
        headers: { 'Retry-After': '5' },
        contentType: 'application/json',
        body: JSON.stringify({
          errorCode: 'RECOVERY_BUSY',
          message: 'Retry after recovery coordination.',
        }),
      });
    });
  }

  // POST /api/management/backup
  await page.route('**/api/management/backup', async (route) => {
    await fulfill(route, {
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ taskId: MOCK_IDS.RECIPE_LASAGNA }),
    });
  });

  // POST /api/management/disaster-recovery
  await page.route('**/api/management/disaster-recovery', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    if (recoveryOptions.demoMode) return refuseDemoManagement(route);
    await fulfill(route, {
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ taskId: MOCK_IDS.RECIPE_LASAGNA }),
    });
  });

  // POST /api/management/backfill-search
  await page.route('**/api/management/backfill-search', async (route) => {
    await fulfill(route, {
      status: 202,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Search index backfill triggered in the background.' }),
    });
  });

  // POST /api/management/seed
  await page.route('**/api/management/seed', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    if (recoveryOptions.demoMode) return refuseDemoManagement(route);
    await fulfill(route, {
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ taskId: MOCK_IDS.RECIPE_LASAGNA }),
    });
  });

  // POST /api/management/demo-capture
  await page.route('**/api/management/demo-capture', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    if (recoveryOptions.demoMode) return refuseDemoManagement(route);
    await fulfill(route, {
      status: 202,
      contentType: 'application/json',
      body: JSON.stringify({
        message: 'Demo capture task enqueued.',
        taskId: MOCK_IDS.RECIPE_LASAGNA,
      }),
    });
  });

  // POST /api/management/demo-restore
  await page.route('**/api/management/demo-restore', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    if (recoveryOptions.demoMode) return refuseDemoManagement(route);
    await fulfill(route, {
      status: 202,
      contentType: 'application/json',
      body: JSON.stringify({
        message: 'Demo restore task enqueued.',
        taskId: MOCK_IDS.RECIPE_LASAGNA,
      }),
    });
  });

  // GET /api/management/status
  await page.route('**/api/management/status', async (route) => {
    await fulfill(route, {
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        workflowId: MOCK_IDS.RECIPE_LASAGNA,
        workflowType: 'demo-restore',
        status: 0,
        createdAt: FIXED_E2E_TIMESTAMP,
        updatedAt: FIXED_E2E_TIMESTAMP,
        demoSnapshotReady: true,
        demoSnapshotMissing: [],
        demoRestoreSeederHealthy: recoveryOptions.demoMode ?? false,
        demoRestoreSeederErrorCode: recoveryOptions.demoMode ? null : 'DEMO_DISABLED',
        demoRestoreCronValid: true,
        demoSnapshotErrorCode: null,
        demoBaselineId: MOCK_IDS.RECIPE_LASAGNA,
        demoRecoveryState: 'available',
        demoNextRestoreAt: recoveryOptions.demoMode ? FIXED_E2E_TIMESTAMP : null,
        demoLastResetTaskId: MOCK_IDS.RECIPE_LASAGNA,
        demoLastResetStatus: 'Completed',
      }),
    });
  });

  // GET /api/workflows/instances/{instanceId}
  await page.route('**/api/workflows/instances/*', async (route) => {
    await fulfill(route, {
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: MOCK_IDS.RECIPE_LASAGNA,
        workflowId: 'recipe-import',
        status: 'Completed',
        createdAt: FIXED_E2E_TIMESTAMP,
        updatedAt: FIXED_E2E_TIMESTAMP,
        tasks: [],
      }),
    });
  });

  // GET /api/workflows/tasks/{taskId}/diagnostics
  await page.route('**/api/workflows/tasks/*/diagnostics', async (route) => {
    await fulfill(route, {
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          taskId: MOCK_IDS.RECIPE_LASAGNA,
          instanceId: MOCK_IDS.RECIPE_LASAGNA,
          workflowId: 'recipe-import',
          taskName: 'extract-recipe',
          processorName: 'RecipeExtractionProcessor',
          status: 'Failed',
          retryCount: 1,
          errorMessage: 'The extractor returned no steps.',
          stackTrace: 'System.InvalidOperationException: missing steps',
          createdAt: FIXED_E2E_TIMESTAMP,
          updatedAt: FIXED_E2E_TIMESTAMP,
        },
      }),
    });
  });

  // POST /api/workflows/tasks/{taskId}/reset
  await page.route('**/api/workflows/tasks/*/reset', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    const taskId = new URL(route.request().url()).pathname.split('/').at(-2)!;
    if (recoveryOptions.demoMode && recoveryOptions.demoManagementTaskIds?.includes(taskId))
      return refuseDemoManagement(route);
    await fulfill(route, {
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { success: true } }),
    });
  });

  // GET /api/workflows/active
  await page.route('**/api/workflows/active', async (route) => {
    await fulfill(route, {
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    });
  });

  // POST /api/workflows/{workflowId}/trigger
  await page.route('**/api/workflows/*/trigger', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    const workflow = new URL(route.request().url()).pathname.split('/').at(-2);
    if (
      recoveryOptions.demoMode &&
      ['demo-capture', 'demo-restore', 'db-restore', 'db-disaster-recovery'].includes(workflow!)
    )
      return refuseDemoManagement(route);
    await fulfill(route, {
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ instanceId: MOCK_IDS.RECIPE_LASAGNA }),
    });
  });

  // GET /api/health
  await page.route('**/api/health', async (route) => {
    await fulfill(route, {
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'Healthy',
        timestamp: FIXED_E2E_TIMESTAMP,
        checks: {},
        demoMode: recoveryOptions.demoMode ?? false,
        demoModeRawValue: recoveryOptions.demoMode ? 'true' : 'false',
        demoRestoreCronValid: true,
      }),
    });
  });

  // GET /api/stream — SSE endpoint
  //
  // BS-10 NOTE: route.fulfill() closes the HTTP response immediately after the body is sent.
  // This causes the browser's EventSource to see a dropped connection and automatically
  // reconnect. The reconnect loop is harmless because every reconnect receives the same
  // `connected` event with the same snapshot. Tests that assert on UI state MUST do so
  // AFTER the `connected` event has been processed (use waitFor on the resulting DOM state,
  // not on connection state). Do NOT assert on the EventSource being "open" — it will
  // always be in a reconnecting state after fulfill() closes the response.
  await page.route(/\/(?:backend\/)?api\/stream/, async (route) => {
    await fulfill(route, {
      status: 200,
      contentType: 'text/event-stream',
      headers: {
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
      body: buildSseBody([
        buildSseFrame('connected', {
          type: 'connected',
          schedule: makeSchedule(0, scheduleCalendar.referenceWeekStartDate),
          demoGeneration: generation(),
        }),
      ]),
    });
  });

  // PATCH /api/ingredients/{normalizedKey}/category
  await page.route('**/api/ingredients/*/category', async (route) => {
    if (route.request().method() === 'PATCH') {
      await fulfill(route, { status: 204 });
    } else {
      await route.continue();
    }
  });

  // GET /api/goto and PUT /api/goto
  // Per-test in-memory store for GOTO items

  await page.route('**/api/goto', async (route) => {
    if (route.request().method() === 'GET') {
      await fulfill(route, {
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { items: gotoItems } }),
      });
    } else if (route.request().method() === 'PUT') {
      const body = route.request().postDataJSON();
      gotoItems = body.items || [];
      await fulfill(route, {
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: body }),
      });
    } else {
      await route.fallback();
    }
  });

  // GET /api/goto/active
  await page.route('**/api/goto/active', async (route) => {
    const readyItem = gotoItems.find((i) => i.status === 'ready');
    if (readyItem) {
      await fulfill(route, {
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: readyItem }),
      });
    } else {
      await fulfill(route, {
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Not found' }),
      });
    }
  });

  // GET /api/settings/{key} and POST /api/settings/{key}
  // Per-test in-memory store (reset each time setupCommonRoutes is called in beforeEach)
  const settingsStore: Record<string, unknown> = {
    // family_goto is now handled via /api/goto
  };
  await page.route('**/api/settings/*', async (route) => {
    const key = new URL(route.request().url()).pathname.split('/').pop()!;
    if (route.request().method() === 'GET') {
      if (settingsStore[key] == null) {
        await fulfill(route, {
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: { key, value: null } }),
        });
      } else {
        await fulfill(route, {
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: { key, value: settingsStore[key] } }),
        });
      }
    } else {
      const body = route.request().postDataJSON();
      settingsStore[key] = body.value;
      await fulfill(route, {
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { key, value: body.value } }),
      });
    }
  });

  // GET /api/captures/failures (Task 18)
  await page.route('**/api/captures/failures', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }
    await fulfill(route, {
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { items: [] } }),
    });
  });

  // POST /api/captures/failures/*/retry (Task 18)
  await page.route('**/api/captures/failures/*/retry', async (route) => {
    await fulfill(route, {
      status: 202,
      contentType: 'application/json',
      body: JSON.stringify({ data: { queued: true } }),
    });
  });

  // DELETE /api/captures/failures/{id} (Task 18)
  await page.route('**/api/captures/failures/*', async (route) => {
    if (route.request().method() !== 'DELETE') {
      await route.fallback();
      return;
    }
    await fulfill(route, {
      status: 202,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          cleared: true,
          cleanupCommandId: MOCK_IDS.CLEANUP_COMMAND,
        },
      }),
    });
  });

  // Register last so demo POST refusal precedes ordinary stateful mutations.
  if (recoveryOptions.demoMode) {
    for (const pattern of [
      '**/api/recipes',
      '**/api/recipes/capture-pdf',
      '**/api/recipes/capture-url',
      '**/api/recipes/describe',
      '**/api/recipes/*/originals',
      '**/api/recipes/*/hero/regenerate',
      '**/api/recipes/imports/bulk',
      '**/api/recipes/*/import-report',
      '**/api/captures/failures/*/retry',
    ]) {
      await page.route(pattern, async (route) => {
        if (route.request().method() !== 'POST') return route.fallback();
        return fulfill(route, {
          status: 403,
          json: {
            status: 403,
            code: 'DEMO_AI_UNAVAILABLE',
            message:
              'AI capture and generation are unavailable in Demo Mode. Explore the prepared recipes instead.',
          },
        });
      });
    }
  }
  if (recoveryOptions.demoMode) {
    await page.route('**/api/**', async (route) => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      const mutation =
        !['GET', 'HEAD', 'OPTIONS'].includes(request.method()) && path !== '/api/recipes/search';
      const guardedElsewhere =
        path.startsWith('/api/management/') ||
        path.startsWith('/api/workflows/') ||
        (request.method() === 'POST' &&
          (path === '/api/recipes' ||
            /\/(capture-pdf|capture-url|describe|originals|regenerate|import-report|retry)$/.test(
              path
            ) ||
            path === '/api/recipes/imports/bulk'));
      if (mutation && !guardedElsewhere && request.headers()['x-demo-generation'] !== generation())
        return fulfill(route, {
          status: 412,
          json: {
            status: 412,
            code: 'DEMO_RESET_REQUIRED',
            message: 'The demo has reset. Refresh before continuing.',
            generation: generation(),
          },
        });
      return route.fallback();
    });
  }
}

// ---------------------------------------------------------------------------
// SSE mock helpers — exported for per-test overrides
// ---------------------------------------------------------------------------
//
// All helpers override the /api/stream route for the given page. They always
// emit the `connected` event first (with the default 7-day empty schedule),
// then the target event, in a single body string. This satisfies the
// EventSource contract: the client receives the snapshot before any push.
//
// BS-10 REMINDER: route.fulfill() closes the connection. EventSource will
// reconnect automatically. Tests must assert on DOM state (via waitFor),
// not on connection state. The reconnect loop is harmless — every reconnect
// receives the same `connected` event.

/**
 * Mocks the SSE stream to emit a `slot_updated` event after the initial
 * `connected` snapshot. Use this to simulate a recipe being assigned or
 * removed from a specific day slot.
 *
 * @param page - Playwright Page instance
 * @param slotUpdate - The slot update payload: date (YYYY-MM-DD), recipe (or null), status
 */
export async function mockSseWithSlotUpdate(
  page: Page,
  slotUpdate: { date: string; recipe: ScheduleRecipeDto | null; status: number }
): Promise<void> {
  await page.route(/\/(?:backend\/)?api\/stream/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      headers: {
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
      body: buildSseBody([
        buildConnectedEvent(),
        buildSseFrame('slot_updated', { type: 'slot_updated', ...slotUpdate }),
      ]),
    });
  });
}

/**
 * Mocks the SSE stream to emit a `week_updated` event after the initial
 * `connected` snapshot. Use this to simulate a full week snapshot push
 * (e.g. after lock, voting open, or move).
 *
 * Returns a `triggerWeekUpdated` function. Call it *after* `page.goto()`
 * and after a stable element is visible — this guarantees useScheduleStream
 * is mounted and `window.__sseSource` is set before the event fires,
 * eliminating the mount-race that caused flaky failures on CI.
 *
 * @param page - Playwright Page instance
 * @param schedule - The full ScheduleDays snapshot to push
 * @returns triggerWeekUpdated - call after page navigation to fire the event
 */
export async function mockSseWithWeekUpdate(
  page: Page,
  schedule: ScheduleDays
): Promise<{ triggerWeekUpdated: () => Promise<void> }> {
  await page.route(/\/(?:backend\/)?api\/stream/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      headers: {
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
      body: buildSseBody([buildConnectedEvent()]),
    });
  });

  const triggerWeekUpdated = async () => {
    await page.evaluate(
      (sched) => {
        const source = (window as unknown as Record<string, EventSource>).__sseSource;
        if (!source) throw new Error('__sseSource not found — useScheduleStream not mounted yet');
        const event = new MessageEvent('week_updated', {
          data: JSON.stringify({ type: 'week_updated', schedule: sched }),
        });
        source.dispatchEvent(event);
      },
      schedule as unknown as Record<string, unknown>
    );
  };

  return { triggerWeekUpdated };
}

/**
 * Mocks the SSE stream to emit a `slot_updated` event representing an
 * "Take Out" action (recipe: null, status: 3) for the given date.
 *
 * @param page - Playwright Page instance
 * @param date - The date string (YYYY-MM-DD) of the ordered-in slot
 */
export async function mockSseWithOrderIn(page: Page, date: string): Promise<void> {
  await page.route(/\/(?:backend\/)?api\/stream/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      headers: {
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
      body: buildSseBody([
        buildConnectedEvent(),
        buildSseFrame('slot_updated', { type: 'slot_updated', date, recipe: null, status: 3 }),
      ]),
    });
  });
}

/**
 * Mocks the SSE stream to emit a `fill_the_gap_invalidated` event after the
 * initial `connected` snapshot. Use this to simulate a recipe being assigned
 * or removed, invalidating any open Quick Find modal's suggestion list.
 *
 * @param page - Playwright Page instance
 * @param weekOffset - The week offset that was invalidated (defaults to 0)
 */
export async function mockSseWithFillTheGapInvalidated(page: Page, weekOffset = 0): Promise<void> {
  await page.route(/\/(?:backend\/)?api\/stream/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      headers: {
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
      body: buildSseBody([
        buildConnectedEvent(),
        buildSseFrame('fill_the_gap_invalidated', {
          type: 'fill_the_gap_invalidated',
          weekOffset,
          weekStartDate: builders.scheduleDays(weekOffset).weekStartDate,
        }),
      ]),
    });
  });
}

/**
 * Mocks the SSE stream to emit a `smart_defaults_updated` event after the
 * initial `connected` snapshot. Use this to simulate the smart-defaults
 * threshold being crossed and pre-selected recipes being pushed to clients.
 *
 * @param page - Playwright Page instance
 * @param defaults - The SmartDefaultsDto payload to push
 */
export async function mockSseWithSmartDefaultsUpdated(
  page: Page,
  defaults: SmartDefaultsDto
): Promise<void> {
  await page.route(/\/(?:backend\/)?api\/stream/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      headers: {
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
      body: buildSseBody([
        buildConnectedEvent(),
        buildSseFrame('smart_defaults_updated', {
          type: 'smart_defaults_updated',
          weekOffset: defaults.weekOffset ?? 0,
          defaults: {
            ...defaults,
            weekStartDate:
              defaults.weekStartDate ??
              builders.scheduleDays(defaults.weekOffset ?? 0).weekStartDate,
          },
        }),
      ]),
    });
  });
}

/**
 * Mocks the SSE stream to emit a `recipe_ready` event after the initial
 * `connected` snapshot. Use this to simulate a GOTO recipe synthesis
 * completing — replaces the polling-based GOTO status check.
 *
 * The `connected` event is emitted first so the store is seeded before the
 * `recipe_ready` event arrives. Both frames are sent in a single body string
 * (BS-10: route.fulfill() closes the connection; EventSource reconnects, but
 * the UI state is already set from the first connection's events).
 *
 * @param page     - Playwright Page instance
 * @param recipeId - The recipe ID that has finished synthesis
 * @param readSchedule - Reads current saved state for each connection, including reconnects
 */
export async function mockSseWithRecipeReady(
  page: Page,
  recipeId: string,
  readSchedule: () => ScheduleDays = buildDefaultConnectedSchedule
): Promise<void> {
  await page.route(/\/(?:backend\/)?api\/stream/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      headers: {
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
      body: buildSseBody([
        buildConnectedEvent(readSchedule()),
        buildSseFrame('recipe_ready', { type: 'recipe_ready', recipeId }),
      ]),
    });
  });
}

/**
 * Mocks the SSE stream to emit a `vote_updated` event after the initial
 * `connected` snapshot. Use this to simulate a family member voting on a
 * discovery recipe — triggers `hasFamilyInterest` update and re-ranking in
 * `discoveryStore.applyVoteUpdate`.
 *
 * @param page      - Playwright Page instance
 * @param recipeId  - The recipe ID that received the vote
 * @param voteCount - The new total vote count for the recipe
 */
export async function mockSseWithVoteUpdated(
  page: Page,
  recipeId: string,
  voteCount: number
): Promise<void> {
  await page.route(/\/(?:backend\/)?api\/stream/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      headers: {
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
      body: buildSseBody([
        buildConnectedEvent(),
        buildSseFrame('vote_updated', { type: 'vote_updated', recipeId, voteCount }),
      ]),
    });
  });
}

/**
 * Hold a native SSE response until the caller has observed the loaded checklist.
 * The schedule GET owns initial state in this fixture; an unrelated empty
 * connected snapshot would overwrite its rows. Deliver one grocery frame only,
 * then answer reconnects with 204 so the finite response cannot replay state.
 */
export async function mockSseWithGroceryUpdated(
  page: Page,
  weekOffset: number,
  groceryState: Record<string, boolean>
): Promise<{ triggerGroceryUpdated: () => Promise<void> }> {
  let requested!: (route: Route) => void;
  const streamRequested = new Promise<Route>((resolve) => {
    requested = resolve;
  });
  let claimed = false;
  await page.route(/\/(?:backend\/)?api\/stream/, async (route) => {
    if (claimed) return route.fulfill({ status: 204 });
    claimed = true;
    requested(route);
  });
  return {
    triggerGroceryUpdated: async () => {
      const route = await streamRequested;
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        headers: {
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no',
        },
        body: buildSseFrame('grocery_updated', {
          type: 'grocery_updated',
          weekOffset,
          weekStartDate: builders.scheduleDays(weekOffset).weekStartDate,
          groceryState,
        }),
      });
    },
  };
}

export async function mockSseWithGroceryExtrasUpdated(
  page: Page,
  weekStartDate: string,
  groceryExtras: ReturnType<typeof builders.groceryExtra>[]
): Promise<void> {
  await page.route(/\/(?:backend\/)?api\/stream/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      headers: { 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' },
      body: buildSseBody([
        buildConnectedEvent(),
        buildSseFrame('grocery_extras_updated', {
          type: 'grocery_extras_updated',
          weekStartDate,
          groceryExtras,
        }),
      ]),
    });
  });
}

/**
 * Mocks the SSE stream to emit an enriched `recipe_ready` event (with name
 * and imageUrl) after the initial `connected` snapshot.
 *
 * Use this to test the MinimalCapture success screen transition from "queued"
 * to "ready" — the enriched payload is required so the screen can show
 * "[Name] is ready!" and `captureStore.addPending` is matched by recipeId.
 *
 * @param page      - Playwright Page instance
 * @param recipeId  - The recipe ID that has finished synthesis
 * @param name      - The recipe name to display in the ready heading
 * @param imageUrl  - Optional hero image URL
 */
export async function mockSseWithRecipeReadyEnriched(
  page: Page,
  recipeId: string,
  name: string,
  imageUrl?: string
): Promise<void> {
  await page.route(/\/(?:backend\/)?api\/stream/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      headers: {
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
      body: buildSseBody([
        buildConnectedEvent(),
        buildSseFrame('recipe_ready', {
          type: 'recipe_ready',
          recipeId,
          name,
          imageUrl: imageUrl ?? null,
        }),
      ]),
    });
  });
}

/**
 * Mocks the SSE stream to emit a `recipe_failed` event after the initial
 * `connected` snapshot. Use this to test the RecipeFailureBanner appearing
 * when a recipe synthesis workflow fails (all retries exhausted).
 *
 * The `recipe_failed` handler in `useScheduleStream` only pushes a notification
 * if the recipe is in `captureStore.pendingRecipes`. Tests must seed the store
 * via `page.evaluate` before navigating.
 *
 * @param page         - Playwright Page instance
 * @param recipeId     - The recipe ID that failed synthesis
 * @param errorMessage - Human-readable error description
 * @param failedStep   - The workflow step that failed
 * @param partialData  - Optional partial recipe data (name, imageUrl) recovered before failure
 */
export async function mockSseWithRecipeFailed(
  page: Page,
  recipeId: string,
  errorMessage: string,
  failedStep: string,
  partialData?: { name?: string; imageUrl?: string }
): Promise<void> {
  await page.route(/\/(?:backend\/)?api\/stream/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      headers: {
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
      body: buildSseBody([
        buildConnectedEvent(),
        buildSseFrame('recipe_failed', {
          type: 'recipe_failed',
          recipeId,
          errorMessage,
          failedStep,
          partialData: partialData ?? null,
        }),
      ]),
    });
  });
}

/** Stateful schedule boundary for non-cooking planner acceptance. */
export async function mockNonCookingSchedule(
  page: Page,
  schedule: import('../src/lib/api/generated/models').ScheduleDays
) {
  await mockSseWithConnectedSchedule(page, schedule);
  await page.route('**/api/schedule**', async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    const days = schedule.days ?? [];
    const date = url.pathname.match(/\/day\/([^/]+)\//)?.[1];
    const day = days.find((item) => item.date === date);
    if (url.pathname === '/api/schedule' && method === 'GET') {
      await route.fulfill({ json: { data: schedule } });
      return;
    }
    if (url.pathname.endsWith('/smart-defaults')) {
      await route.fulfill({
        json: {
          data: {
            weekOffset: schedule.weekOffset,
            familySize: 3,
            consensusThreshold: 2,
            preSelectedRecipes: [],
            openSlots: days.flatMap((item, dayIndex) =>
              item.status !== 3 && !item.recipe ? [{ dayIndex }] : []
            ),
            consensusRecipesCount: 0,
          },
        },
      });
      return;
    }
    if (url.pathname.endsWith('/validate') && method === 'POST' && day) {
      if (day.recipe) {
        await route.fulfill({ status: 409, json: { status: 409, message: 'Day occupied' } });
        return;
      }
      const body = route.request().postDataJSON();
      day.status = body.status;
      day.nonCooking = body.nonCooking ?? day.nonCooking ?? { kind: 'order_in', customLabel: null };
      day.recipe = null;
      await route.fulfill({
        json: { data: { message: 'Day validated', mealMarkedCooked: false } },
      });
      return;
    }
    if (url.pathname.endsWith('/remove') && method === 'DELETE' && day) {
      day.status = 0;
      day.recipe = null;
      day.nonCooking = null;
      await route.fulfill({ status: 204 });
      return;
    }
    if (url.pathname.endsWith('/voting/open') && method === 'POST') {
      schedule.status = 1;
      schedule.locked = false;
      await route.fulfill({ json: { data: { message: 'Voting opened' } } });
      return;
    }
    if (url.pathname.endsWith('/lock') && method === 'POST') {
      schedule.status = 2;
      schedule.locked = true;
      for (const item of days) if (item.status !== 3) item.status = 1;
      await route.fulfill({ json: { data: { message: 'Schedule locked' } } });
      return;
    }
    if (url.pathname.endsWith('/move') && method === 'POST') {
      const body = route.request().postDataJSON();
      const source = days[body.fromIndex],
        target = days[body.toIndex];
      if (source && target) {
        for (const field of ['recipe', 'status', 'nonCooking'] as const) {
          const value = source[field];
          (source as any)[field] = target[field];
          (target as any)[field] = value;
        }
      }
      await route.fulfill({ json: { data: { message: 'Recipe moved' } } });
      return;
    }
    if (url.pathname.endsWith('/assign') && method === 'POST') {
      const body = route.request().postDataJSON();
      const target = days[body.dayIndex];
      if (target) {
        target.recipe = builders.scheduleRecipe({ id: body.recipeId });
        target.status = 0;
        target.nonCooking = null;
      }
      await route.fulfill({
        json: { data: { message: 'Recipe assigned', displacedRecipe: null } },
      });
      return;
    }
    await route.fallback();
  });
  return schedule;
}

async function refuseDemoManagement(route: import('@playwright/test').Route) {
  return route.fulfill({
    status: 403,
    json: {
      status: 403,
      code: 'DEMO_MANAGEMENT_UNAVAILABLE',
      message:
        'Baseline capture and manual household restores are unavailable in Demo Mode. Demo resets run on the automatic schedule.',
    },
  });
}
