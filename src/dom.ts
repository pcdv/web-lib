/**
 * A few helpers to build the DOM, in place of a framework.
 */

export type Child = Node | string | number | null | undefined | false;
type Children = (Child | Child[])[];
type Tag = keyof HTMLElementTagNameMap;

/**
 * The element of the page with this id, which must be of a type.
 *
 * @param type e.g. HTMLInputElement
 */
export function $<T extends HTMLElement>(id: string, type: {new (): T, prototype: T}): T {
  const el = document.getElementById(id);
  if (!(el instanceof type))
    throw new Error(`#${id} is not a ${type.name}`);
  return el;
}

/**
 * Creates an element. Attributes named "on..." take a listener; true and
 * false add or omit a boolean attribute.
 */
export function h<K extends Tag>(tag: K, attrs?: Record<string, any> | null, ...children: Children): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs || {})) {
    if (name.startsWith('on') && typeof value === 'function')
      el.addEventListener(name.substring(2), value);
    else if (value === true)
      el.setAttribute(name, '');
    else if (value !== false && value != null)
      el.setAttribute(name, String(value));
  }
  append(el, children);
  return el;
}

function append(parent: Node, children: Children) {
  for (const c of children) {
    if (Array.isArray(c))
      append(parent, c);
    else if (c instanceof Node)
      parent.appendChild(c);
    else if (c !== null && c !== undefined && c !== false)
      parent.appendChild(document.createTextNode(String(c)));
  }
}

/** Replaces the content of an element. */
export function replace(el: Element, ...children: Children) {
  el.replaceChildren();
  append(el, children);
}
