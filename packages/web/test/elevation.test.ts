import {afterEach, describe, expect, it} from 'vitest';
import '@rx-m3e/tokens/theme.css';
import tokens from '../../tokens/src/tokens.json';
import '../src/elevation/elevation.js';
import type {RxElevation} from '../src/index.js';

// The M3 spec shadows per level: key [y, blur] at 30%, ambient [y, blur, spread] at 15%.
const SPEC: Record<number, {key: number[]; ambient: number[]}> = {
  0: {key: [0, 0], ambient: [0, 0, 0]},
  1: {key: [1, 2], ambient: [1, 3, 1]},
  2: {key: [1, 2], ambient: [2, 6, 2]},
  3: {key: [1, 3], ambient: [4, 8, 3]},
  4: {key: [2, 3], ambient: [6, 10, 4]},
  5: {key: [4, 4], ambient: [8, 12, 6]},
};

interface Shadow {
  lengths: number[];
  alpha: number;
}

/** Splits a computed box-shadow into its shadows' lengths (x, y, blur, spread) and alpha. */
function parseShadows(value: string): Shadow[] {
  return value.split(/,(?![^(]*\))/).map((part) => {
    const lengths = [...part.matchAll(/(-?[\d.]+)px/g)].map((m) => Math.round(+m[1] * 100) / 100);
    const alpha = /\/\s*([\d.]+)\)|rgba\([^)]*,\s*([\d.]+)\)/.exec(part);
    return {lengths, alpha: alpha ? Number(alpha[1] ?? alpha[2]) : 1};
  });
}

async function mount(html: string) {
  document.body.innerHTML = html;
  const el = document.querySelector('rx-elevation') as RxElevation;
  await el.updateComplete;
  return el;
}

/** Turns off the transition so computed values are final immediately. */
const settle = (el: HTMLElement) => (el.style.transition = 'none');

afterEach(() => document.body.replaceChildren());

describe('rx-elevation', () => {
  for (const [level, spec] of Object.entries(SPEC)) {
    it(`level ${level} draws the M3 key and ambient shadows`, async () => {
      const el = await mount(
        `<div style="position:relative"><rx-elevation level="${level}"></rx-elevation></div>`,
      );
      settle(el);
      const [key, ambient] = parseShadows(getComputedStyle(el).boxShadow);
      expect(key.lengths).toEqual([0, ...spec.key, 0]);
      expect(ambient.lengths).toEqual([0, ...spec.ambient]);
      expect(key.alpha).toBeCloseTo(0.3);
      expect(ambient.alpha).toBeCloseTo(0.15);
    });
  }

  it('takes a dp length from --rx-elevation, as component tokens provide', async () => {
    const el = await mount(
      '<rx-elevation style="--rx-elevation: var(--md-sys-elevation-level3)"></rx-elevation>',
    );
    settle(el);
    const [key, ambient] = parseShadows(getComputedStyle(el).boxShadow);
    expect(key.lengths).toEqual([0, 1, 3, 0]);
    expect(ambient.lengths).toEqual([0, 4, 8, 3]);
  });

  it('grows steadily for values between levels', async () => {
    const el = await mount('<rx-elevation></rx-elevation>');
    settle(el);
    let previous = -1;
    for (let dp = 0; dp <= 12; dp += 0.5) {
      el.style.setProperty('--rx-elevation', `${dp}px`);
      const [, ambient] = parseShadows(getComputedStyle(el).boxShadow);
      expect(ambient.lengths[2], `blur at ${dp}dp`).toBeGreaterThanOrEqual(previous);
      previous = ambient.lengths[2];
    }
    expect(previous).toBe(12);
  });

  it('does not inherit elevation from an elevated parent', async () => {
    const el = await mount(
      '<div style="--rx-elevation: 12px; position: relative"><rx-elevation></rx-elevation></div>',
    );
    settle(el);
    const [key, ambient] = parseShadows(getComputedStyle(el).boxShadow);
    expect(key.lengths).toEqual([0, 0, 0, 0]);
    expect(ambient.lengths).toEqual([0, 0, 0, 0]);
  });

  it('uses a custom shadow color', async () => {
    const el = await mount(
      '<rx-elevation level="2" style="--rx-elevation-shadow-color: rgb(255, 0, 0)"></rx-elevation>',
    );
    settle(el);
    expect(getComputedStyle(el).boxShadow).toMatch(/(srgb 1 0 0|255, 0, 0)/);
  });

  it('fills its parent, follows its corners and ignores the pointer', async () => {
    const el = await mount(
      '<div style="position:relative;width:120px;height:80px;border-radius:16px"><rx-elevation level="1"></rx-elevation></div>',
    );
    const rect = el.getBoundingClientRect();
    expect([rect.width, rect.height]).toEqual([120, 80]);
    expect(getComputedStyle(el).borderRadius).toBe('16px');
    expect(getComputedStyle(el).pointerEvents).toBe('none');
  });

  it('animates between levels', async () => {
    const el = await mount('<rx-elevation level="0"></rx-elevation>');
    const transition = getComputedStyle(el).transitionProperty;
    expect(transition).toContain('--rx-elevation');
  });
});

describe('elevation tokens', () => {
  it('every component elevation token points at one of the six levels', () => {
    const values = Object.values(tokens.components).flatMap((set) =>
      Object.entries(set as Record<string, string>)
        .filter(([name]) => name.includes('elevation'))
        .map(([, value]) => value),
    );
    expect(values.length).toBeGreaterThan(100);
    for (const value of values) expect(value).toMatch(/^var\(--md-sys-elevation-level[0-5]\)$/);
  });
});
