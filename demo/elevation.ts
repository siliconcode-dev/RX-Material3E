import '../packages/web/src/elevation/elevation.js';

const DP = [0, 1, 3, 6, 8, 12];

document.getElementById('levels')!.append(
  ...DP.map((dp, level) => {
    const surface = document.createElement('div');
    surface.className = 'surface';
    const elevation = document.createElement('rx-elevation');
    elevation.level = level;
    surface.append(
      elevation,
      Object.assign(document.createElement('span'), {
        className: 'rx-typescale-title-medium',
        textContent: `Level ${level}`,
      }),
      Object.assign(document.createElement('small'), {
        className: 'rx-typescale-body-small',
        textContent: `${dp}dp`,
      }),
    );
    return surface;
  }),
);

const slider = document.getElementById('dp') as HTMLInputElement;
const out = document.getElementById('dp-out')!;
const live = document.getElementById('live-elevation')!;
slider.addEventListener('input', () => {
  out.textContent = slider.value;
  live.style.setProperty('--rx-elevation', `${slider.value}px`);
});
