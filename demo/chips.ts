import '../packages/web/src/chip/chip.js';
import '../packages/web/src/icon/icon.js';

type Kind = 'rx-assist-chip' | 'rx-suggestion-chip';

function chip(kind: Kind, label: string, options: Record<string, string | boolean> = {}) {
  const el = document.createElement(kind);
  if (options.elevated) el.elevated = true;
  if (options.disabled) el.disabled = true;
  if (typeof options.icon === 'string') {
    el.insertAdjacentHTML('beforeend', `<rx-icon slot="icon">${options.icon}</rx-icon>`);
  }
  el.append(label);
  if (typeof options.trailing === 'string') {
    el.insertAdjacentHTML(
      'beforeend',
      `<rx-icon slot="trailing-icon">${options.trailing}</rx-icon>`,
    );
  }
  return el;
}

const log = document.getElementById('log')!;
const fill = (id: string, chips: HTMLElement[]) => {
  const row = document.getElementById(id)!;
  for (const c of chips) {
    c.addEventListener('click', () => (log.textContent = `${c.textContent?.trim()} clicked`));
    row.append(c);
  }
};

fill('assist', [
  chip('rx-assist-chip', 'Assist chip'),
  chip('rx-assist-chip', 'Add to calendar', {icon: 'event'}),
  chip('rx-assist-chip', 'Directions', {icon: 'directions', trailing: 'arrow_drop_down'}),
]);
fill('assist-elevated', [
  chip('rx-assist-chip', 'Elevated', {elevated: true}),
  chip('rx-assist-chip', 'Settings', {elevated: true, icon: 'settings'}),
  chip('rx-assist-chip', 'Share', {elevated: true, icon: 'share', trailing: 'arrow_drop_down'}),
]);
fill('suggestion', [
  chip('rx-suggestion-chip', 'Sounds good'),
  chip('rx-suggestion-chip', 'See you there'),
  chip('rx-suggestion-chip', 'Nearby', {icon: 'location_on'}),
]);
fill('suggestion-elevated', [
  chip('rx-suggestion-chip', 'Elevated', {elevated: true}),
  chip('rx-suggestion-chip', 'Trending', {elevated: true, icon: 'trending_up'}),
]);
fill('disabled', [
  chip('rx-assist-chip', 'Assist', {disabled: true, icon: 'event'}),
  chip('rx-assist-chip', 'Elevated', {disabled: true, elevated: true, icon: 'settings'}),
  chip('rx-suggestion-chip', 'Suggestion', {disabled: true}),
  chip('rx-suggestion-chip', 'Elevated', {disabled: true, elevated: true}),
]);

const scroller = document.getElementById('scroller')!;
const showAll = chip('rx-assist-chip', 'Show all', {icon: 'tune'});
scroller.append(showAll);
for (let i = 0; i < 9; i++) {
  scroller.append(chip('rx-assist-chip', `Chip ${i}`, {trailing: 'arrow_drop_down'}));
}
