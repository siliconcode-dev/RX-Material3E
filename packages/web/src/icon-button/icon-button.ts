/*
 * Ported by hand from androidx/compose/material3 IconButton.kt (IconButton,
 * IconToggleButton, FilledIconButton, FilledIconToggleButton,
 * FilledTonalIconButton, FilledTonalIconToggleButton, OutlinedIconButton,
 * OutlinedIconToggleButton, their `shapes` overloads, IconButtonShapes,
 * IconToggleButtonShapes, shapeForInteraction and shapeByInteraction) and
 * IconButtonDefaults.kt (colors, vibrant colors, borders, shapes and
 * extraSmallContainerSize to extraLargeContainerSize with
 * IconButtonWidthOption, the size's icon sizes and shapes), with Surface.kt
 * and the tokens StandardIconButtonTokens, FilledIconButtonTokens,
 * FilledTonalIconButtonTokens, OutlinedIconButtonTokens and
 * XSmallIconButtonTokens to XLargeIconButtonTokens.
 * Copyright 2021-2025 The Android Open Source Project. Licensed under the Apache License 2.0.
 */

import filled from '@rx-m3e/tokens/js/filled-icon-button.js';
import tonal from '@rx-m3e/tokens/js/filled-tonal-icon-button.js';
import outlined from '@rx-m3e/tokens/js/outlined-icon-button.js';
import large from '@rx-m3e/tokens/js/large-icon-button.js';
import medium from '@rx-m3e/tokens/js/medium-icon-button.js';
import small from '@rx-m3e/tokens/js/small-icon-button.js';
import standard from '@rx-m3e/tokens/js/standard-icon-button.js';
import xLarge from '@rx-m3e/tokens/js/x-large-icon-button.js';
import xSmall from '@rx-m3e/tokens/js/x-small-icon-button.js';
import {LitElement, css, html, unsafeCSS, type PropertyValues} from 'lit';
import {customElement, property, query} from 'lit/decorators.js';
import '../focus/focus-ring.js';
import type {RxFocusRing} from '../focus/focus-ring.js';
import {addActivation} from '../internals/activation.js';
import {FormAssociated, resetForm, submitForm} from '../internals/form-associated.js';
import {ComposeRole, HostSemanticsController} from '../internals/host-semantics.js';
import {InteractionShapeController} from '../internals/interaction-shape.js';
import {PressInteractionController} from '../internals/press-interaction.js';
import {minimumInteractiveComponentSize} from '../internals/touch-target.js';
import {motionSpring} from '../motion/motion-scheme.js';
import '../ripple/ripple.js';
import type {RxRipple} from '../ripple/ripple.js';

/**
 * The four icon buttons: Compose's IconButton (standard), FilledIconButton,
 * FilledTonalIconButton and OutlinedIconButton.
 */
export type IconButtonVariant = 'standard' | 'filled' | 'tonal' | 'outlined';

/** The expressive sizes, by container height: 32, 40, 56, 96 and 136dp. */
export type IconButtonSize = 'xs' | 's' | 'm' | 'l' | 'xl';

/** IconButtonWidthOption: narrow, uniform (the default) or wide. */
export type IconButtonWidth = 'narrow' | 'uniform' | 'wide';

/** Round (the default) or square corners. */
export type IconButtonShape = 'round' | 'square';

/** `color` at `opacity`, as Color.copy(alpha). */
const alpha = (color: string, opacity: string) =>
  unsafeCSS(`color-mix(in srgb, ${color} calc(${opacity} * 100%), transparent)`);

type SizeTokens = Readonly<Record<string, string>>;

const SIZES: [IconButtonSize, SizeTokens][] = [
  ['xs', xSmall],
  ['s', small],
  ['m', medium],
  ['l', large],
  ['xl', xLarge],
];

/**
 * Each size's container (extraSmallContainerSize to extraLargeContainerSize:
 * the icon size plus the width option's leading and trailing space, by the
 * container height), icon size, and shapes: round or square, the pressed
 * shape, and the selected shape (squarer from round, round from square).
 */
