/*
 * Ported by hand from androidx/compose/material3 SplitButton.kt
 * (SplitButtonLayout, SplitButtonDefaults: LeadingButton, TrailingButton
 * and their Tonal, Outlined and Elevated versions, the shapes, paddings and
 * icon sizes for each height, SplitButtonShapes and shapeByInteraction),
 * HorizontalCenterOptically.kt and internal/AnimatedShape.kt (the optical
 * offset of the morphing shape), with Button.kt's colors and elevations and
 * the tokens SplitButtonXSmallTokens to SplitButtonXLargeTokens, the
 * Filled, FilledTonal, Elevated and Outlined button tokens and StateTokens.
 * The rotating chevron is from the SplitButton samples.
 * Copyright 2024-2025 The Android Open Source Project. Licensed under the Apache License 2.0.
 */

import elevated from '@rx-m3e/tokens/js/elevated-button.js';
import filled from '@rx-m3e/tokens/js/filled-button.js';
import tonal from '@rx-m3e/tokens/js/filled-tonal-button.js';
import outlined from '@rx-m3e/tokens/js/outlined-button.js';
import small from '@rx-m3e/tokens/js/button-small.js';
import splitLarge from '@rx-m3e/tokens/js/split-button-large.js';
import splitMedium from '@rx-m3e/tokens/js/split-button-medium.js';
import splitSmall from '@rx-m3e/tokens/js/split-button-small.js';
import splitXLarge from '@rx-m3e/tokens/js/split-button-x-large.js';
import splitXSmall from '@rx-m3e/tokens/js/split-button-x-small.js';
import {LitElement, css, html, nothing, unsafeCSS, type PropertyValues} from 'lit';
import {customElement, property, query} from 'lit/decorators.js';
import {buttonSizeStyles, type ButtonSize} from '../button/size-styles.js';
import '../elevation/elevation.js';
import {elevationShadow} from '../elevation/elevation.js';
import '../focus/focus-ring.js';
import type {RxFocusRing} from '../focus/focus-ring.js';
import {addActivation} from '../internals/activation.js';
import type {CornerShape} from '../internals/animated-shape.js';
import {cornerSizeToPx} from '../internals/animated-shape.js';
import {
  InteractionElevationController,
  type InteractionElevations,
} from '../internals/interaction-elevation.js';
import {InteractionShapeController} from '../internals/interaction-shape.js';
import {trackPress, type PressTracker} from '../internals/press-interaction.js';
import {minimumInteractiveComponentSize} from '../internals/touch-target.js';
import {Animatable} from '../motion/animatable.js';
import {motionSpring, spring} from '../motion/motion-scheme.js';
import '../ripple/ripple.js';
import type {RxRipple} from '../ripple/ripple.js';

/**
 * The four split buttons: SplitButtonDefaults' LeadingButton and
 * TrailingButton (filled) and their Tonal, Elevated and Outlined versions.
 */
export type SplitButtonVariant = 'filled' | 'tonal' | 'elevated' | 'outlined';

/** internal/AnimatedShape.kt and HorizontalCenterOptically.kt: CenterOpticallyCoefficient. */
const CenterOpticallyCoefficient = Math.fround(0.11);

const SIZES: [ButtonSize, Readonly<Record<string, string>>][] = [
  ['xs', splitXSmall],
  ['s', splitSmall],
  ['m', splitMedium],
  ['l', splitLarge],
  ['xl', splitXLarge],
];

/**
 * Each size: leading/trailingButtonContentPaddingFor, trailingButtonIconSizeFor
 * and the inner corner sizes of leading/trailingButtonShapesFor. (The
 * height, the leading icon size and spacing and the text style come from
 * ButtonDefaults, as in the size samples.)
 */
