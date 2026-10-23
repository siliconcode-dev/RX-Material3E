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
  keys?: readonly string[];
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

/** Tracks whether the host is pressed. */
export class PressInteractionController implements ReactiveController {
  private press = false;

  constructor(
    private readonly host: ReactiveControllerHost & HTMLElement,
    private readonly options: PressInteractionOptions,
  ) {
    host.addController(this);
  }

  /** collectIsPressedAsState().value. */
  get pressed(): boolean {
    return this.press;
  }

  hostConnected() {
    for (const type of EVENTS) this.host.addEventListener(type, this);
  }

  hostDisconnected() {
    for (const type of EVENTS) this.host.removeEventListener(type, this);
    this.set(false);
  }

  hostUpdated() {
    // Disabling a pressed control cancels its press, as clickable does.
    if (this.press && !this.options.enabled()) this.set(false);
  }

  private set(press: boolean) {
    if (this.press === press) return;
    this.press = press;
    this.options.onChange(press);
  }

  /** @internal */
  handleEvent(event: Event) {
    switch (event.type) {
      case 'pointerdown':
        if ((event as PointerEvent).button === 0 && this.options.enabled()) this.set(true);
        break;
      case 'pointerup':
      case 'pointercancel':
      case 'pointerleave':
      case 'keyup':
      case 'focusout':
        this.set(false);
        break;
      case 'keydown': {
        const key = (event as KeyboardEvent).key;
        if (
          (this.options.keys ?? [' ', 'Enter']).includes(key) &&
          !(event as KeyboardEvent).repeat &&
          event.target === this.host &&
          this.options.enabled()
        ) {
          this.set(true);
        }
        break;
      }
    }
  }
}
