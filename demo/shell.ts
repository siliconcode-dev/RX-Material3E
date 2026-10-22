// Wraps every demo page in a shared layout: a top bar with theme and text
// direction switches, and a navigation list of the demo pages that exist.
// Usage: <script type="module" src="./shell.ts"></script> in the page head.

import {sections} from './pages';

type Theme = 'system' | 'light' | 'dark';
type Dir = 'ltr' | 'rtl';

const root = document.documentElement;

// Settings are a per-viewer convenience; storage can be unavailable.
function load<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const value = localStorage.getItem(key) as T | null;
    return value && allowed.includes(value) ? value : fallback;
  } catch {
    return fallback;
  }
}
function save(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore: the setting just won't persist.
  }
}

const THEMES = ['system', 'light', 'dark'] as const;
const DIRS = ['ltr', 'rtl'] as const;

export function applyTheme(theme: Theme) {
  if (theme === 'system') delete root.dataset.theme;
  else root.dataset.theme = theme;
  save('rx-demo-theme', theme);
}

export function applyDir(dir: Dir) {
  root.dir = dir;
  save('rx-demo-dir', dir);
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> = {},
  ...children: (Node | string)[]
) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

function isCurrent(href: string) {
  const path = location.pathname.replace(/\/$/, '/index.html');
  return path.endsWith(`/demo/${href}`);
}

function buildNav() {
  const nav = el('nav', {className: 'demo-nav', id: 'demo-nav', ariaLabel: 'Demo pages'});
  for (const section of sections) {
    const list = el('ul');
    for (const page of section.pages) {
      const link = el('a', {href: `./${page.href}`, textContent: page.title});
      if (isCurrent(page.href)) link.setAttribute('aria-current', 'page');
      list.append(el('li', {}, link));
    }
    nav.append(el('h2', {textContent: section.title}), list);
  }
  return nav;
}

function buildThemeSwitch() {
  const group = el('div', {className: 'demo-segmented', role: 'group', ariaLabel: 'Theme'});
  const buttons = THEMES.map((theme) => {
    const button = el('button', {
      type: 'button',
      textContent: theme[0].toUpperCase() + theme.slice(1),
    });
    button.addEventListener('click', () => {
      applyTheme(theme);
      for (const b of buttons) b.ariaPressed = String(b === button);
    });
    return button;
  });
  const current = load('rx-demo-theme', THEMES, 'system');
  buttons.forEach((b, i) => (b.ariaPressed = String(THEMES[i] === current)));
  group.append(...buttons);
  return group;
}

function buildDirSwitch() {
  const button = el('button', {type: 'button', className: 'demo-button'});
  const render = () => {
    const rtl = root.dir === 'rtl';
    button.textContent = rtl ? 'RTL' : 'LTR';
    button.ariaPressed = String(rtl);
    button.ariaLabel = `Text direction: ${rtl ? 'right to left' : 'left to right'}`;
  };
  button.addEventListener('click', () => {
    applyDir(root.dir === 'rtl' ? 'ltr' : 'rtl');
    render();
  });
  render();
  return button;
}

function addFavicon() {
  if (document.querySelector('link[rel~="icon"]')) return;
  document.head.append(el('link', {rel: 'icon', type: 'image/png', href: '../assets/favicon.png'}));
}

function mount() {
  addFavicon();
  applyTheme(load('rx-demo-theme', THEMES, 'system'));
  applyDir(load('rx-demo-dir', DIRS, 'ltr'));

  const main = el('main', {className: 'demo-main', id: 'demo-main'});
  main.append(...document.body.childNodes);

  const nav = buildNav();
  const menu = el('button', {
    type: 'button',
    className: 'demo-button demo-menu',
    textContent: 'Menu',
    ariaExpanded: 'false',
  });
  menu.setAttribute('aria-controls', nav.id);
  menu.addEventListener('click', () => {
    const open = document.body.classList.toggle('demo-nav-open');
    menu.ariaExpanded = String(open);
  });

  const title = el(
    'a',
    {className: 'demo-title', href: './index.html'},
    el('img', {src: '../assets/icon.png', alt: '', width: 32, height: 32}),
    el('span', {textContent: 'RX Material 3E'}),
  );
  const header = el(
    'header',
    {className: 'demo-header'},
    menu,
    title,
    el('div', {className: 'demo-actions'}, buildThemeSwitch(), buildDirSwitch()),
  );

  document.body.append(header, el('div', {className: 'demo-layout'}, nav, main));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount, {once: true});
} else {
  mount();
}
