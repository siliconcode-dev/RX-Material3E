// A hand port of androidx.graphics.shapes (graphics-shapes) to TypeScript:
// rounded polygons and the circle, rectangle, star, pill and pill-star
// builders, morphing between polygons, plus SVG path output.
export {CornerRounding} from './corner-rounding.js';
export {Cubic, MutableCubic} from './cubic.js';
export {Corner, Edge, Feature} from './features.js';
export {
  doMapping,
  featureDistSquared,
  featureMapper,
  featureRepresentativePoint,
} from './feature-mapping.js';
export {
  DoubleMapper,
  linearMap,
  progressDistance,
  progressInRange,
  validateProgress,
} from './float-mapping.js';
export {Morph} from './morph.js';
export {
  matrixTransformer,
  morphToPath,
  pathFromCubics,
  rotateZTransformer,
  scaleTransformer,
  toPath,
  transformedByMatrix,
  type MorphPathOptions,
  type PathOptions,
} from './path.js';
export {
  LengthMeasurer,
  MeasuredCubic,
  MeasuredPolygon,
  type Measurer,
  type ProgressableFeature,
} from './polygon-measure.js';
export {Point, type PointTransformer} from './point.js';
export {
  RoundedPolygon,
  calculateCenter,
  type NumVerticesOptions,
  type VerticesOptions,
} from './rounded-polygon.js';
export {circle, pill, pillStar, rectangle, star} from './shapes.js';
