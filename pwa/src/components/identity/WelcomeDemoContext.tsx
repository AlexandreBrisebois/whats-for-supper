'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useInstallIdentity } from './IdentityHint';
import { DemoExplanation } from './DemoExplanation';
import { acknowledgeDemoContext, readDemoContextAcknowledgement } from '@/store/demoContextStore';

/** Manual login presentation never mounts Home's entry/interaction observers. */
export function WelcomeDemoContext() {
  const { demo, channel } = useInstallIdentity();
  return demo ? <WelcomeExplanation beta={channel === 'beta'} /> : null;
}

function WelcomeExplanation({ beta }: { beta: boolean }) {
  const pathname = usePathname();
  const [openPath, setOpenPath] = useState<string | null>(null);
  useEffect(() => {
    readDemoContextAcknowledgement();
  }, []);
  return (
    <DemoExplanation
      open={openPath === pathname}
      beta={beta}
      onOpen={() => setOpenPath(pathname)}
      onDismiss={() => {
        setOpenPath(null);
        acknowledgeDemoContext();
      }}
    />
  );
}