function sizeStyles() {
  const rules = SIZES.map(([size, t]) => {
    const host = `:host([size='${size}'])`;
    // Uniform is the leading space twice; LargeIconButtonTokens calls it UniformLeadingSpace.
    const uniform = t['uniform-leading-space'] ?? t['default-leading-space'];
    return `
      ${host} {
        --_height: ${t['container-height']};
        --_icon-size: ${t['icon-size']};
        --_width: calc(${t['icon-size']} + 2 * ${uniform});
        --_shape: var(--rx-icon-button-shape, ${t['container-shape-round']});
        --_pressed-shape: var(--rx-icon-button-pressed-shape, ${t['pressed-container-shape']});
        --_checked-shape: var(--rx-icon-button-checked-shape, ${t['selected-container-shape-round']});
      }
      ${host.slice(0, -1)}[width='narrow']) {
        --_width: calc(${t['icon-size']} + ${t['narrow-leading-space']} + ${t['narrow-trailing-space']});
      }
      ${host.slice(0, -1)}[width='wide']) {
        --_width: calc(${t['icon-size']} + ${t['wide-leading-space']} + ${t['wide-trailing-space']});
      }
      ${host.slice(0, -1)}[shape='square']) {
        --_shape: var(--rx-icon-button-shape, ${t['container-shape-square']});
        --_checked-shape: var(--rx-icon-button-checked-shape, ${t['selected-container-shape-square']});
      }`;
  });
  return unsafeCSS(rules.join('\n'));
}

/**
 * A Material 3 icon button, as Compose's IconButton family, and with
 * `toggle` its IconToggleButton family.
 *
 * - `standard` (IconButton): no container, the icon in the surrounding text
 *   color (LocalContentColor).
 * - `filled` (FilledIconButton): primary container.
 * - `tonal` (FilledTonalIconButton): secondary container.
 * - `outlined` (OutlinedIconButton): a 1dp outline in the surrounding color.
 *
 * With `toggle` it stays on or off (`checked`), as a checkbox. `morph` is
 * Compose's `shapes` overload: the corners morph to the pressed shape while
 * held, and a toggle to the checked shape when on. As in Compose, a
 * morphing standard or outlined toggle uses the vibrant colors; `vibrant`
 * picks them for any standard or outlined icon button.
 *
 * The container is 40dp in a 48dp touch target. Give it a name: a `label`
 * on its `rx-icon`, or `aria-label`.
 *
 * @example
 * <rx-icon-button><rx-icon label="Search">search</rx-icon></rx-icon-button>
 * <rx-icon-button variant="filled" toggle morph><rx-icon label="Favourite">favorite</rx-icon></rx-icon-button>
 *
 * @slot - The icon.
 * @csspart button - The container.
 * @cssprop --rx-icon-button-shape - The corners.
 * @cssprop --rx-icon-button-pressed-shape - The corners while pressed, with `morph`.
 * @cssprop --rx-icon-button-checked-shape - The corners when on, with `toggle` and `morph`.
 * @fires input - When the user toggles it (`toggle`).
 * @fires change - When the user toggles it (`toggle`).
 */
@customElement('rx-icon-button')
export class RxIconButton extends FormAssociated(LitElement) {
  /** Which of the four icon buttons. Defaults to standard. */
  @property({reflect: true}) variant: IconButtonVariant = 'standard';

  /** The toggle version (IconToggleButton): it stays on or off. */
  @property({type: Boolean, reflect: true}) toggle = false;

  /** With `toggle`, whether it is on. The attribute is also what a form reset goes back to. */
  @property({type: Boolean, reflect: true}) checked = false;

  /** Morph the corners when pressed and checked (the `shapes` overloads). */
  @property({type: Boolean, reflect: true}) morph = false;

  /** One of the expressive sizes: extra small to extra large. Defaults to small. */
  @property({reflect: true}) size: IconButtonSize = 's';

  /** IconButtonWidthOption: the space beside the icon. Defaults to uniform (square). */
  @property({reflect: true}) width: IconButtonWidth = 'uniform';

  /** The size's round (default) or square shape. */
  @property({reflect: true}) shape: IconButtonShape = 'round';

  /** The vibrant colors (iconButtonVibrantColors) for a standard or outlined icon button. */
  @property({type: Boolean, reflect: true}) vibrant = false;

  /** As `<button type>` when not a toggle: submit (the default), reset, or button. */
  @property({reflect: true}) type: 'submit' | 'reset' | 'button' = 'submit';

  /** Sent with the form under `name`: when it submits it, or when a toggle is on ("on" then). */
  @property() value = '';

  @query('.button') private buttonEl!: HTMLElement;
  @query('rx-ripple') private ripple?: RxRipple;
  @query('rx-focus-ring') private focusRing?: RxFocusRing;

  private defaultChecked: boolean | null = null;
  private readonly shapeMorph: InteractionShapeController;

