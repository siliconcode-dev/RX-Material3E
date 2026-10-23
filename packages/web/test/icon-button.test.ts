import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {userEvent} from 'vitest/browser';
import '@rx-m3e/tokens/theme.css';
import '../src/icon-button/icon-button.js';
import '../src/icon/icon.js';
import type {RxIconButton} from '../src/icon-button/index.js';
import {setMotionDurationScale} from '../src/motion/index.js';

// The surrounding text color (Compose's LocalContentColor).
const LOCAL = 'rgb(10, 120, 60)';

async function mount(attributes: string, wrap = true) {
  const button = `<rx-icon-button ${attributes}><rx-icon label="Star">star</rx-icon></rx-icon-button>`;
  document.body.innerHTML = wrap ? `<div style="color: ${LOCAL}">${button}</div>` : button;
  const el = document.querySelector('rx-icon-button') as RxIconButton;
  await el.updateComplete;
  return el;
}

const container = (el: RxIconButton) => el.shadowRoot!.querySelector('.button') as HTMLElement;
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r(undefined)));
const frames = async (n: number) => {
  for (let i = 0; i < n; i++) await nextFrame();
};
const radius = (el: RxIconButton) => {
  const box = container(el);
  const specified = parseFloat(getComputedStyle(box).borderTopLeftRadius);
  return Math.min(specified, Math.min(box.offsetWidth, box.offsetHeight) / 2);
};
const press = (el: RxIconButton) =>
  el.dispatchEvent(new PointerEvent('pointerdown', {button: 0, bubbles: true}));
const release = (el: RxIconButton) =>
  el.dispatchEvent(new PointerEvent('pointerup', {button: 0, bubbles: true}));

/** A color (a role name or any CSS color), optionally at an opacity, as the browser computes it. */
function color(value: string, opacity?: number) {
  const css = /^[a-z-]+$/.test(value) ? `var(--md-sys-color-${value})` : value;
  const probe = document.createElement('i');
  probe.style.color =
    opacity === undefined ? css : `color-mix(in srgb, ${css} ${opacity * 100}%, transparent)`;
  document.body.append(probe);
  const result = getComputedStyle(probe).color;
  probe.remove();
  return result;
}
const NONE = 'rgba(0, 0, 0, 0)';

/** [container, content, outline] as computed. */
function look(el: RxIconButton) {
  const s = getComputedStyle(container(el));
  const outline = getComputedStyle(container(el), '::before');
  return [
    s.backgroundColor,
    s.color,
    outline.borderTopWidth === '0px' ? NONE : outline.borderTopColor,
  ];
}

beforeEach(() => {
  document.documentElement.dataset.theme = 'light';
});
afterEach(() => {
  document.body.replaceChildren();
  delete document.documentElement.dataset.theme;
  setMotionDurationScale(null);
});

type Look = [container: string | null, content: [string, number?], outline?: [string, number?]];

/*
 * The test's own copy of IconButtonDefaults' colors: [container, content,
 * outline], each a role (or LOCAL) and an optional opacity. null is no
 * container. Outlines are 1dp.
 */
const CASES: Record<
  string,
  {attrs: string; off: Look; on?: Look; disabled: Look; disabledOn?: Look}
