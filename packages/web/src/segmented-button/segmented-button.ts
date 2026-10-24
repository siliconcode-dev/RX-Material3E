/*
 * Ported by hand from androidx/compose/material3 SegmentedButton.kt
 * (SegmentedButton, SegmentedButtonContent and
 * SegmentedButtonContentMeasurePolicy, interactionZIndex,
 * SegmentedButtonDefaults' colors, itemShape, Icon and ContentPadding) with
 * Surface.kt (the toggleable and selectable Surface it is drawn on) and the
 * token OutlinedSegmentedButtonTokens.
 * Copyright 2023-2025 The Android Open Source Project. Licensed under the Apache License 2.0.
 */

import tokens from '@rx-m3e/tokens/js/outlined-segmented-button.js';
import {LitElement, css, html, unsafeCSS, type PropertyValues} from 'lit';
import {customElement, property, query, state} from 'lit/decorators.js';
import '../focus/focus-ring.js';
import type {RxFocusRing} from '../focus/focus-ring.js';
import {addActivation} from '../internals/activation.js';
import {FormAssociated} from '../internals/form-associated.js';
import {ComposeRole, HostSemanticsController} from '../internals/host-semantics.js';
import {PressInteractionController} from '../internals/press-interaction.js';
import {minimumInteractiveComponentSize} from '../internals/touch-target.js';
import {Animatable} from '../motion/animatable.js';
import {motionSpring} from '../motion/motion-scheme.js';
import '../ripple/ripple.js';
import type {RxRipple} from '../ripple/ripple.js';

/** SegmentedButton's private IconSpacing: between the icon and the label (dp). */
const IconSpacing = 8;

/** ButtonDefaults.MinWidth (dp). */
const MinWidth = 58;

/**
 * One Material 3 segmented button, as Compose's `SegmentedButton`: an
 * outlined button that is on or off, normally one of an
 * `<rx-segmented-button-set>`, which gives it its place in the row and its
 * shape. Checked, it fills with the secondary container color and a
 * checkmark grows in at its start while the label slides over to make
 * room; unchecked, the checkmark goes at once and the label slides back to
 * the middle.
 *
 * With an icon in the `icon` slot, the icon shows while it is off and
 * crossfades with the checkmark (SegmentedButtonDefaults.Icon with
 * inactiveContent). `no-checkmark` drops the checkmark: the slotted icon,
 * if any, then always shows.
 *
 * On its own it is a checkbox for assistive technology; in a single-select
 * set, a radio button. In forms, checked, it submits `value` ("on" by
 * default) under `name`. Toggling fires `input` and `change`.
 *
 * @example
 * <rx-segmented-button checked>Day</rx-segmented-button>
 * <rx-segmented-button><rx-icon slot="icon">star</rx-icon>Favorites</rx-segmented-button>
 *
 * @slot - The label.
 * @slot icon - An icon shown while it is off (SegmentedButtonDefaults.IconSize).
 * @csspart button - The container.
 * @cssprop --rx-segmented-button-shape - The corners of the ends of the row
 *   (SegmentedButtonDefaults.baseShape). Defaults to fully round.
 * @fires input - When the user toggles it.
 * @fires change - When the user toggles it.
 */
@customElement('rx-segmented-button')
export class RxSegmentedButton extends FormAssociated(LitElement) {
  /** Whether it is on. The `checked` attribute is also the value a form reset goes back to. */
  @property({type: Boolean, reflect: true}) checked = false;

  /** Sent with the form, under `name`, when checked. */
  @property() value = 'on';

  /**
   * A radio button, as in Compose's SingleChoiceSegmentedButtonRow
   * (`Role.RadioButton`): pressing it when it is on keeps it on. A
   * single-select set sets this.
   */
  @property({type: Boolean, reflect: true}) radio = false;

  /** No checkmark (Compose's `icon` without SegmentedButtonDefaults.Icon). */
  @property({type: Boolean, reflect: true, attribute: 'no-checkmark'}) noCheckmark = false;

  @state() private hasIcon = false;

  @query('.button') private buttonEl?: HTMLElement;
  @query('.label') private labelEl?: HTMLElement;
  @query('.check') private checkEl?: HTMLElement;
  @query('.inactive') private inactiveEl?: HTMLElement;
  @query('rx-ripple') private ripple?: RxRipple;
  @query('rx-focus-ring') private focusRing?: RxFocusRing;

  private defaultChecked: boolean | null = null;
  // SegmentedButtonContentMeasurePolicy's animatable: the label's offset (px).
  private readonly offset = new Animatable(0, {integer: true});
  private offsetSet = false;
  // The checkmark's AnimatedVisibility (fade and scale) or, with an icon,
  // the Crossfade's two alphas.
  private readonly checkAlpha = new Animatable(0);
  private readonly checkScale = new Animatable(1);
  private readonly inactiveAlpha = new Animatable(0);
  private shown: {check: boolean; inactive: boolean} | null = null;