  constructor() {
    super();
    // A button clicks on Enter and Space, a toggle (checkbox) on Space only.
    addActivation(this, {
      kind: 'button',
      isDisabled: () => this.isDisabled,
      isEnabled: () => !this.toggle,
    });
    addActivation(this, {
      kind: 'toggle',
      isDisabled: () => this.isDisabled,
      isEnabled: () => this.toggle,
    });
    this.addEventListener('click', this.onClick);
    new HostSemanticsController(this, () => ({
      role: this.toggle ? ComposeRole.Checkbox : ComposeRole.Button,
      disabled: this.isDisabled,
      aria: {checked: this.toggle ? this.checked : null},
    }));
    const press = new PressInteractionController(this, {
      enabled: () => !this.isDisabled,
      onChange: () => this.shapeMorph.update(),
      keys: () => (this.toggle ? [' '] : [' ', 'Enter']),
    });
    // shapeForInteraction: the pressed shape while pressed, then the checked
    // shape for a toggle that is on, on the default effects spring
    // ("intentional here to prevent any bounce").
    this.shapeMorph = new InteractionShapeController(this, {
      container: () => this.buttonEl,
      shapes: ['--_shape', '--_pressed-shape', '--_checked-shape'],
      current: () => (press.pressed ? 1 : this.toggle && this.checked ? 2 : 0),
      spec: () => motionSpring(this, 'defaultEffects'),
      enabled: () => this.morph,
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

        /*
         * iconButtonColors / iconToggleButtonColors: no container, the
         * surrounding content color (LocalContentColor, here the inherited
         * color), at DisabledOpacity when disabled; a toggle that is on takes
         * the selected color.
         */
        --_off-container: transparent;
        --_off-content: currentColor;
        --_checked-container: transparent;
        --_checked-content: ${unsafeCSS(standard['selected-color'])};
        --_disabled-container: transparent;
        --_disabled-content: ${alpha('currentColor', standard['disabled-opacity'])};
        --_outline: transparent;
        --_disabled-outline: transparent;
        /* standardShape / filledShape / outlinedShape; shapes() and toggleableShapes(). */
        --_shape: var(--rx-icon-button-shape, ${unsafeCSS(small['container-shape-round'])});
        --_pressed-shape: var(
          --rx-icon-button-pressed-shape,
          ${unsafeCSS(small['pressed-container-shape'])}
        );
        --_checked-shape: var(
          --rx-icon-button-checked-shape,
          ${unsafeCSS(small['selected-container-shape-round'])}
        );
      }

      /* iconButtonVibrantColors / iconToggleButtonVibrantColors. */
      :host([variant='standard']:is([vibrant], [toggle][morph])) {
        --_off-content: ${unsafeCSS(standard['color'])};
        --_disabled-content: ${alpha(standard['disabled-color'], standard['disabled-opacity'])};
      }

      :host([variant='standard'][toggle]:is([vibrant], [morph])) {
        --_off-content: ${unsafeCSS(standard['unselected-color'])};
      }

      /* filledIconButtonColors. */
      :host([variant='filled']) {
        --_off-container: ${unsafeCSS(filled['container-color'])};
        --_off-content: ${unsafeCSS(filled['color'])};
        --_disabled-container: ${alpha(
          filled['disabled-container-color'],
          filled['disabled-container-opacity'],
        )};
        --_disabled-content: ${alpha(filled['disabled-color'], filled['disabled-opacity'])};
      }

      /* filledIconToggleButtonColors. */
      :host([variant='filled'][toggle]) {
        --_off-container: ${unsafeCSS(filled['unselected-container-color'])};
        --_off-content: ${unsafeCSS(filled['unselected-color'])};
        --_checked-container: ${unsafeCSS(filled['selected-container-color'])};
        --_checked-content: ${unsafeCSS(filled['selected-color'])};
      }

      /* filledTonalIconButtonColors. */
      :host([variant='tonal']) {
        --_off-container: ${unsafeCSS(tonal['container-color'])};
        --_off-content: ${unsafeCSS(tonal['color'])};
        --_disabled-container: ${alpha(
          tonal['disabled-container-color'],
          tonal['disabled-container-opacity'],
        )};
        --_disabled-content: ${alpha(tonal['disabled-color'], tonal['disabled-opacity'])};
      }

      /* filledTonalIconToggleButtonColors. */
      :host([variant='tonal'][toggle]) {
        --_off-container: ${unsafeCSS(tonal['unselected-container-color'])};
        --_off-content: ${unsafeCSS(tonal['unselected-color'])};
        --_checked-container: ${unsafeCSS(tonal['selected-container-color'])};
        --_checked-content: ${unsafeCSS(tonal['selected-color'])};
      }

      /*
       * outlinedIconButtonColors and outlinedIconButtonBorder: the
       * surrounding content color for the icon and the outline. The toggle
       * (outlinedIconToggleButtonColors) is on in inverse surface, with
       * contentColorFor it. Upstream reads the standard toggle's color cache
       * here by mistake, so on Android it can show the standard toggle's
       * colors instead; these are the colors it means.
       */
      :host([variant='outlined']) {
        --_disabled-content: ${alpha('currentColor', outlined['disabled-opacity'])};
        --_outline: currentColor;
        --_disabled-outline: currentColor;
        --_checked-container: ${unsafeCSS(outlined['selected-container-color'])};
        --_checked-content: var(--md-sys-color-inverse-on-surface);
      }

      /* outlinedIconButtonVibrantColors and outlinedIconButtonVibrantBorder. */
      :host([variant='outlined']:is([vibrant], [toggle][morph])) {
        --_off-content: ${unsafeCSS(outlined['color'])};
        --_disabled-content: ${alpha(outlined['disabled-color'], outlined['disabled-opacity'])};
        --_outline: ${unsafeCSS(outlined['outline-color'])};
        --_disabled-outline: ${alpha(outlined['outline-color'], outlined['disabled-opacity'])};
      }

      /* outlinedIconToggleButtonVibrantColors. */
      :host([variant='outlined'][toggle]:is([vibrant], [morph])) {
        --_off-content: ${unsafeCSS(outlined['unselected-color'])};
        --_checked-content: ${unsafeCSS(outlined['selected-color'])};
      }

      :host([aria-disabled='true']) {
        cursor: default;
      }

      /* The size's container size (see sizeStyles). */
      .button {
        position: relative;
        display: inline-grid;
        place-items: center;
        box-sizing: border-box;
        /* In a button group: the width the group gives it. */
        width: var(--rx-button-group-width, var(--_width));
        height: var(--_height);
        border-radius: var(--_shape);
        background: var(--_off-container);
        color: var(--_off-content);
      }

      /* IconToggleButtonColors: disabled, else checked, else the off colors. */
      :host([toggle][checked]:not([aria-disabled='true'])) .button {
        background: var(--_checked-container);
        color: var(--_checked-content);
      }

      :host([aria-disabled='true']) .button {
        background: var(--_disabled-container);
        color: var(--_disabled-content);
      }

      /* The outline, drawn over the container as Modifier.border. */
      .button::before {
        content: '';
        position: absolute;
        inset: 0;
        border: ${unsafeCSS(small['outlined-outline-width'])} solid var(--_outline);
        border-radius: inherit;
        pointer-events: none;
      }

      :host([aria-disabled='true']) .button::before {
        border-color: var(--_disabled-outline);
      }

      /* outlinedIconToggleButtonBorder: no outline when on. */
      :host([variant='outlined'][toggle][checked]) .button::before {
        border-color: transparent;
      }

      /* The size's icon size (extraSmallIconSize to extraLargeIconSize). */
      ::slotted(*) {
        --rx-icon-size: var(--_icon-size);
      }

      @media (forced-colors: active) {
        .button::before {
          border-color: ButtonText;
        }
        :host([toggle][checked]) .button {
          outline: 2px solid ButtonText;
          outline-offset: -2px;
        }
        :host([aria-disabled='true']) .button {
          color: GrayText;
        }
      }
    `,
    sizeStyles(),
  ];

  /** @internal The shape morph's state, for tests. */
  get shapeState() {
    return this.shapeMorph.shapeState;
  }

  override connectedCallback() {
    super.connectedCallback();
    // As a native checkbox, the `checked` attribute it starts with is its default.
    this.defaultChecked ??= this.hasAttribute('checked');
  }

  formValue() {
    if (!this.toggle) return {value: null};
    return {value: this.checked ? this.value || 'on' : null, state: String(this.checked)};
  }

  formReset() {
    if (this.toggle) this.checked = this.defaultChecked ?? false;
  }

  formRestore(state: unknown) {
    if (this.toggle) this.checked = state === 'true';
  }

  private readonly onClick = (event: MouseEvent) => {
    if (this.isDisabled || event.defaultPrevented) return;
    if (this.toggle) {
      // onCheckedChange(!checked).
      this.checked = !this.checked;
      this.dispatchEvent(new Event('input', {bubbles: true, composed: true}));
      this.dispatchEvent(new Event('change', {bubbles: true}));
    } else if (this.type === 'submit') {
      submitForm(this, {name: this.name, value: this.value});
    } else if (this.type === 'reset') {
      resetForm(this);
    }
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
  }

  protected override render() {
    return html`<div class="button" part="button">
      <rx-ripple></rx-ripple>
      <rx-focus-ring></rx-focus-ring>
      <slot></slot>
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'rx-icon-button': RxIconButton;
  }
}
