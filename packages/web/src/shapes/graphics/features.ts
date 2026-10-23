/*
 * Ported by hand from androidx/graphics/graphics-shapes Features.kt.
 * Copyright 2023 The Android Open Source Project. Licensed under the Apache License 2.0.
 */

import type {Cubic} from './cubic.js';
import type {PointTransformer} from './point.js';
import {DistanceEpsilon} from './utils.js';

/**
 * Groups a polygon's cubics into straight edges, convex corners and concave
 * corners. Rounding a rectangle adds many cubics, but it still has four
 * corners; Morph relies on that grouping to match shapes: it reduces noise
 * from individual cubics, it is the base set for the mapping, and it lets
 * Morph match convex corners to convex corners and concave to concave. Edges
 * and ignorable features are left out of the default mapping.
 */
export abstract class Feature {
  constructor(readonly cubics: readonly Cubic[]) {}

  /**
   * Cubics forming a feature the default Morph mapping should ignore, e.g. a
   * star's inner corners, so the morph only lines up the outer ones.
   *
   * @throws for an empty or non-continuous list.
   */
  static buildIgnorableFeature(cubics: readonly Cubic[]): Feature {
    return validated(new Edge(cubics));
  }

  /** A straight edge: neither inward nor outward. */
  static buildEdge(cubic: Cubic): Feature {
    return new Edge([cubic]);
  }

  /** A convex (outward) corner. @throws for an empty or non-continuous list. */
  static buildConvexCorner(cubics: readonly Cubic[]): Feature {
    return validated(new Corner(cubics, true));
  }

  /** A concave (inward) corner. @throws for an empty or non-continuous list. */
  static buildConcaveCorner(cubics: readonly Cubic[]): Feature {
    return validated(new Corner(cubics, false));
  }

  /** A copy with every point passed through `f`. */
  abstract transformed(f: PointTransformer): Feature;

  /** A copy with its points in reverse order. */
  abstract reversed(): Feature;

  /** Whether Morph's default mapping ignores this feature. */
  abstract readonly isIgnorableFeature: boolean;
  /** A straight edge, neither inward nor outward. */
  abstract readonly isEdge: boolean;
  /** An outward corner. */
  abstract readonly isConvexCorner: boolean;
  /** An inward corner. */
  abstract readonly isConcaveCorner: boolean;
}

function validated(feature: Feature): Feature {
  if (feature.cubics.length === 0) throw new Error('Features need at least one cubic.');
  if (!isContinuous(feature)) {
    throw new Error(
      'Feature must be continuous, with the anchor points of all cubics ' +
        'matching the anchor points of the preceding and succeeding cubics',
    );
  }
  return feature;
}

function isContinuous(feature: Feature): boolean {
  let prevCubic = feature.cubics[0];
  for (let index = 1; index < feature.cubics.length; index++) {
    const cubic = feature.cubics[index];
    if (
      Math.abs(cubic.anchor0X - prevCubic.anchor1X) > DistanceEpsilon ||
      Math.abs(cubic.anchor0Y - prevCubic.anchor1Y) > DistanceEpsilon
    ) {
      return false;
    }
    prevCubic = cubic;
  }
  return true;
}

const reversedCubics = (cubics: readonly Cubic[]) => cubics.map((c) => c.reverse()).reverse();

/**
 * The straight lines between corners. They have no vertex or concavity.
 */
export class Edge extends Feature {
  readonly isIgnorableFeature = true;
  readonly isEdge = true;
  readonly isConvexCorner = false;
  readonly isConcaveCorner = false;

  transformed(f: PointTransformer): Edge {
    return new Edge(this.cubics.map((c) => c.transformed(f)));
  }

  reversed(): Edge {
    return new Edge(reversedCubics(this.cubics));
  }

  override toString(): string {
    return 'Edge';
  }
}

/**
 * The cubics rounding (or not) one vertex, and whether that vertex is convex.
 * A regular polygon has only convex corners; a star usually has convex outer
 * and concave inner corners.
 */
export class Corner extends Feature {
  readonly isIgnorableFeature = false;
  readonly isEdge = false;

  constructor(
    cubics: readonly Cubic[],
    readonly convex: boolean = true,
  ) {
    super(cubics);
  }

  get isConvexCorner(): boolean {
    return this.convex;
  }

  get isConcaveCorner(): boolean {
    return !this.convex;
  }

  transformed(f: PointTransformer): Corner {
    return new Corner(
      this.cubics.map((c) => c.transformed(f)),
      this.convex,
    );
  }

  reversed(): Corner {
    // Upstream (b/369320447): the flag is negated until RoundedPolygon stops
    // using orientation to set it.
    return new Corner(reversedCubics(this.cubics), !this.convex);
  }

  override toString(): string {
    return `Corner: cubics=${this.cubics.map((c) => `[${c}]`).join(', ')} convex=${this.convex}`;
  }
}
