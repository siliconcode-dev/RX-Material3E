import {LitElement, css, html, nothing, unsafeCSS, type PropertyValues} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';
import {styleMap} from 'lit/directives/style-map.js';
import '../elevation/elevation.js';
import '../focus/focus-ring.js';
import '../ripple/ripple.js';

/**
 * Background roles and the content color Compose pairs with each
 * (`ColorScheme.contentColorFor`).
 */
export const SURFACE_COLORS = {
  primary: 'on-primary',
  secondary: 'on-secondary',
  tertiary: 'on-tertiary',
  background: 'on-background',
  error: 'on-error',
  'primary-container': 'on-primary-container',
  'secondary-container': 'on-secondary-container',
  'tertiary-container': 'on-tertiary-container',
  'error-container': 'on-error-container',
  'inverse-surface': 'inverse-on-surface',
  surface: 'on-surface',
  'surface-variant': 'on-surface-variant',
  'surface-bright': 'on-surface',
  'surface-container': 'on-surface',
  'surface-container-high': 'on-surface',
  'surface-container-highest': 'on-surface',
  'surface-container-low': 'on-surface',
  'surface-container-lowest': 'on-surface',
  'surface-dim': 'on-surface',
  'primary-fixed': 'on-primary-fixed',
  'primary-fixed-dim': 'on-primary-fixed',
  'secondary-fixed': 'on-secondary-fixed',
  'secondary-fixed-dim': 'on-secondary-fixed',
  'tertiary-fixed': 'on-tertiary-fixed',
  'tertiary-fixed-dim': 'on-tertiary-fixed',
} as const;
export type SurfaceColor = keyof typeof SURFACE_COLORS;

/** Corner shapes from the shape tokens. */
export const SURFACE_SHAPES = [
  'none',
  'extra-small',
  'extra-small-top',
  'small',
  'medium',
  'large',
  'large-top',
  'large-start',
  'large-end',
  'large-increased',
  'extra-large',
  'extra-large-top',
  'extra-large-increased',
  'extra-extra-large',
  'full',
] as const;
export type SurfaceShape = (typeof SURFACE_SHAPES)[number];

/** Elevation levels 0-5 in dp, as in the elevation tokens. */
const LEVEL_DP = [0, 1, 3, 6, 8, 12];

/**
 * Compose's `surfaceColorAtElevation`: how much surface tint to lay over the
 * surface color at a given tonal elevation.
 */
export function tonalTintPercent(dp: number): number {
  if (dp <= 0) return 0;
  return 4.5 * Math.log(dp + 1) + 2;
}

const colorRules = Object.entries(SURFACE_COLORS)
  .map(
    ([bg, fg]) =>
      `:host([color='${bg}']) { --_bg: var(--md-sys-color-${bg}); --_fg: var(--md-sys-color-${fg}); }`,
  )
  .join('\n');

const shapeRules = SURFACE_SHAPES.map((shape) => {
  // Start and end corners follow the text direction, as in Compose.
  if (shape === 'large-start' || shape === 'large-end') {
    const side = shape.endsWith('start') ? 'start' : 'end';
    const r = 'var(--md-sys-shape-corner-value-large)';
    return `:host([shape='${shape}']) { --_shape: 0; }
      :host([shape='${shape}']) .surface, :host([shape='${shape}']) .content,
      :host([shape='${shape}']) rx-elevation, :host([shape='${shape}']) rx-ripple,
      :host([shape='${shape}']) rx-focus-ring {
        border-start-${side}-radius: ${r}; border-end-${side}-radius: ${r};
      }`;
  }
  return `:host([shape='${shape}']) { --_shape: var(--md-sys-shape-corner-${shape}); }`;
}).join('\n');

/**
 * The container everything else sits on, ported from Compose's `Surface`:
 * a background color role with its matching content color, a corner shape,
 * an optional border, shadow elevation and tonal elevation. Content is
 * clipped to the shape.
 *
 * With `interactive` it behaves like Compose's clickable `Surface`: it is a
 * focusable button with a ripple and a focus ring, and `selected` marks it
 * pressed.
 *
 * @example
 * <rx-surface color="secondary-container" shape="large" elevation="1">...</rx-surface>
 *
 * @cssprop --rx-surface-color - Background, overriding `color`.
 * @cssprop --rx-surface-content-color - Content color, overriding `color`.
 * @cssprop --rx-surface-shape - Corner radius, overriding `shape`.
 * @cssprop --rx-surface-border - Border drawn inside the shape, e.g. `1px solid var(--md-sys-color-outline-variant)`.
 */
@customElement('rx-surface')
export class RxSurface extends LitElement {
  /** Background color role. Its content color is chosen to match. */
  @property({reflect: true}) color: SurfaceColor = 'surface';

  /** Corner shape. */
  @property({reflect: true}) shape: SurfaceShape = 'none';

  /** Shadow elevation level, 0-5. */
  @property({type: Number}) elevation = 0;

  /**
   * Tonal elevation level, 0-5. Tints a `surface` colored surface with
   * `surface-tint`, adding up through nested surfaces as in Compose.
   */
  @property({type: Number, attribute: 'tonal-elevation'}) tonalElevation = 0;

