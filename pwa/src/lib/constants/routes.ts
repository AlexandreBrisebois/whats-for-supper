export const ROUTES = {
  LANDING: '/',
  ONBOARDING: '/onboarding',
  HOME: '/home',
  CAPTURE: '/capture',
  CAPTURE_CONFIRM: '/capture/confirm',
  PLANNER: '/planner',
  DISCOVERY: '/discovery',
  PROFILE: '/profile',
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];