function sizeStyles() {
  return unsafeCSS(
    SIZES.map(
      ([size, t]) => `
        :host([size='${size}']) {
          --_leading-start: ${t['leading-button-leading-space']};
          --_leading-end: ${t['leading-button-trailing-space']};
          --_trailing-start: ${t['trailing-button-leading-space']};
          --_trailing-end: ${t['trailing-button-trailing-space']};
          --_trailing-icon-size: ${t['trailing-icon-size']};
          --_inner: ${t['inner-corner-corner-size']};
          --_inner-pressed: ${t['inner-pressed-corner-corner-size']};
          --_spacing: ${t['between-space']};
        }`,
    ).join('\n'),
  );
}

/**
 * A Material 3 Expressive split button, as Compose's SplitButtonLayout with
 * SplitButtonDefaults' LeadingButton and checkable TrailingButton: a main
 * action and, 2dp away, a button that opens more (a menu).
 *
 * The two halves share the outer full corners; their inner corners grow
 * when pressed, and the trailing one turns fully round when checked, with
 * its chevron turned over. The halves are buttons for assistive technology;
 * the trailing one says expanded or collapsed (`checked`).
 *
 * @example
 * <rx-split-button trailing-label="More options">
 *   <rx-icon slot="icon">edit</rx-icon>Edit
 * </rx-split-button>
 *
 * @slot - The leading button's label.
 * @slot icon - The leading button's icon.
 * @slot trailing - The trailing button's content (a down chevron by default).
 * @csspart leading - The leading button.
 * @csspart trailing - The trailing button.
 * @fires leading-click - When the leading button is clicked.
 * @fires input - When the trailing button toggles `checked`.
 * @fires change - When the trailing button toggles `checked`.
 */
@customElement('rx-split-button')
export class RxSplitButton extends LitElement {
  /** Which of the four split buttons. Defaults to filled. */
  @property({reflect: true}) variant: SplitButtonVariant = 'filled';

  /** Extra small to extra large. Defaults to small. */
  @property({reflect: true}) size: ButtonSize = 's';

  /** Whether the trailing button is checked (its menu open). */
  @property({type: Boolean, reflect: true}) checked = false;

  /** Both buttons disabled. */
  @property({type: Boolean, reflect: true}) disabled = false;

  /** The trailing button's name for assistive technology (its contentDescription). */
  @property({attribute: 'trailing-label'}) trailingLabel = '';

  @query('.leading') private leading!: HTMLElement;
  @query('.trailing') private trailing!: HTMLElement;
  @query('.trailing-content') private trailingContent!: HTMLElement;
  @query('.chevron') private chevron!: HTMLElement;

  private leadingPress: PressTracker | null = null;
  private trailingPress: PressTracker | null = null;
  // The sample's animateFloatAsState(if (checked) 180f else 0f): the default spring.
  private readonly rotation = new Animatable(0);
  private rotationTarget: number | null = null;
  private readonly leadingShape: InteractionShapeController;
  private readonly trailingShape: InteractionShapeController;

  constructor() {
    super();
    // shapeByInteraction: pressed, then checked; no key, so new shapes
    // (another size) morph on too; DefaultEffects, "to prevent any bounce".
    const spec = () => motionSpring(this, 'defaultEffects');
    this.leadingShape = new InteractionShapeController(this, {
      container: () => this.leading,
      shapes: ['--_leading-shape', '--_leading-pressed-shape'],
      current: () => (this.leadingPress?.pressed ? 1 : 0),
      spec,
      keyed: false,
    });
    this.trailingShape = new InteractionShapeController(this, {
      container: () => this.trailing,
      shapes: ['--_trailing-shape', '--_trailing-pressed-shape', '--_trailing-checked-shape'],
      current: () => (this.trailingPress?.pressed ? 1 : this.checked ? 2 : 0),
      spec,
      keyed: false,
      onDraw: (shape, width, height) => this.centerOptically(shape, width, height),
    });
    for (const part of ['leading', 'trailing'] as const) {
      new InteractionElevationController(this, {
        target: () => this[part],
        source: () => this[part],
        elevations: () => this.elevations,
        enabled: () => !this.disabled,
      });
    }
  }

