/*
 * Ported by hand from androidx/compose/material3 FloatingActionButtonMenu.kt
 * (FloatingActionButtonMenu, its FloatingActionButtonMenuItemColumn with the
 * staggered item count, FloatingActionButtonMenuItem with its width and
 * alpha animations, the item visibility modifier and the private FabMenu*
 * paddings and sizes), the keyboard handling of
 * samples/FloatingActionButtonMenuSamples.kt, Surface.kt (the clickable
 * Surface an item is drawn on) and the tokens FabMenuBaselineTokens.
 * Copyright 2024 The Android Open Source Project. Licensed under the Apache License 2.0.
 */

import menu from '@rx-m3e/tokens/js/fab-menu-baseline.js';
import {LitElement, css, html, unsafeCSS, type PropertyValues} from 'lit';
import {customElement, property, query, queryAssignedElements, state} from 'lit/decorators.js';
import {classMap} from 'lit/directives/class-map.js';
import '../focus/focus-ring.js';
import type {RxFocusRing} from '../focus/focus-ring.js';
import {addActivation} from '../internals/activation.js';
import {ComposeRole, HostSemanticsController} from '../internals/host-semantics.js';
import {Animatable} from '../motion/animatable.js';
import {motionSpring} from '../motion/motion-scheme.js';
import '../ripple/ripple.js';
import type {RxRipple} from '../ripple/ripple.js';
import {RxToggleFab, type FabMenuColor} from './toggle-fab.js';

/** FloatingActionButtonMenu's horizontalAlignment: where the items and the button line up. */
export type FabMenuAlign = 'start' | 'center' | 'end';

const JUSTIFY: Record<FabMenuAlign, string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
};

/**
 * One item of a FAB menu, as Compose's FloatingActionButtonMenuItem: an icon
 * and a label on a round 56dp pill, in the color set's container color. It
 * has no shadow (Compose draws it on a plain Surface).
 *
 * In an `rx-fab-menu` it shows and hides with the menu: its width springs
 * open from the menu's alignment side (fast spatial) as it fades in (fast
 * effects), and back. Hidden, it is inert.
 *
 * It is a button: it fires `click`. In a menu, a click also closes the menu
 * unless the click's default is prevented.
 *
 * @example
 * <rx-fab-menu-item><rx-icon slot="icon">reply</rx-icon>Reply</rx-fab-menu-item>
 *
 * @slot - The label.
 * @slot icon - The icon.
 * @csspart item - The container.
 * @cssprop --rx-fab-menu-item-container-color - The container color, overriding `color`.
 * @cssprop --rx-fab-menu-item-content-color - The icon and label color, overriding `color`.
 */
@customElement('rx-fab-menu-item')
export class RxFabMenuItem extends LitElement {
  /** The color set: its container color. Defaults to primary (primary container). */
  @property({reflect: true}) color: FabMenuColor = 'primary';

  /** @internal Set by the menu: the side the width grows from. */
  @property({attribute: false}) alignment: FabMenuAlign = 'end';

  @state() private hasIcon = false;

  @query('.item') private itemEl?: HTMLElement;
  @query('.row') private rowEl?: HTMLElement;
  @query('rx-ripple') private ripple?: RxRipple;
  @query('rx-focus-ring') private focusRing?: RxFocusRing;

  // widthAnim (FastSpatial) and alphaAnim (FastEffects).
  private readonly widthProgress = new Animatable(1);
  private readonly alpha = new Animatable(1);
  private shown: boolean | null = null;

  /** @internal Called by the menu when the item starts or stops being drawn. */
  onVisibleChange: (() => void) | null = null;

  constructor() {
    super();
    addActivation(this, {kind: 'button', isDisabled: () => false});
    new HostSemanticsController(this, () => ({role: ComposeRole.Button}));
  }

