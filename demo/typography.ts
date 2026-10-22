import {TYPESCALE_ROLES} from '../packages/web/src/index.js';

const SAMPLES: Record<string, string> = {
  en: 'The quick brown fox jumps over the lazy dog',
  bn: 'আমি বাংলায় গান গাই',
  hi: 'सभी मनुष्यों को गौरव और अधिकारों के मामले में जन्मजात स्वतन्त्रता प्राप्त है',
  ar: 'يولد جميع الناس أحرارًا متساوين في الكرامة والحقوق',
  ja: 'すべての人間は、生まれながらにして自由である',
  ko: '모든 인간은 태어날 때부터 자유롭다',
  'zh-CN': '人人生而自由，在尊严和权利上一律平等',
};

const form = document.getElementById('type-controls') as HTMLFormElement;
const sample = form.elements.namedItem('sample') as HTMLInputElement;
const lang = form.elements.namedItem('lang') as HTMLSelectElement;
const container = document.getElementById('specimens')!;

const px = (value: string) => `${Math.round(parseFloat(value) * 100) / 100}px`;

function metrics(el: Element) {
  const s = getComputedStyle(el);
  const tracking = s.letterSpacing === 'normal' ? '0px' : px(s.letterSpacing);
  return `${px(s.fontSize)} / ${px(s.lineHeight)} · weight ${s.fontWeight} · tracking ${tracking}`;
}

function render() {
  container.replaceChildren(
    ...TYPESCALE_ROLES.map((role) => {
      const section = document.createElement('section');
      section.className = 'specimen';
      const header = document.createElement('header');
      header.className = 'rx-typescale-label-medium';
      header.append(Object.assign(document.createElement('code'), {textContent: role}));
      section.append(header);
      // Two columns: the regular and emphasized samples, with their metrics below.
      const variants = [role, `${role}-emphasized`];
      const samples = variants.map((variant) =>
        Object.assign(document.createElement('p'), {
          className: `rx-typescale-${variant}`,
          lang: lang.value,
          dir: 'auto',
          textContent: sample.value,
        }),
      );
      const tags = variants.map(() =>
        Object.assign(document.createElement('div'), {className: 'tag rx-typescale-body-small'}),
      );
      section.append(...samples, ...tags);
      requestAnimationFrame(() => {
        tags.forEach((tag, i) => {
          tag.textContent = `${i ? 'Emphasized' : 'Regular'} · ${metrics(samples[i])}`;
        });
      });
      return section;
    }),
  );
}

sample.addEventListener('input', render);
lang.addEventListener('change', () => {
  sample.value = SAMPLES[lang.value];
  render();
});
render();
