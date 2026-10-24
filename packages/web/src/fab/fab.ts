/*
 * Ported by hand from androidx/compose/material3 FloatingActionButton.kt
 * (FloatingActionButton, SmallFloatingActionButton,
 * MediumFloatingActionButton, LargeFloatingActionButton,
 * FloatingActionButtonDefaults' shapes, icon sizes, containerColor,
 * elevation and loweredElevation) with Surface.kt (the clickable Surface it
 * is drawn on) and the tokens FabBaselineTokens, FabSmallTokens,
 * FabMediumTokens, FabLargeTokens, FabPrimaryContainerTokens,
 * FabSecondaryContainerTokens and ExtendedFabPrimaryTokens. The colors other than the default come from MDC
 * Android's FAB styles (floatingactionbutton/res/values/styles.xml and
 * fab_tokens.xml).
 * Copyright 2021-2025 The Android Open Source Project. Licensed under the Apache License 2.0.
 */

import baseline from '@rx-m3e/tokens/js/fab-baseline.js';
import large from '@rx-m3e/tokens/js/fab-large.js';
import medium from '@rx-m3e/tokens/js/fab-medium.js';
import primaryContainer from '@rx-m3e/tokens/js/fab-primary-container.js';
import secondaryContainer from '@rx-m3e/tokens/js/fab-secondary-container.js';
import small from '@rx-m3e/tokens/js/fab-small.js';
import label from '@rx-m3e/tokens/js/extended-fab-primary.js';
import {LitElement, css, html, unsafeCSS} from 'lit';
import {customElement, property, query} from 'lit/decorators.js';
import '../elevation/elevation.js';
import {elevationShadow} from '../elevation/elevation.js';
import '../focus/focus-ring.js';
import type {RxFocusRing} from '../focus/focus-ring.js';
import {addActivation} from '../internals/activation.js';
import {ComposeRole, HostSemanticsController} from '../internals/host-semantics.js';
import {
  InteractionElevationController,
  type InteractionElevations,
} from '../internals/interaction-elevation.js';
import {minimumInteractiveComponentSize} from '../internals/touch-target.js';
import '../ripple/ripple.js';
import type {RxRipple} from '../ripple/ripple.js';

/**
 * SmallFloatingActionButton (the older, 40dp one), FloatingActionButton
 * (baseline, 56dp), MediumFloatingActionButton (80dp, M3 Expressive) and
 * LargeFloatingActionButton (96dp).
 */
export type FabSize = 'small' | 'baseline' | 'medium' | 'large';

/**
 * The FAB colors: M3 Expressive's six (MDC's FloatingActionButton styles),
 * primary container by default, and baseline M3's surface FAB.
 */
export type FabColor =
  | 'primary-container'
  | 'secondary-container'
  | 'tertiary-container'
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'surface';

/** [container, content] for each color, as MDC's fab_tokens.xml pairs them. */
const COLORS: Record<FabColor, [string, string]> = {
  'primary-container': [primaryContainer['container-color'], primaryContainer['icon-color']],
  'secondary-container': [secondaryContainer['container-color'], secondaryContainer['icon-color']],
  'tertiary-container': [
    'var(--md-sys-color-tertiary-container)',
    'var(--md-sys-color-on-tertiary-container)',
  ],
  primary: ['var(--md-sys-color-primary)', 'var(--md-sys-color-on-primary)'],
  secondary: ['var(--md-sys-color-secondary)', 'var(--md-sys-color-on-secondary)'],
  tertiary: ['var(--md-sys-color-tertiary)', 'var(--md-sys-color-on-tertiary)'],
  surface: ['var(--md-sys-color-surface-container-high)', 'var(--md-sys-color-primary)'],
};

const colorRules = Object.entries(COLORS)
  .map(
    ([name, [container, content]]) =>
      `:host([color='${name}']) { --_container: ${container}; --_content: ${content}; }`,
  )
  .join('\n');

/**
 * A Material 3 floating action button, as Compose's FloatingActionButton
 * family: the screen's main action, an icon on a raised container.
 *
 * `size` is `small` (the older 40dp FAB), `baseline` (56dp, the default),
 * `medium` (80dp) or `large` (96dp), each with its shape and icon size.
 * `color` is `primary-container` (the default), `secondary-container`,
 * `tertiary-container`, `primary`, `secondary`, `tertiary` or `surface`.
 * It sits at elevation level 3 and rises to level 4 under the pointer;
 * `lowered` uses loweredElevation (level 1, level 2 hovered).
 *
 * Give it a name for assistive technology: a `label` on its `rx-icon`, or
 * `aria-label`. It is a plain button: it fires `click` and is not a form
 * control.
 *
 * @example
 * <rx-fab><rx-icon label="Compose">edit</rx-icon></rx-fab>
 * <rx-fab size="large" color="tertiary"><rx-icon label="Add">add</rx-icon></rx-fab>
 *
 * @slot - The icon.
 * @csspart fab - The container.
 * @cssprop --rx-fab-container-color - The container color, overriding `color`.
 * @cssprop --rx-fab-content-color - The icon color, overriding `color`.
 * @cssprop --rx-fab-shape - The corner radius, overriding the size's shape.
 */
