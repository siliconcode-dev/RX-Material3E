/*
 * Ported by hand from androidx/compose/material3 ToggleButton.kt
 * (ToggleButton, ElevatedToggleButton, FilledTonalToggleButton,
 * OutlinedToggleButton, ToggleButtonSize, ToggleButtonDefaults and the
 * Elevated, FilledTonal and Outlined ToggleButtonDefaults, ToggleButtonShapes,
 * shapeByInteraction and animateBorderStrokeAsState) with Surface.kt (the
 * toggleable Surface it is drawn on), ButtonDefaults' iconSizeFor,
 * iconSpacingFor and textStyleFor, and the tokens FilledButtonTokens,
 * ElevatedButtonTokens, FilledTonalButtonTokens, TonalButtonTokens,
 * OutlinedButtonTokens and ButtonXSmallTokens to ButtonXLargeTokens.
 * Copyright 2024-2025 The Android Open Source Project. Licensed under the Apache License 2.0.
 */

import large from '@rx-m3e/tokens/js/button-large.js';
import medium from '@rx-m3e/tokens/js/button-medium.js';
import small from '@rx-m3e/tokens/js/button-small.js';
import xLarge from '@rx-m3e/tokens/js/button-x-large.js';
import xSmall from '@rx-m3e/tokens/js/button-x-small.js';
import elevated from '@rx-m3e/tokens/js/elevated-button.js';
import filled from '@rx-m3e/tokens/js/filled-button.js';
import filledTonal from '@rx-m3e/tokens/js/filled-tonal-button.js';
import outlined from '@rx-m3e/tokens/js/outlined-button.js';
import tonal from '@rx-m3e/tokens/js/tonal-button.js';
import {LitElement, css, html, unsafeCSS, type PropertyValues} from 'lit';
import {customElement, property, query} from 'lit/decorators.js';
import '../elevation/elevation.js';
import {elevationShadow} from '../elevation/elevation.js';
import '../focus/focus-ring.js';
import type {RxFocusRing} from '../focus/focus-ring.js';
import {addActivation} from '../internals/activation.js';
import {FormAssociated} from '../internals/form-associated.js';
import {ComposeRole, HostSemanticsController} from '../internals/host-semantics.js';
import {
  InteractionElevationController,
  type InteractionElevations,
} from '../internals/interaction-elevation.js';
import {InteractionShapeController} from '../internals/interaction-shape.js';
import {PressInteractionController} from '../internals/press-interaction.js';
import {minimumInteractiveComponentSize} from '../internals/touch-target.js';
import {Animatable} from '../motion/animatable.js';
import {
  colorToVector,
  cssColor,
  parseCssColor,
  Transparent,
  vectorToColor,
} from '../motion/color.js';
import {motionSpring} from '../motion/motion-scheme.js';
import '../ripple/ripple.js';
import type {RxRipple} from '../ripple/ripple.js';
import {buttonSizeStyles, type ButtonSize} from './size-styles.js';

/**
 * The four toggle buttons: Compose's ToggleButton (filled),
 * ElevatedToggleButton, FilledTonalToggleButton and OutlinedToggleButton.
 */
export type ToggleButtonVariant = 'filled' | 'elevated' | 'tonal' | 'outlined';

/**
 * A Material 3 Expressive toggle button, as Compose's `ToggleButton` family:
 * a button that stays on or off. Checked, it takes its checked colors and
 * square corners; pressed, its corners pinch in. The corners morph between
 * the three shapes on the fast spatial spring.
 *
 * - `filled` (ToggleButton): surface container off, primary on.
 * - `elevated` (ElevatedToggleButton): with a shadow.
 * - `tonal` (FilledTonalToggleButton): secondary container off, secondary on.
 * - `outlined` (OutlinedToggleButton): an outline off, inverse surface on.
 *
 * `size` (`xs`, `s`, `m`, `l` or `xl`; small by default) sets the height,
 * padding, icon size and text style, and the pressed and checked corners.
 * It is a checkbox for assistive technology and in forms: checked, it
 * submits `value` ("on" by default) under `name`. Toggling fires `input`
 * and `change`.
 *
 * @example
 * <rx-toggle-button>Bold</rx-toggle-button>
 * <rx-toggle-button variant="outlined" checked><rx-icon slot="icon">star</rx-icon>Starred</rx-toggle-button>
 *
 * @slot - The label.
 * @slot icon - A leading icon (iconSizeFor the size).
 * @csspart button - The container.
 * @cssprop --rx-toggle-button-shape - The corners when off.
 * @cssprop --rx-toggle-button-pressed-shape - The corners while pressed.
 * @cssprop --rx-toggle-button-checked-shape - The corners when on.
 * @fires input - When the user toggles it.
 * @fires change - When the user toggles it.
 */
