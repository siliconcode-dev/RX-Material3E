import {LitElement, css, html} from 'lit';
import '../packages/web/src/icon/icon.js';
import '../packages/web/src/surface/surface.js';
import '../packages/web/src/focus/focus-ring.js';
import {
  addActivation,
  ComposeRole,
  FormAssociated,
  HostSemanticsController,
  minimumInteractiveComponentSize,
  resetForm,
  RovingTabindexController,
  submitForm,
} from '../packages/web/src/internals/index.js';

/** A minimal checkbox made from the building blocks (not the real one: that is step 51). */
class DemoCheck extends FormAssociated(LitElement) {
  static override properties = {
    checked: {type: Boolean, reflect: true},
    required: {type: Boolean},
    value: {},
  };
  declare checked: boolean;
  declare required: boolean;
  declare value: string;
  private defaultChecked = false;

  static override styles = [
    minimumInteractiveComponentSize,
    css`
      :host {
        position: relative;
        cursor: pointer;
        border-radius: 50%;
        outline: none;
      }
      :host([aria-disabled='true']) {
        cursor: default;
        opacity: 0.38;
      }
      .box {
        display: grid;
        place-items: center;
        box-sizing: border-box;
        width: 18px;
        height: 18px;
        border: 2px solid var(--md-sys-color-on-surface-variant);
        border-radius: 2px;
        color: var(--md-sys-color-on-primary);
        font: 700 14px/1 sans-serif;
      }
      :host([checked]) .box {
        border-color: var(--md-sys-color-primary);
        background: var(--md-sys-color-primary);
      }
    `,
  ];

  constructor() {
    super();
    this.checked = false;
    this.required = false;
    this.value = 'on';
    addActivation(this, {kind: 'toggle', isDisabled: () => this.isDisabled});
    this.addEventListener('click', () => {
      this.checked = !this.checked;
      this.dispatchEvent(new Event('change', {bubbles: true}));
    });
    new HostSemanticsController(this, () => ({
      role: ComposeRole.Checkbox,
      disabled: this.isDisabled,
      aria: {checked: this.checked, required: this.required || null},
    }));
  }

  override connectedCallback() {
    super.connectedCallback();
    this.defaultChecked = this.hasAttribute('checked');
  }

  formValue() {
    return {value: this.checked ? this.value : null, state: String(this.checked)};
  }
  formReset() {
    this.checked = this.defaultChecked;
  }
  formRestore(state: unknown) {
    this.checked = state === 'true';
  }

  protected override updated(changed: Map<PropertyKey, unknown>) {
    super.updated(changed);
    if (this.required && !this.checked) {
      this.internals.setValidity({valueMissing: true}, 'Please tick this box.');
    } else {
      this.internals.setValidity({});
    }
  }

  protected override render() {
    return html`<div class="box">${this.checked ? '✓' : ''}</div>
      <rx-focus-ring></rx-focus-ring>`;
  }
}
customElements.define('demo-check', DemoCheck);

/** A minimal button made from the building blocks (the real one is step 18). */
class DemoButton extends FormAssociated(LitElement) {
  static override properties = {type: {}, value: {}};
  declare type: 'button' | 'submit' | 'reset';
  declare value: string;

  static override styles = css`
    :host {
      position: relative;
      display: inline-grid;
      place-items: center;
      min-height: 40px;
      padding: 0 24px;
      border-radius: 20px;
      background: var(--md-sys-color-primary);
      color: var(--md-sys-color-on-primary);
      cursor: pointer;
      font: var(--md-sys-typescale-label-large-weight) var(--md-sys-typescale-label-large-size) /
        var(--md-sys-typescale-label-large-line-height) var(--md-sys-typescale-label-large-font);
      outline: none;
    }
    :host([type='reset']) {
      background: var(--md-sys-color-secondary-container);
      color: var(--md-sys-color-on-secondary-container);
    }
  `;

  constructor() {
    super();
    this.type = 'button';
    this.value = '';
    addActivation(this, {kind: 'button', isDisabled: () => this.isDisabled});
    this.addEventListener('click', () => {
      if (this.type === 'submit') submitForm(this, {name: this.name, value: this.value});
      else if (this.type === 'reset') resetForm(this);
    });
    new HostSemanticsController(this, () => ({
      role: ComposeRole.Button,
      disabled: this.isDisabled,
    }));
  }

  formValue() {
    return {value: null};
  }
  formReset() {}
  formRestore() {}

  protected override render() {
    return html`<slot></slot><rx-focus-ring></rx-focus-ring>`;
  }
}
customElements.define('demo-button', DemoButton);

/** A toolbar with a roving tabindex. */
class DemoToolbar extends LitElement {
  constructor() {
    super();
    new RovingTabindexController(this, {items: () => [...this.querySelectorAll('rx-surface')]});
    new HostSemanticsController(this, () => ({role: 'toolbar', focusable: false}));
  }
  protected override render() {
    return html`<slot></slot>`;
  }
}
customElements.define('demo-toolbar', DemoToolbar);

const form = document.getElementById('form') as HTMLFormElement;
const output = document.getElementById('form-output')!;
form.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = [...new FormData(form, event.submitter)].map(([k, v]) => `${k}=${String(v)}`);
  output.textContent = `Submitted: ${data.join('&')}`;
});
form.addEventListener('reset', () => {
  output.textContent = 'The form was reset.';
});
form.addEventListener(
  'invalid',
  (event) => {
    output.textContent = `Not sent: ${(event.target as DemoCheck).validationMessage}`;
  },
  true,
);
document.getElementById('disable-fieldset')!.addEventListener('change', (event) => {
  (document.getElementById('fieldset') as HTMLFieldSetElement).disabled = (
    event.target as HTMLInputElement
  ).checked;
});
