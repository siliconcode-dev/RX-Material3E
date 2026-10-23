// A hand port of androidx.graphics.shapes (graphics-shapes) to TypeScript:
// rounded polygons and the circle, rectangle, star, pill and pill-star
// builders, plus SVG path output. Morph follows in roadmap step 14.
export {CornerRounding} from './corner-rounding.js';
export {Cubic, MutableCubic} from './cubic.js';
export {Corner, Edge, Feature} from './features.js';
export {
  matrixTransformer,
  pathFromCubics,
  toPath,
  transformedByMatrix,
  type PathOptions,
} from './path.js';
export {Point, type PointTransformer} from './point.js';
export {
  RoundedPolygon,
  calculateCenter,
  type NumVerticesOptions,
  type VerticesOptions,
} from './rounded-polygon.js';
export {circle, pill, pillStar, rectangle, star} from './shapes.js';
