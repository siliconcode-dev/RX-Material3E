/*
 * Ported by hand from androidx/compose/material3 Chip.kt (AssistChip,
 * ElevatedAssistChip, SuggestionChip, ElevatedSuggestionChip,
 * AssistChipDefaults, SuggestionChipDefaults, the private Chip, ChipContent
 * and ChipArrangement, ChipElevation and ChipColors) with Surface.kt (the
 * clickable Surface a chip is drawn on) and the tokens AssistChipTokens and
 * SuggestionChipTokens.
 * Copyright 2022-2025 The Android Open Source Project. Licensed under the Apache License 2.0.
 */

import assist from '@rx-m3e/tokens/js/assist-chip.js';
import suggestion from '@rx-m3e/tokens/js/suggestion-chip.js';
import {LitElement, css, html, unsafeCSS, type PropertyValues} from 'lit';
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

/** The tokens both chip sets have. */
type ChipTokens = Pick<typeof assist, keyof typeof assist & keyof typeof suggestion>;

/** A color at an opacity, as Compose's `copy(alpha = ...)`. */
const withAlpha = (color: string, opacity: string) =>
  `color-mix(in srgb, ${color} calc(${opacity} * 100%), transparent)`;

/**
 * A chip's styles from its token set: the colors, border and elevations of
 * the flat and elevated chip (ChipColors, the border and ChipElevation of
 * its Defaults), enabled and disabled. `icon` and `disabledIcon` are the
 * leading icon's tokens, named differently in each set.
 */
function chipStyles(
  t: ChipTokens,
  icon: string,
  disabledIcon: string,
  disabledIconOpacity: string,
) {
  return css`
    :host {
      /* The flat chip: a transparent container with an outline, no shadow. */
      --_container: transparent;
      --_label: ${unsafeCSS(t['label-text-color'])};
      --_icon: ${unsafeCSS(icon)};
      --_outline: ${unsafeCSS(t['flat-outline-color'])};
      --_elevation: ${unsafeCSS(t['flat-container-elevation'])};
      --_elevation-pressed: var(--_elevation);
      --_elevation-focused: var(--_elevation);
      --_elevation-hovered: var(--_elevation);
      --_elevation-disabled: var(--_elevation);
    }

    /* The elevated chip: a container color and shadow, no border. */
    :host([elevated]) {
      --_container: ${unsafeCSS(t['elevated-container-color'])};
      --_outline: transparent;
      --_elevation: ${unsafeCSS(t['elevated-container-elevation'])};
      --_elevation-pressed: ${unsafeCSS(t['elevated-pressed-container-elevation'])};
      --_elevation-focused: ${unsafeCSS(t['elevated-focus-container-elevation'])};
      --_elevation-hovered: ${unsafeCSS(t['elevated-hover-container-elevation'])};
      --_elevation-disabled: ${unsafeCSS(t['elevated-disabled-container-elevation'])};
    }

    :host([aria-disabled='true']) {
      cursor: default;
      --_label: ${unsafeCSS(
        withAlpha(t['disabled-label-text-color'], t['disabled-label-text-opacity']),
      )};
      --_icon: ${unsafeCSS(withAlpha(disabledIcon, disabledIconOpacity))};
      --_outline: ${unsafeCSS(
        withAlpha(t['flat-disabled-outline-color'], t['flat-disabled-outline-opacity']),
      )};
    }

    :host([elevated][aria-disabled='true']) {
      --_outline: transparent;
      --_container: ${unsafeCSS(
        withAlpha(t['elevated-disabled-container-color'], t['elevated-disabled-container-opacity']),
      )};
    }

    .chip {
      min-height: ${unsafeCSS(t['container-height'])};
      border-radius: ${unsafeCSS(t['container-shape'])};
      font: ${unsafeCSS(t['label-text-weight'])} ${unsafeCSS(t['label-text-size'])} /
        ${unsafeCSS(t['label-text-line-height'])} ${unsafeCSS(t['label-text-font'])};
      letter-spacing: ${unsafeCSS(t['label-text-tracking'])};
    }

    .chip::before {
      border-width: ${unsafeCSS(t['flat-outline-width'])};
    }
  `;
}

