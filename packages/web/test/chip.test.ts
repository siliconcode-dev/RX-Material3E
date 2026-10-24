import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {userEvent} from 'vitest/browser';
import '@rx-m3e/tokens/theme.css';
import '../src/chip/chip.js';
import '../src/icon/icon.js';
import type {RxAssistChip, RxSuggestionChip} from '../src/chip/index.js';
import {setMotionDurationScale} from '../src/motion/index.js';

type Chip = RxAssistChip | RxSuggestionChip;

/*
 * The test's own copy of Compose's values. AssistChipDefaults and
 * SuggestionChipDefaults: Height 32dp (the tokens' ContainerHeight),
 * IconSize 18dp, ContentPadding 8dp at the sides, HorizontalSpacing 8dp,
 * shape CornerSmall (8dp), label large text; the clickable Surface's 48dp
 * touch target.
 */
const HEIGHT = 32;
const TOUCH = 48;
const PADDING = 8;
const SPACING = 8;
const ICON = 18;
const CORNER = 8;

/*
 * ChipColors from the Defaults: [label, leading icon, flat container,
 * elevated container]. Disabled: label and icons on-surface at 38%, the flat
 * outline on-surface at 12%, the elevated container on-surface at 12%.
 */
const COLORS = {
  'rx-assist-chip': {label: 'on-surface', icon: 'primary'},
  'rx-suggestion-chip': {label: 'on-surface-variant', icon: 'primary'},
} as const;

/* ChipElevation in dp (level 1 is 1dp, level 2 is 3dp). */
const FLAT = {default: 0, pressed: 0, focused: 0, hovered: 0, disabled: 0};
const ELEVATED = {default: 1, pressed: 1, focused: 1, hovered: 3, disabled: 0};

async function mount<T extends Chip = Chip>(markup: string) {
  document.body.innerHTML = markup;
  const el = document.querySelector('rx-assist-chip, rx-suggestion-chip') as T;
  await el.updateComplete;
  return el;
}

const container = (el: Chip) => el.shadowRoot!.querySelector('.chip') as HTMLElement;
const box = (el: Element) => el.getBoundingClientRect();
const elevation = (el: Chip) =>
  parseFloat(getComputedStyle(container(el)).getPropertyValue('--rx-elevation'));

/** The text node's box. */
function textBox(el: Element) {
  const node = [...el.childNodes].find(
    (n) => n.nodeType === Node.TEXT_NODE && n.textContent!.trim(),
  )!;
  const range = document.createRange();
  range.selectNodeContents(node);
  return range.getBoundingClientRect();
}

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

/** Fully transparent, however the browser writes it. */
const isTransparent = (c: string) =>
  c === 'rgba(0, 0, 0, 0)' || /^color\(srgb [\d. ]+\/ 0\)$/.test(c);

const outline = (el: Chip) => getComputedStyle(container(el), '::before');

beforeEach(() => {
  document.documentElement.dataset.theme = 'light';
});
afterEach(() => {
  document.body.replaceChildren();
  delete document.documentElement.dataset.theme;
  document.documentElement.dir = '';
  setMotionDurationScale(null);
});

