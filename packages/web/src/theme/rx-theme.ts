import {LitElement, html} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import {createScheme, type SchemeVariant, type SpecVersion} from './scheme.js';

export type ThemeMode = 'system' | 'light' | 'dark';

/**
 * Gives everything inside it a color scheme generated from one seed color.
 * Without `source` it changes nothing and the page theme shows through.
 *
 * Light or dark comes from the `theme` attribute. With `theme="system"` (the
 * default) it follows `data-theme` on `<html>` when set, otherwise the OS.
 *
 * @example
 * <rx-theme source="#0b57d0" variant="vibrant">...</rx-theme>
 */
@customElement('rx-theme')
export class RxTheme extends LitElement {
  /** Seed color as hex. */
  @property() source?: string;

  @property() variant: SchemeVariant = 'tonal-spot';

  /** -1 (reduced) to 1 (high). 0 is standard, 0.5 medium, 1 high. */
  @property({type: Number}) contrast = 0;

  @property() spec: SpecVersion = '2025';

  @property() theme: ThemeMode = 'system';

  private readonly sheet = new CSSStyleSheet();
  private readonly media = matchMedia('(prefers-color-scheme: dark)');
  private readonly rootObserver = new MutationObserver(() => this.requestUpdate());
  private readonly onMediaChange = () => this.requestUpdate();

  override connectedCallback() {
    super.connectedCallback();
    this.media.addEventListener('change', this.onMediaChange);
    this.rootObserver.observe(document.documentElement, {attributeFilter: ['data-theme']});
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.media.removeEventListener('change', this.onMediaChange);
    this.rootObserver.disconnect();
  }

  /** Whether the dark scheme is in use right now. */
  get dark(): boolean {
    if (this.theme === 'light' || this.theme === 'dark') return this.theme === 'dark';
    const page = document.documentElement.dataset.theme;
    if (page === 'light' || page === 'dark') return page === 'dark';
    return this.media.matches;
  }

  protected override createRenderRoot() {
    const root = super.createRenderRoot() as ShadowRoot;
    root.adoptedStyleSheets = [...root.adoptedStyleSheets, this.sheet];
    return root;
  }

  protected override willUpdate() {
    const dark = this.dark;
    let vars = '';
    if (this.source) {
      const scheme = createScheme(
        {source: this.source, variant: this.variant, contrast: this.contrast, spec: this.spec},
        dark,
      );
      vars = Object.entries(scheme)
        .map(([k, v]) => `${k}: ${v};`)
        .join(' ');
      vars = `color-scheme: ${dark ? 'dark' : 'light'}; ${vars}`;
    }
    this.sheet.replaceSync(`:host { display: contents; ${vars} }`);
  }

  protected override render() {
    return html`<slot></slot>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'rx-theme': RxTheme;
  }
}
