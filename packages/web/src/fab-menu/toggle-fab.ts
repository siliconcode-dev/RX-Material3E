/*
 * Ported by hand from androidx/compose/material3 FloatingActionButtonMenu.kt
 * (ToggleFloatingActionButton, ToggleFloatingActionButtonDefaults with
 * animateIcon, and the private Fab* sizes it uses), ui-graphics Color.kt
 * (lerp, in Oklab with the fraction clamped) and the tokens
 * FabBaselineTokens, FabMediumTokens, FabLargeTokens, FabMenuBaselineTokens
 * and FabPrimaryContainerTokens.
 * Copyright 2024 The Android Open Source Project. Licensed under the Apache License 2.0.
 */

import baseline from '@rx-m3e/tokens/js/fab-baseline.js';
import large from '@rx-m3e/tokens/js/fab-large.js';
import medium from '@rx-m3e/tokens/js/fab-medium.js';
import menu from '@rx-m3e/tokens/js/fab-menu-baseline.js';
import primaryContainer from '@rx-m3e/tokens/js/fab-primary-container.js';
import {LitElement, css, html, unsafeCSS, type PropertyValues} from 'lit';
import {customElement, property, query, state} from 'lit/decorators.js';
import '../elevation/elevation.js';
import {elevationShadow} from '../elevation/elevation.js';
import '../focus/focus-ring.js';
import type {RxFocusRing} from '../focus/focus-ring.js';
import {addActivation} from '../internals/activation.js';
import {ComposeRole, HostSemanticsController} from '../internals/host-semantics.js';
import {Animatable} from '../motion/animatable.js';
import {motionSpring} from '../motion/motion-scheme.js';
import '../ripple/ripple.js';
import type {RxRipple} from '../ripple/ripple.js';

/**
 * ToggleFloatingActionButtonDefaults' sizes: containerSize (the 56dp FAB),
 * containerSizeMedium (80dp) and containerSizeLarge (96dp), each with its
 * corner radius and icon size.
 */
export type ToggleFabSize = 'baseline' | 'medium' | 'large';

/** The FAB menu's color sets: primary (the default), secondary or tertiary. */
export type FabMenuColor = 'primary' | 'secondary' | 'tertiary';

const f32 = Math.fround;
/** ui-util's lerp in 32-bit floats: (1 - fraction) * start + fraction * stop. */
const lerp = (start: number, stop: number, fraction: number) =>
  f32(f32(f32(1 - fraction) * start) + f32(fraction * stop));

/**
 * A Material 3 Expressive toggle FAB, as Compose's ToggleFloatingActionButton:
 * the button that opens and closes a FAB menu. Checked, it springs (fast
 * spatial) from a FAB to the menu's round 56dp close button: its size,
 * corners, container color and icon size and color all follow the one
 * checked progress.
 *
 * `size` is `baseline` (56dp, 16dp corners, 24dp icon, the default),
 * `medium` (80dp, 20dp, 28dp) or `large` (96dp, 28dp, 36dp); all end at
 * 56dp, fully round, with a 20dp icon. A smaller container stays in the
 * top-end corner of the starting size. `color` picks the menu's color set:
 * from primary container to primary by default.
 *
 * The default slot holds the icon shown up to half way (usually `add`), the
 * `checked` slot the one shown after (usually `close`), as Compose's sample
 * switches them at 50% progress.
 *
 * It is a button that says whether its menu is expanded (`aria-expanded`).
 * Give it a name with `aria-label`. A click toggles `checked` and fires
 * `input` and `change`.
 *
 * @example
 * <rx-toggle-fab aria-label="Toggle menu">
 *   <rx-icon>add</rx-icon>
 *   <rx-icon slot="checked">close</rx-icon>
 * </rx-toggle-fab>
 *
 * @slot - The icon while unchecked.
 * @slot checked - The icon while checked (the default slot's icon if empty).
 * @csspart fab - The container.
 * @cssprop --rx-toggle-fab-container-color - The unchecked container color.
 * @cssprop --rx-toggle-fab-checked-container-color - The checked container color.
 * @cssprop --rx-toggle-fab-icon-color - The unchecked icon color.
 * @cssprop --rx-toggle-fab-checked-icon-color - The checked icon color.
 * @cssprop --rx-toggle-fab-progress - Read only, for slotted content: the checked progress, 0 to 1.
 */
@customElement('rx-toggle-fab')
export class RxToggleFab extends LitElement {
  /** Whether it is checked (its menu expanded). */
  @property({type: Boolean, reflect: true}) checked = false;

  /** Baseline (the default), medium or large: the size it starts from. */
  @property({reflect: true}) size: ToggleFabSize = 'baseline';

  /** The color set. Defaults to primary. */
  @property({reflect: true}) color: FabMenuColor = 'primary';

  @state() private hasCheckedIcon = false;

