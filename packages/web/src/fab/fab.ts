/*
 * Ported by hand from androidx/compose/material3 FloatingActionButton.kt
 * (FloatingActionButton, SmallFloatingActionButton,
 * MediumFloatingActionButton, LargeFloatingActionButton, the
 * ExtendedFloatingActionButton family with their private layouts,
 * extendedFabExpandAnimation and extendedFabCollapseAnimation, the private
 * extended FAB paddings and text styles, FloatingActionButtonDefaults'
 * shapes, icon sizes, containerColor, elevation and loweredElevation) with
 * Surface.kt (the clickable Surface it is drawn on), animation's
 * AnimatedVisibility expandHorizontally and shrinkHorizontally, and the
 * tokens FabBaselineTokens, FabSmallTokens, FabMediumTokens, FabLargeTokens,
 * FabPrimaryContainerTokens, FabSecondaryContainerTokens,
 * ExtendedFabPrimaryTokens and ExtendedFabSmallTokens to
 * ExtendedFabLargeTokens. The colors other than the default come from MDC
 * Android's FAB styles (floatingactionbutton/res/values/styles.xml and
 * fab_tokens.xml).
 * Copyright 2021-2025 The Android Open Source Project. Licensed under the Apache License 2.0.
 */

import extendedLarge from '@rx-m3e/tokens/js/extended-fab-large.js';
import extendedMedium from '@rx-m3e/tokens/js/extended-fab-medium.js';
import label from '@rx-m3e/tokens/js/extended-fab-primary.js';
import extendedSmall from '@rx-m3e/tokens/js/extended-fab-small.js';
import baseline from '@rx-m3e/tokens/js/fab-baseline.js';
import large from '@rx-m3e/tokens/js/fab-large.js';
import medium from '@rx-m3e/tokens/js/fab-medium.js';
import primaryContainer from '@rx-m3e/tokens/js/fab-primary-container.js';
import secondaryContainer from '@rx-m3e/tokens/js/fab-secondary-container.js';
import small from '@rx-m3e/tokens/js/fab-small.js';
import {LitElement, css, html, nothing, unsafeCSS, type PropertyValues} from 'lit';
import {customElement, property, query, state} from 'lit/decorators.js';
import {classMap} from 'lit/directives/class-map.js';
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
import {Animatable} from '../motion/animatable.js';
import {motionSpring} from '../motion/motion-scheme.js';
import '../ripple/ripple.js';
import type {RxRipple} from '../ripple/ripple.js';

/**
 * SmallFloatingActionButton (the older, 40dp one), FloatingActionButton
 * (baseline, 56dp), MediumFloatingActionButton (80dp, M3 Expressive) and
 * LargeFloatingActionButton (96dp). With a label: ExtendedFloatingActionButton
 * (baseline) and the M3 Expressive Small (56dp), Medium (80dp) and Large
 * (96dp) ExtendedFloatingActionButton.
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

/** A typescale role as the font and letter spacing custom properties. */
const typescale = (role: string) => `
  --_type-weight: var(--md-sys-typescale-${role}-weight);
  --_type-size: var(--md-sys-typescale-${role}-size);
  --_type-line-height: var(--md-sys-typescale-${role}-line-height);
  --_type-font: var(--md-sys-typescale-${role}-font);
  --_type-tracking: var(--md-sys-typescale-${role}-tracking);`;

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
 * With a `label` it is an extended FAB: Compose's ExtendedFloatingActionButton
 * at the baseline size, and the M3 Expressive Small (56dp), Medium (80dp) and
 * Large (96dp) ExtendedFloatingActionButton for the others, with their
 * paddings and text styles. With an icon too, `collapsed` (Compose's
 * `expanded = false`) folds it to the icon alone: the baseline one slides
 * and fades the label out, the M3 Expressive ones spring their width.
 *
 * Give it a name for assistive technology: a `label` on its `rx-icon`, or
 * `aria-label`. As in Compose, an extended FAB's label names it only when
 * there is no icon. It is a plain button: it fires `click` and is not a
 * form control.
 *
 * @example
 * <rx-fab><rx-icon label="Compose">edit</rx-icon></rx-fab>
 * <rx-fab size="large" color="tertiary"><rx-icon label="Add">add</rx-icon></rx-fab>
 * <rx-fab label="Compose"><rx-icon label="Compose">edit</rx-icon></rx-fab>
 *
 * @slot - The icon.
 * @csspart fab - The container.
 * @cssprop --rx-fab-container-color - The container color, overriding `color`.
 * @cssprop --rx-fab-content-color - The icon and label color, overriding `color`.
 * @cssprop --rx-fab-shape - The corner radius, overriding the size's shape.
 */
