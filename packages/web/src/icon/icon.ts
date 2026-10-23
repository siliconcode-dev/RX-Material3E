import {LitElement, css, html, type PropertyValues} from 'lit';
import {customElement, property} from 'lit/decorators.js';

export type IconVariant = 'rounded' | 'outlined' | 'sharp';

/**
 * A Material Symbols icon, or any SVG you put inside it.
 *
 * Like Compose's `Icon`: 24dp, tinted with the surrounding text color, and
 * decorative unless it has a `label` (Compose's `contentDescription`), in which
 * case screen readers announce it as an image.
 *
 * The icon font is not bundled; load it once per page, e.g. with
 * `@rx-m3e/tokens/icons.css`, or from Google Fonts with `&icon_names=` to load
 * only the icons you use.
 *
 * @example
 * <rx-icon>home</rx-icon>
 * <rx-icon filled label="Favourite">favorite</rx-icon>
 * <rx-icon><svg viewBox="0 0 24 24">...</svg></rx-icon>
 *
 * @cssprop --rx-icon-size - Width, height and glyph size. Defaults to 24px.
 * @cssprop --rx-icon-weight - Stroke weight, 100-700. Defaults to 400.
 * @cssprop --rx-icon-grade - Grade, -50 to 200. Defaults to 0; -25 suits light icons on dark backgrounds.
 * @cssprop --rx-icon-optical-size - Optical size, 20-48. Defaults to 24; match it to the size.
 * @cssprop --rx-icon-font - Font family, overriding `variant`.
 */
@customElement('rx-icon')
export class RxIcon extends LitElement {
  /** Material Symbols style. */
  @property({reflect: true}) variant: IconVariant = 'rounded';

  /** Use the filled version of the symbol. Changes animate. */
  @property({type: Boolean, reflect: true}) filled = false;

  /** Accessible name. Without it the icon is decorative and hidden from screen readers. */
  @property() label = '';

  /** Mirror the icon in right-to-left layouts, for directional icons such as arrows. */
  @property({type: Boolean, reflect: true, attribute: 'flip-rtl'}) flipRtl = false;

  static override styles = css`
    :host {
      --_size: var(--rx-icon-size, 24px);
      display: inline-flex;
      flex: none;
      align-items: center;
      justify-content: center;
      width: var(--_size);
      height: var(--_size);
      overflow: hidden;
      color: inherit;
      font-family: var(--rx-icon-font, 'Material Symbols Rounded');
      font-size: var(--_size);
      font-style: normal;
      font-weight: normal;
      line-height: 1;
      letter-spacing: normal;
      text-transform: none;
      white-space: nowrap;
      word-wrap: normal;
      direction: ltr;
      user-select: none;
      font-feature-settings: 'liga';
      -webkit-font-smoothing: antialiased;
      text-rendering: optimizeLegibility;
      font-variation-settings:
        'FILL' 0,
        'wght' var(--rx-icon-weight, 400),
        'GRAD' var(--rx-icon-grade, 0),
        'opsz' var(--rx-icon-optical-size, 24);
      transition: font-variation-settings
        var(--md-sys-motion-spring-default-effects-duration, 200ms)
        var(--md-sys-motion-spring-default-effects-easing, ease);
    }

    :host([variant='outlined']) {
      font-family: var(--rx-icon-font, 'Material Symbols Outlined');
    }

    :host([variant='sharp']) {
      font-family: var(--rx-icon-font, 'Material Symbols Sharp');
    }

    :host([filled]) {
      font-variation-settings:
        'FILL' 1,
        'wght' var(--rx-icon-weight, 400),
        'GRAD' var(--rx-icon-grade, 0),
        'opsz' var(--rx-icon-optical-size, 24);
    }

    :host([flip-rtl]:dir(rtl)) {
      transform: scaleX(-1);
    }

    ::slotted(svg),
    ::slotted(img) {
      width: 100%;
      height: 100%;
    }

    ::slotted(svg) {
      fill: currentColor;
    }

    @media (prefers-reduced-motion: reduce) {
      :host {
        transition: none;
      }
    }
  `;

  protected override updated(changed: PropertyValues<this>) {
    // Plain ARIA attributes rather than ElementInternals, so accessibility
    // checkers (axe, Testing Library, Playwright) see them too.
    if (changed.has('label')) {
      if (this.label) {
        this.setAttribute('role', 'img');
        this.setAttribute('aria-label', this.label);
        this.removeAttribute('aria-hidden');
      } else {
        this.removeAttribute('role');
        this.removeAttribute('aria-label');
        this.setAttribute('aria-hidden', 'true');
      }
    }
  }

  protected override render() {
    return html`<slot></slot>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'rx-icon': RxIcon;
  }
}
