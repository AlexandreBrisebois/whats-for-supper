'use client';

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { apiClient } from '@/lib/api/api-client';

type DemoModeState = { mode: boolean | null; loading: boolean; error: boolean; retry: () => void };
const normalMode: DemoModeState = { mode: false, loading: false, error: false, retry: () => {} };
const DemoModeContext = createContext<DemoModeState>(normalMode);

export const useDemoMode = () => useContext(DemoModeContext);

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<Omit<DemoModeState, 'retry'>>({
    mode: null,
    loading: true,
    error: false,
  });
  const pending = useRef<Promise<boolean> | null>(null);

  useEffect(() => {
    let active = true;
    pending.current ??= Promise.resolve()
      .then(() => apiClient.api.health.get())
      .then((health) => {
        if (typeof health?.demoMode !== 'boolean') throw new Error('Demo status unavailable');
        return health.demoMode;
      })
      .finally(() => {
        pending.current = null;
      });
    void pending.current
      .then((mode) => {
        if (active) setState({ mode, loading: false, error: false });
      })
      .catch(() => {
        if (active) setState({ mode: null, loading: false, error: true });
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  return (
    <DemoModeContext.Provider
      value={{
        ...state,
        retry: () => {
          setState({ mode: null, loading: true, error: false });
          setAttempt((value) => value + 1);
        },
      }}
    >
      {children}
    </DemoModeContext.Provider>
  );
}
