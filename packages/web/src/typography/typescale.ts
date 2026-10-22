import {css, unsafeCSS, type CSSResult} from 'lit';

/**
 * The Material typescale roles. Each `-emphasized` role is the Material 3
 * Expressive variant: same size, heavier weight.
 */
export const TYPESCALE_ROLES = [
  'display-large',
  'display-medium',
  'display-small',
  'headline-large',
  'headline-medium',
  'headline-small',
  'title-large',
  'title-medium',
  'title-small',
  'body-large',
  'body-medium',
  'body-small',
  'label-large',
  'label-medium',
  'label-small',
] as const;

export type BaseTypescaleRole = (typeof TYPESCALE_ROLES)[number];
export type TypescaleRole = BaseTypescaleRole | `${BaseTypescaleRole}-emphasized`;

export const ALL_TYPESCALE_ROLES: readonly TypescaleRole[] = TYPESCALE_ROLES.flatMap((role) => [
  role,
  `${role}-emphasized` as const,
]);

/** CSS declarations that set a role's font family, size, line height, weight and tracking. */
export function typescale(role: TypescaleRole): CSSResult {
  const v = (part: string) => `var(--md-sys-typescale-${role}-${part})`;
  return unsafeCSS(
    `font-family: ${v('font')}; font-size: ${v('size')}; line-height: ${v('line-height')}; ` +
      `font-weight: ${v('weight')}; letter-spacing: ${v('tracking')};`,
  );
}

/**
 * The `.rx-typescale-<role>` classes for use inside a shadow root. Outside
 * components, use `@rx-m3e/tokens/typescale.css` instead.
 */
export const typescaleStyles: CSSResult = css`
  ${unsafeCSS(ALL_TYPESCALE_ROLES.map((role) => `.rx-typescale-${role} { ${typescale(role)} }`).join('\n'))}
`;
