import {LitElement, css, html, type PropertyValues} from 'lit';
import {customElement, property, query, state} from 'lit/decorators.js';

// Timings from Compose material3-ripple (RippleAnimation.kt, Ripple.kt).
const FADE_IN_MS = 75;
const RADIUS_MS = 225;
const FADE_OUT_MS = 150;
const FAST_OUT_SLOW_IN = 'cubic-bezier(0.4, 0, 0.2, 1)';
/** Bounded ripples grow 10dp past the surface's edge. */
const BOUNDED_EXTRA_RADIUS = 10;
/** Ripples start at 60% of the surface's largest dimension, i.e. a 30% radius. */
const START_RADIUS_FRACTION = 0.3;

// Defined before the class: elements already in the page upgrade as soon as
// the class is defined.
const EVENTS = [
  'pointerenter',
  'pointerleave',
  'pointerdown',
  'pointerup',
  'pointercancel',
  'click',
  'focusin',
  'focusout',
] as const;

interface ActiveRipple {
  el: HTMLElement;
  /** Resolves when the grow animation has finished (Compose's fade-in phase). */
  grown: Promise<void>;
  fadeIn: Animation;
  released: boolean;
}

/**
 * Material's interaction feedback: a state layer that tints the surface on
 * hover, focus and drag, and a ripple that grows from the press point.
 *
 * Place it inside a positioned control. It follows the control's corner
 * radius and clips to it. Colors come from `currentColor` unless set.
 *
 * Behaviour follows Compose material3-ripple: the ripple starts at 30% of the
 * surface's longest side, grows for 225ms (fast-out-slow-in) to cover the
 * surface plus 10dp while its center drifts from the press point to the
 * middle, fades in over 75ms, and fades out over 150ms once it has finished
 * growing and the press has ended.
 *
 * @cssprop --rx-ripple-color - Color of the state layer and ripple. Defaults to currentColor.
 * @cssprop --rx-ripple-hover-opacity - Defaults to the hover state token (0.08).
 * @cssprop --rx-ripple-pressed-opacity - Defaults to the pressed state token (0.1).
 * @cssprop --rx-ripple-dragged-opacity - Defaults to the dragged state token (0.16).
 * @cssprop --rx-ripple-focus-opacity - Defaults to 0, because components show
 *   focus with `<rx-focus-ring>`. Set it to `var(--md-sys-state-focus-state-layer-opacity)`
 *   for Compose's tinted focus instead.
 */
@customElement('rx-ripple')
export class RxRipple extends LitElement {
  /** Turns off all feedback. */
  @property({type: Boolean, reflect: true}) disabled = false;

  /** Lets the ripple spread past the control's bounds, without the extra 10dp. */
  @property({type: Boolean, reflect: true}) unbounded = false;

  /** Shows the dragged state layer. Components set this while dragging. */
  @property({type: Boolean, reflect: true}) dragged = false;

  /** Id of the control to follow, in the same document or shadow root. Defaults to the parent. */
  @property({attribute: 'for'}) htmlFor = '';

  /**
   * The control to follow, ahead of `for` and the parent. Components set it
   * when the ring or ripple sits inside the visible part of a control whose
   * host element takes the focus and the clicks.
   */
  @property({attribute: false}) controlElement: HTMLElement | null = null;

  @state() private hovered = false;
  @state() private focused = false;

  @query('.surface') private surface!: HTMLElement;

  private attached: HTMLElement | null = null;
  private readonly ripples = new Set<ActiveRipple>();
  /** Set between a pointerdown and its click, so the click doesn't add a second ripple. */
  private pointerPressed = false;

  static override styles = css`
    :host {
      position: absolute;
      inset: 0;
      display: block;
      border-radius: inherit;
      pointer-events: none;
      --_color: var(--rx-ripple-color, currentColor);
    }

    :host([disabled]) {
      display: none;
    }

    .surface {
      position: absolute;
      inset: 0;
      border-radius: inherit;
      overflow: hidden;
    }

    :host([unbounded]) .surface {
      overflow: visible;
    }

    .state {
      position: absolute;
      inset: 0;
      border-radius: inherit;
      background: var(--_color);
      opacity: 0;
      transition: opacity 15ms linear;
    }

    .state.hovered {
      opacity: var(--rx-ripple-hover-opacity, var(--md-sys-state-hover-state-layer-opacity, 0.08));
    }

    .state.focused {
      opacity: var(--rx-ripple-focus-opacity, 0);
      transition-duration: 45ms;
    }

    .state.dragged {
      opacity: var(
        --rx-ripple-dragged-opacity,
        var(--md-sys-state-dragged-state-layer-opacity, 0.16)
      );
      transition-duration: 45ms;
    }

    .ripple {
      position: absolute;
      border-radius: 50%;
      background: var(--_color);
      opacity: 0;
      will-change: opacity, scale, translate;
    }

    @media (forced-colors: active) {
      :host {
        display: none;
      }
    }
  `;

  /** The element whose interactions the ripple follows. */
  get control(): HTMLElement | null {
    if (this.controlElement) return this.controlElement;
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
    if ((changed.has('htmlFor') || changed.has('controlElement')) && this.isConnected) {
      this.attach(this.control);
    }
    if (changed.has('disabled') && this.disabled) this.reset();
  }