  static override styles = [
    minimumInteractiveComponentSize,
    css`
      :host {
        position: relative;
        vertical-align: middle;
        -webkit-tap-highlight-color: transparent;

        /* Filled: ButtonDefaults.buttonColors and buttonElevation. */
        --_container: ${unsafeCSS(filled['container-color'])};
        --_content: ${unsafeCSS(filled['label-text-color'])};
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
        --_outline: transparent;
        --_elevation: ${unsafeCSS(filled['container-elevation'])};
        --_elevation-pressed: ${unsafeCSS(filled['pressed-container-elevation'])};
        --_elevation-focused: ${unsafeCSS(filled['focused-container-elevation'])};
        --_elevation-hovered: ${unsafeCSS(filled['hovered-container-elevation'])};
        --_elevation-disabled: ${unsafeCSS(filled['disabled-container-elevation'])};

        /*
         * leading/trailingButtonShapesFor: the outer corners are
         * OuterCornerSize, ShapeDefaults.CornerFull (CornerSize(100)), the
         * inner ones the size's inner corner size; checked, the trailing
         * button is CircleShape.
         */
        --_leading-shape: 100% var(--_inner) var(--_inner) 100%;
        --_leading-pressed-shape: 100% var(--_inner-pressed) var(--_inner-pressed) 100%;
        --_trailing-shape: var(--_inner) 100% 100% var(--_inner);
        --_trailing-pressed-shape: var(--_inner-pressed) 100% 100% var(--_inner-pressed);
        --_trailing-checked-shape: var(--md-sys-shape-corner-full);
      }

      /* TonalLeading/TrailingButton: filledTonalButtonColors and Elevation. */
      :host([variant='tonal']) {
        --_container: ${unsafeCSS(tonal['container-color'])};
        --_content: ${unsafeCSS(tonal['label-text-color'])};
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
        --_elevation: ${unsafeCSS(tonal['container-elevation'])};
        --_elevation-pressed: ${unsafeCSS(tonal['pressed-container-elevation'])};
        --_elevation-focused: ${unsafeCSS(tonal['focus-container-elevation'])};
        --_elevation-hovered: ${unsafeCSS(tonal['hover-container-elevation'])};
        --_elevation-disabled: 0px;
      }

      /* ElevatedLeading/TrailingButton: elevatedButtonColors and Elevation. */
      :host([variant='elevated']) {
        --_container: ${unsafeCSS(elevated['container-color'])};
        --_content: ${unsafeCSS(elevated['label-text-color'])};
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

      /* OutlinedLeading/TrailingButton: outlinedButtonColors and Border; no elevation. */
      :host([variant='outlined']) {
        --_container: transparent;
        --_content: ${unsafeCSS(outlined['label-text-color'])};
        --_disabled-container: transparent;
        --_disabled-content: color-mix(
          in srgb,
          ${unsafeCSS(outlined['disabled-label-text-color'])}
            calc(${unsafeCSS(outlined['disabled-label-text-opacity'])} * 100%),
          transparent
        );
        --_outline: ${unsafeCSS(outlined['outline-color'])};
        --_elevation: none;
      }

      :host([disabled]) {
        --_container: var(--_disabled-container);
        --_content: var(--_disabled-content);
      }

      :host([variant='outlined'][disabled]) {
        --_outline: color-mix(
          in srgb,
          ${unsafeCSS(outlined['outline-color'])}
            calc(${unsafeCSS(outlined['disabled-container-opacity'])} * 100%),
          transparent
        );
      }

      /*
       * SplitButtonLayout: the two buttons Spacing apart, at the same height
       * (the taller one's); the trailing button gets its width first. The
       * minimum touch target is on the whole layout, not on each button.
       */
      .layout {
        display: flex;
        align-items: stretch;
        gap: var(--_spacing);
        min-width: 0;
        max-width: 100%;
        /* Wider than its content, the layout places the buttons from the start. */
        justify-self: start;
      }

      .part {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        box-sizing: border-box;
        /* defaultMinSize: 48dp wide (Leading/TrailingButtonMinWidth), the size's height. */
        min-width: 48px;
        min-height: var(--_height);
        background: var(--_container);
        color: var(--_content);
        font: var(--_type-weight) var(--_type-size) / var(--_type-line-height) var(--_type-font);
        letter-spacing: var(--_type-tracking);
        text-align: center;
        cursor: pointer;
        outline: none;
        --rx-elevation: 0px;
        ${elevationShadow}
      }

      :host([disabled]) .part {
        cursor: default;
      }

      .leading {
        flex: 0 1 auto;
        min-width: 48px;
        padding-inline: var(--_leading-start) var(--_leading-end);
        border-radius: var(--_leading-shape);
      }

      .trailing {
        flex: none;
        padding-inline: var(--_trailing-start) var(--_trailing-end);
        border-radius: var(--_trailing-shape);
      }

      /* The outline, drawn over the container as Modifier.border. */
      .part::before {
        content: '';
        position: absolute;
        inset: 0;
        border: ${unsafeCSS(small['outlined-outline-width'])} solid var(--_outline);
        border-radius: inherit;
        pointer-events: none;
      }

      /*
       * Checked, TrailingButton draws its outline over the content in the
       * content color at PressedStateLayerOpacity.
       */
      .trailing::after {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: inherit;
        background: currentColor;
        opacity: 0;
        pointer-events: none;
      }

      :host([checked]) .trailing::after {
        opacity: var(--md-sys-state-pressed-state-layer-opacity);
      }

      /* The leading icon (leadingButtonIconSizeFor) and its spacing. */
      ::slotted([slot='icon']) {
        --rx-icon-size: var(--_icon-size);
        width: var(--_icon-size);
        height: var(--_icon-size);
        flex: none;
        margin-inline-end: var(--_icon-space);
      }

      slot[name='icon'] {
        display: contents;
      }

      /*
       * The leading button gets the width the trailing one leaves; its label
       * wraps in it, and both buttons grow to the taller height.
       */
      .label {
        min-width: 0;
      }

      .trailing-content,
      .chevron {
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }

      /*
       * placeRelative: the optical offset is toward the end, mirrored in
       * right-to-left text (in CSS, so it follows a change of direction).
       */
      .trailing-content {
        translate: calc(var(--_nudge, 0px) * var(--_dir)) 0;
      }

      :host {
        --_dir: 1;
      }

      :host(:dir(rtl)) {
        --_dir: -1;
      }

      /* trailingButtonIconSizeFor. */
      .chevron {
        --rx-icon-size: var(--_trailing-icon-size);
        width: var(--_trailing-icon-size);
        height: var(--_trailing-icon-size);
      }

      .chevron svg {
        width: 100%;
        height: 100%;
        fill: currentColor;
      }

      @media (forced-colors: active) {
        .part::before {
          border-color: ButtonText;
        }
        :host([disabled]) .part {
          color: GrayText;
        }
      }
    `,
    buttonSizeStyles,
    sizeStyles(),
  ];

