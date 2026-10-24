/*
 * Ported by hand from androidx/compose/material3 ButtonGroup.kt
 * (ButtonGroup, ButtonGroupDefaults.ExpandedRatio and HorizontalArrangement,
 * ButtonGroupMeasurePolicy's expand and compress logic, EnlargeOnPressNode
 * and waitUntil) with the token ButtonGroupSmallTokens.
 * Copyright 2024-2025 The Android Open Source Project. Licensed under the Apache License 2.0.
 *
 * Compose lays the items out in a row, each at its intrinsic width (or its
 * weight's share), and while an item is pressed it grows into its
 * neighbours: a spring takes its "pressed" value from 0 to 1, and every
 * layout pass turns that value into widths. Here the row is CSS flexbox
 * (`flex` on an item is Compose's weight), and while any item's spring runs
 * the group works out the widths as Compose does and sets them.
 */

import group from '@rx-m3e/tokens/js/button-group-small.js';
import connected from '@rx-m3e/tokens/js/connected-button-group-small.js';
import {LitElement, css, html, unsafeCSS} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import {trackPress, type PressTracker} from '../internals/press-interaction.js';
import {Animatable} from '../motion/animatable.js';
import {motionSpring} from '../motion/motion-scheme.js';

/** Multi (the default: each toggle on its own) or single (one toggle on at a time). */
export type ButtonGroupSelection = 'multi' | 'single';

/** Alignment.Vertical for the items: Top (the default), CenterVertically or Bottom. */
export type ButtonGroupAlign = 'top' | 'center' | 'bottom';

/** ButtonDefaults.ContentPadding's end padding: the default compression limit (dp). */
const DefaultCompressionLimit = 24;

/** waitUntil's MAX_WAIT_TIME_MILLIS. */
const MaxWaitTimeMillis = 1000;

interface Item {
  readonly element: HTMLElement;
  readonly pressed: Animatable;
  readonly tracker: PressTracker;
  // collectLatest: a newer press state cancels a pending release.
  release: number;
  // Inline styles the group overrode while animating, to put back.
  saved: Record<string, string> | null;
}

const OVERRIDDEN = [
  'width',
  'min-width',
  '--rx-button-group-min-width',
  '--rx-button-group-max-padding',
] as const;

/**
 * A Material 3 Expressive button group, as Compose's ButtonGroup: buttons,
 * toggle buttons and icon buttons in a row, 12dp apart. A pressed button
 * grows and squeezes its neighbours (Compose's animateWidth) on the fast
 * spatial spring; `static` turns that off.
 *
 * Each item is as wide as it would be on its own, except that its container
 * fills its 48dp touch target (so a small icon button is 48dp wide, as in
 * Compose). Give an item `flex: 1` (Compose's weight) to share out the free
 * width; the group then needs a width of its own.
 *
 * The overflow menu that Compose shows when the items don't fit comes with
 * menus (step 58); until then extra items run past the end.
 *
 * @example
 * <rx-button-group>
 *   <rx-button>Day</rx-button>
 *   <rx-button variant="tonal">Week</rx-button>
 *   <rx-button variant="tonal">Month</rx-button>
 * </rx-button-group>
 *
 * @slot - The buttons.
 * @cssprop --rx-button-group-compression-limit - On an item: how far its
 *   neighbours may squeeze it (Compose's compressionLimit). Defaults to 24px.
 */
@customElement('rx-button-group')
export class RxButtonGroup extends LitElement {
  /** How much a pressed item grows, as a share of its width (ExpandedRatio, 0.15). */
  @property({type: Number, attribute: 'expanded-ratio'}) expandedRatio = 0.15;

  /** How the items line up when their heights differ. Defaults to top. */
  @property({reflect: true}) align: ButtonGroupAlign = 'top';

  /** No growing on press. */
  @property({type: Boolean, reflect: true, attribute: 'static'}) isStatic = false;

  /**
   * A connected group, as Compose's connected samples: toggle buttons 2dp
   * apart with ButtonGroupDefaults' connected shapes, wrapping onto more
   * rows 2dp apart. Connected items don't grow on press.
   */
  @property({type: Boolean, reflect: true}) connected = false;

  /**
   * With `single`, one toggle button is on at a time and they are radio
   * buttons (SingleSelectConnectedButtonGroupSample); pressing the one that
   * is on keeps it on.
   */
  @property({reflect: true}) selection: ButtonGroupSelection = 'multi';

  private items: Item[] = [];
  // The items' widths before any growth (Compose's `widths`), while animating.
  private base: number[] | null = null;