/** What AssistChip and SuggestionChip share: Compose's private Chip on a clickable Surface. */
class ChipBase extends LitElement {
  /** The elevated chip (ElevatedAssistChip, ElevatedSuggestionChip) rather than the flat one. */
  @property({type: Boolean, reflect: true}) elevated = false;

  /** Not enabled: it ignores input and shows as disabled. */
  @property({type: Boolean, reflect: true}) disabled = false;

  @query('.chip') private chipEl!: HTMLElement;
  @query('rx-ripple') private ripple?: RxRipple;
  @query('rx-focus-ring') private focusRing?: RxFocusRing;

  constructor() {
    super();
    addActivation(this, {kind: 'button', isDisabled: () => this.disabled});
    // Chip's Modifier.semantics { role = Role.Button }.
    new HostSemanticsController(this, () => ({
      role: ComposeRole.Button,
      disabled: this.disabled,
    }));
    new InteractionElevationController(this, {
      target: () => this.chipEl,
      elevations: () => this.elevations,
      enabled: () => !this.disabled,
      // ChipElevation keeps the interaction it last moved to.
      trackLastInteraction: true,
    });
  }

  static override styles = [
    minimumInteractiveComponentSize,
    css`
      :host {
        /*
         * ChipContent's width(IntrinsicSize.Max): the chip keeps its natural
         * width in a row rather than squeezing its label.
         */
        flex-shrink: 0;
        vertical-align: middle;
        cursor: pointer;
        outline: none;
        -webkit-tap-highlight-color: transparent;
      }

      /*
       * The Surface and ChipContent's Row: at least the container height,
       * 8dp at the sides, the content centered. The leading box, the label
       * and the trailing box are always there (an empty box is the Row's
       * 0dp Spacer) with ChipArrangement's 8dp between them, so a label
       * alone has 16dp each side, and the label takes any extra width.
       */
      /*
       * A width set on the chip reaches the Row (the Surface passes its
       * minimum on), and the label takes the extra.
       */
      .chip {
        justify-self: stretch;
        position: relative;
        display: flex;
        align-items: center;
        gap: 8px;
        box-sizing: border-box;
        padding-inline: 8px;
        background: var(--_container);
        color: var(--_label);
        --rx-elevation: 0px;
        ${elevationShadow}
      }

      /* The border is drawn over the container, as Modifier.border: it takes no room. */
      .chip::before {
        content: '';
        position: absolute;
        inset: 0;
        border-style: solid;
        border-color: var(--_outline);
        border-radius: inherit;
        pointer-events: none;
      }

      .label {
        display: flex;
        flex: 1 1 auto;
        min-width: 0;
      }

      .leading,
      .trailing {
        display: flex;
        flex: none;
        align-items: center;
        justify-content: center;
        color: var(--_icon);
      }

      /* AssistChipDefaults.IconSize and SuggestionChipDefaults.IconSize. */
      ::slotted([slot='icon']),
      ::slotted([slot='trailing-icon']) {
        --rx-icon-size: 18px;
        flex: none;
      }

      @media (forced-colors: active) {
        .chip::before {
          border-color: ButtonText;
        }
        :host([aria-disabled='true']) .chip {
          color: GrayText;
        }
        :host([aria-disabled='true']) .chip::before {
          border-color: GrayText;
        }
      }
    `,
  ];

  /** The elevations in dp it moves between (ChipElevation of its Defaults), from the tokens. */
  get elevations(): InteractionElevations {
    const style = getComputedStyle(this);
    const dp = (name: string) => parseFloat(style.getPropertyValue(name)) || 0;
    return {
      default: dp('--_elevation'),
      pressed: dp('--_elevation-pressed'),
      focused: dp('--_elevation-focused'),
      hovered: dp('--_elevation-hovered'),
      disabled: dp('--_elevation-disabled'),
    };
  }

