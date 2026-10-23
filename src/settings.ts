/**
 * What the page remembers in the browser: a tab chosen, a section folded…
 * Browser storage can be unavailable (a private window, site data blocked):
 * it is only a convenience, and the page works without it.
 *
 * Keys are global to the origin: each project starts its own with its name,
 * e.g. "app.live.window".
 */

export function readSetting(key: string): string | null {
  try {
    return localStorage.getItem(key);
  }
  catch (e) {
    return null;
  }
}

/** @param value stored as a string */
export function writeSetting(key: string, value: string | number | boolean) {
  try {
    localStorage.setItem(key, String(value));
  }
  catch (e) {
    // only a convenience
  }
}