  protected override render() {
    const layer = this.dragged
      ? 'dragged'
      : this.focused
        ? 'focused'
        : this.hovered
          ? 'hovered'
          : '';
    return html`<div class="surface"><div class="state ${layer}"></div></div>`;
  }

  /** Follows `control` instead of the parent or `for`. Pass null to detach. */
  attach(control: HTMLElement | null) {
    if (control === this.attached) return;
    for (const type of EVENTS) this.attached?.removeEventListener(type, this);
    this.attached = control;
    for (const type of EVENTS) control?.addEventListener(type, this);
    this.reset();
  }

  /** @internal */
  handleEvent(event: Event) {
    if (this.disabled) return;
    switch (event.type) {
      case 'pointerenter':
        // Touch has no hover.
        if ((event as PointerEvent).pointerType !== 'touch') this.hovered = true;
        break;
      case 'pointerleave':
        this.hovered = false;
        this.releaseAll();
        break;
      case 'pointerdown': {
        const e = event as PointerEvent;
        if (e.button !== 0) return;
        this.pointerPressed = true;
        this.press(e.clientX, e.clientY);
        break;
      }
      case 'pointerup':
      case 'pointercancel':
        this.releaseAll();
        break;
      case 'click':
        // A click without a pointer press came from the keyboard: ripple from the center.
        if (!this.pointerPressed) {
          this.press();
          this.releaseAll();
        }
        this.pointerPressed = false;
        break;
      case 'focusin': {
        const focused = event.composedPath()[0];
        this.focused = focused instanceof Element && focused.matches(':focus-visible');
        break;
      }
      case 'focusout':
        this.focused = false;
        break;
    }
  }

  /**
   * Starts a ripple at a viewport point, or from the center when no point is
   * given. Call {@link releaseAll} to let it fade out.
   *
   * @returns The ripple's element, or null before the first render.
   */
  press(clientX?: number, clientY?: number): HTMLElement | null {
    const surface = this.surface;
    if (!surface) return null;
    const rect = surface.getBoundingClientRect();
    const {width, height} = rect;
    const center = {x: width / 2, y: height / 2};
    const origin =
      clientX === undefined || clientY === undefined
        ? center
        : {x: clientX - rect.left, y: clientY - rect.top};

    const coveringRadius = Math.hypot(width, height) / 2;
    const endRadius = coveringRadius + (this.unbounded ? 0 : BOUNDED_EXTRA_RADIUS);
    const startRadius = Math.max(width, height) * START_RADIUS_FRACTION;

    const el = document.createElement('div');
    el.className = 'ripple';
    Object.assign(el.style, {
      width: `${endRadius * 2}px`,
      height: `${endRadius * 2}px`,
      left: `${center.x - endRadius}px`,
      top: `${center.y - endRadius}px`,
    });
    surface.append(el);

    const opacity = this.pressedOpacity();
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const grow = reduceMotion ? 0 : RADIUS_MS;
    const fadeIn = el.animate([{opacity: 0}, {opacity}], {
      duration: FADE_IN_MS,
      easing: 'linear',
      fill: 'forwards',
    });
    const scale = el.animate([{scale: `${startRadius / endRadius}`}, {scale: '1'}], {
      duration: grow,
      easing: FAST_OUT_SLOW_IN,
      fill: 'forwards',
    });
    el.animate(
      [{translate: `${origin.x - center.x}px ${origin.y - center.y}px`}, {translate: '0px 0px'}],
      {duration: grow, easing: 'linear', fill: 'forwards'},
    );

    const ripple: ActiveRipple = {
      el,
      fadeIn,
      released: false,
      grown: scale.finished.then(() => {}),
    };
    this.ripples.add(ripple);
    return el;
  }

  /** Ends every active press: each ripple fades out once it has finished growing. */
  releaseAll() {
    for (const ripple of this.ripples) {
      if (ripple.released) continue;
      ripple.released = true;
      // Released before the fade-in finished: jump to full strength, as Compose does.
      ripple.fadeIn.finish();
      ripple.grown
        .then(() => {
          const fade = ripple.el.animate([{opacity: this.pressedOpacity()}, {opacity: 0}], {
            duration: FADE_OUT_MS,
            easing: 'linear',
            fill: 'forwards',
          });
          return fade.finished;
        })
        .catch(() => {})
        .finally(() => {
          ripple.el.remove();
          this.ripples.delete(ripple);
        });
    }
  }

  private pressedOpacity() {
    const value = getComputedStyle(this).getPropertyValue('--rx-ripple-pressed-opacity').trim();
    const token = getComputedStyle(this)
      .getPropertyValue('--md-sys-state-pressed-state-layer-opacity')
      .trim();
    return Number(value || token || 0.1);
  }

  private reset() {
    this.hovered = false;
    this.focused = false;
    this.pointerPressed = false;
    for (const ripple of this.ripples) ripple.el.remove();
    this.ripples.clear();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'rx-ripple': RxRipple;
  }
}