  /** Make it a clickable button with a ripple and focus ring. */
  @property({type: Boolean, reflect: true}) interactive = false;

  /** With `interactive`: marks it pressed (aria-pressed). */
  @property({type: Boolean, reflect: true}) selected = false;

  /** With `interactive`: not clickable or focusable. */
  @property({type: Boolean, reflect: true}) disabled = false;

  /** Tonal elevation in dp including every surface it sits on. */
  @state() private absoluteTonalDp = 0;

  constructor() {
    super();
    // Registered first so it runs before any listener a page adds.
    this.addEventListener('click', this.onClick, true);
    this.addEventListener('keydown', this.onKeyDown);
    this.addEventListener('keyup', this.onKeyUp);
  }

  static override styles = css`
    :host {
      --_bg: var(--md-sys-color-surface);
      --_fg: var(--md-sys-color-on-surface);
      --_shape: 0px;
      position: relative;
      display: block;
      isolation: isolate;
      border-radius: var(--rx-surface-shape, var(--_shape));
      color: var(--rx-surface-content-color, var(--_fg));
    }

    ${unsafeCSS(colorRules)}
    ${unsafeCSS(shapeRules)}

    :host([interactive]:not([disabled])) {
      cursor: pointer;
    }

    :host(:focus) {
      outline: none;
    }

    .surface {
      position: absolute;
      inset: 0;
      z-index: -1;
      box-sizing: border-box;
      border-radius: inherit;
      border: var(--rx-surface-border, none);
      background: color-mix(
        in srgb,
        var(--md-sys-color-surface-tint) var(--_tonal, 0%),
        var(--rx-surface-color, var(--_bg))
      );
    }

    rx-elevation {
      z-index: -2;
    }

    .content {
      position: relative;
      border-radius: inherit;
      overflow: hidden;
    }

    @media (forced-colors: active) {
      .surface {
        border: 1px solid CanvasText;
      }
    }
  `;

  override connectedCallback() {
    super.connectedCallback();
    this.updateTonalElevation();
  }

  protected override willUpdate(changed: PropertyValues<this>) {
    if (changed.has('tonalElevation')) this.updateTonalElevation();
  }

  protected override updated(changed: PropertyValues) {
    if (changed.has('interactive') || changed.has('disabled') || changed.has('selected')) {
      this.updateSemantics();
    }
    if (changed.has('absoluteTonalDp')) {
      // Nested surfaces add their own tonal elevation on top of this one's.
      for (const child of this.querySelectorAll('rx-surface')) child.updateTonalElevation();
    }
  }

  /** The surface this one sits on, across shadow roots. */
  private get parentSurface(): RxSurface | null {
    let node: Node | null = this.parentNode;
    while (node) {
      if (node instanceof RxSurface) return node;
      node = node.parentNode ?? (node instanceof ShadowRoot ? node.host : null);
    }
    return null;
  }

  /** @internal Recomputes the tonal elevation added up from enclosing surfaces. */
  updateTonalElevation() {
    const own = LEVEL_DP[Math.max(0, Math.min(5, Math.round(this.tonalElevation)))] ?? 0;
    this.absoluteTonalDp = (this.parentSurface?.absoluteTonalDp ?? 0) + own;
  }

  private updateSemantics() {
    if (this.interactive) {
      this.setAttribute('role', 'button');
      if (this.disabled) {
        this.removeAttribute('tabindex');
        this.setAttribute('aria-disabled', 'true');
      } else {
        this.setAttribute('tabindex', '0');
        this.removeAttribute('aria-disabled');
      }
      if (this.selected) this.setAttribute('aria-pressed', 'true');
      else this.removeAttribute('aria-pressed');
    } else {
      for (const name of ['role', 'tabindex', 'aria-disabled', 'aria-pressed']) {
        this.removeAttribute(name);
      }
    }
  }

  private readonly onClick = (event: Event) => {
    if (this.interactive && this.disabled) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  };

  // Button keyboard behaviour: Enter clicks on keydown, Space on keyup.
  private readonly onKeyDown = (event: KeyboardEvent) => {
    if (!this.interactive || this.disabled || event.target !== this) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      this.click();
    } else if (event.key === ' ') {
      event.preventDefault();
    }
  };

  private readonly onKeyUp = (event: KeyboardEvent) => {
    if (!this.interactive || this.disabled || event.target !== this) return;
    if (event.key === ' ') this.click();
  };

  protected override render() {
    // Tonal elevation only tints the plain surface color, as in Compose.
    const tonal =
      this.color === 'surface' && this.absoluteTonalDp > 0
        ? `${tonalTintPercent(this.absoluteTonalDp)}%`
        : null;
    const level = Math.max(0, Math.min(5, Math.round(this.elevation)));
    return html`
      ${level > 0 ? html`<rx-elevation level=${level} part="elevation"></rx-elevation>` : nothing}
      <div class="surface" part="surface" style=${styleMap({'--_tonal': tonal})}></div>
      ${
        this.interactive
          ? html`<rx-ripple ?disabled=${this.disabled}></rx-ripple><rx-focus-ring></rx-focus-ring>`
          : nothing
      }
      <div class="content" part="content"><slot></slot></div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'rx-surface': RxSurface;
  }
}