  constructor() {
    super();
    addActivation(this, {kind: 'toggle', isDisabled: () => this.isDisabled});
    this.addEventListener('click', this.onClick);
    new HostSemanticsController(this, () => ({
      role: this.radio ? ComposeRole.RadioButton : ComposeRole.Checkbox,
      disabled: this.isDisabled,
      aria: {checked: this.checked},
    }));
    new PressInteractionController(this, {
      enabled: () => !this.isDisabled,
      keys: () => [' '],
      onChange: (pressed) => {
        // interactionZIndex counts presses.
        try {
          if (pressed) this.internals.states.add('pressed');
          else this.internals.states.delete('pressed');
        } catch {
          // No custom states: the press doesn't lift it.
        }
      },
    });
  }

  static override styles = [
    minimumInteractiveComponentSize,
    css`
      :host {
        vertical-align: middle;
        cursor: pointer;
        outline: none;
        -webkit-tap-highlight-color: transparent;

        /* SegmentedButtonDefaults.colors: the inactive ones. */
        --_container: transparent;
        --_content: ${unsafeCSS(tokens['unselected-label-text-color'])};
        --_outline: ${unsafeCSS(tokens['outline-color'])};
        --_icon-size: ${unsafeCSS(tokens['icon-size'])};
        /* itemShape: baseShape on both ends; a set squares the inner ends. */
        --_corner: var(--rx-segmented-button-shape, ${unsafeCSS(tokens.shape)});
        --_start-corner: var(--_corner);
        --_end-corner: var(--_corner);

        /*
         * interactionZIndex: one for each press and focus, five more when
         * checked, so its border draws over its neighbours'. Keyboard focus
         * lifts it above any neighbour: the focus ring is drawn outside it,
         * where Compose's focus is a tint inside.
         */
        z-index: calc(var(--_z-checked, 0) + var(--_z-pressed, 0) + var(--_z-focused, 0));
      }

      :host {
        --_dir: 1;
      }

      :host(:dir(rtl)) {
        --_dir: -1;
      }

      :host([checked]) {
        --_container: ${unsafeCSS(tokens['selected-container-color'])};
        --_content: ${unsafeCSS(tokens['selected-label-text-color'])};
        --_z-checked: 5;
      }

      :host(:state(pressed)) {
        --_z-pressed: 1;
      }

      :host(:focus-visible) {
        --_z-focused: 10;
      }

      /*
       * Disabled: the active container stays; the content is the disabled
       * label color and the border the outline color (not the disabled
       * outline token) at their disabled opacities.
       */
      :host([aria-disabled='true']) {
        cursor: default;
        --_content: color-mix(
          in srgb,
          ${unsafeCSS(tokens['disabled-label-text-color'])}
            calc(${unsafeCSS(tokens['disabled-label-text-opacity'])} * 100%),
          transparent
        );
        --_outline: color-mix(
          in srgb,
          ${unsafeCSS(tokens['outline-color'])}
            calc(${unsafeCSS(tokens['disabled-outline-opacity'])} * 100%),
          transparent
        );
      }

      /*
       * The Surface: defaultMinSize(ButtonDefaults.MinWidth, MinHeight) as
       * the visible part of its 48dp touch target, as wide as the set makes
       * it, clipped to its shape.
       */
      .button {
        position: relative;
        justify-self: stretch;
        display: grid;
        box-sizing: border-box;
        /* A set's row gives it a fixed width, which defaultMinSize gives way to. */
        min-width: var(--_min-width, ${MinWidth}px);
        min-height: ${unsafeCSS(tokens['container-height'])};
        border-start-start-radius: var(--_start-corner);
        border-end-start-radius: var(--_start-corner);
        border-start-end-radius: var(--_end-corner);
        border-end-end-radius: var(--_end-corner);
        background: var(--_container);
        color: var(--_content);
        font: ${unsafeCSS(tokens['label-text-weight'])} ${unsafeCSS(tokens['label-text-size'])} /
          ${unsafeCSS(tokens['label-text-line-height'])} ${unsafeCSS(tokens['label-text-font'])};
        letter-spacing: ${unsafeCSS(tokens['label-text-tracking'])};
      }

      /* SegmentedButtonDefaults.ContentPadding: 12dp at the sides, 8dp above and below. */
      .clip {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        align-items: center;
        justify-items: center;
        padding: 8px 12px;
        border-radius: inherit;
        overflow: hidden;
      }

      /*
       * SegmentedButtonContent: the icon's box (IconSize), the spacing, then
       * the label. The label may be as wide as the whole padded box (it is
       * measured with the Box's constraints), so a wrapped label pushes the
       * row past the box, centered, and the shape clips it.
       */
      .content {
        position: relative;
        width: max-content;
        max-width: calc(100% + var(--_icon-size) + ${IconSpacing}px);
      }

      /* The offset is toward the end: mirrored in right-to-left text. */
      .label {
        display: block;
        margin-inline-start: calc(var(--_icon-size) + ${IconSpacing}px);
        translate: calc(var(--_offset, 0px) * var(--_dir)) 0;
      }

      .icon {
        position: absolute;
        inset-inline-start: 0;
        top: 50%;
        translate: 0 -50%;
        display: grid;
        width: var(--_icon-size);
        height: var(--_icon-size);
      }

      .check,
      .inactive {
        grid-area: 1 / 1;
        display: grid;
      }

      /* scaleIn(transformOrigin = TransformOrigin(0f, 1f)): from the bottom left. */
      .check {
        transform-origin: 0 100%;
      }

      .check svg {
        width: 100%;
        height: 100%;
        fill: currentColor;
      }

      [hidden] {
        display: none !important;
      }

      ::slotted([slot='icon']) {
        --rx-icon-size: var(--_icon-size);
        width: var(--_icon-size);
        height: var(--_icon-size);
      }

      /* The border is drawn over the container, the content and the ripple. */
      .outline {
        position: absolute;
        inset: 0;
        border: ${unsafeCSS(tokens['outline-width'])} solid var(--_outline);
        border-radius: inherit;
        pointer-events: none;
      }

      @media (forced-colors: active) {
        .outline {
          border-color: ButtonText;
        }
        :host([checked]) .button {
          outline: 2px solid ButtonText;
          outline-offset: -3px;
        }
        :host([aria-disabled='true']) .button {
          color: GrayText;
        }
      }
    `,
  ];

