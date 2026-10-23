import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {userEvent} from 'vitest/browser';
import '@rx-m3e/tokens/theme.css';
import '../src/button/button.js';
import '../src/icon/icon.js';
import type {RxButton} from '../src/button/index.js';
import {setMotionDurationScale} from '../src/motion/index.js';

async function mount(markup: string) {
  document.body.innerHTML = markup;
  const el = document.querySelector('rx-button') as RxButton;
  await el.updateComplete;
  return el;
}

const container = (el: RxButton) => el.shadowRoot!.querySelector('.button') as HTMLElement;
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r(undefined)));

/** A color role (optionally at an opacity) as the browser computes it. */
function color(role: string, opacity?: number) {
  const probe = document.createElement('i');
  probe.style.color =
    opacity === undefined
      ? `var(--md-sys-color-${role})`
      : `color-mix(in srgb, var(--md-sys-color-${role}) ${opacity * 100}%, transparent)`;
  document.body.append(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}

const transparent = 'rgba(0, 0, 0, 0)';
/** Fully transparent, however the browser writes it. */
const isTransparent = (c: string) => c === transparent || /^color\(srgb [\d. ]+\/ 0\)$/.test(c);

beforeEach(() => {
  document.documentElement.dataset.theme = 'light';
});
afterEach(() => {
  document.body.replaceChildren();
  delete document.documentElement.dataset.theme;
  setMotionDurationScale(null);
});

// The test's own copy of ButtonDefaults' colors (Button.kt and the button tokens).
const COLORS = {
  filled: {container: 'primary', content: 'on-primary'},
  elevated: {container: 'surface-container-low', content: 'primary'},
  tonal: {container: 'secondary-container', content: 'on-secondary-container'},
  outlined: {container: null, content: 'on-surface-variant'},
  text: {container: null, content: 'primary'},
} as const;

const DISABLED = {
  filled: {container: ['on-surface', 0.1], content: ['on-surface-variant', 0.38]},
  elevated: {container: ['on-surface', 0.1], content: ['on-surface-variant', 0.38]},
  tonal: {container: ['on-surface', 0.12], content: ['on-surface', 0.38]},
  outlined: {container: null, content: ['on-surface-variant', 0.38]},
  text: {container: null, content: ['on-surface-variant', 0.38]},
} as const;

describe('rx-button colors', () => {
  for (const [variant, want] of Object.entries(COLORS)) {
    it(`${variant}: container and content`, async () => {
      const el = await mount(`<rx-button variant="${variant}">Label</rx-button>`);
      const style = getComputedStyle(container(el));
      expect(style.backgroundColor).toBe(want.container ? color(want.container) : transparent);
      expect(style.color).toBe(color(want.content));
    });

    it(`${variant}: disabled`, async () => {
      const el = await mount(`<rx-button variant="${variant}" disabled>Label</rx-button>`);
      const style = getComputedStyle(container(el));
      const d = DISABLED[variant as keyof typeof DISABLED];
      if (d.container) {
        expect(style.backgroundColor).toBe(color(d.container[0], d.container[1]));
      } else {
        expect(isTransparent(style.backgroundColor), style.backgroundColor).toBe(true);
      }
      expect(style.color).toBe(color(d.content[0], d.content[1]));
    });
  }

  it('outlined: a 1dp outline-variant border over the container, at 10% when disabled', async () => {
    const el = await mount('<rx-button variant="outlined">Label</rx-button>');
    const border = getComputedStyle(container(el), '::before');
    expect(border.borderTopWidth).toBe('1px');
    expect(border.borderTopColor).toBe(color('outline-variant'));
    el.disabled = true;
    await el.updateComplete;
    expect(getComputedStyle(container(el), '::before').borderTopColor).toBe(
      color('outline-variant', 0.1),
    );
    // Other buttons draw no border.
    el.variant = 'filled';
    await el.updateComplete;
    expect(getComputedStyle(container(el), '::before').borderTopColor).toBe(transparent);
  });
});

describe('rx-button layout', () => {
  it('is 40dp tall in a 48dp touch target, at least 58dp wide, fully rounded', async () => {
    const el = await mount('<rx-button>OK</rx-button>');
    const host = el.getBoundingClientRect();
    const box = container(el).getBoundingClientRect();
    expect(box.height).toBe(40);
    expect(host.height).toBe(48);
    expect(box.width).toBeGreaterThanOrEqual(58);
    expect(box.top - host.top).toBe(4);
    const radius = parseFloat(getComputedStyle(container(el)).borderTopLeftRadius);
    expect(radius).toBeGreaterThanOrEqual(20);
  });

  it('pads 24dp at the sides, 16dp before a leading icon; text buttons 12dp (16dp end with an icon)', async () => {
    const pads = async (markup: string) => {
      const el = await mount(markup);
      const s = getComputedStyle(container(el));
      return [s.paddingLeft, s.paddingRight, s.paddingTop, s.paddingBottom];
    };
    expect(await pads('<rx-button>Label</rx-button>')).toEqual(['24px', '24px', '8px', '8px']);
    expect(await pads('<rx-button><rx-icon slot="icon">add</rx-icon>Label</rx-button>')).toEqual([
      '16px',
      '24px',
      '8px',
      '8px',
    ]);
    expect(await pads('<rx-button variant="text">Label</rx-button>')).toEqual([
      '12px',
      '12px',
      '8px',
      '8px',
    ]);
    expect(
      await pads('<rx-button variant="text"><rx-icon slot="icon">add</rx-icon>Label</rx-button>'),
    ).toEqual(['12px', '16px', '8px', '8px']);
  });

  it('has 18dp icons 8dp from the label, and the label-large type style', async () => {
    const el = await mount(
      '<rx-button><rx-icon slot="icon">add</rx-icon><span id="label">Label</span></rx-button>',
    );
    const icon = el.querySelector('rx-icon')!.getBoundingClientRect();
    const label = document.getElementById('label')!.getBoundingClientRect();
    expect([icon.width, icon.height]).toEqual([18, 18]);
    expect(label.left - icon.right).toBe(8);
    const style = getComputedStyle(container(el));
    const probe = document.createElement('i');
    probe.style.font =
      'var(--md-sys-typescale-label-large-weight) var(--md-sys-typescale-label-large-size) / var(--md-sys-typescale-label-large-line-height) var(--md-sys-typescale-label-large-font)';
    document.body.append(probe);
    const want = getComputedStyle(probe);
    expect([style.fontSize, style.fontWeight, style.lineHeight, style.fontFamily]).toEqual([
      want.fontSize,
      want.fontWeight,
      want.lineHeight,
      want.fontFamily,
    ]);
  });

  it('is never narrower than ButtonDefaults.MinWidth (58dp)', async () => {
    const el = await mount('<rx-button aria-label="Empty"></rx-button>');
    expect(container(el).getBoundingClientRect().width).toBe(58);
  });

  it('takes clicks across its whole 48dp touch target', async () => {
    const el = await mount('<rx-button style="position: absolute; top: 0; left: 0">OK</rx-button>');
    const clicks: Event[] = [];
    el.addEventListener('click', (e) => clicks.push(e));
    const host = el.getBoundingClientRect();
    // 2px from the top: outside the 40dp container, inside the touch target.
    const hit = document.elementFromPoint(host.left + host.width / 2, host.top + 2);
    expect(hit).toBe(el);
  });
});

describe('rx-button elevation', () => {
  it("reads Compose's elevations from the tokens", async () => {
    // The test's own copy of ButtonDefaults' elevations (Level0=0, Level1=1, Level2=3dp).
    const want = {
      filled: {default: 0, pressed: 0, focused: 0, hovered: 1, disabled: 0},
      elevated: {default: 1, pressed: 1, focused: 1, hovered: 3, disabled: 0},
      tonal: {default: 0, pressed: 0, focused: 0, hovered: 1, disabled: 0},
      outlined: null,
      text: null,
    };
    for (const [variant, elevations] of Object.entries(want)) {
      const el = await mount(`<rx-button variant="${variant}">x</rx-button>`);
      expect(el.elevations, variant).toEqual(elevations);
    }
  });

  const elevation = (el: RxButton) =>
    parseFloat(getComputedStyle(container(el)).getPropertyValue('--rx-elevation'));

  it('rises on hover with a 120ms tween and settles back', async () => {
    const el = await mount('<rx-button variant="elevated">Hover</rx-button>');
    expect(elevation(el)).toBe(1);
    // Slow time down so the tweens are still running when they are checked.
    setMotionDurationScale(20);
    const timing = () => container(el).getAnimations()[0]?.effect?.getTiming();
    await userEvent.hover(el);
    // Into hover: ElevationDefaults' DefaultIncomingSpec, 120ms FastOutSlowIn.
    expect(timing()?.duration).toBe(120 * 20);
    expect(timing()?.easing).toBe('cubic-bezier(0.4, 0, 0.2, 1)');
    const mid = elevation(el);
    expect(mid).toBeGreaterThan(1);
    expect(mid).toBeLessThan(3);
    await userEvent.unhover(el);
    // Out of hover: HoveredOutgoingSpec, 120ms on (0.4, 0, 0.6, 1).
    expect(timing()?.duration).toBe(120 * 20);
    expect(timing()?.easing).toBe('cubic-bezier(0.4, 0, 0.6, 1)');
    setMotionDurationScale(null);
    await userEvent.hover(el);
    await new Promise((r) => setTimeout(r, 250));
    expect(elevation(el)).toBe(3);
    await userEvent.unhover(el);
    await new Promise((r) => setTimeout(r, 250));
    expect(elevation(el)).toBe(1);
  });

  it('snaps to its disabled elevation, with no shadow', async () => {
    const el = await mount('<rx-button variant="elevated">Off</rx-button>');
    el.disabled = true;
    await el.updateComplete;
    expect(elevation(el)).toBe(0);
    // No transition into disabled.
    expect(container(el).getAnimations()).toHaveLength(0);
    // At 0dp the key and ambient shadows have no size or offset: nothing shows.
    const shadow = getComputedStyle(container(el)).boxShadow.replace(/(color|rgba?)\([^)]*\)/g, '');
    expect(
      shadow
        .match(/-?[\d.]+px/g)!
        .map(parseFloat)
        .every((v) => v === 0),
    ).toBe(true);
  });

  it('outlined and text buttons never get a shadow', async () => {
    const el = await mount('<rx-button variant="outlined">x</rx-button>');
    await userEvent.hover(el);
    await new Promise((r) => setTimeout(r, 200));
    expect(elevation(el)).toBe(0);
  });
});