  /** Whether this chip has a trailing icon slot (AssistChip does, SuggestionChip does not). */
  protected get hasTrailing(): boolean {
    return false;
  }

  protected override firstUpdated() {
    // The ripple and focus ring sit in the 32dp container but follow the
    // host, which takes the focus and the clicks (48dp touch target).
    if (this.ripple) this.ripple.controlElement = this;
    if (this.focusRing) this.focusRing.controlElement = this;
  }

  protected override updated(changed: PropertyValues<this>) {
    super.updated(changed);
    if (this.ripple) this.ripple.disabled = this.disabled;
  }

  protected override render() {
    return html`<div class="chip" part="chip">
      <rx-ripple></rx-ripple>
      <rx-focus-ring></rx-focus-ring>
      <span class="leading"><slot name="icon"></slot></span>
      <span class="label"><slot></slot></span>
      ${
        this.hasTrailing
          ? html`<span class="trailing"><slot name="trailing-icon"></slot></span>`
          : html`<span class="trailing"></span>`
      }
    </div>`;
  }
}

/**
 * A Material 3 assist chip, as Compose's AssistChip: a smart or automated
 * action, shown in context, such as adding an event to a calendar.
 *
 * Flat by default: a transparent container with an outline. `elevated` is
 * ElevatedAssistChip: a low surface container with a level 1 shadow (level 2
 * hovered) and no outline. It is 32dp tall, with label large text and 18dp
 * icons in the primary color, and like the clickable Surface it is drawn on
 * it takes at least 48dp for its touch target.
 *
 * It is a button: it fires `click`. `disabled` turns it off.
 *
 * @example
 * <rx-assist-chip><rx-icon slot="icon">event</rx-icon>Add to calendar</rx-assist-chip>
 * <rx-assist-chip elevated>Directions<rx-icon slot="trailing-icon">arrow_drop_down</rx-icon></rx-assist-chip>
 *
 * @slot - The label.
 * @slot icon - A leading icon (18dp).
 * @slot trailing-icon - A trailing icon (18dp).
 * @csspart chip - The container.
 */
@customElement('rx-assist-chip')
export class RxAssistChip extends ChipBase {
  static override styles = [
    ...ChipBase.styles,
    chipStyles(
      assist,
      assist['icon-color'],
      assist['disabled-icon-color'],
      assist['disabled-icon-opacity'],
    ),
  ];

  protected override get hasTrailing(): boolean {
    return true;
  }
}

/**
 * A Material 3 suggestion chip, as Compose's SuggestionChip: a suggested
 * reply or search, made from what the user is doing.
 *
 * Flat by default: a transparent container with an outline. `elevated` is
 * ElevatedSuggestionChip: a low surface container with a level 1 shadow
 * (level 2 hovered) and no outline. It is 32dp tall with label large text in
 * on-surface-variant, an optional 18dp icon in the primary color, and a 48dp
 * touch target.
 *
 * It is a button: it fires `click`. `disabled` turns it off.
 *
 * @example
 * <rx-suggestion-chip>Sounds good</rx-suggestion-chip>
 *
 * @slot - The label.
 * @slot icon - An icon before the label (18dp).
 * @csspart chip - The container.
 */
@customElement('rx-suggestion-chip')
export class RxSuggestionChip extends ChipBase {
  static override styles = [
    ...ChipBase.styles,
    chipStyles(
      suggestion,
      suggestion['leading-icon-color'],
      suggestion['disabled-leading-icon-color'],
      suggestion['disabled-leading-icon-opacity'],
    ),
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'rx-assist-chip': RxAssistChip;
    'rx-suggestion-chip': RxSuggestionChip;
  }
}