@customElement('rx-fab')
export class RxFab extends LitElement {
  /** Small, baseline (the default), medium or large. */
  @property({reflect: true}) size: FabSize = 'baseline';

  /** The container color, with its matching content color. Defaults to primary container. */
  @property({reflect: true}) color: FabColor = 'primary-container';

  /** FloatingActionButtonDefaults.loweredElevation: level 1, level 2 when hovered. */
  @property({type: Boolean, reflect: true}) lowered = false;

  /** The text of an extended FAB. */
  @property() label = '';

  /** An extended FAB with an icon folded to the icon alone (Compose's `expanded = false`). */
  @property({type: Boolean, reflect: true}) collapsed = false;

  /** Compose's `expanded`: the opposite of `collapsed`. */
  get expanded(): boolean {
    return !this.collapsed;
  }

  set expanded(value: boolean) {
    this.collapsed = !value;
  }

  @state() private hasIcon = false;
  // The label is laid out (AnimatedVisibility's content, or not fullyCollapsed).
  @state() private textShown = true;

  @query('.fab') private fabEl?: HTMLElement;
  @query('.row') private rowEl?: HTMLElement;
  @query('.text-clip') private textClipEl?: HTMLElement;
  @query('.text') private textEl?: HTMLElement;
  @query('rx-ripple') private ripple?: RxRipple;
  @query('rx-focus-ring') private focusRing?: RxFocusRing;