  static override styles = css`
    /* HorizontalArrangement: spacedBy(BetweenSpace); verticalAlignment Top. */
    :host {
      display: inline-flex;
      gap: ${unsafeCSS(group['between-space'])};
      align-items: flex-start;
      vertical-align: middle;
    }

    :host([align='center']) {
      align-items: center;
    }

    :host([align='bottom']) {
      align-items: flex-end;
    }

    /*
     * Each item is measured at its intrinsic width and then given exactly
     * that width, so its container fills its touch target. Items keep their
     * width when the row is too narrow (Compose shows an overflow menu).
     */
    ::slotted(*) {
      flex-shrink: 0;
      --rx-button-group-width: 100%;
    }

    /*
     * Connected (SingleSelect/MultiSelectConnectedButtonGroupSample): a
     * FlowRow spaced by ConnectedSpaceBetween, rows 2dp apart; the toggle
     * buttons take connectedMiddleButtonShapes (ShapeDefaults.Small, the
     * pressed inner corner size, connectedButtonCheckedShape fully round),
     * the first connectedLeadingButtonShapes and the last
     * connectedTrailingButtonShapes. Their outer corners are
     * ShapeDefaults.CornerFull, CornerSize(100): 100% of the shorter side,
     * which the outline scales down to fit.
     */
    :host([connected]) {
      flex-wrap: wrap;
      gap: 2px ${unsafeCSS(connected['between-space'])};
    }

    :host([connected]) ::slotted(*) {
      --rx-toggle-button-shape: var(--md-sys-shape-corner-small);
      --rx-toggle-button-pressed-shape: ${unsafeCSS(connected['pressed-inner-corner-corner-size'])};
      --rx-toggle-button-checked-shape: var(--md-sys-shape-corner-full);
    }

    :host([connected]) ::slotted(:last-child) {
      --rx-toggle-button-shape: ${unsafeCSS(connected['inner-corner-corner-size'])} 100% 100%
        ${unsafeCSS(connected['inner-corner-corner-size'])};
      --rx-toggle-button-pressed-shape: ${unsafeCSS(connected['pressed-inner-corner-corner-size'])}
        100% 100% ${unsafeCSS(connected['pressed-inner-corner-corner-size'])};
    }

    /* After the last child's rule: a lone item is the leading one (index 0). */
    :host([connected]) ::slotted(:first-child) {
      --rx-toggle-button-shape: 100% ${unsafeCSS(connected['inner-corner-corner-size'])}
        ${unsafeCSS(connected['inner-corner-corner-size'])} 100%;
      --rx-toggle-button-pressed-shape: 100%
        ${unsafeCSS(connected['pressed-inner-corner-corner-size'])}
        ${unsafeCSS(connected['pressed-inner-corner-corner-size'])} 100%;
    }
  `;

  constructor() {
    super();
    this.addEventListener('click', this.onItemClick, true);
    this.addEventListener('change', this.onItemChange);
  }

  /** The direct child an event came from, if any. */
  private itemOf(event: Event): HTMLElement | null {
    for (const node of event.composedPath()) {
      if (node instanceof HTMLElement && node.parentElement === this) return node;
    }
    return null;
  }

  // Single selection: pressing the toggle that is on keeps it on
  // (onCheckedChange = { selectedIndex = index }).
  private readonly onItemClick = (event: Event) => {
    const item = this.itemOf(event);
    if (this.selection === 'single' && item && (item as {checked?: boolean}).checked === true) {
      event.preventDefault();
    }
  };

  // Single selection: turning one on turns the others off.
  private readonly onItemChange = (event: Event) => {
    const item = this.itemOf(event) as (HTMLElement & {checked?: boolean}) | null;
    if (this.selection !== 'single' || !item?.checked) return;
    for (const other of this.items) {
      const element = other.element as HTMLElement & {checked?: boolean};
      if (element !== item && element.checked) element.checked = false;
    }
  };

  protected override updated() {
    this.markRadios();
  }

  // Single selection makes the toggle buttons radio buttons.
  private markRadios() {
    // The attribute, so it also reaches toggle buttons that upgrade later.
    for (const {element} of this.items) {
      if (element.localName === 'rx-toggle-button' || 'radio' in element) {
        element.toggleAttribute('radio', this.selection === 'single');
      }
    }
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    for (const item of this.items) this.forget(item);
    this.items = [];
    this.base = null;
  }

  private onSlotChange(event: Event) {
    const elements = (event.target as HTMLSlotElement)
      .assignedElements()
      .filter((e): e is HTMLElement => e instanceof HTMLElement);
    for (const item of this.items) {
      if (!elements.includes(item.element)) this.forget(item);
    }
    this.items = elements.map(
      (element) => this.items.find((i) => i.element === element) ?? this.watch(element),
    );
    this.base = null;
    this.markRadios();
  }

  /** EnlargeOnPressNode for one item. */
  private watch(element: HTMLElement): Item {
    const item: Item = {
      element,
      pressed: new Animatable(0),
      release: 0,
      saved: null,
      tracker: trackPress(element, {
        enabled: () =>
          !this.isStatic && !this.connected && element.getAttribute('aria-disabled') !== 'true',
        // A toggle (checkbox) is pressed by Space only, as it is activated.
        keys: () => (element.getAttribute('role') === 'checkbox' ? [' '] : [' ', 'Enter']),
        onChange: (pressed) => this.onPressChange(item, pressed),
      }),
    };
    return item;
  }

