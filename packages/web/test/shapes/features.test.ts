/*
 * Ported from androidx/graphics/graphics-shapes commonTest FeaturesTest.kt.
 * Copyright 2023 The Android Open Source Project. Licensed under the Apache License 2.0.
 */

import {describe, expect, it} from 'vitest';
import {Corner, Cubic, Edge, Feature} from '../../src/shapes/graphics/index.js';
import {assertFeaturesEqualish} from './test-utils.js';

describe('Feature (FeaturesTest.kt)', () => {
  it('cannotBuildEmptyFeatures', () => {
    expect(() => Feature.buildConvexCorner([])).toThrow();
    expect(() => Feature.buildConcaveCorner([])).toThrow();
    expect(() => Feature.buildIgnorableFeature([])).toThrow();
  });

  it('cannotBuildNonContinuousFeatures', () => {
    const cubic1 = Cubic.straightLine(0, 0, 1, 1);
    const cubic2 = Cubic.straightLine(10, 10, 11, 11);
    expect(() => Feature.buildConvexCorner([cubic1, cubic2])).toThrow();
    expect(() => Feature.buildConcaveCorner([cubic1, cubic2])).toThrow();
    expect(() => Feature.buildIgnorableFeature([cubic1, cubic2])).toThrow();
  });

  it('buildsConcaveCorner', () => {
    const cubic = Cubic.straightLine(0, 0, 1, 0);
    assertFeaturesEqualish(new Corner([cubic], false), Feature.buildConcaveCorner([cubic]));
  });

  it('buildsConvexCorner', () => {
    const cubic = Cubic.straightLine(0, 0, 1, 0);
    assertFeaturesEqualish(new Corner([cubic], true), Feature.buildConvexCorner([cubic]));
  });

  it('buildsEdge', () => {
    const cubic = Cubic.straightLine(0, 0, 1, 0);
    assertFeaturesEqualish(new Edge([cubic]), Feature.buildEdge(cubic));
  });

  it('buildsIgnorableAsEdge', () => {
    const cubic = Cubic.straightLine(0, 0, 1, 0);
    assertFeaturesEqualish(new Edge([cubic]), Feature.buildIgnorableFeature([cubic]));
  });
});