  override connectedCallback() {
    super.connectedCallback();
    // As a native checkbox, the `checked` attribute it starts with is its default.
    this.defaultChecked ??= this.hasAttribute('checked');
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    for (const a of [this.offset, this.checkAlpha, this.checkScale, this.inactiveAlpha]) a.stop();
  }

  formValue() {
    return {value: this.checked ? this.value : null, state: String(this.checked)};
  }

  formReset() {
    this.checked = this.defaultChecked ?? false;
  }

  formRestore(state: unknown) {
    this.checked = state === 'true';
  }

  private readonly onClick = (event: MouseEvent) => {
    if (this.isDisabled || event.defaultPrevented) return;
    // A radio button that is on stays on (onClick = { selectedIndex = index }).
    if (this.radio && this.checked) return;
    // onCheckedChange(!checked), or onClick selecting it.
    this.checked = !this.checked;
    this.dispatchEvent(new Event('input', {bubbles: true, composed: true}));
    this.dispatchEvent(new Event('change', {bubbles: true}));
  };

  private onIconSlotChange(event: Event) {
    this.hasIcon = (event.target as HTMLSlotElement).assignedElements().length > 0;
  }

  protected override willUpdate(changed: PropertyValues<this>) {
    super.willUpdate(changed);
    // Before the first render, so an icon is there from the start (the
    // slot reports it only after rendering).
    if (!this.hasUpdated) this.hasIcon = this.querySelector(':scope > [slot="icon"]') !== null;
  }

  protected override firstUpdated() {
    // The ripple and focus ring sit in the container but follow the host,
    // which takes the focus and the clicks (48dp touch target).
    if (this.ripple) this.ripple.controlElement = this;
    if (this.focusRing) this.focusRing.controlElement = this;
  }

  protected override updated(changed: PropertyValues<this>) {
    super.updated(changed);
    if (this.ripple) this.ripple.disabled = this.isDisabled;
    this.updateIcon();
    this.updateOffset();
  }

  /**
   * SegmentedButtonDefaults.Icon. With no icon, the checkmark's
   * AnimatedVisibility: in with fadeIn (default effects) and scaleIn from 0
   * (fast spatial), out at once (ExitTransition.None). With an icon, a
   * Crossfade (default effects) between the two.
   */
  private updateIcon() {
    const crossfade = this.hasIcon && !this.noCheckmark;
    const next = {
      check: !this.noCheckmark && this.checked,
      inactive: this.hasIcon && (this.noCheckmark || !this.checked),
    };
    const previous = this.shown;
    this.shown = next;
    const draw = () => this.drawIcon();
    if (!previous) {
      // Composed already showing: no enter animation.
      this.checkAlpha.snapTo(next.check ? 1 : 0);
      this.checkScale.snapTo(1);
      this.inactiveAlpha.snapTo(next.inactive ? 1 : 0);
      draw();
      return;
    }
    const effects = () => motionSpring(this, 'defaultEffects');
    if (next.check !== previous.check) {
      if (crossfade) {
        void this.checkAlpha.animateTo(next.check ? 1 : 0, effects(), undefined, draw).then(draw);
      } else if (next.check) {
        this.checkAlpha.snapTo(0);
        this.checkScale.snapTo(0);
        void this.checkAlpha.animateTo(1, effects(), undefined, draw).then(draw);
        void this.checkScale
          .animateTo(1, motionSpring(this, 'fastSpatial'), undefined, draw)
          .then(draw);
      } else {
        this.checkAlpha.snapTo(0);
        this.checkScale.snapTo(1);
      }
    }
    if (next.inactive !== previous.inactive) {
      if (crossfade) {
        void this.inactiveAlpha
          .animateTo(next.inactive ? 1 : 0, effects(), undefined, draw)
          .then(draw);
      } else {
        this.inactiveAlpha.snapTo(next.inactive ? 1 : 0);
      }
    }
    draw();
  }

