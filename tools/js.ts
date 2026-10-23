/**
 * Turns a module of the lib into JS that reads as its source does: the same
 * lines, comments and indentation, without the types.
 *
 * Node's own stripping blanks the types out, keeping every position: this
 * takes those blanks away, and with them the doc comment of a declaration
 * blanked whole (a type, an interface), which would otherwise describe what
 * follows it.
 */
import {stripTypeScriptTypes} from 'node:module';

export function toJs(ts: string): string {
  const blank = stripTypeScriptTypes(ts);
  let js = '';
  let from = 0;
  for (const [start, end] of blanked(ts, blank)) {
    js += blank.substring(from, start);
    from = end;
  }
  js += blank.substring(from);
  return js
    .replace(/((?:from\s+|import\()'\.\.?\/[^']*)\.ts'/g, "$1.js'")
    // the commas of "type" names taken out of a list, e.g. "import {h, type Child}"
    .replace(/^((?:import|export)\s*)\{([^}]*)\}/gm,
             (_, keyword, names) => `${keyword}{${names.split(',').map((n: string) => n.trim()).filter(Boolean).join(', ')}}`)
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n');
}

/** The spans of the source taken out, in order. */
function blanked(ts: string, blank: string): [number, number][] {
  const spans: [number, number][] = [];
  for (let i = 0; i < ts.length; i++) {
    if (ts[i] === blank[i])
      continue;
    // what was blanked, up to the last change before something kept
    let end = i + 1;
    for (let j = end; j < ts.length && /\s/.test(blank[j]); j++)
      if (ts[j] !== blank[j])
        end = j + 1;
    spans.push(wholeLines(ts, i, end));
    i = end - 1;
  }
  return spans;
}

/**
 * A span covering all of its lines takes them, with the doc comment just
 * above; any other is taken as it is, e.g. ": string" in "(id: string)".
 */
function wholeLines(ts: string, start: number, end: number): [number, number] {
  const lineStart = ts.lastIndexOf('\n', start - 1) + 1;
  const newline = ts.indexOf('\n', end);
  const lineEnd = newline < 0 ? ts.length : newline + 1;
  if (ts.substring(lineStart, start).trim() || ts.substring(end, lineEnd).trim()) {
    // the spaces before " as T", unless they part words, e.g. "class A<T> extends"
    if (!/[\w$'"`]/.test(ts[end] ?? ''))
      while (start > lineStart && /[ \t]/.test(ts[start - 1]))
        start--;
    return [start, end];
  }
  // the line just above: one past a blank line documents something else, e.g. the module
  const above = ts.substring(0, lineStart - 1);
  if (above.substring(above.lastIndexOf('\n') + 1).trim().endsWith('*/')) {
    const open = above.lastIndexOf('/**');
    const openLine = ts.lastIndexOf('\n', open - 1) + 1;
    if (open >= 0 && !ts.substring(openLine, open).trim())
      return [openLine, lineEnd];
  }
  return [lineStart, lineEnd];
}