  /** The elevations in dp (ButtonElevation of the variant); null for outlined. */
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

  /** @internal The trailing button's shape morph, for tests. */
  get trailingShapeState() {
    return this.trailingShape.shapeState;
  }

  /** @internal The chevron's rotation in degrees, for tests. */
  get chevronRotation() {
    return this.rotation.value;
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.leadingPress?.dispose();
    this.trailingPress?.dispose();
    this.leadingPress = this.trailingPress = null;
    this.rotation.stop();
  }

  protected override firstUpdated() {
    for (const part of [this.leading, this.trailing]) {
      const ripple = part.querySelector('rx-ripple') as RxRipple | null;
      const ring = part.querySelector('rx-focus-ring') as RxFocusRing | null;
      if (ripple) ripple.controlElement = part;
      if (ring) ring.controlElement = part;
      addActivation(part, {kind: 'button', isDisabled: () => this.disabled});
    }
    this.leading.addEventListener('click', this.onLeadingClick);
    this.trailing.addEventListener('click', this.onTrailingClick);
  }

  protected override updated(changed: PropertyValues<this>) {
    super.updated(changed);
    this.leadingPress ??= trackPress(this.leading, {
      enabled: () => !this.disabled,
      onChange: () => this.leadingShape.update(),
    });
    this.trailingPress ??= trackPress(this.trailing, {
      enabled: () => !this.disabled,
      onChange: () => this.trailingShape.update(),
    });
    if (this.disabled) {
      this.leadingPress.cancel();
      this.trailingPress.cancel();
    }
    for (const part of [this.leading, this.trailing]) {
      const ripple = part.querySelector('rx-ripple') as RxRipple | null;
      if (ripple) ripple.disabled = this.disabled;
    }
    this.rotate();
  }

