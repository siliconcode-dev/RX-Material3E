/*
 * Ported by hand from androidx/compose/material3 Button.kt (Button,
 * ElevatedButton, FilledTonalButton, OutlinedButton, TextButton, their
 * expressive `shapes` overloads, ButtonDefaults with its size helpers
 * shapesFor, contentPaddingFor, iconSizeFor, iconSpacingFor and
 * textStyleFor, ButtonShapes and shapeByInteraction) with Surface.kt (the
 * clickable Surface every button is drawn on) and the tokens
 * FilledButtonTokens, ElevatedButtonTokens, FilledTonalButtonTokens,
 * OutlinedButtonTokens, TextButtonTokens, BaselineButtonTokens and
 * ButtonXSmallTokens to ButtonXLargeTokens.
 * Copyright 2021-2025 The Android Open Source Project. Licensed under the Apache License 2.0.
 */

import baseline from '@rx-m3e/tokens/js/baseline-button.js';
import large from '@rx-m3e/tokens/js/button-large.js';
import medium from '@rx-m3e/tokens/js/button-medium.js';
import small from '@rx-m3e/tokens/js/button-small.js';
import xLarge from '@rx-m3e/tokens/js/button-x-large.js';
import xSmall from '@rx-m3e/tokens/js/button-x-small.js';
import elevated from '@rx-m3e/tokens/js/elevated-button.js';
import filled from '@rx-m3e/tokens/js/filled-button.js';
import tonal from '@rx-m3e/tokens/js/filled-tonal-button.js';
import outlined from '@rx-m3e/tokens/js/outlined-button.js';
import text from '@rx-m3e/tokens/js/text-button.js';
import {LitElement, css, html, unsafeCSS, type PropertyValues} from 'lit';
import {customElement, property, query} from 'lit/decorators.js';
import '../elevation/elevation.js';
import {elevationShadow} from '../elevation/elevation.js';
import '../focus/focus-ring.js';
import type {RxFocusRing} from '../focus/focus-ring.js';
import {addActivation} from '../internals/activation.js';
import {
  AnimatedShapeState,
  applyCornerShape,
  clearCornerShape,
  cornerShapesEqual,
  parseCornerShape,
  type CornerShape,
} from '../internals/animated-shape.js';
import {FormAssociated, resetForm, submitForm} from '../internals/form-associated.js';
import {ComposeRole, HostSemanticsController} from '../internals/host-semantics.js';
import {
  InteractionElevationController,
  type InteractionElevations,
} from '../internals/interaction-elevation.js';
import {PressInteractionController} from '../internals/press-interaction.js';
import {minimumInteractiveComponentSize} from '../internals/touch-target.js';
import {motionSpring} from '../motion/motion-scheme.js';
import '../ripple/ripple.js';
import type {RxRipple} from '../ripple/ripple.js';

/** The five button styles: Compose's Button, ElevatedButton, FilledTonalButton, OutlinedButton, TextButton. */
export type ButtonVariant = 'filled' | 'elevated' | 'tonal' | 'outlined' | 'text';

/**
 * The expressive sizes, by container height: extra small 32dp, small 40dp,
 * medium 56dp, large 96dp, extra large 136dp.
 */
export type ButtonSize = 'xs' | 's' | 'm' | 'l' | 'xl';

/** ButtonDefaults.shape (fully round) or ButtonDefaults.squareShape. */
export type ButtonShape = 'round' | 'square';

/** The label's text style: a typescale role (textStyleFor). */
function typescale(role: string) {
  const token = (name: string) => `var(--md-sys-typescale-${role}-${name})`;
  return unsafeCSS(`
    --_type-font: ${token('font')};
    --_type-weight: ${token('weight')};
    --_type-size: ${token('size')};
    --_type-line-height: ${token('line-height')};
    --_type-tracking: ${token('tracking')};
  `);
}