for (const tag of ['rx-assist-chip', 'rx-suggestion-chip'] as const) {
  describe(`${tag} layout`, () => {
    it('is 32dp tall in a 48dp touch target, with 8dp corners', async () => {
      const el = await mount(`<${tag}>Label</${tag}>`);
      expect(box(container(el)).height).toBe(HEIGHT);
      expect(box(el).height).toBe(TOUCH);
      expect(box(container(el)).top - box(el).top).toBe((TOUCH - HEIGHT) / 2);
      expect(getComputedStyle(container(el)).borderTopLeftRadius).toBe(`${CORNER}px`);
    });

    it('a label alone has 16dp each side (padding plus the spacing around the empty icon boxes)', async () => {
      const el = await mount(`<${tag}>Label</${tag}>`);
      const chip = box(container(el));
      const text = textBox(el);
      expect(text.left - chip.left).toBeCloseTo(PADDING + SPACING, 0);
      expect(chip.right - text.right).toBeCloseTo(PADDING + SPACING, 0);
      expect(chip.width).toBeCloseTo(text.width + 2 * (PADDING + SPACING), 0);
    });

    it('an icon: 8dp, the 18dp icon, 8dp, the label, 16dp', async () => {
      const el = await mount(`<${tag}><rx-icon slot="icon">star</rx-icon>Label</${tag}>`);
      const chip = box(container(el));
      const icon = box(el.querySelector('rx-icon')!);
      expect([icon.width, icon.height]).toEqual([ICON, ICON]);
      expect(icon.left - chip.left).toBe(PADDING);
      expect(icon.top - chip.top).toBe((HEIGHT - ICON) / 2);
      const text = textBox(el);
      expect(text.left - icon.right).toBeCloseTo(SPACING, 0);
      expect(chip.right - text.right).toBeCloseTo(PADDING + SPACING, 0);
    });

    it('sets the label in label large', async () => {
      const el = await mount(`<${tag}>Label</${tag}>`);
      const probe = document.createElement('i');
      probe.className = 'rx-typescale-label-large';
      probe.style.font =
        'var(--md-sys-typescale-label-large-weight) var(--md-sys-typescale-label-large-size) / var(--md-sys-typescale-label-large-line-height) var(--md-sys-typescale-label-large-font)';
      document.body.append(probe);
      const want = getComputedStyle(probe);
      const got = getComputedStyle(container(el));
      for (const p of ['fontSize', 'fontWeight', 'lineHeight', 'fontFamily'] as const) {
        expect(got[p], p).toBe(want[p]);
      }
    });

    it('mirrors in RTL', async () => {
      document.documentElement.dir = 'rtl';
      const el = await mount(`<${tag}><rx-icon slot="icon">star</rx-icon>Label</${tag}>`);
      const chip = box(container(el));
      const icon = box(el.querySelector('rx-icon')!);
      expect(chip.right - icon.right).toBe(PADDING);
      expect(icon.left - textBox(el).right).toBeCloseTo(SPACING, 0);
    });

    it('keeps its natural width in a squeezed row (width(IntrinsicSize.Max))', async () => {
      const el = await mount(
        `<div style="display: flex; width: 40px"><${tag}>A long label</${tag}></div>`,
      );
      const text = textBox(el);
      expect(box(container(el)).width).toBeCloseTo(text.width + 32, 0);
      // One line.
      expect(text.height).toBeLessThan(HEIGHT);
      expect(box(el).width).toBe(box(container(el)).width);
    });
  });

  describe(`${tag} colors`, () => {
    const want = COLORS[tag];

    it(`flat: transparent, ${want.label} label, ${want.icon} icon, a 1dp outline-variant outline`, async () => {
      const el = await mount(`<${tag}><rx-icon slot="icon">star</rx-icon>Label</${tag}>`);
      const style = getComputedStyle(container(el));
      expect(isTransparent(style.backgroundColor)).toBe(true);
      expect(style.color).toBe(color(want.label));
      expect(getComputedStyle(el.querySelector('rx-icon')!).color).toBe(color(want.icon));
      expect(outline(el).borderTopWidth).toBe('1px');
      expect(outline(el).borderTopColor).toBe(color('outline-variant'));
      // Modifier.border takes no room: the content box is unchanged.
      expect(style.borderTopWidth).toBe('0px');
    });

    it('elevated: surface container low, no outline', async () => {
      const el = await mount(`<${tag} elevated>Label</${tag}>`);
      const style = getComputedStyle(container(el));
      expect(style.backgroundColor).toBe(color('surface-container-low'));
      expect(style.color).toBe(color(want.label));
      expect(isTransparent(outline(el).borderTopColor)).toBe(true);
    });

    it('disabled flat: label and icon on-surface at 38%, the outline at 12%', async () => {
      const el = await mount(`<${tag} disabled><rx-icon slot="icon">star</rx-icon>Label</${tag}>`);
      expect(getComputedStyle(container(el)).color).toBe(color('on-surface', 0.38));
      expect(getComputedStyle(el.querySelector('rx-icon')!).color).toBe(color('on-surface', 0.38));
      expect(outline(el).borderTopColor).toBe(color('on-surface', 0.12));
      expect(isTransparent(getComputedStyle(container(el)).backgroundColor)).toBe(true);
    });

    it('disabled elevated: the container on-surface at 12%, no outline', async () => {
      const el = await mount(`<${tag} elevated disabled>Label</${tag}>`);
      expect(getComputedStyle(container(el)).backgroundColor).toBe(color('on-surface', 0.12));
      expect(getComputedStyle(container(el)).color).toBe(color('on-surface', 0.38));
      expect(isTransparent(outline(el).borderTopColor)).toBe(true);
    });
  });

  describe(`${tag} elevation`, () => {
    it('reads its elevations from the tokens', async () => {
      expect((await mount(`<${tag}>x</${tag}>`)).elevations).toEqual(FLAT);
      expect((await mount(`<${tag} elevated>x</${tag}>`)).elevations).toEqual(ELEVATED);
    });

    it('elevated: level 1 (1dp), level 2 (3dp) hovered, back to 1', async () => {
      const el = await mount(`<${tag} elevated>Label</${tag}>`);
      expect(elevation(el)).toBe(1);
      await userEvent.hover(el);
      await new Promise((r) => setTimeout(r, 250));
      expect(elevation(el)).toBe(3);
      await userEvent.unhover(el);
      await new Promise((r) => setTimeout(r, 250));
      expect(elevation(el)).toBe(1);
    });

    it('elevated, disabled: snaps to 0', async () => {
      const el = await mount(`<${tag} elevated>Label</${tag}>`);
      el.disabled = true;
      await el.updateComplete;
      expect(elevation(el)).toBe(0);
      expect(container(el).getAnimations()).toHaveLength(0);
    });

    it('flat: no shadow, even hovered', async () => {
      const el = await mount(`<${tag}>Label</${tag}>`);
      await userEvent.hover(el);
      await new Promise((r) => setTimeout(r, 200));
      expect(elevation(el)).toBe(0);
    });
  });

  describe(`${tag} behaviour`, () => {
    it('is a button; disabled takes it out of the tab order', async () => {
      const el = await mount(`<${tag}>Label</${tag}>`);
      expect(el.getAttribute('role')).toBe('button');
      expect(el.tabIndex).toBe(0);
      el.disabled = true;
      await el.updateComplete;
      expect(el.getAttribute('aria-disabled')).toBe('true');
      expect(el.hasAttribute('tabindex') ? el.tabIndex : -1).toBe(-1);
    });

    it('clicks with Enter and Space, and not while disabled', async () => {
      const el = await mount(`<${tag}>Label</${tag}>`);
      let clicks = 0;
      el.addEventListener('click', () => clicks++);
      el.focus();
      await userEvent.keyboard('{Enter}');
      await userEvent.keyboard(' ');
      expect(clicks).toBe(2);
      el.disabled = true;
      await el.updateComplete;
      el.click();
      await userEvent.click(el, {force: true});
      expect(clicks).toBe(2);
    });

    it('turns its ripple off while disabled', async () => {
      const el = await mount(`<${tag} disabled>Label</${tag}>`);
      const ripple = el.shadowRoot!.querySelector('rx-ripple')!;
      expect(ripple.disabled).toBe(true);
    });
  });
}

