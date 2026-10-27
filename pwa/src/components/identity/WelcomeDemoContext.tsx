'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useInstallIdentity } from './IdentityHint';
import { DemoExplanation } from './DemoExplanation';
import {
  acknowledgeContext,
  readContextAcknowledgement,
  type ContextMode,
} from '@/store/demoContextStore';

/** Manual login presentation never mounts Home's entry/interaction observers. */
export function WelcomeDemoContext() {
  const { demo, channel } = useInstallIdentity();
  const mode = demo ? 'demo' : channel === 'beta' ? 'beta' : null;
  return mode ? (
    <WelcomeExplanation key={mode} mode={mode} beta={mode === 'demo' && channel === 'beta'} />
  ) : null;
}

function WelcomeExplanation({ beta, mode }: { beta: boolean; mode: ContextMode }) {
  const pathname = usePathname();
  const [openPath, setOpenPath] = useState<string | null>(null);
  useEffect(() => {
    readContextAcknowledgement(mode);
  }, [mode]);
  return (
    <DemoExplanation
      open={openPath === pathname}
      beta={beta}
      mode={mode}
      onOpen={() => setOpenPath(pathname)}
      onDismiss={() => {
        setOpenPath(null);
        acknowledgeContext(mode);
      }}
    />
  );
}