/**
 * A Material 3 button, as Compose's `Button` family.
 *
 * - `filled` (Button): the highest emphasis, for the main action.
 * - `tonal` (FilledTonalButton): between filled and outlined.
 * - `elevated` (ElevatedButton): a tonal surface with a shadow, to stand out on busy backgrounds.
 * - `outlined` (OutlinedButton): medium emphasis, for important but not primary actions.
 * - `text` (TextButton): the lowest emphasis, in dialogs and cards.
 *
 * Like the clickable Surface it is built on, it takes at least 48dp for its
 * touch target while its container is 40dp tall. It is a form button: by
 * default it submits its form, as `<button>` does; `type="button"` makes it
 * a plain button.
 *
 * Without `size` it is the classic button. `size` picks one of the
 * expressive sizes, laid out as Compose's size samples do: the container
 * height, ButtonDefaults' contentPaddingFor, iconSizeFor, iconSpacingFor and
 * textStyleFor for that height. `shape="square"` uses
 * ButtonDefaults.squareShape. `morph` is the expressive `shapes` overload:
 * the corners morph to the pressed shape of ButtonDefaults.shapesFor while
 * the button is held, and its padding defaults to contentPaddingFor.
 *
 * @example
 * <rx-button>Save</rx-button>
 * <rx-button variant="outlined"><rx-icon slot="icon">add</rx-icon>New</rx-button>
 * <rx-button size="l" shape="square" morph>Start</rx-button>
 *
 * @slot - The label.
 * @slot icon - A leading icon (18dp; 20 to 40dp with `size`).
 * @slot trailing-icon - A trailing icon (18dp; 20 to 40dp with `size`).
 * @csspart button - The container.
 * @cssprop --rx-button-shape - The container's corners (one to four lengths).
 * @cssprop --rx-button-pressed-shape - The corners while pressed, with `morph`.
 */
@customElement('rx-button')
export class RxButton extends FormAssociated(LitElement) {
  /** Which of the five buttons. Defaults to filled. */
  @property({reflect: true}) variant: ButtonVariant = 'filled';

  /** One of the expressive sizes; unset, the classic button. */
  @property({reflect: true}) size?: ButtonSize;

  /** Round (the default) or square corners. */
  @property({reflect: true}) shape: ButtonShape = 'round';

  /** Morph the corners while pressed (the expressive `shapes` overload). */
  @property({type: Boolean, reflect: true}) morph = false;

  /** As `<button type>`: submit (the default), reset, or button. */
  @property({reflect: true}) type: 'submit' | 'reset' | 'button' = 'submit';

  /** Sent with the form, under `name`, when this button submits it. */
  @property() value = '';

  @query('.button') private buttonEl!: HTMLElement;
  @query('rx-ripple') private ripple?: RxRipple;
  @query('rx-focus-ring') private focusRing?: RxFocusRing;

  constructor() {
    super();
    addActivation(this, {kind: 'button', isDisabled: () => this.isDisabled});
    this.addEventListener('click', this.onClick);
    new HostSemanticsController(this, () => ({
      role: ComposeRole.Button,
      disabled: this.isDisabled,
    }));
    new InteractionElevationController(this, {
      target: () => this.buttonEl,
      elevations: () => this.elevations,
      enabled: () => !this.isDisabled,
    });
    this.press = new PressInteractionController(this, {
      enabled: () => !this.isDisabled,
      onChange: () => this.updateShape(),
    });
  }

  private readonly press: PressInteractionController;
  // shapeByInteraction's key(shapes) and the AnimatedShapeState it remembers.
  private shapes: {shape: CornerShape; pressedShape: CornerShape} | null = null;
  private shapeState: AnimatedShapeState | null = null;

