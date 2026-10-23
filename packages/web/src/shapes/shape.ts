import {LitElement, css, html, type PropertyValues} from 'lit';
import {customElement, property, query} from 'lit/decorators.js';
import type {Cubic} from './graphics/cubic.js';
import {Animatable} from '../motion/animatable.js';
import {motionSpring, spring} from '../motion/motion-scheme.js';
import {Morph} from './graphics/morph.js';
import {pathFromCubics} from './graphics/path.js';
import type {RoundedPolygon} from './graphics/rounded-polygon.js';
import {materialShape, materialShapeName} from './material-shapes.js';

/**
 * SVG path data for closed cubics in the 0..1 square drawn at `width` by
 * `height`, as Compose outlines a normalized shape (`RoundedPolygon.toShape`,
 * and the LoadingIndicator's morphs): scaled to the size, then moved so the
 * path's bounds are centered. Android takes a path's bounds from the curves'
 * control points, which is the approximate bounds.
 */
function cubicsPath(cubics: readonly Cubic[], width: number, height: number): string {
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (const c of cubics) {
    for (let i = 0; i < 8; i += 2) {
      left = Math.min(left, c.points[i]);
      right = Math.max(right, c.points[i]);
      top = Math.min(top, c.points[i + 1]);
      bottom = Math.max(bottom, c.points[i + 1]);
    }
  }
  const dx = width / 2 - ((left + right) / 2) * width;
  const dy = height / 2 - ((top + bottom) / 2) * height;
  const scaled = cubics.map((c) => c.transformed((x, y) => [x * width + dx, y * height + dy]));
  return pathFromCubics(scaled, 0, 0, {startAngle: 0});
}

/** SVG path data for a normalized polygon at `width` by `height`, like Compose `toShape`. */
export function shapePath(polygon: RoundedPolygon, width: number, height: number): string {
  return cubicsPath(polygon.cubics, width, height);
}

/**
 * SVG path data for a morph between normalized polygons at `progress`,
 * drawn at `width` by `height` the same way as {@link shapePath}.
 */
export function morphShapePath(
  morph: Morph,
  progress: number,
  width: number,
  height: number,
): string {
  return cubicsPath(morph.asCubics(progress), width, height);
}

// Building a Morph takes some work, so recent ones are kept, as Compose's
// LoadingIndicator does (8 sequences).
const morphCache = new Map<RoundedPolygon, Map<RoundedPolygon, Morph>>();
const morphCacheOrder: [RoundedPolygon, RoundedPolygon][] = [];
const MorphCacheSize = 8;

function cachedMorph(start: RoundedPolygon, end: RoundedPolygon): Morph {
  let byEnd = morphCache.get(start);
  const hit = byEnd?.get(end);
  if (hit) return hit;
  const morph = new Morph(start, end);
  if (!byEnd) morphCache.set(start, (byEnd = new Map()));
  byEnd.set(end, morph);
  morphCacheOrder.push([start, end]);
  if (morphCacheOrder.length > MorphCacheSize) {
    const [s, e] = morphCacheOrder.shift()!;
    morphCache.get(s)?.delete(e);
    if (morphCache.get(s)?.size === 0) morphCache.delete(s);
  }
  return morph;
}

/**
 * Clips its content to a Material 3 Expressive shape and fills it with a
 * color. Any of the 35 MaterialShapes by name (`cookie-9-sided`, `heart`,
 * ...), or any normalized polygon through the `polygon` property.
 *
 * Changing the shape morphs to the new one with Google's Morph (the same
 * curve matching as Android), its progress driven by the default spatial
 * spring as Compose would. Going back mid-morph springs back from where it
 * is, keeping its speed. Reduced motion, or `no-morph`, switches at once.
 *
 * @example
 * <rx-shape shape="cookie-9-sided"><img src="avatar.jpg" alt=""></rx-shape>
 *
 * @cssprop --rx-shape-color - Fill. Defaults to `primary-container`.
 * @cssprop --rx-shape-content-color - Content color. Defaults to `on-primary-container`.
 * @cssprop --rx-shape-morph-stiffness - Morph spring stiffness. Defaults to the default spatial spring's.
 * @cssprop --rx-shape-morph-damping - Morph spring damping ratio. Defaults to the default spatial spring's.
 */