  static override styles = css`
    :host {
      display: flex;
      flex: none;
      outline: none;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      --_container: var(--md-sys-color-primary-container);
      --_content: var(--md-sys-color-on-primary-container);
    }

    :host([color='secondary']) {
      --_container: var(--md-sys-color-secondary-container);
      --_content: var(--md-sys-color-on-secondary-container);
    }

    :host([color='tertiary']) {
      --_container: var(--md-sys-color-tertiary-container);
      --_content: var(--md-sys-color-on-tertiary-container);
    }

    /* The Surface: ListItemContainerShape, no elevation. */
    .item {
      position: relative;
      display: flex;
      border-radius: ${unsafeCSS(menu['list-item-container-shape'])};
      background: var(--rx-fab-menu-item-container-color, var(--_container));
      color: var(--rx-fab-menu-item-content-color, var(--_content));
      /* LocalTextStyle: titleMedium. */
      font: var(--md-sys-typescale-title-medium-weight) var(--md-sys-typescale-title-medium-size) /
        var(--md-sys-typescale-title-medium-line-height) var(--md-sys-typescale-title-medium-font);
      letter-spacing: var(--md-sys-typescale-title-medium-tracking);
    }

    .item.gone {
      visibility: hidden;
    }

    /* The Surface clips to its shape; the Row sits at the alignment side. */
    .clip {
      display: flex;
      flex: 1;
      border-radius: inherit;
      overflow: hidden;
    }

    /*
     * The Row: at least 56dp each way, 24dp at the start and end, the icon
     * and label 8dp apart and centered.
     */
    .row {
      display: flex;
      flex: none;
      align-items: center;
      justify-content: center;
      gap: ${unsafeCSS(menu['list-item-icon-label-space'])};
      box-sizing: border-box;
      min-width: ${unsafeCSS(menu['list-item-container-height'])};
      min-height: ${unsafeCSS(menu['list-item-container-height'])};
      padding-inline: ${unsafeCSS(menu['list-item-leading-space'])}
        ${unsafeCSS(menu['list-item-trailing-space'])};
      white-space: nowrap;
    }

    ::slotted([slot='icon']) {
      --rx-icon-size: ${unsafeCSS(menu['list-item-icon-size'])};
      flex: none;
    }

    [hidden] {
      display: none !important;
    }

    @media (forced-colors: active) {
      .item {
        border: 1px solid ButtonText;
      }
    }
  `;

  /** Whether it is drawn (its alpha above 0), as the item visibility modifier reports. */
  get visible(): boolean {
    return this.alpha.value !== 0;
  }

  /** @internal The show and hide animations' state, for tests. */
  get showState() {
    return {shown: this.shown, width: this.widthProgress.value, alpha: this.alpha.value};
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.widthProgress.stop();
    this.alpha.stop();
  }

  protected override willUpdate(changed: PropertyValues<this>) {
    super.willUpdate(changed);
    if (!this.hasUpdated) this.hasIcon = this.querySelector(':scope > [slot="icon"]') !== null;
  }

  protected override firstUpdated() {
    if (this.ripple) this.ripple.controlElement = this;
    if (this.focusRing) this.focusRing.controlElement = this;
    this.draw();
  }

  /**
   * @internal Called by the menu with whether the item should show. The
   * first call sets it without animating (a new Animatable at the target).
   */
  setShown(shown: boolean) {
    if (this.shown === shown) return;
    const first = this.shown === null;
    this.shown = shown;
    const target = shown ? 1 : 0;
    if (first) {
      this.widthProgress.snapTo(target);
      this.alpha.snapTo(target);
      this.draw();
      return;
    }
    const draw = () => this.draw();
    const width = this.widthProgress.animateTo(
      target,
      motionSpring(this, 'fastSpatial'),
      undefined,
      draw,
    );
    const alpha = this.alpha.animateTo(target, motionSpring(this, 'fastEffects'), undefined, draw);
    void Promise.all([width, alpha]).then(draw);
    draw();
  }

