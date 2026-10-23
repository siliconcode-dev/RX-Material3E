/*
 * Ported by hand from androidx/compose/material3 Button.kt (ButtonDefaults'
 * contentPaddingFor, iconSizeFor, iconSpacingFor and textStyleFor) and
 * ToggleButton.kt (ToggleButtonDefaults.contentPaddingFor, the same values),
 * with the tokens ButtonXSmallTokens to ButtonXLargeTokens.
 * Copyright 2024-2025 The Android Open Source Project. Licensed under the Apache License 2.0.
 */

import large from '@rx-m3e/tokens/js/button-large.js';
import medium from '@rx-m3e/tokens/js/button-medium.js';
import small from '@rx-m3e/tokens/js/button-small.js';
import xLarge from '@rx-m3e/tokens/js/button-x-large.js';
import xSmall from '@rx-m3e/tokens/js/button-x-small.js';
import {css, unsafeCSS} from 'lit';

/** The expressive sizes, by container height: 32, 40, 56, 96 and 136dp. */
export type ButtonSize = 'xs' | 's' | 'm' | 'l' | 'xl';

/** The label's text style: a typescale role (textStyleFor). */
export function typescale(role: string) {
  const token = (name: string) => `var(--md-sys-typescale-${role}-${name})`;
  return unsafeCSS(`
    --_type-font: ${token('font')};
    --_type-weight: ${token('weight')};
    --_type-size: ${token('size')};
    --_type-line-height: ${token('line-height')};
    --_type-tracking: ${token('tracking')};
  `);
}

/**
 * The layout of each size, for a host with a `size` attribute: the height
 * (`--_height`), contentPaddingFor (`--_padding-start`, `--_padding-end`,
 * `--_padding-block`), iconSizeFor (`--_icon-size`), iconSpacingFor
 * (`--_icon-space`) and textStyleFor (`--_type-*`). With an icon the
 * padding is the same: the icon paddings equal the leading and trailing
 * space unless precision pointer sizing is on, and it is off.
 */
export const buttonSizeStyles = css`
  :host([size='xs']) {
    --_height: ${unsafeCSS(xSmall['container-height'])};
    /* ExtraSmallContentPadding (upstream TODO: from the tokens once corrected). */
    --_padding-start: 12px;
    --_padding-end: 12px;
    --_padding-block: 6px;
    --_icon-size: ${unsafeCSS(xSmall['icon-size'])};
    /* ExtraSmallIconSpacing (upstream TODO: from the tokens once corrected). */
    --_icon-space: 4px;
    ${typescale('label-large')}
  }

  :host([size='s']) {
    --_height: ${unsafeCSS(small['container-height'])};
    --_padding-start: ${unsafeCSS(small['leading-space'])};
    --_padding-end: ${unsafeCSS(small['trailing-space'])};
    --_padding-block: 10px;
    --_icon-size: ${unsafeCSS(small['icon-size'])};
    --_icon-space: ${unsafeCSS(small['icon-label-space'])};
    ${typescale('label-large')}
  }

  :host([size='m']) {
    --_height: ${unsafeCSS(medium['container-height'])};
    --_padding-start: ${unsafeCSS(medium['leading-space'])};
    --_padding-end: ${unsafeCSS(medium['trailing-space'])};
    --_padding-block: 16px;
    --_icon-size: ${unsafeCSS(medium['icon-size'])};
    --_icon-space: ${unsafeCSS(medium['icon-label-space'])};
    ${typescale('title-medium')}
  }

  :host([size='l']) {
    --_height: ${unsafeCSS(large['container-height'])};
    --_padding-start: ${unsafeCSS(large['leading-space'])};
    --_padding-end: ${unsafeCSS(large['trailing-space'])};
    --_padding-block: 32px;
    --_icon-size: ${unsafeCSS(large['icon-size'])};
    --_icon-space: ${unsafeCSS(large['icon-label-space'])};
    ${typescale('headline-small')}
  }

  /* ExtraLargeContentPadding: the tokens' sides, 48dp vertical. */
  :host([size='xl']) {
    --_height: ${unsafeCSS(xLarge['container-height'])};
    --_padding-start: ${unsafeCSS(xLarge['leading-space'])};
    --_padding-end: ${unsafeCSS(xLarge['trailing-space'])};
    --_padding-block: 48px;
    --_icon-size: ${unsafeCSS(xLarge['icon-size'])};
    --_icon-space: ${unsafeCSS(xLarge['icon-label-space'])};
    ${typescale('headline-large')}
  }
`;