  private drawIcon() {
    const check = this.checkEl;
    const inactive = this.inactiveEl;
    if (!check || !inactive) return;
    const checkAlpha = this.checkAlpha.value;
    check.hidden = checkAlpha <= 0 && !this.checkAlpha.isRunning;
    check.style.opacity = String(checkAlpha);
    check.style.scale = String(this.checkScale.value);
    const inactiveAlpha = this.inactiveAlpha.value;
    inactive.hidden = inactiveAlpha <= 0 && !this.inactiveAlpha.isRunning;
    inactive.style.opacity = String(inactiveAlpha);
  }

  /**
   * SegmentedButtonContentMeasurePolicy: with no icon showing, the label
   * moves back by half the icon and its spacing, to the middle; the move
   * springs (fast spatial) in whole pixels.
   */
  private updateOffset() {
    const iconShowing = this.hasIcon || (!this.noCheckmark && this.checked);
    const iconSize = parseFloat(getComputedStyle(this).getPropertyValue('--_icon-size')) || 0;
    // -(IconSize + IconSpacing) / 2 in Kotlin's Int arithmetic.
    const target = iconShowing ? 0 : Math.trunc(-(Math.round(iconSize) + IconSpacing) / 2) + 0;
    if (!this.offsetSet) {
      this.offsetSet = true;
      this.offset.snapTo(target);
      this.drawOffset();
      return;
    }
    if (this.offset.targetValue !== target) {
      void this.offset.animateTo(target, motionSpring(this, 'fastSpatial'), undefined, () =>
        this.drawOffset(),
      );
    }
  }

  private drawOffset() {
    this.labelEl?.style.setProperty('--_offset', `${this.offset.value}px`);
  }

  /**
   * @internal The width Compose's minIntrinsicWidth gives it: its label at
   * its longest word (rounded up, as Compose's text), the icon's room, the
   * padding and the minimum widths. A set is as wide as its widest one,
   * times the count. 0 when it isn't rendered.
   */
  minIntrinsicWidth(): number {
    const label = this.labelEl;
    const button = this.buttonEl;
    if (!label || !button) return 0;
    label.style.width = 'min-content';
    button.style.width = 'max-content';
    button.style.minWidth = `${MinWidth}px`;
    // Everything but the label is whole pixels, so rounding up the total
    // rounds up the label.
    const width = button.getBoundingClientRect().width;
    label.style.removeProperty('width');
    button.style.removeProperty('width');
    button.style.removeProperty('min-width');
    if (width === 0) return 0;
    // A minimumInteractiveComponentSize the page sets larger (the default
    // 48dp is under MinWidth), which a set's layout lets the button ignore.
    const touch = getComputedStyle(this).getPropertyValue(
      '--rx-minimum-interactive-component-size',
    );
    return Math.max(Math.ceil(width), parseFloat(touch) || 0);
  }

  /** @internal The label's offset (px) and the checkmark's state, for tests. */
  get contentState() {
    return {
      offset: this.offset.value,
      offsetTarget: this.offset.targetValue,
      checkAlpha: this.checkAlpha.value,
      checkScale: this.checkScale.value,
      inactiveAlpha: this.inactiveAlpha.value,
    };
  }

  protected override render() {
    return html`<div class="button" part="button">
      <span class="clip"
        ><span class="content"
          ><span class="icon" aria-hidden="true"
            ><span class="check" hidden
              ><svg viewBox="0 0 24 24">
                <path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg></span
            ><span class="inactive" hidden
              ><slot name="icon" @slotchange=${this.onIconSlotChange}></slot></span></span
          ><span class="label"><slot></slot></span></span
      ></span>
      <rx-ripple></rx-ripple>
      <rx-focus-ring></rx-focus-ring>
      <span class="outline" aria-hidden="true"></span>
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'rx-segmented-button': RxSegmentedButton;
  }
}
