import {test, beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {startRouter, type Route} from '../src/router.ts';

// what the router uses of a browser: the hash, its changes, and a root
let location: {hash: string};
let window: EventTarget;
let root: {emptied: number, replaceChildren(): void} & any;

beforeEach(() => {
  location = (globalThis as any).location = {hash: ''};
  window = (globalThis as any).window = new EventTarget();
  root = {emptied: 0, replaceChildren() { this.emptied++; }};
});

/** Goes to a hash, as a link or the back button does. */
function go(hash: string) {
  location.hash = hash;
  window.dispatchEvent(new Event('hashchange'));
}

interface Call {params: string[], signal: AbortSignal}

/** A view recording how it was called. */
function view(calls: Call[]): Route['view'] {
  return (root, params, signal) => calls.push({params, signal});
}

test('the view of the hash renders with the groups matched', () => {
  const sessions: Call[] = [], session: Call[] = [];
  location.hash = '#/sessions/12';
  startRouter(root, [
    {hash: /^#\/sessions\/(\d+)$/, view: view(session)},
    {hash: /^#\/sessions$/, view: view(sessions)},
  ], {fallback: '#/sessions'});
  assert.equal(sessions.length, 0);
  assert.deepEqual(session.map(c => c.params), [['12']]);
  assert.equal(session[0].signal.aborted, false);
});

test('the first route matching wins', () => {
  const first: Call[] = [], second: Call[] = [];
  location.hash = '#/x';
  startRouter(root, [{hash: /^#\/x$/, view: view(first)}, {hash: /^#\/.*$/, view: view(second)}],
              {fallback: '#/'});
  assert.equal(first.length, 1);
  assert.equal(second.length, 0);
});

test('a hash no route matches goes to the fallback', () => {
  const home: Call[] = [];
  location.hash = '#/nowhere';
  startRouter(root, [{hash: /^#\/$/, view: view(home)}], {fallback: '#/'});
  assert.equal(location.hash, '#/');
  assert.equal(home.length, 0, 'rendered on the hashchange that follows, as in a browser');
  window.dispatchEvent(new Event('hashchange'));
  assert.equal(home.length, 1);
});

test('the view replaced is stopped, and the root emptied for the next', () => {
  const a: Call[] = [], b: Call[] = [];
  location.hash = '#/a';
  startRouter(root, [{hash: /^#\/a$/, view: view(a)}, {hash: /^#\/b$/, view: view(b)}],
              {fallback: '#/a'});
  const emptied = root.emptied;
  go('#/b');
  assert.equal(a[0].signal.aborted, true);
  assert.equal(b[0].signal.aborted, false);
  assert.equal(root.emptied, emptied + 1);
  // back: a new view, with a signal of its own
  go('#/a');
  assert.equal(b[0].signal.aborted, true);
  assert.equal(a.length, 2);
  assert.equal(a[1].signal.aborted, false);
});

test('onRoute is told of the route before its view renders', () => {
  const order: string[] = [];
  location.hash = '#/sessions/3';
  const route = {hash: /^#\/sessions\/(\d+)$/, title: 'Session', view: () => { order.push('view'); }};
  startRouter(root, [route], {
    fallback: '#/',
    onRoute: (r, params) => order.push(`${r.title} ${params[0]}`),
  });
  assert.deepEqual(order, ['Session 3', 'view']);
});