@customElement('rx-shape')
export class RxShape extends LitElement {
  /** A MaterialShapes name, in kebab case (`soft-burst`) or as in Compose (`SoftBurst`). */
  @property({reflect: true}) shape = 'circle';

  /** A normalized polygon to use instead of a named shape. */
  @property({attribute: false}) polygon: RoundedPolygon | null = null;

  /** Switch shapes at once instead of morphing. */
  @property({type: Boolean, reflect: true, attribute: 'no-morph'}) noMorph = false;

  @query('.shape') private shapeEl!: HTMLElement;

  /** The polygon shown, or being morphed to. */
  private target: RoundedPolygon | null = null;
  private morph: Morph | null = null;
  private morphStart: RoundedPolygon | null = null;
  private morphEnd: RoundedPolygon | null = null;
  /** Morph progress: 0 is morphStart, 1 is morphEnd. */
  private readonly progress = new Animatable(0);

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
    this.finishMorph();
  }

  /**
   * The progress of the running morph (0 at the old shape, 1 at the new;
   * a springy morph overshoots a little), or null when not morphing.
   */
  get morphProgress(): number | null {
    return this.morph ? this.progress.value : null;
  }

  protected override updated(changed: PropertyValues<this>) {
    const next = this.resolvedPolygon;
    if (next !== this.target && (changed.has('shape') || changed.has('polygon'))) {
      this.morphTo(next);
    }
    this.updateClip();
  }

  /** The default spatial spring, or the element's own stiffness and damping. */
  private morphSpring() {
    const base = motionSpring(this, 'defaultSpatial');
    const style = getComputedStyle(this);
    const stiffness = parseFloat(style.getPropertyValue('--rx-shape-morph-stiffness'));
    const damping = parseFloat(style.getPropertyValue('--rx-shape-morph-damping'));
    return spring({
      stiffness: stiffness > 0 ? stiffness : base.stiffness,
      dampingRatio: damping >= 0 ? damping : base.dampingRatio,
    });
  }

  private morphTo(next: RoundedPolygon | null) {
    const previous = this.target;
    this.target = next;
    if (!previous || !next || this.noMorph || !this.isConnected) {
      this.finishMorph();
      return;
    }

    if (this.morph && this.morphStart && this.morphEnd) {
      // Back to either end of the running morph: spring the progress there
      // from where it is, keeping its velocity, as Compose's Animatable does.
      if (next === this.morphStart || next === this.morphEnd) {
        this.runProgress(next === this.morphEnd ? 1 : 0);
        return;
      }
      // A third shape: start from whichever end of the running morph is closer.
      const nearer = this.progress.value < 0.5 ? this.morphStart : this.morphEnd;
      this.finishMorph();
      if (nearer === next) return;
      this.startMorph(nearer, next);
      return;
    }
    this.startMorph(previous, next);
  }

  private startMorph(start: RoundedPolygon, end: RoundedPolygon) {
    this.morph = cachedMorph(start, end);
    this.morphStart = start;
    this.morphEnd = end;
    this.progress.snapTo(0);
    this.runProgress(1);
  }

  private runProgress(to: 0 | 1) {
    void this.progress
      .animateTo(to, this.morphSpring(), undefined, () => this.updateClip())
      .then((result) => {
        if (result.endReason === 'Interrupted') return;
        this.finishMorph();
        this.updateClip();
      });
  }

  private finishMorph() {
    this.progress.stop();
    this.morph = null;
    this.morphStart = null;
    this.morphEnd = null;
  }

  private updateClip() {
    const el = this.shapeEl;
    if (!el) return;
    // Layout size, unaffected by CSS transforms such as rotate().
    const style = getComputedStyle(el);
    const width = parseFloat(style.width);
    const height = parseFloat(style.height);
    let path = '';
    if (width > 0 && height > 0) {
      if (this.morph) {
        path = morphShapePath(this.morph, this.progress.value, width, height);
      } else if (this.target) {
        path = shapePath(this.target, width, height);
      }
    }
    el.style.clipPath = path ? `path('${path}')` : '';
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
