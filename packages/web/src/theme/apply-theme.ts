import {themeCss, type ThemeOptions} from './scheme.js';

const sheets = new WeakMap<Document | ShadowRoot, CSSStyleSheet>();

/**
 * Applies a generated theme to a whole document (or a shadow root). Calling it
 * again replaces the previous theme. Light and dark both follow the same
 * `data-theme` and OS rules as the default tokens.
 *
 * @returns A function that removes the theme again.
 */
export function applyTheme(options: ThemeOptions, target: Document | ShadowRoot = document) {
  let sheet = sheets.get(target);
  if (!sheet) {
    sheet = new CSSStyleSheet();
    sheets.set(target, sheet);
  }
  sheet.replaceSync(themeCss(options, target instanceof Document ? ':root' : ':host'));
  if (!target.adoptedStyleSheets.includes(sheet)) {
    target.adoptedStyleSheets = [...target.adoptedStyleSheets, sheet];
  }
  return () => removeTheme(target);
}

/** Removes a theme added with {@link applyTheme}. */
export function removeTheme(target: Document | ShadowRoot = document) {
  const sheet = sheets.get(target);
  if (!sheet) return;
  target.adoptedStyleSheets = target.adoptedStyleSheets.filter((s) => s !== sheet);
  sheets.delete(target);
}
