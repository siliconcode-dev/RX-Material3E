// Accessibility semantics on the custom element itself.
//
// Compose puts semantics on the node that draws the component (a Button's
// Modifier.semantics { role = Role.Button }). Here the host element plays
// that node: its role, tab stop and ARIA state are plain attributes on it,
// in the light DOM. So aria-labelledby, aria-describedby and <label for>
// pointing at the element work (IDs can't reach into a shadow root), and
// accessibility checkers such as axe see the attributes.

import type {ReactiveController, ReactiveControllerHost} from 'lit';

/**
 * Compose `Role`s and the ARIA roles they correspond to. Components may also
 * use any other ARIA role.
 */
export const ComposeRole = Object.freeze({
  Button: 'button',
  Checkbox: 'checkbox',
  Switch: 'switch',
  RadioButton: 'radio',
  Tab: 'tab',
  Image: 'img',
  DropdownList: 'combobox',
  ValuePicker: 'slider',
  Carousel: 'region',
});

export interface Semantics {
  /** ARIA role, or null for none. */
  role: string | null;
  /** In the tab order. Defaults to true when there is a role. */
  focusable?: boolean;
  /** Disabled: out of the tab order and aria-disabled. */
  disabled?: boolean;
  /**
   * ARIA states and properties the component owns, without the `aria-`
   * prefix: `{pressed: true, checked: 'mixed', expanded: null}`. null or
   * undefined removes the attribute; booleans become "true"/"false".
   */
  aria?: Record<string, string | number | boolean | null | undefined>;
}

/**
 * Keeps a host's role, tab stop and ARIA state in step with what `compute`
 * returns, after every update. It only writes the attributes it owns: a
 * page's own aria-label and the like stay as they are. A tabindex already on
 * the element (set by the page, or by a roving tabindex) is left alone while
 * the element is enabled.
 */
export class HostSemanticsController implements ReactiveController {
  private owned = new Set<string>();

  constructor(
    private readonly host: ReactiveControllerHost & HTMLElement,
    private readonly compute: () => Semantics,
  ) {
    host.addController(this);
  }

  hostConnected() {
    this.apply();
  }

  hostUpdated() {
    this.apply();
  }

  /** Writes the attributes now. */
  apply() {
    const host = this.host;
    const {role, focusable = role !== null, disabled = false, aria = {}} = this.compute();
    const next = new Map<string, string>();
    if (role !== null) next.set('role', role);
    if (disabled) next.set('aria-disabled', 'true');
    for (const [name, value] of Object.entries(aria)) {
      if (value === null || value === undefined) continue;
      next.set(`aria-${name}`, String(value));
    }
    for (const name of this.owned) {
      if (!next.has(name)) host.removeAttribute(name);
    }
    for (const [name, value] of next) {
      if (host.getAttribute(name) !== value) host.setAttribute(name, value);
    }
    this.owned = new Set(next.keys());

    if (!focusable || disabled) {
      if (host.hasAttribute('tabindex')) host.removeAttribute('tabindex');
    } else if (!host.hasAttribute('tabindex')) {
      host.setAttribute('tabindex', '0');
    }
  }
}