  private forget(item: Item) {
    item.tracker.dispose();
    item.pressed.stop();
    item.release++;
    this.restore(item);
  }

  private onPressChange(item: Item, pressed: boolean) {
    // A new press state cancels the wait for the last one (collectLatest).
    const token = ++item.release;
    const spec = () => motionSpring(this, 'fastSpatial');
    if (pressed) {
      void item.pressed.animateTo(1, spec(), undefined, this.relayout);
      return;
    }
    // Released: let the grow get at least three quarters of the way first
    // (waitUntil, which gives up after a second), then spring back.
    requestAnimationFrame((start) => {
      const check = (now: number) => {
        if (token !== item.release) return;
        if (now - start > MaxWaitTimeMillis || item.pressed.value > 0.75) {
          void item.pressed.animateTo(0, spec(), undefined, this.relayout).then(this.relayout);
          return;
        }
        requestAnimationFrame(check);
      };
      check(start);
    });
  }

  /** ButtonGroupMeasurePolicy's expand and compress logic, run on every frame. */
  private readonly relayout = () => {
    const items = this.items;
    const active = items.some((i) => i.pressed.value !== 0 || i.pressed.isRunning);
    if (!active) {
      for (const item of items) this.restore(item);
      this.base = null;
      return;
    }
    // The widths as laid out without growth, read before setting any.
    this.base ??= items.map((i) => i.element.offsetWidth);
    const widths = [...this.base];
    const limits = items.map((i) => {
      const value = parseFloat(
        getComputedStyle(i.element).getPropertyValue('--rx-button-group-compression-limit'),
      );
      return Number.isFinite(value) ? value : DefaultCompressionLimit;
    });
    const ratio = Math.fround(this.expandedRatio);
    const f = Math.fround;
    const last = items.length - 1;
    if (items.length > 1) {
      for (let index = 0; index <= last; index++) {
        const value = f(items[index].pressed.value);
        if (value === 0) continue;
        let actualGrowth: number;
        if (index >= 1 && index < last) {
          // A middle item compresses both neighbours.
          const targetGrowth = Math.round(
            f(
              value *
                Math.min(f(f(ratio * widths[index]) / 2), limits[index - 1], limits[index + 1]),
            ),
          );
          const growthLeft = Math.min(targetGrowth, widths[index - 1]);
          const growthRight = Math.min(targetGrowth, widths[index + 1]);
          widths[index - 1] -= growthLeft;
          widths[index + 1] -= growthRight;
          actualGrowth = growthLeft + growthRight;
        } else if (index === 0) {
          // The first item compresses the next one.
          const targetGrowth = Math.round(
            f(value * Math.min(f(ratio * widths[index]), limits[index + 1])),
          );
          const growthRight = Math.min(targetGrowth, widths[index + 1]);
          widths[index + 1] -= growthRight;
          actualGrowth = growthRight;
        } else {
          // The last item compresses the previous one.
          const targetGrowth = Math.round(
            f(value * Math.min(f(ratio * widths[index]), limits[index - 1])),
          );
          const growthLeft = Math.min(targetGrowth, widths[index - 1]);
          widths[index - 1] -= growthLeft;
          actualGrowth = growthLeft;
        }
        widths[index] += actualGrowth;
      }
    }
    items.forEach((item, i) => this.setWidth(item, widths[i]));
  };

  // The item is measured at exactly this width, even below its minimums.
  private setWidth(item: Item, width: number) {
    const style = item.element.style;
    item.saved ??= Object.fromEntries(OVERRIDDEN.map((p) => [p, style.getPropertyValue(p)]));
    style.setProperty('width', `${width}px`);
    style.setProperty('min-width', '0px');
    style.setProperty('--rx-button-group-min-width', '0px');
    style.setProperty('--rx-button-group-max-padding', '50%');
  }

  private restore(item: Item) {
    if (!item.saved) return;
    for (const p of OVERRIDDEN) {
      if (item.saved[p]) item.element.style.setProperty(p, item.saved[p]);
      else item.element.style.removeProperty(p);
    }
    item.saved = null;
  }

  /** @internal The items' pressed springs, for tests. */
  get pressedValues(): number[] {
    return this.items.map((i) => i.pressed.value);
  }

  /** @internal Where the items' pressed springs are heading, for tests. */
  get pressedTargets(): number[] {
    return this.items.map((i) => i.pressed.targetValue);
  }

  protected override render() {
    return html`<slot @slotchange=${this.onSlotChange}></slot>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'rx-button-group': RxButtonGroup;
  }
}
