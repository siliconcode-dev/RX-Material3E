import {afterEach, describe, expect, it} from 'vitest';
import {LitElement, css, html} from 'lit';
import '@rx-m3e/tokens/theme.css';
import '@rx-m3e/tokens/typescale.css';
import tokens from '../../tokens/src/tokens.json';
import {ALL_TYPESCALE_ROLES, typescale, typescaleStyles} from '../src/index.js';

const sys = tokens.sys as Record<string, string>;
const ref = tokens.ref as Record<string, string>;

/** Resolves a token value from tokens.json to what the browser should compute. */
function expected(role: string) {
  const get = (part: string) => sys[`--md-sys-typescale-${role}-${part}`];
  const px = (rem: string) => `${parseFloat(rem) * 16}px`;
  const weight = /var\((--md-ref-[\w-]+)\)/.exec(get('weight'))![1];
  return {
    fontSize: px(get('size')),
    lineHeight: px(get('line-height')),
    fontWeight: ref[weight],
    letterSpacing: get('tracking') === '0rem' ? 'normal' : px(get('tracking')),
  };
}

function computedFor(el: Element) {
  const s = getComputedStyle(el);
  return {
    fontSize: s.fontSize,
    lineHeight: s.lineHeight,
    fontWeight: s.fontWeight,
    letterSpacing: s.letterSpacing,
  };
}

/** Rounds px values so 0.0313rem (0.5008px) and similar compare cleanly. */
const round = (v: Record<string, string>) =>
  Object.fromEntries(
    Object.entries(v).map(([k, val]) => [
      k,
      val.endsWith('px') ? `${Math.round(parseFloat(val) * 100) / 100}px` : val,
    ]),
  );

afterEach(() => document.body.replaceChildren());

describe('typescale roles', () => {
  it('match the 30 roles in the Compose tokens', () => {
    const fromTokens = new Set(
      Object.keys(sys)
        .filter((k) => k.startsWith('--md-sys-typescale-'))
        .map((k) =>
          k
            .slice('--md-sys-typescale-'.length)
            .replace(/-(font|size|line-height|weight|tracking)$/, ''),
        ),
    );
    expect(new Set(ALL_TYPESCALE_ROLES)).toEqual(fromTokens);
    expect(ALL_TYPESCALE_ROLES).toHaveLength(30);
  });

  it('emphasized roles are heavier than their base role', () => {
    for (const role of ALL_TYPESCALE_ROLES.filter((r) => !r.endsWith('-emphasized'))) {
      expect(Number(expected(`${role}-emphasized`).fontWeight), role).toBeGreaterThan(
        Number(expected(role).fontWeight),
      );
    }
  });
});

describe('typescale.css classes', () => {
  it('apply every role exactly as the tokens define it', () => {
    for (const role of ALL_TYPESCALE_ROLES) {
      const el = document.createElement('p');
      el.className = `rx-typescale-${role}`;
      el.textContent = role;
      document.body.append(el);
      expect(round(computedFor(el)), role).toEqual(round(expected(role)));
    }
  });

  it('spot check: display large is 57/64, label small emphasized is bold', () => {
    document.body.innerHTML =
      '<p class="rx-typescale-display-large">a</p><p class="rx-typescale-label-small-emphasized">b</p>';
    const [display, label] = document.querySelectorAll('p');
    expect(getComputedStyle(display).fontSize).toBe('57px');
    expect(getComputedStyle(display).lineHeight).toBe('64px');
    expect(getComputedStyle(label).fontWeight).toBe('700');
  });

  it('switch to the Noto family for other languages', () => {
    document.body.innerHTML =
      '<p class="rx-typescale-title-large">English</p><p lang="bn" class="rx-typescale-title-large">বাংলা</p>';
    const [en, bn] = [...document.querySelectorAll('p')].map((p) =>
      getComputedStyle(p).fontFamily.split(',')[0].replace(/["']/g, ''),
    );
    expect(en).toBe('Google Sans Flex');
    expect(bn).toBe('Noto Sans');
  });
});

describe('typescale helpers for components', () => {
  class TypeProbe extends LitElement {
    static override styles = [
      typescaleStyles,
      css`
        .direct {
          ${typescale('title-medium-emphasized')}
        }
      `,
    ];
    override render() {
      return html`<span class="rx-typescale-headline-small">a</span><span class="direct">b</span>`;
    }
  }
  customElements.define('type-probe', TypeProbe);

  it('work inside a shadow root', async () => {
    const el = document.createElement('type-probe') as TypeProbe;
    document.body.append(el);
    await el.updateComplete;
    const [cls, direct] = el.shadowRoot!.querySelectorAll('span');
    expect(round(computedFor(cls))).toEqual(round(expected('headline-small')));
    expect(round(computedFor(direct))).toEqual(round(expected('title-medium-emphasized')));
  });
});
