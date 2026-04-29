export const ROUTES = {
  LANDING: '/',
  WELCOME: '/welcome',
  INVITE: '/invite',
  ONBOARDING: '/onboarding',
  HOME: '/home',
  CAPTURE: '/capture',
  CAPTURE_CONFIRM: '/capture/confirm',
  PLANNER: '/planner',
  DISCOVERY: '/discovery',
  PROFILE: '/profile',
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];