  @query('.fab') private fabEl?: HTMLElement;
  @query('.content') private contentEl?: HTMLElement;
  @query('.unchecked') private uncheckedEl?: HTMLElement;
  @query('.checked') private checkedEl?: HTMLElement;
  @query('rx-ripple') private ripple?: RxRipple;
  @query('rx-focus-ring') private focusRing?: RxFocusRing;

  // animateFloatAsState(if (checked) 1f else 0f, FastSpatial).
  private readonly progress = new Animatable(0);
  private shownChecked: boolean | null = null;
  private metrics = {initial: 56, initialCorner: 16, initialIcon: 24, final: 56, finalIcon: 20};

  constructor() {
    super();
    addActivation(this, {kind: 'button', isDisabled: () => false});
    new HostSemanticsController(this, () => ({
      role: ComposeRole.Button,
      aria: {expanded: this.checked},
    }));
    this.addEventListener('click', this.onClick);
  }

  static override styles = css`
    :host {
      position: relative;
      display: inline-block;
      flex: none;
      vertical-align: middle;
      /* The outer Box: the starting size, whatever the container does. */
      width: var(--_initial);
      height: var(--_initial);
      outline: none;
      /* Only the container takes clicks, as in Compose. */
      pointer-events: none;
      -webkit-tap-highlight-color: transparent;

      /* FabInitialSize, FabInitialCornerRadius, FabInitialIconSize. */
      --_initial: ${unsafeCSS(baseline['container-height'])};
      --_initial-corner: 16px;
      --_initial-icon: ${unsafeCSS(baseline['icon-size'])};
      /* FabFinalSize and FabFinalIconSize (the close button). */
      --_final: ${unsafeCSS(menu['close-button-container-height'])};
      --_final-icon: ${unsafeCSS(menu['close-button-icon-size'])};
      /* containerColor() and iconColor(). */
      --_from: var(--md-sys-color-primary-container);
      --_to: var(--md-sys-color-primary);
      --_icon-from: var(--md-sys-color-on-primary-container);
      --_icon-to: var(--md-sys-color-on-primary);
    }

    /* containerSizeMedium, containerCornerRadiusMedium (20dp), iconSizeMedium. */
    :host([size='medium']) {
      --_initial: ${unsafeCSS(medium['container-height'])};
      --_initial-corner: 20px;
      --_initial-icon: ${unsafeCSS(medium['icon-size'])};
    }

    /* containerSizeLarge, 28dp corners, and 36dp icons (Compose marks the 32dp token incorrect). */
    :host([size='large']) {
      --_initial: ${unsafeCSS(large['container-height'])};
      --_initial-corner: 28px;
      --_initial-icon: 36px;
    }

    :host([color='secondary']) {
      --_from: var(--md-sys-color-secondary-container);
      --_to: var(--md-sys-color-secondary);
      --_icon-from: var(--md-sys-color-on-secondary-container);
      --_icon-to: var(--md-sys-color-on-secondary);
    }

    :host([color='tertiary']) {
      --_from: var(--md-sys-color-tertiary-container);
      --_to: var(--md-sys-color-tertiary);
      --_icon-from: var(--md-sys-color-on-tertiary-container);
      --_icon-to: var(--md-sys-color-on-tertiary);
    }

    /*
     * The container, in the top-end corner (contentAlignment TopEnd). At
     * rest it is the start or end state; while it springs, script sets its
     * size, corners, color mix and icon size from the progress.
     */
    .fab {
      position: absolute;
      top: 0;
      inset-inline-end: 0;
      display: grid;
      place-items: center;
      width: var(--_initial);
      height: var(--_initial);
      border-radius: var(--_initial-corner);
      --_mix: 0%;
      --_icon: var(--_initial-icon);
      --rx-toggle-fab-progress: 0;
      background: color-mix(
        in oklab,
        var(--rx-toggle-fab-container-color, var(--_from)),
        var(--rx-toggle-fab-checked-container-color, var(--_to)) var(--_mix)
      );
      color: color-mix(
        in oklab,
        var(--rx-toggle-fab-icon-color, var(--_icon-from)),
        var(--rx-toggle-fab-checked-icon-color, var(--_icon-to)) var(--_mix)
      );
      pointer-events: auto;
      cursor: pointer;
      /* FabShadowElevation: Level3 always. */
      --rx-elevation: ${unsafeCSS(primaryContainer['container-elevation'])};
      ${elevationShadow}
    }

    :host([checked]) .fab {
      width: var(--_final);
      height: var(--_final);
      border-radius: calc(var(--_final) / 2);
      --_mix: 100%;
      --_icon: var(--_final-icon);
      --rx-toggle-fab-progress: 1;
    }

    /* The Box clips to the shape. */
    .clip {
      position: absolute;
      inset: 0;
      border-radius: inherit;
      overflow: hidden;
      display: grid;
      place-items: center;
    }

    .content {
      display: grid;
      width: var(--_icon);
      height: var(--_icon);
    }

    .content > * {
      grid-area: 1 / 1;
      display: grid;
      place-items: center;
    }

    ::slotted(*) {
      --rx-icon-size: var(--_icon);
    }

    [hidden] {
      display: none !important;
    }

    @media (forced-colors: active) {
      .fab {
        border: 1px solid ButtonText;
      }
    }
  `;