  /** Sets the animated width and alpha, and hides the item at alpha 0. */
  private draw() {
    const item = this.itemEl;
    if (!item) return;
    const visible = this.visible;
    const wasGone = item.classList.contains('gone');
    item.classList.toggle('gone', !visible);
    // Not placed: no drawing, no input, no semantics.
    this.inert = !visible;
    // The menu shows its column first, so the width below is measured.
    if (wasGone === visible) this.onVisibleChange?.();
    if (this.alpha.isRunning) item.style.opacity = String(this.alpha.value);
    else item.style.removeProperty('opacity');
    // Hidden, the width stays at 0: only the shown items widen the column.
    if ((this.widthProgress.isRunning || this.widthProgress.value !== 1) && this.rowEl) {
      // (the Row's width * max(widthAnim, 0)).roundToInt()
      const full = Math.ceil(this.rowEl.getBoundingClientRect().width);
      item.style.width = `${Math.round(full * Math.max(this.widthProgress.value, 0))}px`;
    } else {
      item.style.removeProperty('width');
    }
  }

  private onIconSlotChange(event: Event) {
    this.hasIcon = (event.target as HTMLSlotElement).assignedElements().length > 0;
  }

  protected override render() {
    return html`<div class="item" part="item">
      <rx-ripple></rx-ripple>
      <rx-focus-ring></rx-focus-ring>
      <div class="clip" style="justify-content: ${JUSTIFY[this.alignment]}">
        <div class="row">
          <slot name="icon" ?hidden=${!this.hasIcon} @slotchange=${this.onIconSlotChange}></slot>
          <slot></slot>
        </div>
      </div>
    </div>`;
  }
}

/**
 * A Material 3 Expressive FAB menu, as Compose's FloatingActionButtonMenu:
 * a toggle FAB that opens a column of up to six related actions above it.
 *
 * Put an `rx-toggle-fab` in the `button` slot and `rx-fab-menu-item`s in
 * the default slot. Expanding, the items appear one after another from the
 * bottom (the item count springs on slow effects), each opening its width
 * and fading in; collapsing, they go from the top. The menu has 16dp at the
 * sides, the button 16dp below it, and the items 4dp apart and 8dp above
 * the button. `align` lines the items and the button up at the `end` (the
 * default), `start` or `center`. If the items are taller than the room the
 * menu is given (a `max-height`), they scroll while expanded.
 *
 * The toggle FAB's click toggles `expanded`; so does any other button
 * there. As in Compose's sample, an item's click and Escape close the menu
 * (prevent the item click's default to keep it open). Each user change
 * fires `toggle`. Focus goes from the button to the top item with Tab or
 * the down arrow, and back with the up arrow or Shift+Tab; the arrows move
 * between the items. Closing with focus on an item moves it to the button.
 *
 * Place the menu yourself, usually `position: fixed` at the bottom end of
 * the screen.
 *
 * @example
 * <rx-fab-menu>
 *   <rx-toggle-fab slot="button" aria-label="Toggle menu">
 *     <rx-icon>add</rx-icon><rx-icon slot="checked">close</rx-icon>
 *   </rx-toggle-fab>
 *   <rx-fab-menu-item><rx-icon slot="icon">reply</rx-icon>Reply</rx-fab-menu-item>
 *   <rx-fab-menu-item><rx-icon slot="icon">archive</rx-icon>Archive</rx-fab-menu-item>
 * </rx-fab-menu>
 *
 * @slot - The items, `rx-fab-menu-item`s.
 * @slot button - The button that opens and closes the menu, an `rx-toggle-fab`.
 * @csspart items - The column of items.
 * @fires toggle - When the user opens or closes the menu.
 */
@customElement('rx-fab-menu')
export class RxFabMenu extends LitElement {
  /** Whether the items show. */
  @property({type: Boolean, reflect: true}) expanded = false;

  /** Where the items and the button line up: end (the default), start or center. */
  @property({reflect: true}) align: FabMenuAlign = 'end';

  @state() private buttonHeight = 0;
  @state() private anyItemVisible = false;
  @state() private needsScroll = false;

  @query('.column') private columnEl?: HTMLElement;
  @queryAssignedElements({slot: 'button'}) private buttonElements!: HTMLElement[];
  @queryAssignedElements() private assigned!: HTMLElement[];

  // The visible item count: Animatable<Int> on SlowEffects with visibilityThreshold 1.
  private stagger: Animatable<number> | null = null;
  private items: RxFabMenuItem[] = [];
  private readonly resizeObserver = new ResizeObserver(() => this.measure());
  private observedButton: HTMLElement | null = null;

