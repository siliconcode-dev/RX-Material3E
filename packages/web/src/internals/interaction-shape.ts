/*
 * Ported by hand from androidx/compose/material3 Button.kt and
 * ToggleButton.kt (shapeByInteraction): a control shows one of a set of
 * corner shapes, picked by its interaction state (pressed, checked), and
 * morphs between them with rememberAnimatedShape. The set is the key: a new
 * set starts a new morph state, at rest on the current shape.
 * Copyright 2024-2025 The Android Open Source Project. Licensed under the Apache License 2.0.
 */

import type {ReactiveController, ReactiveControllerHost} from 'lit';
import type {SpringSpec} from '../motion/motion-scheme.js';
import {
  AnimatedShapeState,
  applyCornerShape,
  clearCornerShape,
  cornerShapesEqual,
  parseCornerShape,
  type CornerShape,
} from './animated-shape.js';

export interface InteractionShapeOptions {
  /** The element whose corners to set. */
  container: () => HTMLElement | null | undefined;
  /**
   * The custom properties on the host holding the shapes (CSS radii), in
   * the order `current` indexes them.
   */
  shapes: readonly string[];
  /** Which of `shapes` to show now. */
  current: () => number;
  /** The spring to morph on. */
  spec: () => SpringSpec;
  /** Whether the morph is on; when off the stylesheet's corners apply. */
  enabled?: () => boolean;
}

/**
 * shapeByInteraction. Call `update()` when the state that picks the shape
 * changes; the host's updates call it too.
 */
export class InteractionShapeController implements ReactiveController {
  // key(shapes) and the AnimatedShapeState remembered under it.
  private key: CornerShape[] | null = null;
  private state: AnimatedShapeState | null = null;
  // The corners are px worked out from the size: redraw when it changes.
  private resize: ResizeObserver | null = null;

  constructor(
    private readonly host: ReactiveControllerHost & HTMLElement,
    private readonly options: InteractionShapeOptions,
  ) {
    host.addController(this);
  }

  /** @internal The morph state, for tests. */
  get shapeState(): AnimatedShapeState | null {
    return this.state;
  }

  hostUpdated() {
    this.update();
  }

  hostDisconnected() {
    this.state?.progress.stop();
    this.resize?.disconnect();
    this.resize = null;
  }

  update() {
    const container = this.options.container();
    if (!container) return;
    if (this.options.enabled && !this.options.enabled()) {
      if (this.key || this.state) this.reset(container);
      return;
    }
    const style = getComputedStyle(this.host);
    const full = style.getPropertyValue('--md-sys-shape-corner-full');
    const raw = this.options.shapes.map((name) => style.getPropertyValue(name));
    const index = this.options.current();
    const shapes = raw.map((value) => parseCornerShape(value, full));
    if (shapes.some((shape) => !shape)) {
      // Not all corner sizes (hasCornerBasedShapes is false): switch without a morph.
      this.reset(container);
      container.style.setProperty('border-radius', raw[index]);
      return;
    }
    container.style.removeProperty('border-radius');
    const set = shapes as CornerShape[];
    const current = set[index];
    if (
      !this.key ||
      !this.state ||
      this.key.length !== set.length ||
      set.some((shape, i) => !cornerShapesEqual(shape, this.key![i]))
    ) {
      this.state?.progress.stop();
      this.key = set;
      const state = new AnimatedShapeState(current, this.options.spec, () => this.draw(state));
      this.state = state;
      this.draw(state);
      return;
    }
    const state = this.state;
    void state.animateToShape(current)?.then(() => this.draw(state));
  }

  private reset(container: HTMLElement) {
    this.state?.progress.stop();
    this.key = this.state = null;
    this.resize?.disconnect();
    this.resize = null;
    clearCornerShape(container);
    container.style.removeProperty('border-radius');
  }

  private draw(state: AnimatedShapeState) {
    const container = this.options.container();
    if (state !== this.state || !container) return;
    if (!this.resize) {
      this.resize = new ResizeObserver(() => this.state && this.draw(this.state));
      this.resize.observe(container);
    }
    applyCornerShape(container, state.atRest ? state.targetShape : state.morphedShape());
  }
}
