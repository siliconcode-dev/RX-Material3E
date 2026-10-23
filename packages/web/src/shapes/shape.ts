import {LitElement, css, html} from 'lit';
import {customElement, property, query} from 'lit/decorators.js';
import {toPath} from './graphics/path.js';
import type {RoundedPolygon} from './graphics/rounded-polygon.js';
import {materialShape, materialShapeName} from './material-shapes.js';

/**
 * SVG path data for a normalized polygon drawn at `width` by `height`, as
 * Compose's `RoundedPolygon.toShape()` outlines it: scaled to the size, then
 * moved so the path's bounds are centered. Compose takes the bounds from the
 * curves' control points (Android's Path bounds), which is the approximate
 * `calculateBounds()`.
 */
export function shapePath(polygon: RoundedPolygon, width: number, height: number): string {
  const [left, top, right, bottom] = polygon.calculateBounds();
  const dx = width / 2 - ((left + right) / 2) * width;
  const dy = height / 2 - ((top + bottom) / 2) * height;
  const scaled = polygon.transformed((x, y) => [x * width + dx, y * height + dy]);
  return toPath(scaled, {startAngle: 0});
}

/**
 * Clips its content to a Material 3 Expressive shape and fills it with a
 * color. Any of the 35 MaterialShapes by name (`cookie-9-sided`, `heart`,
 * ...), or any normalized polygon through the `polygon` property.
 *
 * @example
 * <rx-shape shape="cookie-9-sided"><img src="avatar.jpg" alt=""></rx-shape>
 *
 * @cssprop --rx-shape-color - Fill. Defaults to `primary-container`.
 * @cssprop --rx-shape-content-color - Content color. Defaults to `on-primary-container`.
 */
@customElement('rx-shape')
export class RxShape extends LitElement {
  /** A MaterialShapes name, in kebab case (`soft-burst`) or as in Compose (`SoftBurst`). */
  @property({reflect: true}) shape = 'circle';

  /** A normalized polygon to use instead of a named shape. */
  @property({attribute: false}) polygon: RoundedPolygon | null = null;

  @query('.shape') private shapeEl!: HTMLElement;

  private readonly resizeObserver = new ResizeObserver(() => this.updateClip());

  static override styles = css`
    :host {
      position: relative;
      display: inline-grid;
      width: 48px;
      height: 48px;
      color: var(--rx-shape-content-color, var(--md-sys-color-on-primary-container));
    }

    .shape {
      display: grid;
      place-items: center;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: var(--rx-shape-color, var(--md-sys-color-primary-container));
    }

    ::slotted(img),
    ::slotted(video) {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  `;

  /** The polygon being drawn, or null for an unknown shape name. */
  get resolvedPolygon(): RoundedPolygon | null {
    if (this.polygon) return this.polygon;
    const name = materialShapeName(this.shape);
    return name ? materialShape(name) : null;
  }

  override connectedCallback() {
    super.connectedCallback();
    this.resizeObserver.observe(this);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.resizeObserver.disconnect();
  }

  protected override updated() {
    this.updateClip();
  }

  private updateClip() {
    const el = this.shapeEl;
    if (!el) return;
    const polygon = this.resolvedPolygon;
    // Layout size, unaffected by CSS transforms such as rotate().
    const style = getComputedStyle(el);
    const width = parseFloat(style.width);
    const height = parseFloat(style.height);
    el.style.clipPath =
      polygon && width > 0 && height > 0 ? `path('${shapePath(polygon, width, height)}')` : '';
  }

  protected override render() {
    return html`<div class="shape" part="shape"><slot></slot></div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'rx-shape': RxShape;
  }
}