  // addActivation swallows a disabled control's clicks before these run.
  private readonly onLeadingClick = () => {
    this.dispatchEvent(new Event('leading-click', {bubbles: true, composed: true}));
  };

  private readonly onTrailingClick = (event: MouseEvent) => {
    if (event.defaultPrevented) return;
    // onCheckedChange(!checked).
    this.checked = !this.checked;
    this.dispatchEvent(new Event('input', {bubbles: true, composed: true}));
    this.dispatchEvent(new Event('change', {bubbles: true}));
  };

  // The chevron turns over when checked (animateFloatAsState, default spring).
  private rotate() {
    const target = this.checked ? 180 : 0;
    if (this.rotationTarget === target) return;
    const first = this.rotationTarget === null;
    this.rotationTarget = target;
    const draw = () => (this.chevron.style.rotate = `${this.rotation.value}deg`);
    if (first) {
      this.rotation.snapTo(target);
      draw();
      return;
    }
    void this.rotation.animateTo(target, spring(), undefined, draw);
  }

  /**
   * HorizontalCenterOptically with the morphing shape's offset: the
   * trailing content moves by CenterOpticallyCoefficient times the
   * difference of the start and end corners (each held to 0..height/2),
   * at most the padding on either side.
   */
  private centerOptically(shape: CornerShape, width: number, height: number) {
    const f = Math.fround;
    const corner = (key: keyof CornerShape) =>
      Math.min(Math.max(f(cornerSizeToPx(shape[key], width, height)), 0), f(height / 2));
    const avgStart = f(f(corner('topStart') + corner('bottomStart')) / 2);
    const avgEnd = f(f(corner('topEnd') + corner('bottomEnd')) / 2);
    const offset = f(CenterOpticallyCoefficient * f(avgStart - avgEnd));
    const style = getComputedStyle(this);
    const maxStart = -parseFloat(style.getPropertyValue('--_trailing-start'));
    const maxEnd = parseFloat(style.getPropertyValue('--_trailing-end'));
    const x = Math.round(Math.min(Math.max(offset, maxStart), maxEnd));
    this.trailingContent.style.setProperty('--_nudge', `${x}px`);
  }

  protected override render() {
    const tabindex = this.disabled ? '-1' : '0';
    return html`<div class="layout">
      <div
        class="part leading"
        part="leading"
        role="button"
        tabindex=${tabindex}
        aria-disabled=${this.disabled ? 'true' : 'false'}
      >
        <rx-ripple></rx-ripple>
        <rx-focus-ring></rx-focus-ring>
        <slot name="icon"></slot>
        <span class="label"><slot></slot></span>
      </div>
      <div
        class="part trailing"
        part="trailing"
        role="button"
        tabindex=${tabindex}
        aria-disabled=${this.disabled ? 'true' : 'false'}
        aria-expanded=${this.checked ? 'true' : 'false'}
        aria-label=${this.trailingLabel || nothing}
      >
        <rx-ripple></rx-ripple>
        <rx-focus-ring></rx-focus-ring>
        <span class="trailing-content"
          ><span class="chevron"
            ><slot name="trailing"
              ><svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z" /></svg></slot></span
        ></span>
      </div>
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'rx-split-button': RxSplitButton;
  }
}