describe('rx-assist-chip trailing icon', () => {
  it('sits 8dp from the end, 8dp after the label', async () => {
    const el = await mount(
      '<rx-assist-chip>Label<rx-icon slot="trailing-icon">arrow_drop_down</rx-icon></rx-assist-chip>',
    );
    const chip = box(container(el));
    const icon = box(el.querySelector('rx-icon')!);
    expect([icon.width, icon.height]).toEqual([ICON, ICON]);
    expect(chip.right - icon.right).toBe(PADDING);
    expect(icon.left - textBox(el).right).toBeCloseTo(SPACING, 0);
    // The empty leading box still has its spacing: 16dp before the label.
    expect(textBox(el).left - chip.left).toBeCloseTo(PADDING + SPACING, 0);
    expect(getComputedStyle(el.querySelector('rx-icon')!).color).toBe(color('primary'));
  });

  it('given more width, the label takes it and the trailing icon stays at the end', async () => {
    const el = await mount(
      '<rx-assist-chip style="width: 300px"><rx-icon slot="icon">star</rx-icon>Label<rx-icon slot="trailing-icon">arrow_drop_down</rx-icon></rx-assist-chip>',
    );
    const chip = box(container(el));
    expect(chip.width).toBe(300);
    const [lead, trail] = [...el.querySelectorAll('rx-icon')].map(box);
    expect(lead.left - chip.left).toBe(PADDING);
    expect(chip.right - trail.right).toBe(PADDING);
    expect(textBox(el).left - lead.right).toBeCloseTo(SPACING, 0);
  });
});

describe('rx-suggestion-chip', () => {
  it('has no trailing icon (SuggestionChip passes trailingIcon = null)', async () => {
    const el = await mount(
      '<rx-suggestion-chip>Label<rx-icon slot="trailing-icon">close</rx-icon></rx-suggestion-chip>',
    );
    expect(box(el.querySelector('rx-icon')!).width).toBe(0);
    expect(box(container(el)).right - textBox(el).right).toBeCloseTo(PADDING + SPACING, 0);
  });
});