@customElement('rx-fab')
export class RxFab extends LitElement {
  /** Small (40dp), baseline (56dp, the default), medium (80dp) or large (96dp). */
  @property({reflect: true}) size: FabSize = 'baseline';

  /** The container color, with its matching content color. Defaults to primary container. */
  @property({reflect: true}) color: FabColor = 'primary-container';

  /** FloatingActionButtonDefaults.loweredElevation: level 1, level 2 when hovered. */
  @property({type: Boolean, reflect: true}) lowered = false;

  @query('.fab') private fabEl?: HTMLElement;
  @query('rx-ripple') private ripple?: RxRipple;
  @query('rx-focus-ring') private focusRing?: RxFocusRing;

  constructor() {
    super();
    addActivation(this, {kind: 'button', isDisabled: () => false});
    new HostSemanticsController(this, () => ({role: ComposeRole.Button}));
    new InteractionElevationController(this, {
      target: () => this.fabEl,
      elevations: () => this.elevations,
      enabled: () => true,
      trackLastInteraction: true,
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

        /* FloatingActionButtonDefaults.containerColor and contentColorFor it. */
        --_container: ${unsafeCSS(primaryContainer['container-color'])};
        --_content: ${unsafeCSS(primaryContainer['icon-color'])};
        /* FloatingActionButtonDefaults.elevation(). */
        --_elevation: ${unsafeCSS(primaryContainer['container-elevation'])};
        --_elevation-pressed: ${unsafeCSS(primaryContainer['pressed-container-elevation'])};
        --_elevation-focused: ${unsafeCSS(primaryContainer['focused-container-elevation'])};
        --_elevation-hovered: ${unsafeCSS(primaryContainer['hovered-container-elevation'])};
        /* FloatingActionButton: FabBaselineTokens' size and shape, 24dp icons. */
        --_size: ${unsafeCSS(baseline['container-width'])};
        --_shape: ${unsafeCSS(baseline['container-shape'])};
        --_icon-size: ${unsafeCSS(baseline['icon-size'])};
      }

      ${unsafeCSS(colorRules)}

      /* loweredElevation: Level1 at rest, pressed and focused; Level2 hovered. */
      :host([lowered]) {
        --_elevation: var(--md-sys-elevation-level1);
        --_elevation-pressed: var(--md-sys-elevation-level1);
        --_elevation-focused: var(--md-sys-elevation-level1);
        --_elevation-hovered: var(--md-sys-elevation-level2);
      }

      :host([size='small']) {
        --_size: ${unsafeCSS(small['container-width'])};
        --_shape: ${unsafeCSS(small['container-shape'])};
        --_icon-size: ${unsafeCSS(small['icon-size'])};
      }

      /* mediumShape is ShapeDefaults.LargeIncreased; MediumIconSize. */
      :host([size='medium']) {
        --_size: ${unsafeCSS(medium['container-width'])};
        --_shape: ${unsafeCSS(medium['container-shape'])};
        --_icon-size: ${unsafeCSS(medium['icon-size'])};
      }

      /* LargeIconSize is 36dp: Compose overrides the token (32dp) as incorrect. */
      :host([size='large']) {
        --_size: ${unsafeCSS(large['container-width'])};
        --_shape: ${unsafeCSS(large['container-shape'])};
        --_icon-size: 36px;
      }

      /*
       * The Surface and its Box: at least the size's width and height, the
       * content centered, in the extended FAB's label style.
       */
      .fab {
        position: relative;
        display: grid;
        place-items: center;
        box-sizing: border-box;
        min-width: var(--_size);
        min-height: var(--_size);
        border-radius: var(--rx-fab-shape, var(--_shape));
        background: var(--rx-fab-container-color, var(--_container));
        color: var(--rx-fab-content-color, var(--_content));
        font: ${unsafeCSS(label['label-text-weight'])} ${unsafeCSS(label['label-text-size'])} /
          ${unsafeCSS(label['label-text-line-height'])} ${unsafeCSS(label['label-text-font'])};
        letter-spacing: ${unsafeCSS(label['label-text-tracking'])};
        --rx-elevation: 0px;
        ${elevationShadow}
      }

      ::slotted(*) {
        --rx-icon-size: var(--_icon-size);
      }

      @media (forced-colors: active) {
        .fab {
          border: 1px solid ButtonText;
        }
      }
    `,
  ];

  /** The elevations in dp it moves between, from the tokens. */
  get elevations(): InteractionElevations {
    const style = getComputedStyle(this);
    const dp = (name: string) => parseFloat(style.getPropertyValue(name)) || 0;
    const rest = dp('--_elevation');
    return {
      default: rest,
      pressed: dp('--_elevation-pressed'),
      focused: dp('--_elevation-focused'),
      hovered: dp('--_elevation-hovered'),
      // A FAB is never disabled.
      disabled: rest,
    };
  }

  protected override firstUpdated() {
    // The ripple and focus ring sit in the container but follow the host,
    // which takes the focus and the clicks (48dp touch target).
    if (this.ripple) this.ripple.controlElement = this;
    if (this.focusRing) this.focusRing.controlElement = this;
  }

  protected override render() {
    return html`<div class="fab" part="fab">
      <rx-ripple></rx-ripple>
      <rx-focus-ring></rx-focus-ring>
      <slot></slot>
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'rx-fab': RxFab;
  }
}
