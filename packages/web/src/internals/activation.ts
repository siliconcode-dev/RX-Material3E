// Keyboard activation and disabled click blocking for elements that act as
// controls without being native ones, matching what browsers do for the
// native elements.

export type ActivationKind =
  /** Like <button>: Enter clicks on key down, Space clicks on key up. */
  | 'button'
  /** Like <input type=checkbox>: Space clicks on key up; Enter does nothing. */
  | 'toggle';

export interface ActivationOptions {
  kind: ActivationKind;
  /** Whether the element is disabled right now: then no key or click gets through. */
  isDisabled: () => boolean;
  /** Whether activation is on at all (e.g. a surface that is only sometimes interactive). */
  isEnabled?: () => boolean;
}

/**
 * Makes `element` respond to the keyboard like the native control of `kind`
 * and swallows clicks while it is disabled (a disabled native control fires
 * no click). Keys only count when the element itself has focus, not a
 * control inside it. Returns a function that removes the listeners.
 */
export function addActivation(element: HTMLElement, options: ActivationOptions): () => void {
  const {kind, isDisabled, isEnabled = () => true} = options;
  // Space clicks on release, and only if it was pressed on this element.
  let spacePressed = false;
  const active = (event: Event) => isEnabled() && event.target === element;

  const onClick = (event: Event) => {
    if (isEnabled() && isDisabled()) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (!active(event) || event.altKey || event.ctrlKey || event.metaKey) return;
    if (isDisabled()) return;
    if (event.key === ' ') {
      // Space would scroll the page.
      event.preventDefault();
      spacePressed = true;
    } else if (event.key === 'Enter' && kind === 'button') {
      event.preventDefault();
      element.click();
    }
  };
  const onKeyUp = (event: KeyboardEvent) => {
    if (event.key !== ' ') return;
    const pressed = spacePressed;
    spacePressed = false;
    if (pressed && active(event) && !isDisabled()) element.click();
  };
  // Leaving the element (Tab, or focus moving away) cancels a held Space.
  const onBlur = () => (spacePressed = false);

  // Capture, and added first, so a disabled click is stopped before any
  // listener the page adds.
  element.addEventListener('click', onClick, true);
  element.addEventListener('keydown', onKeyDown);
  element.addEventListener('keyup', onKeyUp);
  element.addEventListener('blur', onBlur);
  return () => {
    element.removeEventListener('click', onClick, true);
    element.removeEventListener('keydown', onKeyDown);
    element.removeEventListener('keyup', onKeyUp);
    element.removeEventListener('blur', onBlur);
  };
}
