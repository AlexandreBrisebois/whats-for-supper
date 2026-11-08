import { randomUUID, createHash } from 'node:crypto';
import { scalarQuantity } from '../src/testing/grocery-fixtures';

type Row = Record<string, any>;
type Snapshot = {
  weekStartDate: string;
  groceryListVersion: string;
  groceryItems: Row[];
  groceryState: Record<string, boolean>;
};
type State = Snapshot & {
  signature: string;
  initialized: boolean;
  baselines: Record<string, Row>;
  resetSummaryVersion: string | null;
};
const guid = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const version = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^[1-9][0-9]{0,19}$/.test(value) &&
  BigInt(value) <= 18446744073709551615n;
const next = (value: string) => String(BigInt(value) + 1n);

/** Method-sensitive recipe-row contract owner. Extras never enter this state. */
export function createGroceryRowState(checks: Map<string, Record<string, boolean>> = new Map()) {
  const weeks = new Map<string, State>();
  const retired = new Set<string>();
  const receipts = new Map<string, { hash: string; outcome: Record<string, any> }>();
  let replayed = false;
  const read = (week: string) => {
    let state = weeks.get(week);
    if (!state) {
      state = {
        weekStartDate: week,
        groceryListVersion: '1',
        groceryItems: [],
        groceryState: {},
        signature: '[]',
        initialized: false,
        baselines: {},
        resetSummaryVersion: null,
      };
      weeks.set(week, state);
    }
    return state;
  };
  const snapshot = (week: string): Snapshot => {
    const state = read(week);
    state.initialized = true;
    return structuredClone({
      weekStartDate: week,
      groceryListVersion: state.groceryListVersion,
      groceryItems: state.groceryItems,
      groceryState: state.groceryState,
    });
  };
  const decorate = (schedule: any) => {
    const week = String(schedule.weekStartDate);
    const state = read(week);
    const observed = checks.get(week) ?? state.groceryState;
    const incoming: Row[] = schedule.groceryItems ?? [];
    let reset = false;
    const nextBaselines: Record<string, Row> = {};
    const rows = incoming.map((row) => {
      const identity =
        row.demandIdentity ??
        JSON.stringify({
          fallback: row.normalizedKey ?? row.displayName,
          bucket: row.unitText ?? '',
        });
      const previous = state.groceryItems.find(
        (candidate) => candidate.demandIdentity === identity
      );
      let id = previous?.rowId ?? row.rowId;
      if (!guid(id) || (!previous && retired.has(id))) id = randomUUID();
      const amount =
        typeof row.quantity === 'number' ? scalarQuantity(row.quantity) : (row.quantity ?? null);
      const quantityChanged =
        previous &&
        (JSON.stringify(previous.quantity) !== JSON.stringify(amount) ||
          previous.quantityComplete !== row.quantityComplete);
      let checked = previous ? (observed[id] ?? false) : false;
      const baseline = state.baselines[id];
      if (
        checked &&
        baseline?.quantityComplete === true &&
        row.quantityComplete === true &&
        baseline.quantity &&
        amount &&
        baseline.unitText === row.unitText &&
        baseline.demandIdentity === identity
      ) {
        const min = amount.value ?? amount.min;
        const max = baseline.quantity.value ?? baseline.quantity.max;
        if (BigInt(min.n) * BigInt(max.d) > BigInt(max.n) * BigInt(min.d)) {
          checked = false;
          reset = true;
        }
      }
      // Fixture input checks can initialise a row but cannot invent a baseline.
      if (!previous && guid(row.rowId) && !retired.has(row.rowId)) checked = observed[id] ?? false;
      observed[id] = checked;
      if (checked && baseline) nextBaselines[id] = baseline;
      const checkChanged = previous && state.groceryState[id] !== (observed[id] ?? false);
      const result = {
        ...row,
        rowId: id,
        rowVersion: previous
          ? quantityChanged || checkChanged
            ? next(previous.rowVersion)
            : previous.rowVersion
          : '1',
        weekStartDate: week,
        source: 'recipe',
        demandIdentity: identity,
        quantity: amount,
      };
      // Keep source numeric operands intact for portions mocks; only identity is shared.
      row.rowId = result.rowId;
      row.demandIdentity = identity;
      return result;
    });
    const currentChecks = Object.fromEntries(
      rows.map((row) => [row.rowId, observed[row.rowId] ?? false])
    );
    // Reused source rows acquire identity metadata. Its insertion order must
    // not turn an unchanged projection into a new list version.
    const signature = JSON.stringify(
      rows.map(({ rowVersion, ...row }) =>
        Object.fromEntries(Object.entries(row).sort(([a], [b]) => a.localeCompare(b)))
      )
    );
    if (
      state.initialized &&
      (signature !== state.signature ||
        JSON.stringify(currentChecks) !== JSON.stringify(state.groceryState))
    )
      state.groceryListVersion = next(state.groceryListVersion);
    for (const row of state.groceryItems) retired.add(row.rowId);
    if (reset) state.resetSummaryVersion = randomUUID();
    else if (signature !== state.signature) state.resetSummaryVersion = null;
    Object.assign(state, {
      initialized: true,
      groceryItems: rows,
      groceryState: currentChecks,
      signature,
      baselines: nextBaselines,
    });
    if (schedule.groceryRefresh)
      schedule.groceryRefresh.resetSummaryVersion = state.resetSummaryVersion;
    checks.set(week, currentChecks);
    Object.assign(schedule, snapshot(week));
  };
  const mutate = (week: string, kind: 'item' | 'bulk', body: any) => {
    replayed = false;
    const conflict = (code: string, absent = false) => {
      const captured = snapshot(week);
      return {
        status: 409,
        json: {
          code,
          absent,
          current: {
            updatedAt: '2026-05-04T12:00:00Z',
            weekStartDate: week,
            listVersion: captured.groceryListVersion,
            rows: captured.groceryItems,
            checks: captured.groceryState,
          },
        },
      };
    };
    if (
      !guid(body?.clientMutationId) ||
      !body.weekStartDate ||
      (kind === 'item'
        ? !guid(body.rowId) ||
          !version(body.expectedRowVersion) ||
          typeof body.checked !== 'boolean'
        : !version(body.expectedListVersion) ||
          !body.checks ||
          typeof body.checks !== 'object' ||
          Object.values(body.checks).some((value) => typeof value !== 'boolean'))
    )
      return conflict('upgrade_required');
    if (body.weekStartDate !== week) return conflict('week_conflict');
    const canonical =
      kind === 'item'
        ? {
            kind,
            week,
            rowId: body.rowId,
            expectedRowVersion: body.expectedRowVersion,
            checked: body.checked,
          }
        : {
            kind,
            week,
            expectedListVersion: body.expectedListVersion,
            checks: Object.fromEntries(
              Object.entries(body.checks).sort(([a], [b]) => a.localeCompare(b))
            ),
          };
    const hash = createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
    const replay = receipts.get(body.clientMutationId);
    if (replay) {
      replayed = true;
      return replay.hash === hash ? structuredClone(replay.outcome) : conflict('mutation_conflict');
    }
    const state = read(week);
    const row = state.groceryItems.find((row) => row.rowId === body.rowId);
    if (kind === 'item' && (!row || row.rowVersion !== body.expectedRowVersion))
      return conflict('grocery_conflict', !row);
    if (
      kind === 'bulk' &&
      (body.expectedListVersion !== state.groceryListVersion ||
        Object.keys(body.checks).some((id) => state.groceryItems.every((row) => row.rowId !== id)))
    )
      return conflict('grocery_conflict');
    const replacement =
      kind === 'item'
        ? { ...state.groceryState, [body.rowId]: body.checked }
        : Object.fromEntries(
            state.groceryItems.map((row) => [row.rowId, body.checks[row.rowId] ?? false])
          );
    state.groceryItems = state.groceryItems.map((row) =>
      replacement[row.rowId] !== state.groceryState[row.rowId]
        ? { ...row, rowVersion: next(row.rowVersion) }
        : row
    );
    for (const row of state.groceryItems) {
      if (!replacement[row.rowId]) delete state.baselines[row.rowId];
      else if (!state.groceryState[row.rowId]) state.baselines[row.rowId] = structuredClone(row);
    }
    state.groceryState = replacement;
    state.groceryListVersion = next(state.groceryListVersion);
    checks.set(week, replacement);
    const captured = snapshot(week);
    const result = {
      updatedAt: '2026-05-04T12:00:00Z',
      weekStartDate: week,
      listVersion: captured.groceryListVersion,
      rows: captured.groceryItems,
      checks: captured.groceryState,
      ...(kind === 'item'
        ? {
            rowId: body.rowId,
            rowVersion: state.groceryItems.find((row) => row.rowId === body.rowId)!.rowVersion,
            checked: body.checked,
          }
        : {}),
    };
    const outcome = { status: 200, json: kind === 'item' ? result : { data: result } };
    receipts.set(body.clientMutationId, { hash, outcome: structuredClone(outcome) });
    return outcome;
  };
  return {
    decorate,
    snapshot,
    mutate,
    get replayed() {
      return replayed;
    },
  };
}
