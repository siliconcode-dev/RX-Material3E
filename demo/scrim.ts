import '../packages/web/src/scrim/scrim.js';
import type {RxScrim} from '../packages/web/src/scrim/index.js';

const scrim = document.getElementById('sheet-scrim') as RxScrim;
const sheet = document.getElementById('sheet')!;
const opener = document.getElementById('open-sheet')!;

function setOpen(open: boolean) {
  scrim.open = open;
  sheet.classList.toggle('open', open);
  sheet.toggleAttribute('inert', !open);
  if (open) document.getElementById('close-sheet')!.focus();
  else opener.focus();
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
