import '../packages/web/src/scrim/scrim.js';
import {Animatable, MotionSchemes} from '../packages/web/src/motion/index.js';
import type {RxScrim} from '../packages/web/src/scrim/index.js';

const scrim = document.getElementById('sheet-scrim') as RxScrim;
const sheet = document.getElementById('sheet')!;
const opener = document.getElementById('open-sheet')!;

// The sheet's offset below its open position, in px, as Compose's SheetState
// keeps it: an Animatable, so reopening mid-close carries on smoothly.
const offset = new Animatable(Number.POSITIVE_INFINITY);
const place = () => {
  sheet.style.translate = Number.isFinite(offset.value) ? `0 ${offset.value}px` : '0 100%';
};
// Hidden: the whole sheet below the screen (it reaches 32px past the edge).
const hiddenOffset = () => sheet.offsetHeight - 32;

function setOpen(open: boolean) {
  if (!Number.isFinite(offset.value)) offset.snapTo(hiddenOffset());
  scrim.open = open;
  sheet.toggleAttribute('inert', !open);
  // BottomSheet.kt: show on the default spatial spring, hide on fast effects.
  const scheme = MotionSchemes.expressive();
  void offset.animateTo(
    open ? 0 : hiddenOffset(),
    open ? scheme.defaultSpatial : scheme.fastEffects,
    undefined,
    place,
  );
  // Without preventScroll the browser scrolls the screen to show the
  // still-offscreen button, which jerks the content behind the sheet.
  if (open) document.getElementById('close-sheet')!.focus({preventScroll: true});
  else opener.focus({preventScroll: true});
}

opener.addEventListener('click', () => setOpen(true));
document.getElementById('close-sheet')!.addEventListener('click', () => setOpen(false));
scrim.addEventListener('click', () => setOpen(false));
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && scrim.open) setOpen(false);
});

const drag = document.getElementById('drag') as HTMLFormElement;
const dragScrim = document.getElementById('drag-scrim') as RxScrim;
drag.addEventListener('input', () => {
  const amount = Number((drag.elements.namedItem('amount') as HTMLInputElement).value);
  (drag.elements.namedItem('out') as HTMLOutputElement).value = String(amount);
  dragScrim.currentAlpha = amount / 100;
});
customElements.whenDefined('rx-scrim').then(async () => {
  await dragScrim.updateComplete;
  dragScrim.currentAlpha = 0.5;
});
