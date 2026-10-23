/**
 * Fires a copy of `event` on `element`. Use it for events from a native
 * control inside a shadow root that don't cross the shadow boundary on their
 * own (`change` and `select` are not composed). If the copy is cancelled,
 * the original is too.
 */
export function redispatchEvent(element: Element, event: Event): boolean {
  if (event.bubbles && (!element.shadowRoot || event.composed)) event.stopPropagation();
  const copy = Reflect.construct(event.constructor, [event.type, event]) as Event;
  const dispatched = element.dispatchEvent(copy);
  if (!dispatched) event.preventDefault();
  return dispatched;
}
