/**
 * Routes the hash of the URL to a view, which renders itself into the root.
 *
 * When another view replaces it, the root is emptied: its elements go, and
 * the listeners on them with them. Its signal is aborted then: the view stops
 * what would outlive its elements (a timer, a listener on window…) and drops
 * the answers still coming.
 */

/** The params are the groups of the hash matched. */
export type View = (root: HTMLElement, params: string[], signal: AbortSignal) => void;

export interface Route {
  /** matched against location.hash, e.g. /^#\/sessions\/(\d+)$/ */
  hash: RegExp;
  view: View;
}

/**
 * Shows the view of the hash now, then of each hash it changes to.
 *
 * @param routes the first one matching wins; a route can carry what the
 * application tells of it, e.g. a title
 * @param options.fallback the hash gone to when none matches, e.g. "#/"
 * @param options.onRoute called before a view renders
 */
export function startRouter<R extends Route>(root: HTMLElement, routes: R[],
    {fallback, onRoute}: {fallback: string, onRoute?: (route: R, params: string[]) => void}) {
  let current: AbortController | undefined;

  function route() {
    current?.abort();
    current = undefined;
    root.replaceChildren();
    for (const r of routes) {
      const m = location.hash.match(r.hash);
      if (m) {
        const params = m.slice(1);
        onRoute?.(r, params);
        current = new AbortController();
        r.view(root, params, current.signal);
        return;
      }
    }
    location.hash = fallback;
  }

  window.addEventListener('hashchange', route);
  route();
}
