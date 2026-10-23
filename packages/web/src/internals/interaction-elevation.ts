/*
 * Ported by hand from androidx/compose/material3 Button.kt
 * (ButtonElevation.animateElevation) and internal/Elevation.kt
 * (Animatable.animateElevation, ElevationDefaults and its tween specs).
 * Copyright 2021-2024 The Android Open Source Project. Licensed under the Apache License 2.0.
 *
 * Compose collects a control's hover, focus and press interactions in a
 * list; the newest one picks the elevation, and the change animates with a
 * tween chosen by where it goes (or, going back to rest, where it comes
 * from). Here the interactions come from pointer, focus and key events on
 * the host, and the elevation is the `--rx-elevation` length on an element.
 */

import type {ReactiveController, ReactiveControllerHost} from 'lit';
import {motionDurationScale} from '../motion/duration-scale.js';

/** Elevations in dp (px) for each state, as Compose's ButtonElevation. */
export interface InteractionElevations {
  default: number;
  pressed: number;
  focused: number;
  hovered: number;
  disabled: number;
}

type Interaction = 'press' | 'hover' | 'focus';

interface Tween {
  duration: number;
  easing: string;
}

// internal/Elevation.kt
const FastOutSlowInEasing = 'cubic-bezier(0.4, 0, 0.2, 1)';
const OutgoingSpecEasing = 'cubic-bezier(0.4, 0, 0.6, 1)';
const DefaultIncomingSpec: Tween = {duration: 120, easing: FastOutSlowInEasing};
const DefaultOutgoingSpec: Tween = {duration: 150, easing: OutgoingSpecEasing};
const HoveredOutgoingSpec: Tween = {duration: 120, easing: OutgoingSpecEasing};

/** ElevationDefaults.incomingAnimationSpecForInteraction: the same for press, hover and focus. */
const incomingSpec = (): Tween => DefaultIncomingSpec;

/** ElevationDefaults.outgoingAnimationSpecForInteraction. */
function outgoingSpec(interaction: Interaction): Tween {
  return interaction === 'hover' ? HoveredOutgoingSpec : DefaultOutgoingSpec;
}

export interface InteractionElevationOptions {
  /** The element whose `--rx-elevation` to animate. */
  target: () => HTMLElement | null | undefined;
  /** The elevations, or null for none (an outlined or text button). */
  elevations: () => InteractionElevations | null;
  /** Whether the control is enabled. */
  enabled: () => boolean;
}

/**
 * Animates `--rx-elevation` on a control's visible part as Compose's
 * ButtonElevation does: hover, keyboard focus and press set the target (the
 * newest interaction wins), moving into a state takes 120ms FastOutSlowIn,
 * moving back takes 150ms (120ms from hover), and a disabled control snaps.
 */
export class InteractionElevationController implements ReactiveController {
  // The interactions in the order they started, as Compose's mutableStateListOf.
  private interactions: Interaction[] = [];
  // Animatable.targetValue: the last elevation animated or snapped to.
  private targetValue: number | null = null;
  private animation: Animation | null = null;

  constructor(
    private readonly host: ReactiveControllerHost & HTMLElement,
    private readonly options: InteractionElevationOptions,
  ) {
    host.addController(this);
  }

  hostConnected() {
    for (const type of EVENTS) this.host.addEventListener(type, this);
  }

  hostDisconnected() {
    for (const type of EVENTS) this.host.removeEventListener(type, this);
    this.interactions = [];
  }

  hostUpdated() {
    this.update();
  }

  private add(interaction: Interaction) {
    this.interactions = this.interactions.filter((i) => i !== interaction);
    this.interactions.push(interaction);
    this.update();
  }

  private remove(interaction: Interaction) {
    const before = this.interactions.length;
    this.interactions = this.interactions.filter((i) => i !== interaction);
    if (this.interactions.length !== before) this.update();
  }

  /** @internal */
  handleEvent(event: Event) {
    switch (event.type) {
      case 'pointerenter':
        if ((event as PointerEvent).pointerType !== 'touch') this.add('hover');
        break;
      case 'pointerleave':
        this.remove('hover');
        this.remove('press');
        break;
      case 'pointerdown':
        if ((event as PointerEvent).button === 0) this.add('press');
        break;
      case 'pointerup':
      case 'pointercancel':
        this.remove('press');
        break;
      case 'keydown': {
        const key = (event as KeyboardEvent).key;
        if ((key === ' ' || key === 'Enter') && !(event as KeyboardEvent).repeat) {
          if (event.target === this.host) this.add('press');
        }
        break;
      }
      case 'keyup':
        this.remove('press');
        break;
      case 'focusin':
        // Compose only gets focus from the keyboard (touch mode doesn't focus buttons).
        if (this.host.matches(':focus-visible')) this.add('focus');
        break;
      case 'focusout':
        this.remove('focus');
        this.remove('press');
        break;
    }
  }

  /** The elevation now in effect, in px (the animation's current value). */
  get currentElevation(): number {
    const target = this.options.target();
    if (!target) return 0;
    return parseFloat(getComputedStyle(target).getPropertyValue('--rx-elevation')) || 0;
  }

  private update() {
    const elevations = this.options.elevations();
    const target = this.options.target();
    if (!target) return;
    if (!elevations) {
      this.snap(target, 0);
      return;
    }
    const enabled = this.options.enabled();
    const interaction = this.interactions.at(-1) ?? null;
    const value = !enabled
      ? elevations.disabled
      : interaction === 'press'
        ? elevations.pressed
        : interaction === 'hover'
          ? elevations.hovered
          : interaction === 'focus'
            ? elevations.focused
            : elevations.default;
    if (this.targetValue === value) return;
    if (this.targetValue === null || !enabled) {
      // The first value, and any move to disabled: no transition.
      this.snap(target, value);
      return;
    }
    // Upstream works out the interaction it is leaving from the previous
    // target value, checking pressed, then hovered, then focused.
    const previous = this.targetValue;
    const from: Interaction | null =
      previous === elevations.pressed
        ? 'press'
        : previous === elevations.hovered
          ? 'hover'
          : previous === elevations.focused
            ? 'focus'
            : null;
    const spec = interaction ? incomingSpec() : from ? outgoingSpec(from) : null;
    if (spec) this.animate(target, value, spec);
    else this.snap(target, value);
  }

  private snap(target: HTMLElement, value: number) {
    this.animation?.cancel();
    this.animation = null;
    this.targetValue = value;
    target.style.setProperty('--rx-elevation', `${value}px`);
  }

  private animate(target: HTMLElement, value: number, spec: Tween) {
    const from = this.currentElevation;
    this.animation?.cancel();
    this.targetValue = value;
    target.style.setProperty('--rx-elevation', `${value}px`);
    const duration = spec.duration * motionDurationScale();
    if (duration <= 0 || from === value) {
      this.animation = null;
      return;
    }
    // From wherever it is now, for the full duration, as Animatable.animateTo.
    this.animation = target.animate(
      [{'--rx-elevation': `${from}px`}, {'--rx-elevation': `${value}px`}],
      {duration, easing: spec.easing},
    );
  }
}

const EVENTS = [
  'pointerenter',
  'pointerleave',
  'pointerdown',
  'pointerup',
  'pointercancel',
  'keydown',
  'keyup',
  'focusin',
  'focusout',
] as const;