  constructor() {
    super();
    this.addEventListener('click', this.onClick);
    this.addEventListener('change', this.onChange);
    this.addEventListener('keydown', this.onKeyDown);
  }

  static override styles = css`
    /* FabMenuPaddingHorizontal. */
    :host {
      display: inline-grid;
      grid-template-rows: minmax(0, 1fr);
      box-sizing: border-box;
      padding-inline: 16px;
      vertical-align: bottom;
      --_justify: end;
    }

    :host([align='start']) {
      --_justify: start;
    }

    :host([align='center']) {
      --_justify: center;
    }

    .column,
    .button {
      grid-area: 1 / 1;
      justify-self: var(--_justify);
      min-height: 0;
    }

    /*
     * The item column: the items 4dp apart, then room for the button with
     * 16dp below it and 8dp above.
     */
    .column {
      display: flex;
      flex-direction: column;
      align-items: var(--_justify);
      gap: ${unsafeCSS(menu['list-item-between-space'])};
      box-sizing: border-box;
    }

    .column.scroll {
      overflow: hidden;
    }

    :host([expanded]) .column.scroll {
      overflow-y: auto;
    }

    /*
     * FabMenuButtonPaddingBottom. Compose places the button after the column:
     * drawn over it and first to take touches. Positioned, it paints above.
     */
    .button {
      position: relative;
      display: flex;
      align-self: end;
      margin-bottom: 16px;
    }

    [hidden] {
      display: none !important;
    }
  `;

  /** @internal The staggered item count, for tests. */
  get visibleItemCount(): number {
    return this.stagger?.value ?? 0;
  }

  /** The button in the `button` slot, if any. */
  get button(): HTMLElement | null {
    return this.buttonElements?.[0] ?? null;
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.stagger?.stop();
    this.resizeObserver.disconnect();
    this.observedButton = null;
  }

  override connectedCallback() {
    super.connectedCallback();
    if (this.hasUpdated) {
      this.resizeObserver.observe(this);
      this.onButtonChange();
    }
  }

  protected override firstUpdated() {
    this.resizeObserver.observe(this);
    this.onItemsChange();
    this.onButtonChange();
  }

  protected override updated(changed: PropertyValues<this>) {
    super.updated(changed);
    if (changed.has('align')) for (const item of this.items) item.alignment = this.align;
    if (changed.has('expanded')) {
      const button = this.button;
      if (button instanceof RxToggleFab) button.checked = this.expanded;
      else button?.setAttribute('aria-expanded', String(this.expanded));
      this.retarget();
      // Collapsing with focus on an item: back to the button.
      if (!this.expanded && this.items.some((item) => item.matches(':focus-within'))) {
        button?.focus({preventScroll: true});
      }
    }
    this.measure();
  }

  private onItemsChange() {
    for (const item of this.items) item.onVisibleChange = null;
    this.items = this.assigned.filter((el): el is RxFabMenuItem => el instanceof RxFabMenuItem);
    for (const item of this.items) {
      item.alignment = this.align;
      item.onVisibleChange = () => this.updateVisibility();
    }
    this.retarget();
  }

  private onButtonChange() {
    const button = this.button;
    if (this.observedButton) this.resizeObserver.unobserve(this.observedButton);
    this.observedButton = button;
    if (button) {
      this.resizeObserver.observe(button);
      if (button instanceof RxToggleFab) button.checked = this.expanded;
      else button.setAttribute('aria-expanded', String(this.expanded));
    }
    this.measure();
  }

  /** Springs the visible item count to all of them (expanded) or none. */
  private retarget() {
    if (!this.hasUpdated) return;
    const target = this.expanded ? this.items.length : 0;
    if (!this.stagger) {
      this.stagger = new Animatable(target, {integer: true});
    } else if (this.stagger.targetValue !== target) {
      // A small visibilityThreshold so the last item shows without a delay.
      const spec = {...motionSpring(this, 'slowEffects'), visibilityThreshold: 1};
      void this.stagger.animateTo(target, spec, undefined, () => this.applyStagger());
    }
    this.applyStagger();
  }

