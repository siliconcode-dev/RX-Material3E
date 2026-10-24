/*
 * Ported by hand from androidx/compose/material3 SegmentedButton.kt
 * (SingleChoiceSegmentedButtonRow, MultiChoiceSegmentedButtonRow and
 * SegmentedButtonDefaults.itemShape and BorderWidth) with Row's intrinsic
 * width for weighted items (foundation RowColumnMeasurePolicy) and the token
 * OutlinedSegmentedButtonTokens.
 * Copyright 2023-2025 The Android Open Source Project. Licensed under the Apache License 2.0.
 */

import tokens from '@rx-m3e/tokens/js/outlined-segmented-button.js';
import {LitElement, css, html, unsafeCSS} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import {HostSemanticsController} from '../internals/host-semantics.js';

/** Single (one button on at a time, the default) or multi (each on its own). */
export type SegmentedButtonSelection = 'single' | 'multi';

interface Segment extends HTMLElement {
  checked?: boolean;
  minIntrinsicWidth?: () => number;
}

/**
 * A Material 3 segmented button row, as Compose's
 * SingleChoiceSegmentedButtonRow and MultiChoiceSegmentedButtonRow: its
 * `<rx-segmented-button>`s in a row, their borders overlapping, the first
 * and last rounded at the outer ends (SegmentedButtonDefaults.itemShape).
 *
 * The buttons are all as wide as the widest one: by default the row is as
 * narrow as Compose's `width(IntrinsicSize.Min)` makes it, which fits each
 * label's longest word, so a label of several words wraps. Give the set a
 * width (`width: 100%`, say) to spread the buttons out.
 *
 * With `selection="single"` (the default) one button is on at a time and
 * they are radio buttons in a radio group; pressing the one that is on
 * keeps it on. With `selection="multi"` each toggles on its own.
 *
 * @example
 * <rx-segmented-button-set>
 *   <rx-segmented-button checked>Day</rx-segmented-button>
 *   <rx-segmented-button>Week</rx-segmented-button>
 *   <rx-segmented-button>Month</rx-segmented-button>
 * </rx-segmented-button-set>
 *
 * @slot - The segmented buttons.
 */
@customElement('rx-segmented-button-set')
export class RxSegmentedButtonSet extends LitElement {
  /** One button on at a time (`single`, the default) or any number (`multi`). */
  @property({reflect: true}) selection: SegmentedButtonSelection = 'single';

  private items: Segment[] = [];
  private readonly mutations = new MutationObserver(() => this.measure());
  private readonly resizes = new ResizeObserver(() => this.measure());
  private readonly onFonts = () => this.measure();

  constructor() {
    super();
    // selectableGroup() on the single-choice row.
    new HostSemanticsController(this, () => ({
      role: this.selection === 'single' ? 'radiogroup' : null,
      focusable: false,
    }));
    this.addEventListener('change', this.onItemChange);
  }

  static override styles = css`
    /*
     * The Row: width(IntrinsicSize.Min) (set from script, as wide as the
     * widest button times the count, within the space there is),
     * defaultMinSize(minHeight = ContainerHeight), centered vertically, the
     * buttons weight(1f) and spacedBy(-BorderWidth). The overlap is a
     * negative margin of half the border on each side of every button and a
     * padding of half the border on the row, so all the buttons are the same
     * width.
     */
    :host {
      --_space: ${unsafeCSS(tokens['outline-width'])};
      display: inline-grid;
      grid-auto-flow: column;
      grid-auto-columns: minmax(0, 1fr);
      align-items: center;
      box-sizing: border-box;
      width: var(--_intrinsic-width, max-content);
      max-width: 100%;
      min-height: ${unsafeCSS(tokens['container-height'])};
      padding-inline: calc(var(--_space) / 2);
      vertical-align: middle;
    }

    ::slotted(*) {
      margin-inline: calc(var(--_space) / -2);
      /*
       * The row's fixed widths win over ButtonDefaults.MinWidth and the
       * touch target's width, which stays centered on a narrower button.
       */
      min-width: 0;
      --_min-width: 0px;
    }

    /* itemShape(index, count): the inner ends are square. */
    ::slotted(:not(:first-child)) {
      --_start-corner: 0px;
    }

    ::slotted(:not(:last-child)) {
      --_end-corner: 0px;
    }
  `;

  override connectedCallback() {
    super.connectedCallback();
    this.mutations.observe(this, {subtree: true, childList: true, characterData: true});
    this.resizes.observe(this);
    document.fonts?.addEventListener('loadingdone', this.onFonts);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.mutations.disconnect();
    this.resizes.disconnect();
    document.fonts?.removeEventListener('loadingdone', this.onFonts);
  }

  // Single selection: turning one on turns the others off.
  private readonly onItemChange = (event: Event) => {
    const item = this.items.find((i) => event.composedPath().includes(i));
    if (this.selection !== 'single' || !item?.checked) return;
    for (const other of this.items) {
      if (other !== item && other.checked) other.checked = false;
    }
  };

  protected override updated() {
    this.markRadios();
    this.measure();
  }

  // Single selection makes the buttons radio buttons. The attribute, so it
  // also reaches buttons that upgrade later.
  private markRadios() {
    for (const item of this.items) item.toggleAttribute('radio', this.selection === 'single');
  }

  private onSlotChange(event: Event) {
    this.items = (event.target as HTMLSlotElement)
      .assignedElements()
      .filter((e): e is Segment => e instanceof HTMLElement);
    this.markRadios();
    this.measure();
  }

  /**
   * Row's minIntrinsicWidth with weighted items: the widest button's
   * minIntrinsicWidth times the count, less the overlaps. Measured when the
   * buttons change, render or resize, and when their content or fonts change.
   */
  measure() {
    const widths = this.items.map((i) => i.minIntrinsicWidth?.() ?? 0);
    const widest = Math.max(0, ...widths);
    // Not rendered (display: none, say): keep the last width.
    if (widest === 0) return;
    const space = Math.round(parseFloat(getComputedStyle(this).getPropertyValue('--_space')));
    const width = widest * widths.length - (widths.length - 1) * (space || 0);
    const value = `${width}px`;
    if (this.style.getPropertyValue('--_intrinsic-width') !== value) {
      this.style.setProperty('--_intrinsic-width', value);
    }
  }

  protected override render() {
    return html`<slot @slotchange=${this.onSlotChange}></slot>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'rx-segmented-button-set': RxSegmentedButtonSet;
  }
}