@customElement('rx-toggle-button')
export class RxToggleButton extends FormAssociated(LitElement) {
  /** Which of the four toggle buttons. Defaults to filled. */
  @property({reflect: true}) variant: ToggleButtonVariant = 'filled';

  /** ToggleButtonSize: extra small to extra large. Defaults to small. */
  @property({reflect: true}) size: ButtonSize = 's';

  /** Whether it is on. The `checked` attribute is also the value a form reset goes back to. */
  @property({type: Boolean, reflect: true}) checked = false;

  /** Sent with the form, under `name`, when checked. */
  @property() value = 'on';

  @query('.button') private buttonEl!: HTMLElement;
  @query('.outline-color') private outlineProbe?: HTMLElement;
  @query('rx-ripple') private ripple?: RxRipple;
  @query('rx-focus-ring') private focusRing?: RxFocusRing;

  private defaultChecked: boolean | null = null;
  private readonly shapeMorph: InteractionShapeController;
  // animateBorderStrokeAsState: the border's width (dp) and color ([alpha, L, a, b]).
  private readonly borderWidth = new Animatable(0);
  private readonly borderColor = new Animatable([0, 0, 0, 0]);
  private borderTarget: {width: number; color: readonly number[]} | null = null;

  constructor() {
    super();
    addActivation(this, {kind: 'toggle', isDisabled: () => this.isDisabled});
    this.addEventListener('click', this.onClick);
    new HostSemanticsController(this, () => ({
      role: ComposeRole.Checkbox,
      disabled: this.isDisabled,
      aria: {checked: this.checked},
    }));
    new InteractionElevationController(this, {
      target: () => this.buttonEl,
      elevations: () => this.elevations,
      enabled: () => !this.isDisabled,
    });
    const press = new PressInteractionController(this, {
      enabled: () => !this.isDisabled,
      onChange: () => this.shapeMorph.update(),
      keys: () => [' '],
    });
    // shapeByInteraction: pressed wins over checked, on the fast spatial spring.
    this.shapeMorph = new InteractionShapeController(this, {
      container: () => this.buttonEl,
      shapes: ['--_shape', '--_pressed-shape', '--_checked-shape'],
      current: () => (press.pressed ? 1 : this.checked ? 2 : 0),
      spec: () => motionSpring(this, 'fastSpatial'),
    });
  }

