// A roving tabindex: a group of controls (button groups, chips, segmented
// buttons, tabs, toolbars) takes one Tab stop, and the arrow keys move
// between its items, as the ARIA Authoring Practices describe for
// composite widgets.

import type {ReactiveController, ReactiveControllerHost} from 'lit';
import {isRtl} from './dir.js';

export interface RovingTabindexOptions {
  /** The items, in order. */
  items: () => HTMLElement[];
  /** Which arrow keys move: left/right, up/down, or both. Defaults to horizontal. */
  orientation?: 'horizontal' | 'vertical' | 'both';
  /** Whether moving past the last item goes to the first. Defaults to true. */
  wrap?: boolean;
  /** Items to skip. Defaults to items with `disabled` or aria-disabled="true". */
  isDisabled?: (item: HTMLElement) => boolean;
  /**
   * The item that should hold the Tab stop when focus is outside the group
   * (a selected tab, a checked radio). Defaults to the last one focused.
   */
  preferred?: () => HTMLElement | null | undefined;
}

const defaultDisabled = (item: HTMLElement) =>
  (item as {disabled?: boolean}).disabled === true || item.getAttribute('aria-disabled') === 'true';

/**
 * Gives one item tabindex="0" and the rest tabindex="-1", moves focus with
 * the arrow keys (left and right swap in right-to-left text), Home and End,
 * and remembers the last focused item. Call {@link sync} when the items or
 * their disabled state change; the host's updates also sync.
 */
export class RovingTabindexController implements ReactiveController {
  private current: HTMLElement | null = null;
  private readonly isDisabled: (item: HTMLElement) => boolean;

  constructor(
    private readonly host: ReactiveControllerHost & HTMLElement,
    private readonly options: RovingTabindexOptions,
  ) {
    this.isDisabled = options.isDisabled ?? defaultDisabled;
    host.addController(this);
  }

  hostConnected() {
    this.host.addEventListener('keydown', this.onKeyDown);
    this.host.addEventListener('focusin', this.onFocusIn);
    this.sync();
  }

  hostDisconnected() {
    this.host.removeEventListener('keydown', this.onKeyDown);
    this.host.removeEventListener('focusin', this.onFocusIn);
  }

  hostUpdated() {
    this.sync();
  }

  /** The item holding the Tab stop. */
  get activeItem(): HTMLElement | null {
    return this.current;
  }

  private enabledItems() {
    return this.options.items().filter((item) => !this.isDisabled(item));
  }

  /** Reassigns the Tab stop: the preferred item, else the current one, else the first enabled. */
  sync() {
    const items = this.options.items();
    const enabled = items.filter((item) => !this.isDisabled(item));
    const preferred = this.options.preferred?.();
    const focusInside = items.some((item) => item.matches(':focus-within'));
    let active: HTMLElement | null;
    if (!focusInside && preferred && enabled.includes(preferred)) active = preferred;
    else if (this.current && enabled.includes(this.current)) active = this.current;
    else active = enabled[0] ?? null;
    this.current = active;
    for (const item of items) {
      if (this.isDisabled(item)) {
        // Disabled items are skipped; their own semantics decide focusability.
        if (item.getAttribute('tabindex') === '0') item.setAttribute('tabindex', '-1');
        continue;
      }
      item.setAttribute('tabindex', item === active ? '0' : '-1');
    }
  }

  /** Moves the Tab stop (and focus) to `item`. */
  focusItem(item: HTMLElement) {
    this.current = item;
    this.sync();
    item.focus();
  }

  private readonly onFocusIn = (event: FocusEvent) => {
    const item = this.options
      .items()
      .find((it) => it === event.target || it.contains(event.target as Node));
    if (item && !this.isDisabled(item) && item !== this.current) {
      this.current = item;
      this.sync();
    }
  };

  private readonly onKeyDown = (event: KeyboardEvent) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.defaultPrevented) return;
    const items = this.enabledItems();
    const from = items.findIndex((it) => it === event.target || it.contains(event.target as Node));
    if (from < 0 || items.length === 0) return;
    const {orientation = 'horizontal', wrap = true} = this.options;
    const horizontal = orientation !== 'vertical';
    const vertical = orientation !== 'horizontal';
    const rtl = isRtl(this.host);
    let step = 0;
    let to = -1;
    switch (event.key) {
      case 'ArrowRight':
        if (horizontal) step = rtl ? -1 : 1;
        break;
      case 'ArrowLeft':
        if (horizontal) step = rtl ? 1 : -1;
        break;
      case 'ArrowDown':
        if (vertical) step = 1;
        break;
      case 'ArrowUp':
        if (vertical) step = -1;
        break;
      case 'Home':
        to = 0;
        break;
      case 'End':
        to = items.length - 1;
        break;
      default:
        return;
    }
    if (step !== 0) {
      to = from + step;
      if (to < 0 || to >= items.length) {
        if (!wrap) {
          event.preventDefault();
          return;
        }
        to = (to + items.length) % items.length;
      }
    }
    if (to < 0) return;
    event.preventDefault();
    this.focusItem(items[to]);
  };
}