> = {
  standard: {
    attrs: '',
    off: [null, [LOCAL]],
    disabled: [null, [LOCAL, 0.38]],
  },
  'standard toggle': {
    attrs: 'toggle',
    off: [null, [LOCAL]],
    on: [null, ['primary']],
    disabled: [null, [LOCAL, 0.38]],
  },
  'standard vibrant': {
    attrs: 'vibrant',
    off: [null, ['on-surface-variant']],
    disabled: [null, ['on-surface', 0.38]],
  },
  'standard toggle morph (vibrant)': {
    attrs: 'toggle morph',
    off: [null, ['on-surface-variant']],
    on: [null, ['primary']],
    disabled: [null, ['on-surface', 0.38]],
  },
  'standard morph (not vibrant)': {
    attrs: 'morph',
    off: [null, [LOCAL]],
    disabled: [null, [LOCAL, 0.38]],
  },
  filled: {
    attrs: 'variant="filled"',
    off: ['primary', ['on-primary']],
    disabled: [['on-surface', 0.1] as never, ['on-surface', 0.38]],
  },
  'filled toggle': {
    attrs: 'variant="filled" toggle',
    off: ['surface-container', ['on-surface-variant']],
    on: ['primary', ['on-primary']],
    disabled: [['on-surface', 0.1] as never, ['on-surface', 0.38]],
  },
  tonal: {
    attrs: 'variant="tonal"',
    off: ['secondary-container', ['on-secondary-container']],
    disabled: [['on-surface', 0.1] as never, ['on-surface', 0.38]],
  },
  'tonal toggle': {
    attrs: 'variant="tonal" toggle',
    off: ['secondary-container', ['on-secondary-container']],
    on: ['secondary', ['on-secondary']],
    disabled: [['on-surface', 0.1] as never, ['on-surface', 0.38]],
  },
  outlined: {
    attrs: 'variant="outlined"',
    off: [null, [LOCAL], [LOCAL]],
    disabled: [null, [LOCAL, 0.38], [LOCAL, 0.38]],
  },
  'outlined toggle': {
    attrs: 'variant="outlined" toggle',
    off: [null, [LOCAL], [LOCAL]],
    on: ['inverse-surface', ['inverse-on-surface']],
    disabled: [null, [LOCAL, 0.38], [LOCAL, 0.38]],
    // outlinedIconToggleButtonBorder: no outline when checked, enabled or not.
    disabledOn: [null, [LOCAL, 0.38]],
  },
  'outlined vibrant': {
    attrs: 'variant="outlined" vibrant',
    off: [null, ['on-surface-variant'], ['outline-variant']],
    disabled: [null, ['on-surface', 0.38], ['outline-variant', 0.38]],
  },
  'outlined toggle morph (vibrant)': {
    attrs: 'variant="outlined" toggle morph',
    off: [null, ['on-surface-variant'], ['outline-variant']],
    on: ['inverse-surface', ['inverse-on-surface']],
    disabled: [null, ['on-surface', 0.38], ['outline-variant', 0.38]],
    disabledOn: [null, ['on-surface', 0.38]],
  },
};

function expected([bg, content, outline]: Look) {
  const background = bg === null ? NONE : Array.isArray(bg) ? color(bg[0], bg[1]) : color(bg);
  return [
    background,
    color(content[0], content[1]),
    outline ? color(outline[0], outline[1]) : NONE,
  ];
}

describe('rx-icon-button colors', () => {
  for (const [name, c] of Object.entries(CASES)) {
    it(name, async () => {
      const el = await mount(c.attrs);
      expect(look(el), 'off').toEqual(expected(c.off));
      if (c.on) {
        el.checked = true;
        await el.updateComplete;
        expect(look(el), 'on').toEqual(expected(c.on));
      }
      // Disabled wins over checked.
      el.disabled = true;
      await el.updateComplete;
      expect(look(el), 'disabled').toEqual(
        expected(c.on ? (c.disabledOn ?? c.disabled) : c.disabled),
      );
      el.checked = false;
      await el.updateComplete;
      expect(look(el), 'disabled, off').toEqual(expected(c.disabled));
    });
  }

  it('the outline is 1dp', async () => {
    const el = await mount('variant="outlined"');
    expect(getComputedStyle(container(el), '::before').borderTopWidth).toBe('1px');
  });

  it('checked only counts for a toggle', async () => {
    const el = await mount('variant="filled" checked');
    expect(look(el)).toEqual(expected(CASES.filled.off));
  });
});