  static override styles = [
    minimumInteractiveComponentSize,
    css`
      :host {
        position: relative;
        vertical-align: middle;
        cursor: pointer;
        outline: none;
        -webkit-tap-highlight-color: transparent;

        /* ToggleButtonDefaults.colors. */
        --_container: ${unsafeCSS(filled['unselected-container-color'])};
        --_content: ${unsafeCSS(filled['unselected-pressed-label-text-color'])};
        --_checked-container: ${unsafeCSS(filled['selected-container-color'])};
        --_checked-content: ${unsafeCSS(filled['selected-pressed-label-text-color'])};
        --_disabled-container: color-mix(
          in srgb,
          ${unsafeCSS(filled['disabled-container-color'])}
            calc(${unsafeCSS(filled['disabled-container-opacity'])} * 100%),
          transparent
        );
        --_disabled-content: color-mix(
          in srgb,
          ${unsafeCSS(filled['disabled-label-text-color'])}
            calc(${unsafeCSS(filled['disabled-label-text-opacity'])} * 100%),
          transparent
        );
        /* ToggleButtonDefaults.elevation. */
        --_elevation: ${unsafeCSS(filled['container-elevation'])};
        --_elevation-pressed: ${unsafeCSS(filled['pressed-container-elevation'])};
        --_elevation-focused: ${unsafeCSS(filled['focused-container-elevation'])};
        --_elevation-hovered: ${unsafeCSS(filled['hovered-container-elevation'])};
        --_elevation-disabled: ${unsafeCSS(filled['disabled-container-elevation'])};
        /* ButtonDefaults.outlinedButtonBorder: ButtonSmallTokens' width at every size. */
        --_outline-width: ${unsafeCSS(small['outlined-outline-width'])};
        --_outline-disabled-opacity: ${unsafeCSS(outlined['disabled-container-opacity'])};
        /* ToggleButtonDefaults.shapesFor(Small): pressedShape is RoundedCornerShape(6.dp) upstream. */
        --_shape: var(--rx-toggle-button-shape, ${unsafeCSS(small['container-shape-round'])});
        --_pressed-shape: var(--rx-toggle-button-pressed-shape, 6px);
        --_checked-shape: var(
          --rx-toggle-button-checked-shape,
          ${unsafeCSS(small['selected-container-shape-square'])}
        );
      }

      :host([variant='elevated']) {
        --_container: ${unsafeCSS(elevated['unselected-container-color'])};
        --_content: ${unsafeCSS(elevated['unselected-pressed-label-text-color'])};
        --_checked-container: ${unsafeCSS(elevated['selected-container-color'])};
        --_checked-content: ${unsafeCSS(elevated['selected-pressed-label-text-color'])};
        --_disabled-container: color-mix(
          in srgb,
          ${unsafeCSS(elevated['disabled-container-color'])}
            calc(${unsafeCSS(elevated['disabled-container-opacity'])} * 100%),
          transparent
        );
        --_disabled-content: color-mix(
          in srgb,
          ${unsafeCSS(elevated['disabled-label-text-color'])}
            calc(${unsafeCSS(elevated['disabled-label-text-opacity'])} * 100%),
          transparent
        );
        --_elevation: ${unsafeCSS(elevated['container-elevation'])};
        --_elevation-pressed: ${unsafeCSS(elevated['pressed-container-elevation'])};
        --_elevation-focused: ${unsafeCSS(elevated['focused-container-elevation'])};
        --_elevation-hovered: ${unsafeCSS(elevated['hovered-container-elevation'])};
        --_elevation-disabled: ${unsafeCSS(elevated['disabled-container-elevation'])};
      }

      /* FilledTonalToggleButtonDefaults: TonalButtonTokens colors, FilledTonalButtonTokens elevations. */
      :host([variant='tonal']) {
        --_container: ${unsafeCSS(tonal['unselected-container-color'])};
        --_content: ${unsafeCSS(tonal['unselected-label-text-color'])};
        --_checked-container: ${unsafeCSS(tonal['selected-container-color'])};
        --_checked-content: ${unsafeCSS(tonal['selected-label-text-color'])};
        --_disabled-container: color-mix(
          in srgb,
          ${unsafeCSS(tonal['disabled-container-color'])}
            calc(${unsafeCSS(tonal['disabled-container-opacity'])} * 100%),
          transparent
        );
        --_disabled-content: color-mix(
          in srgb,
          ${unsafeCSS(tonal['disabled-label-text-color'])}
            calc(${unsafeCSS(tonal['disabled-label-text-opacity'])} * 100%),
          transparent
        );
        --_elevation: ${unsafeCSS(filledTonal['container-elevation'])};
        --_elevation-pressed: ${unsafeCSS(filledTonal['pressed-container-elevation'])};
        --_elevation-focused: ${unsafeCSS(filledTonal['focus-container-elevation'])};
        --_elevation-hovered: ${unsafeCSS(filledTonal['hover-container-elevation'])};
        --_elevation-disabled: 0px;
      }

      /*
       * OutlinedToggleButtonDefaults: a transparent container off; disabled,
       * the disabled outline color at DisabledContainerOpacity. No elevation.
       */
      :host([variant='outlined']) {
        --_container: transparent;
        --_content: ${unsafeCSS(outlined['unselected-label-text-color'])};
        --_checked-container: ${unsafeCSS(outlined['selected-container-color'])};
        --_checked-content: ${unsafeCSS(outlined['selected-label-text-color'])};
        --_disabled-container: color-mix(
          in srgb,
          ${unsafeCSS(outlined['disabled-outline-color'])}
            calc(${unsafeCSS(outlined['disabled-container-opacity'])} * 100%),
          transparent
        );
        --_disabled-content: color-mix(
          in srgb,
          ${unsafeCSS(outlined['disabled-label-text-color'])}
            calc(${unsafeCSS(outlined['disabled-label-text-opacity'])} * 100%),
          transparent
        );
        --_elevation: none;
      }

      /* ToggleButtonColors: checked colors when enabled, the disabled ones otherwise. */
      :host([checked]) {
        --_container: var(--_checked-container);
        --_content: var(--_checked-content);
      }

      :host([aria-disabled='true']) {
        cursor: default;
        --_container: var(--_disabled-container);
        --_content: var(--_disabled-content);
      }

      /* shapesFor each size: the pressed shape and the square checked shape. */
      :host([size='xs']) {
        --_pressed-shape: var(
          --rx-toggle-button-pressed-shape,
          ${unsafeCSS(xSmall['pressed-container-shape'])}
        );
        --_checked-shape: var(
          --rx-toggle-button-checked-shape,
          ${unsafeCSS(xSmall['container-shape-square'])}
        );
      }

      :host([size='m']) {
        --_pressed-shape: var(
          --rx-toggle-button-pressed-shape,
          ${unsafeCSS(medium['pressed-container-shape'])}
        );
        --_checked-shape: var(
          --rx-toggle-button-checked-shape,
          ${unsafeCSS(medium['container-shape-square'])}
        );
      }

      :host([size='l']) {
        --_pressed-shape: var(
          --rx-toggle-button-pressed-shape,
          ${unsafeCSS(large['pressed-container-shape'])}
        );
        --_checked-shape: var(
          --rx-toggle-button-checked-shape,
          ${unsafeCSS(large['container-shape-square'])}
        );
      }

      :host([size='xl']) {
        --_pressed-shape: var(
          --rx-toggle-button-pressed-shape,
          ${unsafeCSS(xLarge['pressed-container-shape'])}
        );
        --_checked-shape: var(
          --rx-toggle-button-checked-shape,
          ${unsafeCSS(xLarge['container-shape-square'])}
        );
      }

      /*
       * The Row: defaultMinSize(minHeight = the size's height) and
       * contentPaddingFor the size. Unlike Button there is no minimum width.
       */
      .button {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        box-sizing: border-box;
        /* In a button group: the width the group gives it. */
        width: var(--rx-button-group-width, auto);
        min-height: var(--_height);
        padding-block: var(--_padding-block);
        /*
         * A button group squeezing this one caps the padding at half its
         * width, as Compose's padding gives way under tight constraints.
         */
        padding-inline: min(var(--_padding-start), var(--rx-button-group-max-padding, 9999px))
          min(var(--_padding-end), var(--rx-button-group-max-padding, 9999px));
        border-radius: var(--_shape);
        background: var(--_container);
        color: var(--_content);
        font: var(--_type-weight) var(--_type-size) / var(--_type-line-height) var(--_type-font);
        letter-spacing: var(--_type-tracking);
        text-align: center;
        --rx-elevation: 0px;
        ${elevationShadow}
      }

      /*
       * The border, drawn over the container as Modifier.border; its width and
       * color are animated from script (animateBorderStrokeAsState). An inset
       * shadow rather than a CSS border, which browsers snap to whole device
       * pixels: Compose draws the fractional widths of the spring.
       */
      .button::before {
        content: '';
        position: absolute;
        inset: 0;
        box-shadow: inset 0 0 0 var(--_border-width, 0px) var(--_border-color, transparent);
        border-radius: inherit;
        pointer-events: none;
      }

      .outline-color {
        display: none;
        color: ${unsafeCSS(outlined['outline-color'])};
      }

      /* A Box of iconSizeFor the size, then a Spacer of iconSpacingFor. */
      ::slotted([slot='icon']) {
        --rx-icon-size: var(--_icon-size);
        width: var(--_icon-size);
        height: var(--_icon-size);
        flex: none;
        margin-inline-end: var(--_icon-space);
      }

      slot[name] {
        display: contents;
      }

      /* Forced colors drop shadows: every toggle button gets a plain border. */
      @media (forced-colors: active) {
        .button::before {
          border: 1px solid ButtonText;
        }
        :host([checked]) .button {
          outline: 2px solid ButtonText;
          outline-offset: -2px;
        }
        :host([aria-disabled='true']) .button {
          color: GrayText;
        }
      }
    `,
    buttonSizeStyles,
  ];

