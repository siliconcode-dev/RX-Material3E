import '../packages/web/src/ripple/ripple.js';
import '../packages/web/src/focus/focus-ring.js';

// Give every stand-in control a ripple and a focus ring.
for (const control of document.querySelectorAll('.tap')) {
  control.append(document.createElement('rx-ripple'), document.createElement('rx-focus-ring'));
  if (control.classList.contains('item')) control.lastElementChild!.setAttribute('inward', '');
}

// Slow motion: while it's on, every ripple animation (grow and fade out) runs at 1/5 speed.
const slow = document.getElementById('slow') as HTMLInputElement;
const ripples = [...document.querySelectorAll('rx-ripple')];
function slowDown() {
  if (!slow.checked) return;
  for (const ripple of ripples) {
    for (const animation of ripple.shadowRoot?.getAnimations() ?? []) {
      if (animation.playbackRate === 1) animation.updatePlaybackRate(0.2);
    }
  }
  requestAnimationFrame(slowDown);
}
slow.addEventListener('change', slowDown);