describe('rx-icon-button layout and shapes', () => {
  it('is 40dp square, round, in a 48dp touch target, with a 24dp icon', async () => {
    const el = await mount('');
    const box = container(el).getBoundingClientRect();
    expect([box.width, box.height]).toEqual([40, 40]);
    const host = el.getBoundingClientRect();
    expect([host.width, host.height]).toEqual([48, 48]);
    const icon = el.querySelector('rx-icon')!.getBoundingClientRect();
    expect([icon.width, icon.height]).toEqual([24, 24]);
    expect(icon.left - box.left).toBe(8);
    expect(radius(el)).toBe(20);
  });

  it('keeps its shape on press without morph', async () => {
    setMotionDurationScale(0);
    const el = await mount('variant="filled"');
    press(el);
    await frames(2);
    expect(radius(el)).toBe(20);
  });

  it('with morph: 8dp pressed, 12dp checked (a toggle), pressed over checked', async () => {
    setMotionDurationScale(0);
    const el = await mount('variant="filled" toggle morph');
    press(el);
    await frames(2);
    expect(radius(el)).toBe(8);
    release(el);
    await frames(2);
    expect(radius(el)).toBe(20);
    el.checked = true;
    await el.updateComplete;
    await frames(2);
    expect(radius(el)).toBe(12);
    press(el);
    await frames(2);
    expect(radius(el)).toBe(8);
  });

  it('a plain icon button with morph ignores checked', async () => {
    setMotionDurationScale(0);
    const el = await mount('morph checked');
    await frames(2);
    expect(radius(el)).toBe(20);
  });

  it('morphs on the default effects spring', async () => {
    const el = await mount('toggle morph');
    const spec = (el.shapeState as unknown as {spec: () => object}).spec();
    expect(spec).toMatchObject({dampingRatio: 1, stiffness: 1600});
  });

  it('takes its shapes from the custom properties', async () => {
    setMotionDurationScale(0);
    const el = await mount(
      'toggle morph style="--rx-icon-button-shape: 10px; --rx-icon-button-pressed-shape: 2px; --rx-icon-button-checked-shape: 4px"',
    );
    expect(radius(el)).toBe(10);
    el.checked = true;
    await el.updateComplete;
    await frames(2);
    expect(radius(el)).toBe(4);
    press(el);
    await frames(2);
    expect(radius(el)).toBe(2);
  });
});

describe('rx-icon-button behaviour', () => {
  it('is a button, or a checkbox with toggle', async () => {
    const el = await mount('');
    expect(el.getAttribute('role')).toBe('button');
    expect(el.hasAttribute('aria-checked')).toBe(false);
    el.toggle = true;
    await el.updateComplete;
    expect(el.getAttribute('role')).toBe('checkbox');
    expect(el.getAttribute('aria-checked')).toBe('false');
    el.click();
    await el.updateComplete;
    expect(el.getAttribute('aria-checked')).toBe('true');
  });

  it('a button clicks on Enter and Space; a toggle toggles on Space only', async () => {
    const el = await mount('type="button"');
    let clicks = 0;
    el.addEventListener('click', () => clicks++);
    el.focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    expect(clicks).toBe(2);
    el.toggle = true;
    await el.updateComplete;
    await userEvent.keyboard('{Enter}');
    expect(el.checked).toBe(false);
    await userEvent.keyboard(' ');
    expect(el.checked).toBe(true);
  });

  it('presses for the keys that activate it', async () => {
    setMotionDurationScale(0);
    const el = await mount('toggle morph');
    el.focus();
    await userEvent.keyboard('{Enter>}');
    await frames(2);
    expect(radius(el)).toBe(20);
    await userEvent.keyboard('{/Enter}');
    el.toggle = false;
    await el.updateComplete;
    await userEvent.keyboard('{Enter>}');
    await frames(2);
    expect(radius(el)).toBe(8);
    await userEvent.keyboard('{/Enter}');
  });

  it('a toggle fires input and change; disabled it does nothing', async () => {
    const el = await mount('toggle');
    const events: string[] = [];
    el.addEventListener('input', () => events.push('input'));
    el.addEventListener('change', () => events.push('change'));
    await userEvent.click(el);
    expect(events).toEqual(['input', 'change']);
    el.disabled = true;
    await el.updateComplete;
    el.click();
    expect(el.checked).toBe(true);
    expect(events).toHaveLength(2);
  });

  it('in a form: a button submits with its name and value; a toggle is a checkbox', async () => {
    document.body.innerHTML = `<form>
      <rx-icon-button toggle name="star" checked><rx-icon>star</rx-icon></rx-icon-button>
      <rx-icon-button toggle name="pin" value="yes"><rx-icon>push_pin</rx-icon></rx-icon-button>
      <rx-icon-button name="go" value="now"><rx-icon>send</rx-icon></rx-icon-button>
    </form>`;
    const form = document.querySelector('form')!;
    const [star, pin, go] = [...form.querySelectorAll('rx-icon-button')] as RxIconButton[];
    await Promise.all([star, pin, go].map((b) => b.updateComplete));
    let submitted: [string, FormDataEntryValue][] = [];
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      submitted = [...new FormData(form, e.submitter)];
    });
    go.click();
    expect(submitted).toEqual([
      ['star', 'on'],
      ['go', 'now'],
    ]);
    star.click();
    pin.click();
    await Promise.all([star, pin].map((b) => b.updateComplete));
    expect([...new FormData(form)]).toEqual([['pin', 'yes']]);
    form.reset();
    await Promise.all([star, pin].map((b) => b.updateComplete));
    expect([star.checked, pin.checked]).toEqual([true, false]);
  });
});