  /**
   * The elevations in dp this toggle button moves between (its Defaults'
   * elevation), from the tokens; null for the outlined one.
   */
  get elevations(): InteractionElevations | null {
    const style = getComputedStyle(this);
    const read = (name: string) => style.getPropertyValue(name).trim();
    if (read('--_elevation') === 'none') return null;
    const dp = (name: string) => parseFloat(read(name)) || 0;
    return {
      default: dp('--_elevation'),
      pressed: dp('--_elevation-pressed'),
      focused: dp('--_elevation-focused'),
      hovered: dp('--_elevation-hovered'),
      disabled: dp('--_elevation-disabled'),
    };
  }

  /** @internal The shape morph's state, for tests. */
  get shapeState() {
    return this.shapeMorph.shapeState;
  }

  override connectedCallback() {
    super.connectedCallback();
    // As a native checkbox, the `checked` attribute it starts with is its default.
    this.defaultChecked ??= this.hasAttribute('checked');
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.borderWidth.stop();
    this.borderColor.stop();
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
    // onCheckedChange(!checked).
    this.checked = !this.checked;
    this.dispatchEvent(new Event('input', {bubbles: true, composed: true}));
    this.dispatchEvent(new Event('change', {bubbles: true}));
  };

  protected override firstUpdated() {
    // The ripple and focus ring sit in the container but follow the host,
    // which takes the focus and the clicks (48dp touch target).
    if (this.ripple) this.ripple.controlElement = this;
    if (this.focusRing) this.focusRing.controlElement = this;
  }