  /** Each item shows once the count reaches it, counting from the bottom. */
  private applyStagger() {
    const count = this.items.length;
    const visible = this.stagger?.value ?? 0;
    this.items.forEach((item, index) => item.setShown(index >= count - visible));
    this.updateVisibility();
  }

  /** The column has no height while no item is drawn. */
  private updateVisibility() {
    this.anyItemVisible = this.items.some((item) => item.visible);
    // At once, within the frame, not on the next render.
    if (this.columnEl) this.columnEl.hidden = !this.anyItemVisible;
  }

  private measure() {
    this.buttonHeight = this.button?.getBoundingClientRect().height ?? 0;
    const column = this.columnEl;
    if (column && this.anyItemVisible) {
      // itemsNeedVerticalScroll: the column is taller than the room it has.
      this.needsScroll = column.scrollHeight > column.clientHeight + 0.5;
    }
  }

  private setExpanded(expanded: boolean) {
    if (this.expanded === expanded) return;
    this.expanded = expanded;
    this.dispatchEvent(new Event('toggle', {bubbles: true}));
  }

  private readonly onChange = (event: Event) => {
    const button = this.button;
    if (button instanceof RxToggleFab && event.target === button) {
      this.setExpanded(button.checked);
    }
  };

  private readonly onClick = (event: MouseEvent) => {
    const target = event.target as Element;
    const button = this.button;
    if (button && !(button instanceof RxToggleFab) && button.contains(target)) {
      if (!event.defaultPrevented) this.setExpanded(!this.expanded);
      return;
    }
    const item = this.itemOf(target);
    if (item && !event.defaultPrevented) {
      // The sample's onClick: close the menu. The item's own listeners have
      // run by now and can prevent it.
      this.setExpanded(false);
    }
  };

  private itemOf(target: Element | null): RxFabMenuItem | null {
    const item = target?.closest('rx-fab-menu-item');
    return item instanceof RxFabMenuItem && this.items.includes(item) ? item : null;
  }

  /** The items that can take focus (drawn), top to bottom. */
  private get focusableItems(): RxFabMenuItem[] {
    return this.items.filter((item) => item.visible);
  }

  private readonly onKeyDown = (event: KeyboardEvent) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const target = event.target as Element;
    const button = this.button;
    const focus = (el: HTMLElement | undefined | null) => {
      if (!el) return;
      event.preventDefault();
      el.focus();
    };
    if (event.key === 'Escape' && this.expanded) {
      // The sample's BackHandler. Closing moves the focus off an item.
      event.preventDefault();
      this.setExpanded(false);
      return;
    }
    if (button?.contains(target)) {
      // From the button to the first item at the top.
      const forward = (event.key === 'Tab' && !event.shiftKey) || event.key === 'ArrowDown';
      if (this.expanded && forward) focus(this.focusableItems[0]);
      return;
    }
    const item = this.itemOf(target);
    if (!item) return;
    const items = this.focusableItems;
    const index = items.indexOf(item);
    if (event.key === 'ArrowUp' || (event.key === 'Tab' && event.shiftKey && index === 0)) {
      // Back from the first item to the button.
      focus(index > 0 ? items[index - 1] : button);
    } else if (event.key === 'ArrowDown') {
      // The button is below the last item.
      focus(index < items.length - 1 ? items[index + 1] : button);
    }
  };

  protected override render() {
    const bottom = this.buttonHeight > 0 ? `${this.buttonHeight}px + 16px + 8px` : '0px';
    return html`<div class="button">
        <slot name="button" @slotchange=${this.onButtonChange}></slot>
      </div>
      <div
        class=${classMap({column: true, scroll: this.needsScroll})}
        part="items"
        style="padding-bottom: calc(${bottom})"
        ?hidden=${!this.anyItemVisible}
      >
        <slot @slotchange=${this.onItemsChange}></slot>
      </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'rx-fab-menu': RxFabMenu;
    'rx-fab-menu-item': RxFabMenuItem;
  }
}
