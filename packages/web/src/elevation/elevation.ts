import {LitElement, css, unsafeCSS} from 'lit';
import {customElement, property} from 'lit/decorators.js';

// Elevation in the Compose tokens is a distance: levels 0-5 are 0, 1, 3, 6, 8
// and 12dp. Android draws the shadow from that distance; the web needs it
// spelled out. Each level is the M3 spec's pair of shadows: a sharp key shadow
// at 30% and a soft ambient shadow at 15%.
//
//   level  key (y blur)  ambient (y blur spread)
//   1      1 2           1 3 1
//   2      1 2           2 6 2
//   3      1 3           4 8 3
//   4      2 3           6 10 4
//   5      4 4           8 12 6
//
// The shadow is computed in CSS from `--rx-elevation` (a length) so any dp
// value works and changes animate smoothly between levels. I1..I5 below each
// ramp from 0 to 1px across one level band (0-1, 1-3, 3-6, 6-8, 8-12dp).

const dp = 'var(--rx-elevation)';
const ramps = [
  `clamp(0px, ${dp}, 1px)`,
  `clamp(0px, (${dp} - 1px) / 2, 1px)`,
  `clamp(0px, (${dp} - 3px) / 3, 1px)`,
  `clamp(0px, (${dp} - 6px) / 2, 1px)`,
  `clamp(0px, (${dp} - 8px) / 4, 1px)`,
];
const [i1, i2, i3, i4, i5] = ramps;
const len = (expr: string) => `calc(${expr})`;

const keyY = len(`${i1} + ${i4} + 2 * ${i5}`);
const keyBlur = len(`2 * ${i1} + ${i3} + ${i5}`);
const ambientY = len(`${i1} + ${i2} + 2 * (${i3} + ${i4} + ${i5})`);
const ambientBlur = len(`3 * (${i1} + ${i2}) + 2 * (${i3} + ${i4} + ${i5})`);
const ambientSpread = len(`${i1} + ${i2} + ${i3} + ${i4} + 2 * ${i5}`);

const color = (percent: number) =>
  `color-mix(in srgb, var(--rx-elevation-shadow-color, #000) ${percent}%, transparent)`;

/**
 * `box-shadow` for the elevation in `--rx-elevation`. Components can use this
 * directly on an element instead of adding an `<rx-elevation>`.
 */
export const elevationShadow = unsafeCSS(
  `box-shadow: 0px ${keyY} ${keyBlur} 0px ${color(30)}, ` +
    `0px ${ambientY} ${ambientBlur} ${ambientSpread} ${color(15)};`,
);

/**
 * Registers `--rx-elevation` as a non-inheriting length. Not inheriting keeps a
 * card's elevation from leaking into the buttons inside it, and a typed length
 * lets the shadow transition through the levels instead of jumping.
 */
export function registerElevationProperty() {
  try {
    CSS.registerProperty({
      name: '--rx-elevation',
      syntax: '<length>',
      inherits: false,
      initialValue: '0px',
    });
  } catch {
    // Already registered (for example by a second copy of this module).
  }
}
registerElevationProperty();

/**
 * Draws a Material shadow behind its parent. Place it inside a positioned
 * element; it fills the parent and follows its corner radius.
 *
 * Set the height with `level` (0-5), or with `--rx-elevation` as a length,
 * e.g. `--rx-elevation: var(--md-sys-elevation-level2)`.
 *
 * @cssprop --rx-elevation - Elevation as a length (0, 1, 3, 6, 8, 12px for levels 0-5).
 * @cssprop --rx-elevation-shadow-color - Shadow color. Defaults to black.
 */
@customElement('rx-elevation')
export class RxElevation extends LitElement {
  /** Elevation level 0-5. Overrides `--rx-elevation` when set. */
  @property({type: Number, reflect: true}) level?: number;

  static override styles = css`
    :host {
      position: absolute;
      inset: 0;
      border-radius: inherit;
      pointer-events: none;
      transition: --rx-elevation var(--md-sys-motion-spring-default-effects-duration, 200ms)
        var(--md-sys-motion-spring-default-effects-easing, ease);
      ${elevationShadow}
    }
    ${unsafeCSS(
      [0, 1, 2, 3, 4, 5]
        .map((l) => `:host([level='${l}']) { --rx-elevation: var(--md-sys-elevation-level${l}); }`)
        .join('\n'),
    )}
    @media (prefers-reduced-motion: reduce) {
      :host {
        transition: none;
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'rx-elevation': RxElevation;
  }
}
