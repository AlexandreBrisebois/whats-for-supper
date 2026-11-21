'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { getRecipe } from '@/lib/api/recipes';

interface TitleSession {
  scope: string;
  retired: boolean;
  allowed: Set<string>;
  titles: Map<string, string | null>;
  pending: Map<string, Promise<string | null>>;
  attempted: Map<string, number>;
}

/** Metadata only: a week/session-scoped fallback for contributors absent from Planner. */
export function useGroceryRecipeTitles(
  scope: string,
  contributorIds: string[],
  openIds: string[],
  openAttempt: number,
  loadedNames: Record<string, string>,
  blocked: boolean
) {
  const owner = useRef<TitleSession | null>(null);
  const membership = JSON.stringify([...new Set(contributorIds)].sort());
  const [resolved, setResolved] = useState<{
    scope: string;
    membership: string;
    titles: Record<string, string | null>;
  }>({ scope, membership, titles: {} });
  // Reset derived display state while rendering the new identity, before children
  // can expose an old week or a departed contributor. Network ownership stays in effects.
  if (resolved.scope !== scope || resolved.membership !== membership) {
    const allowed = new Set(contributorIds);
    setResolved({
      scope,
      membership,
      titles:
        resolved.scope === scope
          ? Object.fromEntries(Object.entries(resolved.titles).filter(([id]) => allowed.has(id)))
          : {},
    });
  }
  const requested = JSON.stringify([...new Set(openIds)]);
  const loaded = JSON.stringify(loadedNames);

  useLayoutEffect(() => {
    const session: TitleSession = {
      scope,
      retired: false,
      allowed: new Set(),
      titles: new Map(),
      pending: new Map(),
      attempted: new Map(),
    };
    owner.current = session;
    return () => {
      session.retired = true;
    };
  }, [scope]);

  useLayoutEffect(() => {
    const session = owner.current;
    if (!session || session.scope !== scope) return;
    session.allowed = new Set(JSON.parse(membership) as string[]);
    for (const id of session.attempted.keys()) {
      if (!session.allowed.has(id)) {
        session.titles.delete(id);
        session.attempted.delete(id);
        session.pending.delete(id);
      }
    }
  }, [scope, membership]);

  useEffect(() => {
    const session = owner.current;
    if (!session || session.retired || blocked) return;
    const names = JSON.parse(loaded) as Record<string, string>;
    for (const id of JSON.parse(requested) as string[]) {
      if (
        !session.allowed.has(id) ||
        names[id] ||
        typeof session.titles.get(id) === 'string' ||
        session.attempted.get(id) === openAttempt
      )
        continue;
      session.attempted.set(id, openAttempt);
      if (session.pending.has(id)) continue;
      const request = getRecipe(id).then(
        (recipe) => (recipe.id === id && recipe.name?.trim() ? recipe.name.trim() : null),
        () => null
      );
      session.pending.set(id, request);
      void request.then((title) => {
        if (session.pending.get(id) !== request) return;
        session.pending.delete(id);
        if (session.retired || !session.allowed.has(id)) return;
        session.titles.set(id, title);
        setResolved({ scope, membership, titles: Object.fromEntries(session.titles) });
      });
    }
  }, [scope, membership, requested, openAttempt, loaded, blocked]);

  return blocked ? {} : { ...(resolved.scope === scope ? resolved.titles : {}), ...loadedNames };
}