  static override styles = [
    minimumInteractiveComponentSize,
    css`
      :host {
        position: relative;
        vertical-align: middle;
        cursor: pointer;
        outline: none;
        -webkit-tap-highlight-color: transparent;

        /* Filled (Button / ButtonDefaults.buttonColors). */
        --_container: ${unsafeCSS(filled['container-color'])};
        --_content: ${unsafeCSS(filled['label-text-color'])};
        --_disabled-container: ${unsafeCSS(filled['disabled-container-color'])};
        --_disabled-container-opacity: ${unsafeCSS(filled['disabled-container-opacity'])};
        --_disabled-content: ${unsafeCSS(filled['disabled-label-text-color'])};
        --_disabled-content-opacity: ${unsafeCSS(filled['disabled-label-text-opacity'])};
        --_outline: transparent;
        /* ButtonDefaults.buttonElevation. */
        --_elevation: ${unsafeCSS(filled['container-elevation'])};
        --_elevation-pressed: ${unsafeCSS(filled['pressed-container-elevation'])};
        --_elevation-focused: ${unsafeCSS(filled['focused-container-elevation'])};
        --_elevation-hovered: ${unsafeCSS(filled['hovered-container-elevation'])};
        --_elevation-disabled: ${unsafeCSS(filled['disabled-container-elevation'])};
        /* ButtonDefaults.ContentPadding: BaselineButtonTokens leading and trailing space, 8dp vertical. */
        --_padding-start: ${unsafeCSS(baseline['leading-space'])};
        --_padding-end: ${unsafeCSS(baseline['trailing-space'])};
        --_padding-block: 8px;
        /* ButtonDefaults.MinHeight, IconSize, IconSpacing; typography.labelLarge. */
        --_height: ${unsafeCSS(small['container-height'])};
        --_icon-size: 18px;
        --_icon-space: ${unsafeCSS(small['icon-label-space'])};
        ${typescale('label-large')}
        /* ButtonDefaults.shape / squareShape, and shapes()' pressed shape. */
        --_shape: var(--rx-button-shape, ${unsafeCSS(small['container-shape-round'])});
        --_pressed-shape: var(
          --rx-button-pressed-shape,
          ${unsafeCSS(small['pressed-container-shape'])}
        );
      }

      :host([shape='square']) {
        --_shape: var(--rx-button-shape, ${unsafeCSS(small['container-shape-square'])});
      }

      :host([variant='elevated']) {
        --_container: ${unsafeCSS(elevated['container-color'])};
        --_content: ${unsafeCSS(elevated['label-text-color'])};
        --_disabled-container: ${unsafeCSS(elevated['disabled-container-color'])};
        --_disabled-container-opacity: ${unsafeCSS(elevated['disabled-container-opacity'])};
        --_disabled-content: ${unsafeCSS(elevated['disabled-label-text-color'])};
        --_disabled-content-opacity: ${unsafeCSS(elevated['disabled-label-text-opacity'])};
        /* ButtonDefaults.elevatedButtonElevation. */
        --_elevation: ${unsafeCSS(elevated['container-elevation'])};
        --_elevation-pressed: ${unsafeCSS(elevated['pressed-container-elevation'])};
        --_elevation-focused: ${unsafeCSS(elevated['focused-container-elevation'])};
        --_elevation-hovered: ${unsafeCSS(elevated['hovered-container-elevation'])};
        --_elevation-disabled: ${unsafeCSS(elevated['disabled-container-elevation'])};
      }

      :host([variant='tonal']) {
        --_container: ${unsafeCSS(tonal['container-color'])};
        --_content: ${unsafeCSS(tonal['label-text-color'])};
        --_disabled-container: ${unsafeCSS(tonal['disabled-container-color'])};
        --_disabled-container-opacity: ${unsafeCSS(tonal['disabled-container-opacity'])};
        --_disabled-content: ${unsafeCSS(tonal['disabled-label-text-color'])};
        --_disabled-content-opacity: ${unsafeCSS(tonal['disabled-label-text-opacity'])};
        /* ButtonDefaults.filledTonalButtonElevation (its tokens say focus/hover; disabled is 0.dp). */
        --_elevation: ${unsafeCSS(tonal['container-elevation'])};
        --_elevation-pressed: ${unsafeCSS(tonal['pressed-container-elevation'])};
        --_elevation-focused: ${unsafeCSS(tonal['focus-container-elevation'])};
        --_elevation-hovered: ${unsafeCSS(tonal['hover-container-elevation'])};
        --_elevation-disabled: 0px;
      }

      /* outlinedButtonColors: transparent container; outlinedButtonBorder. */
      :host([variant='outlined']) {
        --_container: transparent;
        --_content: ${unsafeCSS(outlined['label-text-color'])};
        --_disabled-container: transparent;
        --_disabled-content: ${unsafeCSS(outlined['disabled-label-text-color'])};
        --_disabled-content-opacity: ${unsafeCSS(outlined['disabled-label-text-opacity'])};
        --_outline: ${unsafeCSS(outlined['outline-color'])};
        /* No elevation (elevation = null). */
        --_elevation: none;
      }

      /*
       * textButtonColors: transparent container and the primary color
       * (upstream: "replace with the token value once it's corrected").
       * TextButtonContentPadding: 12dp each side.
       */
      :host([variant='text']) {
        --_container: transparent;
        --_content: var(--md-sys-color-primary);
        --_disabled-container: transparent;
        --_disabled-content: ${unsafeCSS(text['disabled-label-color'])};
        --_disabled-content-opacity: ${unsafeCSS(text['disabled-label-opacity'])};
        --_padding-start: 12px;
        --_padding-end: 12px;
        /* No elevation (elevation = null). */
        --_elevation: none;
      }

      /* ButtonWithIconContentPadding: 16dp before a leading icon. */
      :host([has-icon]:not([variant='text']):not([size]):not([morph])) {
        --_padding-start: 16px;
      }

      /* TextButtonWithIconContentPadding: 12dp start, 16dp end. */
      :host([has-icon][variant='text']:not([size]):not([morph])) {
        --_padding-end: 16px;
      }

      /*
       * The expressive overload's default padding,
       * contentPaddingFor(MinHeight): the small padding, for every variant.
       */
      :host([morph]) {
        --_padding-start: ${unsafeCSS(small['leading-space'])};
        --_padding-end: ${unsafeCSS(small['trailing-space'])};
        --_padding-block: 10px;
      }

      /*
       * The sizes, as Compose's size samples: Modifier.heightIn(size) and
       * contentPaddingFor, iconSizeFor, iconSpacingFor and textStyleFor for
       * the size; shapesFor picks the pressed shape. With an icon the
       * padding is the same (the icon paddings equal the leading and
       * trailing space unless precision pointer sizing is on, and it is off).
       */
      :host([size='xs']) {
        --_height: ${unsafeCSS(xSmall['container-height'])};
        /* ExtraSmallContentPadding (upstream TODO: from the tokens once corrected). */
        --_padding-start: 12px;
        --_padding-end: 12px;
        --_padding-block: 6px;
        --_icon-size: ${unsafeCSS(xSmall['icon-size'])};
        /* ExtraSmallIconSpacing (upstream TODO: from the tokens once corrected). */
        --_icon-space: 4px;
        --_pressed-shape: var(
          --rx-button-pressed-shape,
          ${unsafeCSS(xSmall['pressed-container-shape'])}
        );
      }

      :host([size='s']) {
        --_height: ${unsafeCSS(small['container-height'])};
        --_padding-start: ${unsafeCSS(small['leading-space'])};
        --_padding-end: ${unsafeCSS(small['trailing-space'])};
        --_padding-block: 10px;
        --_icon-size: ${unsafeCSS(small['icon-size'])};
        --_icon-space: ${unsafeCSS(small['icon-label-space'])};
      }

      :host([size='m']) {
        --_height: ${unsafeCSS(medium['container-height'])};
        --_padding-start: ${unsafeCSS(medium['leading-space'])};
        --_padding-end: ${unsafeCSS(medium['trailing-space'])};
        --_padding-block: 16px;
        --_icon-size: ${unsafeCSS(medium['icon-size'])};
        --_icon-space: ${unsafeCSS(medium['icon-label-space'])};
        ${typescale('title-medium')}
        --_pressed-shape: var(
          --rx-button-pressed-shape,
          ${unsafeCSS(medium['pressed-container-shape'])}
        );
      }

      :host([size='l']) {
        --_height: ${unsafeCSS(large['container-height'])};
        --_padding-start: ${unsafeCSS(large['leading-space'])};
        --_padding-end: ${unsafeCSS(large['trailing-space'])};
        --_padding-block: 32px;
        --_icon-size: ${unsafeCSS(large['icon-size'])};
        --_icon-space: ${unsafeCSS(large['icon-label-space'])};
        ${typescale('headline-small')}
        --_pressed-shape: var(
          --rx-button-pressed-shape,
          ${unsafeCSS(large['pressed-container-shape'])}
        );
      }

      /* ExtraLargeContentPadding: the tokens' sides, 48dp vertical. */
      :host([size='xl']) {
        --_height: ${unsafeCSS(xLarge['container-height'])};
        --_padding-start: ${unsafeCSS(xLarge['leading-space'])};
        --_padding-end: ${unsafeCSS(xLarge['trailing-space'])};
        --_padding-block: 48px;
        --_icon-size: ${unsafeCSS(xLarge['icon-size'])};
        --_icon-space: ${unsafeCSS(xLarge['icon-label-space'])};
        ${typescale('headline-large')}
        --_pressed-shape: var(
          --rx-button-pressed-shape,
          ${unsafeCSS(xLarge['pressed-container-shape'])}
        );
      }

      :host([aria-disabled='true']) {
        cursor: default;
        --_container: color-mix(
          in srgb,
          var(--_disabled-container) calc(var(--_disabled-container-opacity, 0) * 100%),
          transparent
        );
        --_content: color-mix(
          in srgb,
          var(--_disabled-content) calc(var(--_disabled-content-opacity) * 100%),
          transparent
        );
      }

      /* outlinedButtonBorder(enabled = false): the outline at DisabledContainerOpacity. */
      :host([variant='outlined'][aria-disabled='true']) {
        --_outline: color-mix(
          in srgb,
          ${unsafeCSS(outlined['outline-color'])}
            calc(${unsafeCSS(outlined['disabled-container-opacity'])} * 100%),
          transparent
        );
      }

      .button {
        position: relative;
        display: inline-flex;
        gap: var(--_icon-space);
        align-items: center;
        justify-content: center;
        box-sizing: border-box;
        /*
         * ButtonDefaults.MinWidth, and MinHeight or the size's height
         * (heightIn sets a minimum height, so defaultMinSize then only
         * applies its width).
         */
        min-width: 58px;
        min-height: var(--_height);
        padding-block: var(--_padding-block);
        padding-inline: var(--_padding-start) var(--_padding-end);
        border-radius: var(--_shape);
        background: var(--_container);
        color: var(--_content);
        font: var(--_type-weight) var(--_type-size) / var(--_type-line-height) var(--_type-font);
        letter-spacing: var(--_type-tracking);
        text-align: center;
        --rx-elevation: 0px;
        ${elevationShadow}
      }

      /* The border is drawn over the container, as Modifier.border: it takes no room. */
      .button::before {
        content: '';
        position: absolute;
        inset: 0;
        border: ${unsafeCSS(small['outlined-outline-width'])} solid var(--_outline);
        border-radius: inherit;
        pointer-events: none;
      }

      /* ButtonDefaults.IconSize, or iconSizeFor the size. */
      ::slotted([slot='icon']),
      ::slotted([slot='trailing-icon']) {
        --rx-icon-size: var(--_icon-size);
        width: var(--_icon-size);
        height: var(--_icon-size);
        flex: none;
      }

      slot[name] {
        display: contents;
      }

      @media (forced-colors: active) {
        .button::before {
          border-color: ButtonText;
        }
        :host([aria-disabled='true']) .button {
          color: GrayText;
        }
        :host([aria-disabled='true']) .button::before {
          border-color: GrayText;
        }
      }
    `,
  ];