  protected override updated(changed: PropertyValues<this>) {
    super.updated(changed);
    if (this.ripple) this.ripple.disabled = this.isDisabled;
    this.updateBorder();
  }

  /**
   * animateBorderStrokeAsState with OutlinedToggleButtonDefaults.border:
   * unchecked outlined buttons have outlinedButtonBorder(enabled) (1dp, the
   * outline color, at DisabledContainerOpacity when disabled), checked ones
   * none. The width springs on the fast spatial spec and the color on the
   * default effects spec, in Oklab; at 0 or below there is no border.
   */
  private updateBorder() {
    const style = getComputedStyle(this);
    let target: {width: number; color: readonly number[]} | null = null;
    if (this.variant === 'outlined' && !this.checked) {
      const color = parseCssColor(getComputedStyle(this.outlineProbe!).color);
      if (color) {
        if (this.isDisabled) {
          color.alpha *= parseFloat(style.getPropertyValue('--_outline-disabled-opacity'));
        }
        target = {
          width: parseFloat(style.getPropertyValue('--_outline-width')),
          color: colorToVector(color),
        };
      }
    }
    const width = target?.width ?? 0;
    const color = target?.color ?? colorToVector(Transparent);
    const previous = this.borderTarget;
    this.borderTarget = {width, color};
    if (!previous) {
      // animate*AsState starts at its first target.
      this.borderWidth.snapTo(width);
      this.borderColor.snapTo(color);
      this.drawBorder();
      return;
    }
    if (previous.width !== width) {
      void this.borderWidth.animateTo(width, motionSpring(this, 'fastSpatial'), undefined, () =>
        this.drawBorder(),
      );
    }
    if (previous.color.some((v, i) => v !== color[i])) {
      void this.borderColor.animateTo(color, motionSpring(this, 'defaultEffects'), undefined, () =>
        this.drawBorder(),
      );
    }
  }

  private drawBorder() {
    const width = this.borderWidth.value;
    const style = this.buttonEl.style;
    if (width <= 0) {
      style.setProperty('--_border-width', '0px');
      return;
    }
    style.setProperty('--_border-width', `${width}px`);
    style.setProperty('--_border-color', cssColor(vectorToColor(this.borderColor.value)));
  }

  protected override render() {
    return html`<div class="button" part="button">
      <rx-ripple></rx-ripple>
      <rx-focus-ring></rx-focus-ring>
      <span class="outline-color" aria-hidden="true"></span>
      <slot name="icon"></slot>
      <slot></slot>
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'rx-toggle-button': RxToggleButton;
  }
}
