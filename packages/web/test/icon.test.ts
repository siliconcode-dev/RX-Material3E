import {afterEach, describe, expect, it} from 'vitest';
import {page} from 'vitest/browser';
import '@rx-m3e/tokens/theme.css';
import '../src/icon/icon.js';
import type {RxIcon} from '../src/index.js';

async function mount(markup: string) {
  document.body.innerHTML = markup;
  const icon = document.querySelector('rx-icon') as RxIcon;
  await icon.updateComplete;
  icon.style.transition = 'none';
  return icon;
}

const style = (el: Element) => getComputedStyle(el);
const axis = (el: Element, name: string) => {
  const match = new RegExp(`"${name}" (-?[\\d.]+)`).exec(style(el).fontVariationSettings);
  return match ? Number(match[1]) : undefined;
};

afterEach(() => {
  document.body.replaceChildren();
  document.documentElement.removeAttribute('dir');
});

describe('rx-icon', () => {
  it('is a 24dp Material Symbols Rounded glyph in the current text color', async () => {
    const icon = await mount('<div style="color: rgb(10, 20, 30)"><rx-icon>home</rx-icon></div>');
    expect(style(icon).fontFamily).toBe('"Material Symbols Rounded"');
    expect([style(icon).width, style(icon).height, style(icon).fontSize]).toEqual([
      '24px',
      '24px',
      '24px',
    ]);
    expect(style(icon).color).toBe('rgb(10, 20, 30)');
    expect(style(icon).fontFeatureSettings).toContain('liga');
    expect(icon.textContent).toBe('home');
  });

  it('switches between the rounded, outlined and sharp styles', async () => {
    const icon = await mount('<rx-icon>home</rx-icon>');
    icon.variant = 'outlined';
    await icon.updateComplete;
    expect(style(icon).fontFamily).toBe('"Material Symbols Outlined"');
    icon.variant = 'sharp';
    await icon.updateComplete;
    expect(style(icon).fontFamily).toBe('"Material Symbols Sharp"');
  });

  it('fills, and takes weight, grade and optical size', async () => {
    const icon = await mount('<rx-icon>favorite</rx-icon>');
    expect([
      axis(icon, 'FILL'),
      axis(icon, 'wght'),
      axis(icon, 'GRAD'),
      axis(icon, 'opsz'),
    ]).toEqual([0, 400, 0, 24]);
    icon.filled = true;
    icon.style.setProperty('--rx-icon-weight', '600');
    icon.style.setProperty('--rx-icon-grade', '-25');
    icon.style.setProperty('--rx-icon-optical-size', '40');
    await icon.updateComplete;
    expect([
      axis(icon, 'FILL'),
      axis(icon, 'wght'),
      axis(icon, 'GRAD'),
      axis(icon, 'opsz'),
    ]).toEqual([1, 600, -25, 40]);
  });

  it('animates the fill change', async () => {
    document.body.innerHTML = '<rx-icon>favorite</rx-icon>';
    const icon = document.querySelector('rx-icon')!;
    expect(style(icon).transitionProperty).toBe('font-variation-settings');
  });

  it('resizes with --rx-icon-size', async () => {
    const icon = await mount('<rx-icon style="--rx-icon-size: 40px">home</rx-icon>');
    expect([style(icon).width, style(icon).fontSize]).toEqual(['40px', '40px']);
  });

  it('sizes and tints a slotted SVG', async () => {
    const icon = await mount(
      '<rx-icon style="color: rgb(0, 128, 0)"><svg viewBox="0 0 24 24"><path d="M0 0h24v24H0z"/></svg></rx-icon>',
    );
    const svg = icon.querySelector('svg')!;
    const rect = svg.getBoundingClientRect();
    expect([rect.width, rect.height]).toEqual([24, 24]);
    expect(style(svg).fill).toBe('rgb(0, 128, 0)');
  });

  it('is hidden from screen readers unless it has a label', async () => {
    await mount('<rx-icon>home</rx-icon><rx-icon label="Favourite">favorite</rx-icon>');
    await expect.element(page.getByRole('img', {name: 'Favourite'})).toBeInTheDocument();
    expect(page.getByRole('img').elements()).toHaveLength(1);
  });

  it('updates its accessible name when the label changes', async () => {
    const icon = await mount('<rx-icon label="Star">star</rx-icon>');
    icon.label = 'Starred';
    await icon.updateComplete;
    await expect.element(page.getByRole('img', {name: 'Starred'})).toBeInTheDocument();
    icon.label = '';
    await icon.updateComplete;
    expect(page.getByRole('img').elements()).toHaveLength(0);
  });

  it('mirrors directional icons in right-to-left layouts', async () => {
    const icon = await mount('<rx-icon flip-rtl>arrow_back</rx-icon>');
    expect(style(icon).transform).toBe('none');
    document.documentElement.dir = 'rtl';
    expect(style(icon).transform).toBe('matrix(-1, 0, 0, 1, 0, 0)');
  });

  it('keeps ligature names left-to-right inside right-to-left text', async () => {
    document.documentElement.dir = 'rtl';
    const icon = await mount('<rx-icon>home</rx-icon>');
    expect(style(icon).direction).toBe('ltr');
  });
});
