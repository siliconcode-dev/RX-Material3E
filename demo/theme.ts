import {
  SCHEME_VARIANTS,
  applyTheme,
  removeTheme,
  sourceFromImage,
  type RxTheme,
  type SchemeVariant,
  type SpecVersion,
  type ThemeOptions,
} from '../packages/web/src/index.js';

// Background roles paired with the text role meant to sit on them.
const ROLES: [string, string][] = [
  ['primary', 'on-primary'],
  ['primary-container', 'on-primary-container'],
  ['secondary', 'on-secondary'],
  ['secondary-container', 'on-secondary-container'],
  ['tertiary', 'on-tertiary'],
  ['tertiary-container', 'on-tertiary-container'],
  ['error', 'on-error'],
  ['error-container', 'on-error-container'],
  ['primary-fixed', 'on-primary-fixed'],
  ['secondary-fixed', 'on-secondary-fixed'],
  ['tertiary-fixed', 'on-tertiary-fixed'],
  ['surface-dim', 'on-surface'],
  ['surface', 'on-surface'],
  ['surface-bright', 'on-surface'],
  ['surface-container-lowest', 'on-surface'],
  ['surface-container-low', 'on-surface'],
  ['surface-container', 'on-surface'],
  ['surface-container-high', 'on-surface'],
  ['surface-container-highest', 'on-surface-variant'],
  ['inverse-surface', 'inverse-on-surface'],
  ['outline', 'surface'],
  ['outline-variant', 'on-surface'],
];

function fillRoles(container: Element) {
  container.replaceChildren(
    ...ROLES.map(([bg, fg]) => {
      const div = document.createElement('div');
      div.className = 'role';
      div.style.background = `var(--md-sys-color-${bg})`;
      div.style.color = `var(--md-sys-color-${fg})`;
      div.append(bg, Object.assign(document.createElement('code'), {textContent: ''}));
      return div;
    }),
  );
}

/** Shows each role's resolved hex value under its name. */
function showValues(container: Element) {
  for (const role of container.querySelectorAll<HTMLElement>('.role')) {
    const rgb = getComputedStyle(role).backgroundColor.match(/\d+/g)!.slice(0, 3);
    role.querySelector('code')!.textContent =
      '#' + rgb.map((n) => Number(n).toString(16).padStart(2, '0')).join('');
  }
}

const form = document.getElementById('controls') as HTMLFormElement;
const field = <T extends HTMLElement>(name: string) => form.elements.namedItem(name) as T;
const picker = field<HTMLInputElement>('source');
const hex = field<HTMLInputElement>('hex');
const variant = field<HTMLSelectElement>('variant');
const contrast = field<HTMLSelectElement>('contrast');
const spec = field<HTMLSelectElement>('spec');
const image = field<HTMLInputElement>('image');

variant.append(
  ...SCHEME_VARIANTS.map((v) => new Option(v.replace('-', ' '), v, v === 'tonal-spot')),
);

const previews = [...document.querySelectorAll<RxTheme>('#light, #dark')];
for (const p of previews) fillRoles(p.querySelector('.roles')!);

const scoped = document.getElementById('scoped')!;
for (const [seed, style] of [
  ['#0b57d0', 'tonal-spot'],
  ['#146c2e', 'vibrant'],
  ['#b3261e', 'expressive'],
] as const) {
  const theme = document.createElement('rx-theme');
  theme.source = seed;
  theme.variant = style;
  const box = document.createElement('div');
  box.className = 'preview';
  box.append(Object.assign(document.createElement('h3'), {textContent: `${seed} · ${style}`}));
  const roles = document.createElement('div');
  roles.className = 'roles';
  box.append(roles);
  theme.append(box);
  scoped.append(theme);
  fillRoles(roles);
  theme.updateComplete.then(() => showValues(roles));
}

function options(): ThemeOptions {
  return {
    source: picker.value,
    variant: variant.value as SchemeVariant,
    contrast: Number(contrast.value),
    spec: spec.value as SpecVersion,
  };
}

/** Regenerates the previews, and the whole page unless `page` is false. */
async function update(page = true) {
  const opts = options();
  if (page) applyTheme(opts);
  for (const p of previews) Object.assign(p, opts);
  await Promise.all(previews.map((p) => p.updateComplete));
  for (const p of previews) showValues(p);
}

picker.addEventListener('input', () => {
  hex.value = picker.value;
  update();
});
hex.addEventListener('change', () => {
  if (/^#[0-9a-f]{6}$/i.test(hex.value)) {
    picker.value = hex.value.toLowerCase();
    update();
  }
});
for (const select of [variant, contrast, spec]) select.addEventListener('change', () => update());

image.addEventListener('change', async () => {
  const file = image.files?.[0];
  if (!file) return;
  const img = new Image();
  img.src = URL.createObjectURL(file);
  await img.decode();
  picker.value = hex.value = await sourceFromImage(img);
  URL.revokeObjectURL(img.src);
  update();
});

document.getElementById('reset-theme')!.addEventListener('click', () => {
  removeTheme();
  form.reset();
  update(false);
});

// The page starts on the default tokens; the previews start on the default seed.
update(false);
