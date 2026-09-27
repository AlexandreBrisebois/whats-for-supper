import { SettingsPageContent } from './SettingsPageContent';

export const dynamic = 'force-dynamic';

export { SettingsPageContent } from './SettingsPageContent';

interface BuildVersionEnvironment {
  WFS_VERSION?: string;
  TAG?: string;
}

export function getBuildVersion(environment: BuildVersionEnvironment): string | undefined {
  return environment.WFS_VERSION?.trim() || environment.TAG?.trim();
}

export default function SettingsPage() {
  const buildVersion = getBuildVersion({
    WFS_VERSION: process.env.WFS_VERSION,
    TAG: process.env.TAG,
  });

  return <SettingsPageContent buildVersion={buildVersion} />;
}