  /** Compose's ToggleFloatingActionButtonScope.checkedProgress: 0 unchecked, 1 checked. */
  get checkedProgress(): number {
    return this.progress.value;
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.progress.stop();
  }

  protected override firstUpdated() {
    if (this.ripple) this.ripple.controlElement = this;
    if (this.focusRing) this.focusRing.controlElement = this;
  }

  protected override updated(changed: PropertyValues<this>) {
    super.updated(changed);
    this.readMetrics();
    // fabRippleRadius: half the starting size's diagonal.
    if (this.ripple) {
      const half = this.metrics.initial / 2;
      this.ripple.radius = Math.hypot(half, half);
    }
    const previous = this.shownChecked;
    this.shownChecked = this.checked;
    if (previous === null) {
      this.progress.snapTo(this.checked ? 1 : 0);
    } else if (previous !== this.checked) {
      const draw = () => this.draw();
      void this.progress
        .animateTo(this.checked ? 1 : 0, motionSpring(this, 'fastSpatial'), undefined, draw)
        .then(draw);
    }
    this.draw();
  }

  private readonly onClick = (event: MouseEvent) => {
    if (event.defaultPrevented) return;
    // onCheckedChange(!checked).
    this.checked = !this.checked;
    this.dispatchEvent(new Event('input', {bubbles: true, composed: true}));
    this.dispatchEvent(new Event('change', {bubbles: true}));
  };

  private onCheckedSlotChange(event: Event) {
    this.hasCheckedIcon = (event.target as HTMLSlotElement).assignedElements().length > 0;
  }

  /** The sizes in px, from the tokens. */
  private readMetrics() {
    const style = getComputedStyle(this);
    const px = (name: string) => parseFloat(style.getPropertyValue(name)) || 0;
    this.metrics = {
      initial: px('--_initial'),
      initialCorner: px('--_initial-corner'),
      initialIcon: px('--_initial-icon'),
      final: px('--_final'),
      finalIcon: px('--_final-icon'),
    };
  }

  /** Lays the container and icon out for the current progress. */
  private draw() {
    const fab = this.fabEl;
    const content = this.contentEl;
    if (!fab || !content) return;
    const p = this.progress.value;
    // The sample's icon switch: the checked icon past half way.
    const showChecked = this.hasCheckedIcon && p > 0.5;
    this.uncheckedEl?.toggleAttribute('hidden', showChecked);
    this.checkedEl?.toggleAttribute('hidden', !showChecked);
    if (!this.progress.isRunning) {
      for (const name of ['width', 'height', 'border-radius', '--_mix', '--_icon']) {
        fab.style.removeProperty(name);
      }
      fab.style.removeProperty('--rx-toggle-fab-progress');
      content.style.removeProperty('position');
      content.style.removeProperty('left');
      content.style.removeProperty('top');
      return;
    }
    const m = this.metrics;
    // containerSize(progress).roundToPx(); containerCornerRadius(progress).
    const size = Math.round(lerp(m.initial, m.final, p));
    const corner = lerp(m.initialCorner, m.final / 2, p);
    // animateIcon: iconSize(progress).roundToPx().
    const icon = Math.round(lerp(m.initialIcon, m.finalIcon, p));
    fab.style.width = fab.style.height = `${size}px`;
    fab.style.borderRadius = `${corner}px`;
    // Color lerp clamps the fraction to 0..1.
    fab.style.setProperty('--_mix', `${Math.min(Math.max(p, 0), 1) * 100}%`);
    fab.style.setProperty('--_icon', `${icon}px`);
    fab.style.setProperty('--rx-toggle-fab-progress', String(p));
    // The content placed at ((size - width) / 2, (size - height) / 2), in whole pixels.
    const offset = Math.trunc((size - icon) / 2);
    content.style.position = 'absolute';
    content.style.left = content.style.top = `${offset}px`;
  }

  protected override render() {
    return html`<div class="fab" part="fab">
      <rx-ripple></rx-ripple>
      <rx-focus-ring></rx-focus-ring>
      <div class="clip">
        <div class="content">
          <span class="unchecked"><slot></slot></span>
          <span class="checked" hidden
            ><slot name="checked" @slotchange=${this.onCheckedSlotChange}></slot
          ></span>
        </div>
      </div>
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'rx-toggle-fab': RxToggleFab;
  }
}
