import {
  type RecipeDto,
  type RecipeShareBundleDto,
  RecipeDto_sourceTypeObject,
  type ScheduleRecipeDto,
  type ScheduleDays,
  type SmartDefaultsDto,
} from '../lib/api/generated/models/index';
import { type FamilyGetResponse_data } from '../lib/api/generated/api/family/index';
import { MOCK_IDS } from './mock-ids';
import type { CalendarContext } from '../lib/deployment-calendar';
import { REALISTIC_RECIPES, REALISTIC_SCHEDULE_RECIPES } from './realistic-recipes';

/**
 * Common date utilities for schedule mocking.
 */
/** Pins the test environment to a fixed Monday (May 4th, 2026) to prevent test drift. */
export const currentMonday = () => {
  const d = new Date('2026-05-04T12:00:00Z');
  return d;
};

export const toDateStr = (d: Date) => d.toISOString().split('T')[0];

/**
 * Schema-compliant builders for mock data.
 * These ensure that mock objects match the generated API client models.
 */
const deploymentCalendar = (overrides: Partial<CalendarContext> = {}): CalendarContext => ({
  timeZone: 'UTC',
  capturedAtUtc: '2026-05-04T12:00:00Z',
  today: '2026-05-04',
  currentWeekStartDate: '2026-05-04',
  referenceWeekStartDate: '2026-05-04',
  nextDayAtUtc: '2026-05-05T00:00:00Z',
  ...overrides,
});

export const builders = {
  deploymentCalendar,
  scheduleDays: (weekOffset = 0, calendar = deploymentCalendar()) => {
    const monday = new Date(`${calendar.referenceWeekStartDate}T00:00:00Z`);
    monday.setUTCDate(monday.getUTCDate() + 7 * weekOffset);
    return {
      weekOffset,
      calendar,
      weekStartDate: toDateStr(monday),
      locked: false,
      status: 0,
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => {
        const date = new Date(monday);
        date.setUTCDate(date.getUTCDate() + index);
        return { day, date: toDateStr(date), recipe: null as ScheduleRecipeDto | null, status: 0 };
      }),
      groceryState: {} as Record<string, boolean>,
    };
  },
  recipe: (overrides: Partial<RecipeDto> = {}): RecipeDto => {
    const base =
      overrides.id && REALISTIC_RECIPES[overrides.id]
        ? REALISTIC_RECIPES[overrides.id]
        : {
            id: MOCK_IDS.RECIPE_LASAGNA,
            name: 'Mock Recipe',
            description: 'A delicious mock recipe for testing.',
            imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c',
            totalTime: 'PT30M',
            category: 'Italian',
            rating: 0,
            isVegetarian: false,
            isDiscoverable: false,
            sourceType: RecipeDto_sourceTypeObject.Url,
            canReimport: true,
            imageCount: 0,
            finishedDishIndex: -1,
            sourceUrl: 'https://example.com/recipe',
            ingredients: ['Ingredient 1', 'Ingredient 2'],
            recipeInstructions: [
              {
                '@type': 'HowToSection',
                name: 'Instructions',
                itemListElement: [
                  { '@type': 'HowToStep', text: 'Step 1' },
                  { '@type': 'HowToStep', text: 'Step 2' },
                ],
              },
            ] as any,
            isReady: true,
            createdAt: new Date(),
          };
    return { ...base, ...overrides };
  },

  scheduleRecipe: (overrides: Partial<ScheduleRecipeDto> = {}): ScheduleRecipeDto => {
    const base =
      overrides.id && REALISTIC_SCHEDULE_RECIPES[overrides.id]
        ? REALISTIC_SCHEDULE_RECIPES[overrides.id]
        : {
            id: MOCK_IDS.RECIPE_LASAGNA,
            name: 'Mock Schedule Recipe',
            image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c',
            voteCount: 0,
            ingredients: [],
          };
    return { ...base, ...overrides };
  },

  familyMember: (overrides: Partial<FamilyGetResponse_data> = {}): FamilyGetResponse_data => ({
    id: MOCK_IDS.MEMBER_ALEX,
    name: 'Alex',
    browseViewMode: 'stack',
    preferredLanguage: 'en' as any,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  /**
   * Converts a list of ingredient display names into GroceryLineItemDto objects.
   * Each ingredient defaults to the 'Pantry' section unless a section map is provided.
   * Use this to populate `groceryItems` on mock schedule responses.
   */
  groceryItems: (
    names: string[],
    sectionMap: Record<string, string> = {}
  ): Array<{
    displayName: string;
    normalizedKey: string;
    section: string;
    quantity: number | null;
    unitText: string | null;
    recipeIds: string[];
  }> =>
    names.map((name) => ({
      displayName: name,
      normalizedKey: name.toLowerCase().replace(/\s+/g, '_'),
      section: sectionMap[name] ?? 'Pantry',
      quantity: null,
      unitText: null,
      recipeIds: [],
    })),

  recipeShareBundle: (overrides: Partial<RecipeShareBundleDto> = {}): RecipeShareBundleDto => ({
    version: '1.0',
    recipe: {
      name: 'Mock Recipe',
      description: 'A delicious mock recipe for testing.',
      ingredients: ['Ingredient 1', 'Ingredient 2'],
      instructions: [
        {
          name: 'Instructions',
          itemListElement: [{ text: 'Step 1' }, { text: 'Step 2' }],
        },
      ],
      totalTimeMinutes: 30,
      servings: 4,
      sourceUrl: 'https://example.com/recipe',
      sourceName: 'Example Kitchen',
      category: 'Italian',
      isSynthesized: false,
      notes: null,
      rating: null,
    },
    info: {
      exportedAtUtc: new Date('2026-05-14T16:00:00Z'),
      bundleSource: 'wfs-share' as any,
      appVersion: '0.1.0',
    },
    hero: {
      mimeType: 'image/jpeg',
      base64: 'ZmFrZS1oZXJv',
    },
    originals: [
      {
        mimeType: 'image/jpeg',
        base64: 'ZmFrZS1vcmlnaW5hbC0x',
      },
    ],
    ...overrides,
  }),
};
