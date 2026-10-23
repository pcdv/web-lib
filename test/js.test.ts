import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {toJs} from '../tools/js.ts';

test('annotations go, and the code stays as written', () => {
  assert.equal(toJs(
    'export function f<T>(a: T, b = 2): T[] {\n' +
    '  const m = new Map<string, number>();\n' +
    '  return [a as T];\n' +
    '}\n'),
    'export function f(a, b = 2) {\n' +
    '  const m = new Map();\n' +
    '  return [a];\n' +
    '}\n');
});

test('a declaration of types goes whole, with its doc comment', () => {
  assert.equal(toJs(
    '/** The module. */\n' +
    '\n' +
    '/** A type. */\n' +
    'export type A = string | number;\n' +
    '\n' +
    'export interface B {\n' +
    '  /** a member */\n' +
    '  a: A;\n' +
    '}\n' +
    '\n' +
    '/** A function. */\n' +
    'export function f() {}\n'),
    '/** The module. */\n' +
    '\n' +
    '/** A function. */\n' +
    'export function f() {}\n');
});

test('imports of modules of the lib name their JS', () => {
  assert.equal(toJs("import {h, type Child} from './dom.ts';\nimport type {R} from './r.ts';\nh();\n"),
               "import {h} from './dom.js';\nh();\n");
});

test('each module of the lib converts to JS exporting the same', async () => {
  const src = path.resolve(import.meta.dirname, '../src');
  const out = fs.mkdtempSync(path.resolve(import.meta.dirname, '../build/js-test-'));
  try {
    const names = fs.readdirSync(src).filter(f => f.endsWith('.ts'));
    for (const f of names)
      fs.writeFileSync(path.join(out, f.replace(/\.ts$/, '.js')), toJs(fs.readFileSync(path.join(src, f), 'utf8')));
    for (const f of names) {
      const ts = await import(pathToFileURL(path.join(src, f)).href);
      const js = await import(pathToFileURL(path.join(out, f.replace(/\.ts$/, '.js'))).href);
      assert.deepEqual(Object.keys(js).sort(), Object.keys(ts).sort(), f);
    }
  }
  finally {
    fs.rmSync(out, {recursive: true});
  }
});
