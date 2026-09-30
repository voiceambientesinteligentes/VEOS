// Servico: estado compartilhado minimo com assinatura de mudancas.

export function createStore(initial) {
  let state = { ...initial };
  const subs = new Set();
  return {
    get: () => state,
    set(patch) {
      state = { ...state, ...patch };
      for (const fn of subs) fn(state);
    },
    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
  };
}

export const appStore = createStore({ session: null, status: null, rooms: null, connection: "checking" });
