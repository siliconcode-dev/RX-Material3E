/*
 * Compose's Modifier.minimumInteractiveComponentSize() (material3
 * InteractiveComponentSize.kt): a control is laid out at least 48dp in each
 * direction, with its visible part centered, so small controls still have a
 * touch target big enough to hit. LocalMinimumInteractiveComponentSize sets
 * the size there; here it is --rx-minimum-interactive-component-size, and 0
 * turns it off, as in Compose.
 */

import {css} from 'lit';

/** The default minimum interactive size, from LocalMinimumInteractiveComponentSize. */
export const MinimumInteractiveComponentSize = 48;

/**
 * Host styles for the minimum interactive size. The host is the touch
 * target; put the visible control in an element sized on its own.
 */
export const minimumInteractiveComponentSize = css`
  :host {
    display: inline-grid;
    place-items: center;
    min-width: var(--rx-minimum-interactive-component-size, 48px);
    min-height: var(--rx-minimum-interactive-component-size, 48px);
  }
`;
