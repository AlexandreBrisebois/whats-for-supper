'use client';

import { useLayoutEffect, useRef } from 'react';
import {
  readErrorReportingEnabled,
  reportBrowserError,
  reportBrowserObservation,
} from '@/lib/telemetry/actions';
import { observeBoundaryError, retireBoundaryError } from '@/lib/telemetry/errors';
import {
  errorReportingInitialized,
  observeOpening,
  observeErrorPresentation,
} from '@/lib/telemetry/opening';

const initializations = new WeakMap<Document, Promise<void>>();
function initialize(owner: Document): Promise<void> {
  let pending = initializations.get(owner);
  if (!pending) {
    pending = new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        observeOpening(owner, false, null, async () => {});
        resolve();
      }, 2000);
      void readErrorReportingEnabled()
        .then((enabled) => {
          clearTimeout(timer);
          observeOpening(owner, enabled, null, async () => {});
          resolve();
        })
        .catch(() => {
          clearTimeout(timer);
          observeOpening(owner, false, null, async () => {});
          resolve();
        });
    });
    initializations.set(owner, pending);
  }
  return pending;
}

// Snapshot in the commit before the ordinary observer's passive fallback
// presentation. No LocaleProvider, IdentityValidator or observer is needed.
export function useBoundaryError(error: unknown): () => void {
  const current = useRef<{ error: unknown; token: object; active: boolean } | null>(null);
  useLayoutEffect(() => {
    if (!current.current || current.current.error !== error) {
      if (current.current) retireBoundaryError(document, current.current.token);
      current.current = { error, token: {}, active: true };
    }
    const episode = current.current;
    episode.active = true;
    const timestamp = Date.now();
    const initialized = errorReportingInitialized(document);
    const report = () => {
      if (episode.active) {
        observeBoundaryError(
          document,
          error,
          episode.token,
          reportBrowserError,
          timestamp,
          !initialized
        );
        observeErrorPresentation(document, reportBrowserObservation);
      }
    };
    if (initialized) report();
    else
      void initialize(document)
        .then(report)
        .catch(() => {});
    return () => {
      episode.active = false;
      // Effect replay reactivates the token before this microtask. Real removal
      // retires overlap state without permanently suppressing a reused Error.
      queueMicrotask(() => {
        if (!episode.active) retireBoundaryError(document, episode.token);
      });
    };
  }, [error]);
  return () => {
    const episode = current.current;
    if (episode) {
      episode.active = false;
      retireBoundaryError(document, episode.token);
      current.current = null;
    }
  };
}
