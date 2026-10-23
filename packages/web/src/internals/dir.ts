/** Whether `element` lays out right to left (from CSS `direction`, which follows `dir`). */
export function isRtl(element: Element): boolean {
  return getComputedStyle(element).direction === 'rtl';
}
