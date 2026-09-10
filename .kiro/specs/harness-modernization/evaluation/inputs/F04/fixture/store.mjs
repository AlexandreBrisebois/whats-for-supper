export function createStore() {
  let version = 0, items = [], effects = [];
  return {
    begin() { version += 1; items = []; return version; },
    resolve(v, data) { items = data; },
    signal(v) { if (v === version && items.length) effects.push(v); },
    snapshot() { return { version, items: [...items], effects: [...effects] }; }
  };
}