describe('rx-button behaviour', () => {
  it('is a button for assistive technology; disabled takes it out of the tab order', async () => {
    const el = await mount('<rx-button>Save</rx-button>');
    expect(el.getAttribute('role')).toBe('button');
    expect(el.getAttribute('tabindex')).toBe('0');
    el.disabled = true;
    await el.updateComplete;
    expect(el.getAttribute('aria-disabled')).toBe('true');
    expect(el.hasAttribute('tabindex')).toBe(false);
  });

  it('clicks with Enter and Space, not while disabled', async () => {
    const el = await mount('<rx-button type="button">Go</rx-button>');
    let clicks = 0;
    el.addEventListener('click', () => clicks++);
    el.focus();
    await userEvent.keyboard('{Enter} ');
    expect(clicks).toBe(2);
    el.disabled = true;
    await el.updateComplete;
    await userEvent.click(el, {force: true});
    el.click();
    expect(clicks).toBe(2);
  });

  it('submits its form with its name and value, like <button>', async () => {
    document.body.innerHTML =
      '<form><input name="q" value="cats" /><rx-button name="go" value="now">Go</rx-button></form>';
    const el = document.querySelector('rx-button') as RxButton;
    await el.updateComplete;
    let data: [string, FormDataEntryValue][] | null = null;
    el.form!.addEventListener('submit', (event) => {
      event.preventDefault();
      data = [...new FormData(el.form!, event.submitter)];
    });
    await userEvent.click(el);
    expect(data).toEqual([
      ['q', 'cats'],
      ['go', 'now'],
    ]);
  });

  it('type="reset" resets the form; type="button" does nothing to it', async () => {
    document.body.innerHTML =
      '<form><input name="q" value="cats" /><rx-button type="reset">Reset</rx-button><rx-button id="plain" type="button">Plain</rx-button></form>';
    const [reset, plain] = [...document.querySelectorAll('rx-button')] as RxButton[];
    await reset.updateComplete;
    const input = document.querySelector('input')!;
    input.value = 'dogs';
    let submits = 0;
    reset.form!.addEventListener('submit', (e) => {
      e.preventDefault();
      submits++;
    });
    plain.click();
    expect(submits).toBe(0);
    expect(input.value).toBe('dogs');
    reset.click();
    expect(input.value).toBe('cats');
  });

  it('is disabled by a disabled fieldset', async () => {
    document.body.innerHTML =
      '<form><fieldset disabled><rx-button>Go</rx-button></fieldset></form>';
    const el = document.querySelector('rx-button') as RxButton;
    await el.updateComplete;
    expect(el.getAttribute('aria-disabled')).toBe('true');
    let submits = 0;
    el.form!.addEventListener('submit', (e) => {
      e.preventDefault();
      submits++;
    });
    el.click();
    expect(submits).toBe(0);
  });

  it('shows its focus ring for keyboard focus only', async () => {
    document.body.innerHTML = '<button id="before">before</button><rx-button>Go</rx-button>';
    const el = document.querySelector('rx-button') as RxButton;
    await el.updateComplete;
    const ring = el.shadowRoot!.querySelector('rx-focus-ring')!;
    document.getElementById('before')!.focus();
    await userEvent.tab();
    expect(document.activeElement).toBe(el);
    await nextFrame();
    expect(ring.hasAttribute('visible')).toBe(true);
  });
});
