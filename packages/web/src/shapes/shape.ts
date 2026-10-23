import {LitElement, css, html, type PropertyValues} from 'lit';
import {customElement, property, query} from 'lit/decorators.js';
import type {Cubic} from './graphics/cubic.js';
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

/** "532ms" or "0.5s" to milliseconds. */
function parseDuration(value: string): number {
  const v = value.trim();
  const n = parseFloat(v);
  if (!Number.isFinite(n)) return 0;
  return v.endsWith('ms') ? n : v.endsWith('s') ? n * 1000 : n;
}

/**
 * Clips its content to a Material 3 Expressive shape and fills it with a
 * color. Any of the 35 MaterialShapes by name (`cookie-9-sided`, `heart`,
 * ...), or any normalized polygon through the `polygon` property.
 *
 * Changing the shape morphs to the new one with Google's Morph (the same
 * curve matching as Android), timed by the expressive default spatial
 * spring. Reduced motion, or `no-morph`, switches shapes at once.
 *
 * @example
 * <rx-shape shape="cookie-9-sided"><img src="avatar.jpg" alt=""></rx-shape>
 *
 * @cssprop --rx-shape-color - Fill. Defaults to `primary-container`.
 * @cssprop --rx-shape-content-color - Content color. Defaults to `on-primary-container`.
 * @cssprop --rx-shape-morph-duration - Morph duration. Defaults to the default spatial spring's.
 * @cssprop --rx-shape-morph-easing - Morph easing. Defaults to the default spatial spring.
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
  // Our own record: an Animation's playbackRate only changes once a pending reverse() applies.
  private forward = true;
  private animation: Animation | null = null;
  private frame = 0;

  private readonly resizeObserver = new ResizeObserver(() => this.updateClip());

  static override styles = css`
    :host {
      position: relative;
      display: inline-grid;
      width: 48px;
      height: 48px;
      color: var(--rx-shape-content-color, var(--md-sys-color-on-primary-container));
      --_morph-duration: var(
        --rx-shape-morph-duration,
        var(--md-sys-motion-spring-default-spatial-duration, 532ms)
      );
      --_morph-easing: var(
        --rx-shape-morph-easing,
        var(--md-sys-motion-spring-default-spatial-easing, ease)
      );
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
   * The running morph's animation, or null. Pause, seek or reverse it to
   * drive the morph yourself.
   */
  get morphAnimation(): Animation | null {
    return this.animation;
  }

  protected override updated(changed: PropertyValues<this>) {
    const next = this.resolvedPolygon;
    if (next !== this.target && (changed.has('shape') || changed.has('polygon'))) {
      this.morphTo(next);
    }
    this.updateClip();
  }

  private morphTo(next: RoundedPolygon | null) {
    const previous = this.target;
    this.target = next;
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!previous || !next || this.noMorph || reduceMotion || !this.isConnected) {
      this.finishMorph();
      return;
    }

    let start = previous;
    if (this.animation && this.morphStart && this.morphEnd) {
      // Going back to the shape the running morph comes from: run it
      // backwards, which keeps the outline continuous.
      const from = this.forward ? this.morphStart : this.morphEnd;
      if (next === from) {
        this.animation.reverse();
        this.forward = !this.forward;
        return;
      }
      // A third shape: start from whichever end of the running morph is closer.
      start = this.currentProgress() < 0.5 ? this.morphStart : this.morphEnd;
    }
    this.finishMorph();
    if (start === next) return;

    const style = getComputedStyle(this);
    const duration = parseDuration(style.getPropertyValue('--_morph-duration'));
    if (duration <= 0) return;
    let effect: KeyframeEffect;
    try {
      effect = new KeyframeEffect(null, null, {
        duration,
        easing: style.getPropertyValue('--_morph-easing').trim() || 'ease',
        fill: 'forwards',
      });
    } catch {
      // An easing this browser can't parse (such as linear() in an old one).
      effect = new KeyframeEffect(null, null, {duration, easing: 'ease', fill: 'forwards'});
    }
    this.morph = cachedMorph(start, next);
    this.morphStart = start;
    this.morphEnd = next;
    this.forward = true;
    this.animation = new Animation(effect, document.timeline);
    this.animation.play();
    const tick = () => {
      this.updateClip();
      if (!this.animation) return;
      if (this.animation.playState === 'finished') {
        this.finishMorph();
        this.updateClip();
        return;
      }
      this.frame = requestAnimationFrame(tick);
    };
    this.frame = requestAnimationFrame(tick);
  }

  /** Eased progress of the running morph; may overshoot 0..1 with a spring. */
  private currentProgress(): number {
    const progress = this.animation?.effect?.getComputedTiming().progress;
    return progress ?? 1;
  }

  private finishMorph() {
    cancelAnimationFrame(this.frame);
    this.animation?.cancel();
    this.animation = null;
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
        path = morphShapePath(this.morph, this.currentProgress(), width, height);
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