  // Baseline: AnimatedVisibility's width (IntSize, rounded) and alpha.
  private readonly textWidth = new Animatable(0, {integer: 'size'});
  private readonly textAlpha = new Animatable(1);
  // M3 Expressive: the expand transition's width progress and label alpha.
  private readonly widthProgress = new Animatable(1);
  private readonly alphaProgress = new Animatable(1);
  private shownExpanded: boolean | null = null;

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
        /*
         * ProvideContentColorTextStyle: ExtendedFabPrimaryTokens' label (the
         * baseline FAB and extended FAB).
         */
        --_type-weight: ${unsafeCSS(label['label-text-weight'])};
        --_type-size: ${unsafeCSS(label['label-text-size'])};
        --_type-line-height: ${unsafeCSS(label['label-text-line-height'])};
        --_type-font: ${unsafeCSS(label['label-text-font'])};
        --_type-tracking: ${unsafeCSS(label['label-text-tracking'])};
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
       * The M3 Expressive extended FABs: the size's height (also the
       * minimum width), shape, leading and trailing space, the space between
       * icon and label, and text style. Medium and Large take Compose's
       * own icon padding (12dp and 16dp) over the tokens, which it marks as
       * incorrect.
       */
      .expressive.size-small {
        --_ext-height: ${unsafeCSS(extendedSmall['container-height'])};
        --_shape: ${unsafeCSS(extendedSmall['container-shape'])};
        --_leading: ${unsafeCSS(extendedSmall['leading-space'])};
        --_trailing: ${unsafeCSS(extendedSmall['trailing-space'])};
        --_icon-label: ${unsafeCSS(extendedSmall['icon-label-space'])};
        ${unsafeCSS(typescale('title-medium'))}
      }

      .expressive.size-medium {
        --_ext-height: ${unsafeCSS(extendedMedium['container-height'])};
        --_shape: ${unsafeCSS(extendedMedium['container-shape'])};
        --_leading: ${unsafeCSS(extendedMedium['leading-space'])};
        --_trailing: ${unsafeCSS(extendedMedium['trailing-space'])};
        --_icon-label: 12px;
        ${unsafeCSS(typescale('title-large'))}
      }

      .expressive.size-large {
        --_ext-height: ${unsafeCSS(extendedLarge['container-height'])};
        --_shape: ${unsafeCSS(extendedLarge['container-shape'])};
        --_leading: ${unsafeCSS(extendedLarge['leading-space'])};
        --_trailing: ${unsafeCSS(extendedLarge['trailing-space'])};
        --_icon-label: 16px;
        ${unsafeCSS(typescale('headline-small'))}
      }

      /*
       * The Surface and its Box: at least the size's width and height, the
       * content centered.
       */
      .fab {
        position: relative;
        display: grid;
        box-sizing: border-box;
        min-width: var(--_size);
        min-height: var(--_size);
        border-radius: var(--rx-fab-shape, var(--_shape));
        background: var(--rx-fab-container-color, var(--_container));
        color: var(--rx-fab-content-color, var(--_content));
        font: var(--_type-weight) var(--_type-size) / var(--_type-line-height) var(--_type-font);
        letter-spacing: var(--_type-tracking);
        --rx-elevation: 0px;
        ${elevationShadow}
      }

      /* The Surface clips its content to its shape. */
      .clip {
        display: grid;
        place-items: center;
        border-radius: inherit;
        overflow: hidden;
      }

      .row {
        display: flex;
        align-items: center;
        justify-content: center;
        box-sizing: border-box;
      }

      ::slotted(*) {
        --rx-icon-size: var(--_icon-size);
        flex: none;
      }

      .text-clip {
        display: flex;
        overflow: hidden;
        white-space: nowrap;
      }

      .text {
        display: flex;
        flex: none;
      }

      [hidden] {
        display: none !important;
      }

      /*
       * ExtendedFloatingActionButton (baseline): the Box at least 56dp each
       * way. The label alone: a Row at least 80dp wide with 20dp at the
       * sides, centered. With an icon, expanded: 16dp before the icon, 20dp
       * after the label, 12dp between, at least 80dp wide, from the start;
       * collapsed, no padding and at least 56dp (FabBaselineTokens), centered.
       */
      .baseline.fab {
        min-width: ${unsafeCSS(baseline['container-width'])};
        min-height: ${unsafeCSS(baseline['container-height'])};
      }

      .baseline .row {
        min-width: 80px;
        padding-inline: 20px;
      }

      .baseline.icon .row {
        justify-content: flex-start;
        padding-inline: 16px 20px;
      }

      .baseline.icon.collapsed .row {
        min-width: ${unsafeCSS(baseline['container-width'])};
        padding-inline: 0;
        justify-content: center;
      }

      .baseline.icon .text {
        padding-inline-start: 12px;
      }

      /*
       * The M3 Expressive extended FABs. The label alone: the Box at least
       * the height each way, the Row padded and centered. With an icon: no
       * Box minimum; the Row at least the height each way, padded, from the
       * start, laid out at its full width and shown at the width the expand
       * transition gives it (from script), clipped by the shape.
       */
      .expressive.fab {
        min-width: var(--_ext-height);
        min-height: var(--_ext-height);
      }

      .expressive .row {
        padding-inline: var(--_leading) var(--_trailing);
      }

      /* The Spacer between icon and label (none with the label alone). */
      .expressive.icon .text {
        padding-inline-start: var(--_icon-label);
      }

      .expressive.icon.fab {
        min-width: 0;
        min-height: 0;
      }

      .expressive.icon .clip {
        justify-items: start;
      }

      .expressive.icon .row {
        justify-content: flex-start;
        min-width: var(--_ext-height);
        min-height: var(--_ext-height);
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

  /** @internal The expand animations' state, for tests. */
  get expandState() {
    return {
      textShown: this.textShown,
      textWidth: this.textWidth.value,
      textAlpha: this.textAlpha.value,
      widthProgress: this.widthProgress.value,
      alphaProgress: this.alphaProgress.value,
    };
  }

  private get extendedKind(): 'baseline' | 'expressive' | null {
    if (!this.label) return null;
    return this.size === 'small' || this.size === 'medium' || this.size === 'large'
      ? 'expressive'
      : 'baseline';
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    for (const a of [this.textWidth, this.textAlpha, this.widthProgress, this.alphaProgress]) {
      a.stop();
    }
  }

  protected override willUpdate(changed: PropertyValues<this>) {
    super.willUpdate(changed);
    // Before the first render, so an icon counts from the start (the slot
    // reports it only after rendering).
    if (!this.hasUpdated) this.hasIcon = this.querySelector(':scope > :not([slot])') !== null;
  }

  protected override firstUpdated() {
    // The ripple and focus ring sit in the container but follow the host,
    // which takes the focus and the clicks (48dp touch target).
    if (this.ripple) this.ripple.controlElement = this;
    if (this.focusRing) this.focusRing.controlElement = this;
  }

  protected override updated(changed: PropertyValues<this>) {
    super.updated(changed);
    this.updateExpansion();
  }

  private onSlotChange(event: Event) {
    this.hasIcon = (event.target as HTMLSlotElement).assignedElements().length > 0;
  }

  /** Starts the expand or collapse animation when `collapsed` changes. */
  private updateExpansion() {
    const kind = this.extendedKind;
    // Only an extended FAB with an icon collapses.
    const expanded = !(kind && this.hasIcon && this.collapsed);
    const previous = this.shownExpanded;
    this.shownExpanded = expanded;
    if (previous === null || !kind || !this.hasIcon) {
      // The first state (or none to animate): no animation.
      for (const a of [this.textWidth, this.textAlpha, this.widthProgress, this.alphaProgress]) {
        a.snapTo(expanded ? 1 : 0);
      }
      this.textShown = expanded;
      this.drawExpansion();
      return;
    }
    if (previous === expanded) return;
    if (kind === 'baseline') void this.animateBaseline(expanded);
    else this.animateExpressive(expanded);
  }

  /**
   * ExtendedFloatingActionButton's AnimatedVisibility: expanding, fadeIn
   * (default effects) and expandHorizontally from the start (fast spatial);
   * collapsing, fadeOut (fast effects) and shrinkHorizontally towards the
   * start (default spatial). The width springs in whole pixels; the label
   * goes once both have finished.
   */
  private async animateBaseline(expanded: boolean) {
    const wasShown = this.textShown;
    // From nothing (the label wasn't there) or, below, from all of it. The
    // label is laid out before it is measured, within this task, so nothing
    // is painted in between.
    if (!this.textWidth.isRunning) this.textWidth.snapTo(0);
    this.textShown = true;
    await this.updateComplete;
    if (this.shownExpanded !== expanded) return;
    const full = Math.round(this.textEl?.getBoundingClientRect().width ?? 0);
    if (wasShown && !this.textWidth.isRunning) this.textWidth.snapTo(full);
    const draw = () => this.drawExpansion();
    const width = this.textWidth.animateTo(
      expanded ? full : 0,
      motionSpring(this, expanded ? 'fastSpatial' : 'defaultSpatial'),
      undefined,
      draw,
    );
    const alpha = this.textAlpha.animateTo(
      expanded ? 1 : 0,
      motionSpring(this, expanded ? 'defaultEffects' : 'fastEffects'),
      undefined,
      draw,
    );
    draw();
    void Promise.all([width, alpha]).then(() => this.settle(expanded));
  }

  /**
   * The M3 Expressive ExtendedFloatingActionButton's expand transition: the
   * width goes from the minimum (the height) to the full width on fast
   * spatial, the label's alpha on fast effects; the label goes once the
   * transition has finished collapsed.
   */
  private animateExpressive(expanded: boolean) {
    this.textShown = true;
    const target = expanded ? 1 : 0;
    const draw = () => this.drawExpansion();
    const width = this.widthProgress.animateTo(
      target,
      motionSpring(this, 'fastSpatial'),
      undefined,
      draw,
    );
    const alpha = this.alphaProgress.animateTo(
      target,
      motionSpring(this, 'fastEffects'),
      undefined,
      draw,
    );
    draw();
    void Promise.all([width, alpha]).then(() => this.settle(expanded));
  }

  private get isExpanding(): boolean {
    return [this.textWidth, this.textAlpha, this.widthProgress, this.alphaProgress].some(
      (a) => a.isRunning,
    );
  }

  /** Both animations have ended: drop the label if it collapsed, and the set widths. */
  private settle(expanded: boolean) {
    if (this.shownExpanded !== expanded || this.isExpanding) return;
    this.textShown = expanded;
    this.drawExpansion();
  }

  /** Sets the animated widths and alpha. */
  private drawExpansion() {
    const animating = this.isExpanding;
    const fab = this.fabEl;
    const clip = this.textClipEl;
    if (!fab || !clip) return;
    const kind = this.extendedKind;
    if (kind === 'baseline' && animating) {
      clip.style.width = `${this.textWidth.value}px`;
      clip.style.opacity = String(this.textAlpha.value);
    } else {
      clip.style.removeProperty('width');
      clip.style.opacity = kind === 'expressive' ? String(this.alphaProgress.value) : '';
    }
    if (kind === 'expressive' && this.hasIcon && animating && this.rowEl) {
      // lerp(minWidth, the Row's maxIntrinsicWidth, progress), rounded.
      const min = parseFloat(getComputedStyle(fab).getPropertyValue('--_ext-height')) || 0;
      const full = Math.ceil(this.rowEl.getBoundingClientRect().width);
      const width =
        Math.round(min) + Math.round((full - Math.round(min)) * this.widthProgress.value);
      fab.style.width = `${width}px`;
    } else {
      fab.style.removeProperty('width');
    }
  }

  protected override render() {
    const kind = this.extendedKind;
    const classes = {
      fab: true,
      baseline: kind === 'baseline',
      expressive: kind === 'expressive',
      [`size-${this.size}`]: kind === 'expressive',
      icon: this.hasIcon,
      collapsed: !!kind && this.hasIcon && this.collapsed,
    };
    return html`<div class=${classMap(classes)} part="fab">
      <rx-ripple></rx-ripple>
      <rx-focus-ring></rx-focus-ring>
      <div class="clip">
        <div class="row">
          <slot @slotchange=${this.onSlotChange}></slot>
          ${
            kind
              ? html`<span
                  class="text-clip"
                  ?hidden=${!this.textShown}
                  aria-hidden=${this.hasIcon ? 'true' : nothing}
                  ><span class="text">${this.label}</span></span
                >`
              : nothing
          }
        </div>
      </div>
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'rx-fab': RxFab;
  }
}