/*
 * The test's own copy of IconButtonDefaults' sizes (the size tokens):
 * height, icon size, width narrow / uniform / wide, and the corners: square,
 * pressed, selected from round (selected from square is fully round).
 */
const SIZES = {
  xs: {height: 32, icon: 20, widths: [28, 32, 40], square: 12, pressed: 8, selected: 12},
  s: {height: 40, icon: 24, widths: [32, 40, 52], square: 12, pressed: 8, selected: 12},
  m: {height: 56, icon: 24, widths: [48, 56, 72], square: 16, pressed: 12, selected: 16},
  l: {height: 96, icon: 32, widths: [64, 96, 128], square: 28, pressed: 16, selected: 28},
  xl: {height: 136, icon: 40, widths: [104, 136, 184], square: 28, pressed: 16, selected: 28},
} as const;
const WIDTHS = ['narrow', 'uniform', 'wide'] as const;

describe('rx-icon-button sizes and widths', () => {
  it('is small and uniform by default', async () => {
    const el = await mount('');
    expect([el.size, el.width, el.shape]).toEqual(['s', 'uniform', 'round']);
  });

  for (const [size, want] of Object.entries(SIZES)) {
    it(`${size}: ${want.height}dp tall, ${want.widths.join(' / ')}dp wide, a ${want.icon}dp icon`, async () => {
      for (const [i, width] of WIDTHS.entries()) {
        const el = await mount(`size="${size}" width="${width}"`);
        const box = container(el).getBoundingClientRect();
        expect([box.width, box.height], width).toEqual([want.widths[i], want.height]);
        // At least the 48dp touch target, the container centered in it.
        const host = el.getBoundingClientRect();
        expect(host.width).toBe(Math.max(48, want.widths[i]));
        expect(host.height).toBe(Math.max(48, want.height));
        expect(box.left - host.left).toBe((host.width - box.width) / 2);
        const icon = el.querySelector('rx-icon')!.getBoundingClientRect();
        expect([icon.width, icon.height]).toEqual([want.icon, want.icon]);
        expect(icon.left - box.left).toBe((want.widths[i] - want.icon) / 2);
      }
    });

    it(`${size}: round or square, pressed ${want.pressed}dp, selected ${want.selected}dp or round`, async () => {
      setMotionDurationScale(0);
      const round = await mount(`size="${size}" toggle morph`);
      expect(radius(round)).toBe(want.height / 2);
      press(round);
      await frames(2);
      expect(radius(round), 'pressed').toBe(want.pressed);
      release(round);
      round.checked = true;
      await round.updateComplete;
      await frames(2);
      expect(radius(round), 'selected from round').toBe(want.selected);

      const square = await mount(`size="${size}" shape="square" toggle morph`);
      expect(radius(square)).toBe(want.square);
      square.checked = true;
      await square.updateComplete;
      await frames(2);
      expect(radius(square), 'selected from square').toBe(want.height / 2);
    });
  }

  it('a square narrow button turns fully round on its shorter side', async () => {
    setMotionDurationScale(0);
    const el = await mount('size="xl" width="narrow" shape="square" toggle morph checked');
    await frames(2);
    expect(radius(el)).toBe(104 / 2);
  });

  it('keeps the 1dp outline at every size (outlinedIconButtonBorder)', async () => {
    for (const size of Object.keys(SIZES)) {
      const el = await mount(`size="${size}" variant="outlined"`);
      expect(getComputedStyle(container(el), '::before').borderTopWidth, size).toBe('1px');
    }
  });

  it('a square button without morph keeps its square corners', async () => {
    const el = await mount('size="m" shape="square"');
    expect(radius(el)).toBe(16);
  });
});
