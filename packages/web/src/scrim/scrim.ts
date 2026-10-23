/*
 * Ported by hand from androidx/compose/material3 Scrim.kt (Scrim and
 * ScrimDefaults) with tokens/ScrimTokens.kt, and the way ModalBottomSheet,
 * ModalNavigationDrawer and ModalWideNavigationRail show it: its alpha
 * springs between 0 and 1 with the default effects spec.
 * Copyright 2025 The Android Open Source Project. Licensed under the Apache License 2.0.
 */

import {LitElement, css, type PropertyValues} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import {HostSemanticsController} from '../internals/host-semantics.js';
import {Animatable} from '../motion/animatable.js';
import {motionSpring} from '../motion/motion-scheme.js';

/** Compose's labels for the scrims of its own modal components (Strings.kt). */
export const ScrimLabels = Object.freeze({
  /** ModalNavigationDrawer: Strings.CloseDrawer. */
  closeDrawer: 'Close navigation menu',
  /** ModalBottomSheet: Strings.CloseSheet. */
  closeSheet: 'Close sheet',
  /** ModalWideNavigationRail: Strings.CloseRail. */
  closeRail: 'Close rail',
});

/**
 * Obscures the content behind a modal surface, as Compose's `Scrim`: the
 * scrim color at 32% opacity over its whole container (it is absolutely
 * positioned with `inset: 0`; give it `position: fixed` to cover the
 * viewport).
 *
 * `open` fades it in and out on the default effects spring. With
 * `dismissible`, a click on it is the way out of the modal: it is then a
 * button for assistive technology, labelled by `label`, and fires `click`.
 * Like Compose's scrim it is not a Tab stop; modals also close on Escape.
 * Put it after the content it covers, so screen readers reach it last
 * (Compose's traversalIndex = 1).
 *
 * @example
 * <rx-scrim open dismissible label="Close sheet"></rx-scrim>
 *
 * @cssprop --rx-scrim-color - Defaults to the `scrim` color role.
 * @cssprop --rx-scrim-opacity - Defaults to 0.32.
 */
@customElement('rx-scrim')
export class RxScrim extends LitElement {
  /** Shown (alpha springs to 1) or hidden (springs to 0). */
  @property({type: Boolean, reflect: true}) open = false;

  /** Clicking it dismisses the modal: it becomes a clickable, labelled button. */
  @property({type: Boolean, reflect: true}) dismissible = false;

  /** What clicking it does, for assistive technology (Compose's contentDescription). */
  @property() label = '';

  private readonly alpha = new Animatable(0, {lowerBound: 0, upperBound: 1});
  private manualAlpha: number | null = null;

  static override styles = css`
    :host {
      position: absolute;
      inset: 0;
      display: block;
      background: color-mix(
        in srgb,
        var(--rx-scrim-color, var(--md-comp-scrim-container-color, var(--md-sys-color-scrim)))
          calc(var(--rx-scrim-opacity, var(--md-comp-scrim-container-opacity, 0.32)) * 100%),
        transparent
      );
      opacity: 0;
      pointer-events: none;
      -webkit-tap-highlight-color: transparent;
    }

    :host([open]) {
      pointer-events: auto;
    }

    :host([dismissible][open]) {
      cursor: pointer;
    }

    @media (forced-colors: active) {
      :host {
        background: Canvas;
      }
    }
  `;

  constructor() {
    super();
    new HostSemanticsController(this, () =>
      this.dismissible && this.open
        ? {role: 'button', focusable: false, aria: {label: this.label || null}}
        : {role: null, aria: {hidden: true}},
    );
  }

  /**
   * The current alpha, 0 to 1. Set it to drive the scrim yourself (as a
   * drawer does while it is dragged); setting `open` springs it again.
   */
  get currentAlpha(): number {
    return this.manualAlpha ?? this.alpha.value;
  }

  set currentAlpha(value: number) {
    this.manualAlpha = Math.min(1, Math.max(0, value));
    this.alpha.snapTo(this.manualAlpha);
    this.paint();
  }

  override connectedCallback() {
    super.connectedCallback();
    // A scrim that starts open is shown at once, as a first composition is.
    if (this.open) this.alpha.snapTo(1);
    this.paint();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.alpha.stop();
  }

  protected override updated(changed: PropertyValues<this>) {
    if (changed.has('open') && changed.get('open') !== undefined) {
      this.manualAlpha = null;
      void this.alpha.animateTo(
        this.open ? 1 : 0,
        motionSpring(this, 'defaultEffects'),
        undefined,
        () => this.paint(),
      );
    }
    this.paint();
  }

  private paint() {
    const alpha = this.currentAlpha;
    this.style.opacity = String(alpha);
    // Fully faded out: out of the way of pointers.
    this.style.visibility = !this.open && alpha === 0 ? 'hidden' : '';
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'rx-scrim': RxScrim;
  }
}
