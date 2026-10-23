import {LitElement, css, type PropertyValues} from 'lit';
import {customElement, property} from 'lit/decorators.js';

/**
 * Registers `--rx-focus-ring-progress` as a number so the ring's width can
 * spring in and out (0 hidden, 1 shown).
 */
function registerProgressProperty() {
  try {
    CSS.registerProperty({
      name: '--rx-focus-ring-progress',
      syntax: '<number>',
      inherits: false,
      initialValue: '0',
    });
  } catch {
    // Already registered.
  }
}
registerProgressProperty();

// Defined before the class: elements already in the page upgrade as soon as
// the class is defined, before any code after it runs.
const EVENTS = ['focusin', 'focusout', 'pointerdown'] as const;

/**
 * Shows a focus indicator around a control while it has keyboard focus
 * (`:focus-visible`). Clicks and taps don't show it.
 *
 * Place it inside a positioned element. It follows that element's corner
 * radius; to use a different one, set `border-radius` on the ring.
 *
 * Two styles:
 * - default (outward): the M3 web spec ring, 3dp in `secondary`, 2dp outside
 *   the control.
 * - `inward`: Compose's inset focus ring, a 2dp `secondary` ring over a 3dp
 *   `on-secondary` band inset by 1dp, for edge-to-edge controls such as list
 *   items. (RippleDefaults.InsetFocusRingThemeConfiguration in Compose.)
 *
 * It springs in with the fast spatial spring and fades out with the fast
 * effects spring, as Compose does.
 *
 * @cssprop --rx-focus-ring-color - Ring color. Defaults to `secondary`.
 * @cssprop --rx-focus-ring-inner-color - Inward style only: the inner band. Defaults to `on-secondary`.
 * @cssprop --rx-focus-ring-width - Outward style: ring width. Defaults to 3px.
 * @cssprop --rx-focus-ring-offset - Outward style: gap to the control. Defaults to 2px.
 */
@customElement('rx-focus-ring')
export class RxFocusRing extends LitElement {
  /** Shown right now. Set automatically; set it yourself to force the ring on. */
  @property({type: Boolean, reflect: true}) visible = false;

  /** Draw inside the control's edge instead of around it. */
  @property({type: Boolean, reflect: true}) inward = false;

  /** Id of the control to follow, in the same document or shadow root. Defaults to the parent. */
  @property({attribute: 'for'}) htmlFor = '';

  private attached: HTMLElement | null = null;

  static override styles = css`
    :host {
      position: absolute;
      inset: 0;
      border-radius: inherit;
      pointer-events: none;
      transition: --rx-focus-ring-progress var(--md-sys-motion-spring-fast-effects-duration, 150ms)
        var(--md-sys-motion-spring-fast-effects-easing, ease-out);
    }

    :host([visible]) {
      --rx-focus-ring-progress: 1;
      transition-duration: var(--md-sys-motion-spring-fast-spatial-duration, 300ms);
      transition-timing-function: var(--md-sys-motion-spring-fast-spatial-easing, ease-out);
    }

    :host(:not([inward])) {
      outline: calc(var(--rx-focus-ring-width, 3px) * var(--rx-focus-ring-progress)) solid
        var(--rx-focus-ring-color, var(--md-sys-color-secondary));
      outline-offset: var(--rx-focus-ring-offset, 2px);
    }

    /* Compose draws the 3dp inner band first, then the 2dp outer ring on top. */
    :host([inward]) {
      box-shadow:
        inset 0 0 0 calc(2px * var(--rx-focus-ring-progress))
          var(--rx-focus-ring-color, var(--md-sys-color-secondary)),
        inset 0 0 0 calc(4px * var(--rx-focus-ring-progress))
          var(--rx-focus-ring-inner-color, var(--md-sys-color-on-secondary));
    }

    :host(:not([visible])) {
      outline-color: transparent;
    }

    @media (prefers-reduced-motion: reduce) {
      :host,
      :host([visible]) {
        transition: none;
      }
    }

    @media (forced-colors: active) {
      :host(:not([inward])) {
        outline-color: CanvasText;
      }
      :host([inward]) {
        box-shadow: inset 0 0 0 calc(3px * var(--rx-focus-ring-progress)) CanvasText;
      }
    }
  `;

  /** The element whose focus the ring follows. */
  get control(): HTMLElement | null {
    if (this.htmlFor) {
      const root = this.getRootNode() as Document | ShadowRoot;
      return root.getElementById?.(this.htmlFor) ?? null;
    }
    const parent = this.parentNode;
    if (parent instanceof ShadowRoot) return parent.host as HTMLElement;
    return parent instanceof HTMLElement ? parent : null;
  }

  override connectedCallback() {
    super.connectedCallback();
    this.attach(this.control);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.attach(null);
  }

  protected override updated(changed: PropertyValues<this>) {
    if (changed.has('htmlFor') && this.isConnected) this.attach(this.control);
  }

  /** Follows `control` instead of the parent or `for`. Pass null to detach. */
  attach(control: HTMLElement | null) {
    if (control === this.attached) return;
    for (const type of EVENTS) this.attached?.removeEventListener(type, this);
    this.attached = control;
    for (const type of EVENTS) control?.addEventListener(type, this);
    this.visible = false;
  }

  /** @internal */
  handleEvent(event: Event) {
    switch (event.type) {
      case 'focusin': {
        // The focused element may be inside the control's shadow root.
        const focused = event.composedPath()[0];
        this.visible = focused instanceof Element && focused.matches(':focus-visible');
        break;
      }
      case 'focusout':
      case 'pointerdown':
        this.visible = false;
        break;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'rx-focus-ring': RxFocusRing;
  }
}
