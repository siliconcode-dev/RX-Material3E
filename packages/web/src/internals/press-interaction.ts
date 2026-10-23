/*
 * Compose's interactionSource.collectIsPressedAsState() (foundation
 * interaction/PressInteraction.kt) for a control on the web: true from a
 * press (primary pointer down, or Enter or Space down on the control) until
 * its release or cancel. The events are the ones
 * InteractionElevationController reads for its press state.
 */

import type {ReactiveController, ReactiveControllerHost} from 'lit';

export interface PressInteractionOptions {
  /** Whether the control is enabled; a disabled control is never pressed. */
  enabled: () => boolean;
  /** Called when the pressed state changes. */
  onChange: (pressed: boolean) => void;
  /**
   * The keys that press the control, as its activation: Enter and Space for
   * a button (the default), Space alone for a toggle.
   */
  keys?: () => readonly string[];
}

const EVENTS = [
  'pointerdown',
  'pointerup',
  'pointercancel',
  'pointerleave',
  'keydown',
  'keyup',
  'focusout',
] as const;

/** The press state of one element, from its events. */
export interface PressTracker {
  readonly pressed: boolean;
  /** Ends a press without a release (PressInteraction.Cancel). */
  cancel(): void;
  /** Stops listening (and cancels a press). */
  dispose(): void;
}

/**
 * Tracks whether `element` is pressed, for an element whose events you can
 * listen to but don't own (the items of a button group).
 */
export function trackPress(element: HTMLElement, options: PressInteractionOptions): PressTracker {
  let press = false;
  const set = (value: boolean) => {
    if (press === value) return;
    press = value;
    options.onChange(value);
  };
  const handleEvent = (event: Event) => {
    switch (event.type) {
      case 'pointerdown':
        if ((event as PointerEvent).button === 0 && options.enabled()) set(true);
        break;
      case 'pointerup':
      case 'pointercancel':
      case 'pointerleave':
      case 'keyup':
      case 'focusout':
        set(false);
        break;
      case 'keydown': {
        const key = (event as KeyboardEvent).key;
        if (
          (options.keys?.() ?? [' ', 'Enter']).includes(key) &&
          !(event as KeyboardEvent).repeat &&
          event.target === element &&
          options.enabled()
        ) {
          set(true);
        }
        break;
      }
    }
  };
  for (const type of EVENTS) element.addEventListener(type, handleEvent);
  return {
    get pressed() {
      return press;
    },
    cancel: () => set(false),
    dispose() {
      for (const type of EVENTS) element.removeEventListener(type, handleEvent);
      set(false);
    },
  };
}

/** Tracks whether the host is pressed. */
export class PressInteractionController implements ReactiveController {
  private tracker: PressTracker | null = null;

  constructor(
    private readonly host: ReactiveControllerHost & HTMLElement,
    private readonly options: PressInteractionOptions,
  ) {
    host.addController(this);
  }

  /** collectIsPressedAsState().value. */
  get pressed(): boolean {
    return this.tracker?.pressed ?? false;
  }

  hostConnected() {
    this.tracker = trackPress(this.host, this.options);
  }

  hostDisconnected() {
    this.tracker?.dispose();
    this.tracker = null;
  }

  hostUpdated() {
    // Disabling a pressed control cancels its press, as clickable does.
    if (this.pressed && !this.options.enabled()) this.tracker?.cancel();
  }
}