  /**
   * The elevations in dp this button moves between (ButtonDefaults'
   * ButtonElevation), from the tokens; null for outlined and text buttons.
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

  formValue() {
    // A button adds its name and value only when it submits the form.
    return {value: null};
  }

  formReset() {}

  formRestore() {}

  private readonly onClick = () => {
    if (this.isDisabled) return;
    if (this.type === 'submit') submitForm(this, {name: this.name, value: this.value});
    else if (this.type === 'reset') resetForm(this);
  };

  protected override firstUpdated() {
    // The ripple and focus ring sit in the 40dp container but follow the
    // host, which takes the focus and the clicks (48dp touch target).
    if (this.ripple) this.ripple.controlElement = this;
    if (this.focusRing) this.focusRing.controlElement = this;
  }

  protected override updated(changed: PropertyValues<this>) {
    super.updated(changed);
    if (this.ripple) this.ripple.disabled = this.isDisabled;
    this.updateShape();
  }

  /**
   * shapeByInteraction: with `morph`, the shape is the pressed shape while
   * pressed, reached through an AnimatedShapeState on the default effects
   * spring ("intentional here to prevent any bounce"). New shapes (another
   * size, shape or theme) start a new state at rest, as `key(shapes)`.
   */
  private updateShape() {
    const container = this.buttonEl;
    if (!container) return;
    if (!this.morph) {
      if (this.shapes || this.shapeState) {
        this.shapeState?.progress.stop();
        this.shapes = this.shapeState = null;
        clearCornerShape(container);
        container.style.removeProperty('border-radius');
      }
      return;
    }
    const style = getComputedStyle(this);
    const full = style.getPropertyValue('--md-sys-shape-corner-full');
    const rawShape = style.getPropertyValue('--_shape');
    const rawPressed = style.getPropertyValue('--_pressed-shape');
    const pressed = this.press.pressed;
    const shape = parseCornerShape(rawShape, full);
    const pressedShape = parseCornerShape(rawPressed, full);
    if (!shape || !pressedShape) {
      // Not corner sizes (hasCornerBasedShapes is false): switch without a morph.
      this.shapeState?.progress.stop();
      this.shapes = this.shapeState = null;
      clearCornerShape(container);
      container.style.setProperty('border-radius', pressed ? rawPressed : rawShape);
      return;
    }
    container.style.removeProperty('border-radius');
    const current = pressed ? pressedShape : shape;
    const shapes = this.shapes;
    if (
      !shapes ||
      !this.shapeState ||
      !cornerShapesEqual(shapes.shape, shape) ||
      !cornerShapesEqual(shapes.pressedShape, pressedShape)
    ) {
      this.shapeState?.progress.stop();
      this.shapes = {shape, pressedShape};
      const state = new AnimatedShapeState(
        current,
        () => motionSpring(this, 'defaultEffects'),
        () => this.drawShape(state),
      );
      this.shapeState = state;
      this.drawShape(state);
      return;
    }
    const state = this.shapeState;
    void state.animateToShape(current)?.then(() => this.drawShape(state));
  }

  private drawShape(state: AnimatedShapeState) {
    if (state !== this.shapeState || !this.buttonEl) return;
    const atRest = state.atRest;
    applyCornerShape(this.buttonEl, atRest ? state.targetShape : state.morphedShape(), atRest);
  }

  private onSlotChange(event: Event) {
    const slot = event.target as HTMLSlotElement;
    const has = slot.assignedElements().length > 0;
    if (slot.name === 'icon') this.toggleAttribute('has-icon', has);
    if (slot.name === 'trailing-icon') this.toggleAttribute('has-trailing-icon', has);
  }

  protected override render() {
    return html`<div class="button" part="button">
      <rx-ripple></rx-ripple>
      <rx-focus-ring></rx-focus-ring>
      <slot name="icon" @slotchange=${this.onSlotChange}></slot>
      <slot></slot>
      <slot name="trailing-icon" @slotchange=${this.onSlotChange}></slot>
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'rx-button': RxButton;
  }
}
