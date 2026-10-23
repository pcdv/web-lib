/**
 * Copies modules of the lib into a project, which edits none of them: a fix
 * is made here, then synced to each project.
 *
 *   node tools/sync.ts <dir> [--check] [--force]
 *
 * The directory, e.g. ../my-project/web/js/lib, holds a web-lib.json
 * telling what it takes:
 *
 *   {"lang": "js", "modules": ["dom", "dialog"]}
 *
 * "ts" copies the sources; "js" converts them (see js.ts), each with its
 * declarations beside it, for a project type-checking its JS. The modules a
 * module imports come with it. The sync writes into web-lib.json the commit
 * of the lib copied and a hash of each file, by which --check tells a file
 * changed in the project, or behind the lib. A sync refuses to overwrite a
 * file changed in the project, unless --force.
 */
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {toJs} from './js.ts';

const HOME = 'https://github.com/pcdv/web-lib';
const root = path.resolve(import.meta.dirname, '..');
const src = path.join(root, 'src');

interface Manifest {
  lang: 'js' | 'ts';
  modules: string[];
  /** the commit of the lib last synced, "+changes" when its sources had some not committed */
  commit?: string;
  /** a hash of each file synced, by name */
  files?: Record<string, string>;
}

const args = process.argv.slice(2);
const dir = args.find(a => !a.startsWith('--'));
if (!dir) {
  console.error('usage: node tools/sync.ts <dir> [--check] [--force]');
  process.exit(2);
}
const manifestFile = path.join(dir, 'web-lib.json');
if (!fs.existsSync(manifestFile)) {
  console.error(`${manifestFile} is missing: create it with what the project takes, e.g.\n` +
                '  {"lang": "js", "modules": ["dom", "dialog", "settings"]}');
  process.exit(2);
}
const manifest: Manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));

const changedHere = Object.entries(manifest.files ?? {})
  .filter(([name, hash]) => !fs.existsSync(path.join(dir, name)) || hashOf(read(path.join(dir, name))) !== hash)
  .map(([name]) => name);
const files = copies(manifest);

if (args.includes('--check')) {
  const behind = [...files].filter(([name, text]) => !changedHere.includes(name) && read(path.join(dir, name)) !== text)
    .map(([name]) => name);
  const gone = Object.keys(manifest.files ?? {}).filter(name => !files.has(name) && !changedHere.includes(name));
  for (const name of changedHere)
    console.log(`changed in the project: ${name}`);
  for (const name of [...behind, ...gone])
    console.log(`behind the lib: ${name}`);
  if (!changedHere.length && !behind.length && !gone.length)
    console.log(`${dir}: up to date`);
  process.exit(changedHere.length || behind.length || gone.length ? 1 : 0);
}

if (changedHere.length && !args.includes('--force')) {
  console.error(`changed in the project, not overwritten (--force to): ${changedHere.join(', ')}\n` +
                'make the change in the lib, then sync');
  process.exit(1);
}
for (const name of Object.keys(manifest.files ?? {}))
  if (!files.has(name))
    fs.rmSync(path.join(dir, name), {force: true});
for (const [name, text] of files)
  fs.writeFileSync(path.join(dir, name), text);
const synced: Manifest = {
  lang: manifest.lang,
  modules: manifest.modules,
  commit: commit(),
  files: Object.fromEntries([...files].map(([name, text]) => [name, hashOf(text)])),
};
fs.writeFileSync(manifestFile, JSON.stringify(synced, null, 2) + '\n');
console.log(`${dir}: ${[...files.keys()].join(', ')} from ${synced.commit}`);

/** The files of the modules a project takes, with the modules they import, by name. */
function copies({lang, modules}: Manifest): Map<string, string> {
  const files = new Map<string, string>();
  const todo = [...modules];
  const done = new Set<string>();
  if (lang === 'js')
    declarations();
  while (todo.length) {
    const m = todo.shift()!;
    if (done.has(m))
      continue;
    done.add(m);
    const ts = read(path.join(src, `${m}.ts`));
    for (const [, imported] of ts.matchAll(/from\s+'\.\/([\w-]+)\.ts'/g))
      todo.push(imported);
    if (lang === 'ts') {
      files.set(`${m}.ts`, header(m) + ts);
    }
    else {
      files.set(`${m}.js`, header(m) + `// @ts-nocheck: its types are in ${m}.d.ts\n` + toJs(ts));
      files.set(`${m}.d.ts`, header(m) + read(path.join(root, 'build/types', `${m}.d.ts`)));
    }
  }
  return files;
}

function header(module: string) {
  return `// From web-lib (${HOME}), src/${module}.ts: changed there, then synced here.\n`;
}

/** Emits the declarations of the sources into build/types. */
function declarations() {
  fs.rmSync(path.join(root, 'build/types'), {recursive: true, force: true});
  execFileSync(process.execPath, [path.join(root, 'node_modules/typescript/bin/tsc'), '-p', 'tsconfig.build.json'],
               {cwd: root, stdio: 'inherit'});
}

function commit() {
  const git = (...a: string[]) => execFileSync('git', a, {cwd: root, encoding: 'utf8'}).trim();
  const changes = git('status', '--porcelain', '--', 'src') ? '+changes' : '';
  try {
    return git('rev-parse', '--short', 'HEAD') + changes;
  }
  catch {
    return 'none' + changes;
  }
}

function read(file: string) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n') : '';
}

function hashOf(text: string) {
  return createHash('sha256').update(text).digest('hex').substring(0, 16);
}
