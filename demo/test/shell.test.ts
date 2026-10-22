import {beforeAll, describe, expect, it} from 'vitest';

const root = document.documentElement;
const byText = (text: string) =>
  [...document.querySelectorAll('button')].find((b) => b.textContent === text)!;

describe('demo shell', () => {
  beforeAll(async () => {
    localStorage.clear();
    // The test runner page brings its own favicon; the shell only adds one when none exists.
    document.querySelectorAll('link[rel~="icon"]').forEach((link) => link.remove());
    document.body.innerHTML = '<p id="content">Page content</p>';
    await import('../shell');
  });

  it('moves page content into main and adds header and navigation', () => {
    expect(document.querySelector('main #content')).not.toBeNull();
    expect(document.querySelector('header .demo-title')?.textContent).toBe('RX Material 3E');
    expect(document.querySelector('header .demo-title img')?.getAttribute('src')).toBe(
      '../assets/icon.png',
    );
    expect(document.querySelector('link[rel="icon"]')?.getAttribute('href')).toBe(
      '../assets/favicon.png',
    );
    const links = [...document.querySelectorAll('nav a')].map((a) => a.textContent);
    expect(links).toEqual(['Catalog', 'Design tokens', 'Theme', 'Typography']);
  });

  it('starts on the system theme and switches to dark and light', () => {
    expect(root.dataset.theme).toBeUndefined();
    expect(byText('System').ariaPressed).toBe('true');

    byText('Dark').click();
    expect(root.dataset.theme).toBe('dark');
    expect(byText('Dark').ariaPressed).toBe('true');
    expect(byText('System').ariaPressed).toBe('false');
    expect(localStorage.getItem('rx-demo-theme')).toBe('dark');

    byText('Light').click();
    expect(root.dataset.theme).toBe('light');

    byText('System').click();
    expect(root.dataset.theme).toBeUndefined();
  });

  it('toggles text direction', () => {
    const button = byText('LTR');
    button.click();
    expect(root.dir).toBe('rtl');
    expect(button.textContent).toBe('RTL');
    expect(localStorage.getItem('rx-demo-dir')).toBe('rtl');
    button.click();
    expect(root.dir).toBe('ltr');
  });

  it('opens and closes the navigation menu', () => {
    const menu = byText('Menu');
    expect(menu.getAttribute('aria-controls')).toBe('demo-nav');
    menu.click();
    expect(document.body.classList.contains('demo-nav-open')).toBe(true);
    expect(menu.ariaExpanded).toBe('true');
    menu.click();
    expect(menu.ariaExpanded).toBe('false');
  });
});
