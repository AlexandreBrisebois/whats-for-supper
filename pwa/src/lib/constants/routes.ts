export const ROUTES = {
  LANDING: '/',
  WELCOME: '/welcome',
  INVITE: '/invite',
  ONBOARDING: '/onboarding',
  HOME: '/home',
  CAPTURE: '/capture',
  PLANNER: '/planner',
  DISCOVERY: '/discovery',
  PROFILE: '/profile',
  PROFILE_SETTINGS: '/profile/settings',
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];
