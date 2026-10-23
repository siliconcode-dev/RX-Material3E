import {LitElement, html} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import {afterEach, describe, expect, it} from 'vitest';
import {
  addActivation,
  FormAssociated,
  HostSemanticsController,
  resetForm,
  submitForm,
} from '../../src/internals/index.js';

/** A checkbox-like test control: value "on" when checked. */
@customElement('test-check')
class TestCheck extends FormAssociated(LitElement) {
  @property({type: Boolean, reflect: true}) checked = false;
  @property() value = 'on';
  @property({type: Boolean}) required = false;
  private defaultChecked = false;

  constructor() {
    super();
    addActivation(this, {kind: 'toggle', isDisabled: () => this.isDisabled});
    this.addEventListener('click', () => (this.checked = !this.checked));
    new HostSemanticsController(this, () => ({
      role: 'checkbox',
      disabled: this.isDisabled,
      aria: {checked: this.checked},
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
      this.internals.setValidity({valueMissing: true}, 'Tick this box');
    } else {
      this.internals.setValidity({});
    }
  }

  protected override render() {
    return html`<slot></slot>`;
  }
}

/** A submit-button-like test control. */
@customElement('test-submit')
class TestSubmit extends FormAssociated(LitElement) {
  @property() value = '';
  constructor() {
    super();
    addActivation(this, {kind: 'button', isDisabled: () => this.isDisabled});
    this.addEventListener('click', () => submitForm(this, {name: this.name, value: this.value}));
  }
  formValue() {
    // A button only adds its value when it submits the form.
    return {value: null};
  }
  formReset() {}
  formRestore() {}
}

async function mount<T extends HTMLElement>(markup: string, selector: string) {
  document.body.innerHTML = markup;
  const el = document.querySelector(selector) as T & {updateComplete: Promise<boolean>};
  await el.updateComplete;
  return el;
}

afterEach(() => document.body.replaceChildren());

describe('FormAssociated', () => {
  it('puts its value in FormData under its name, and only when it has one', async () => {
    const el = await mount<TestCheck>(
      '<form><test-check name="agree" value="yes"></test-check></form>',
      'test-check',
    );
    const form = el.form!;
    expect(form).toBe(document.querySelector('form'));
    expect([...new FormData(form)]).toEqual([]);
    el.click();
    await el.updateComplete;
    expect([...new FormData(form)]).toEqual([['agree', 'yes']]);
  });

  it('resets with the form', async () => {
    const el = await mount<TestCheck>(
      '<form><test-check name="a" checked></test-check></form>',
      'test-check',
    );
    el.click();
    await el.updateComplete;
    expect(el.checked).toBe(false);
    resetForm(el);
    await el.updateComplete;
    expect(el.checked).toBe(true);
  });

  it('is disabled by a disabled fieldset, without its own attribute changing', async () => {
    const el = await mount<TestCheck>(
      '<form><fieldset><test-check name="a"></test-check></fieldset></form>',
      'test-check',
    );
    const fieldset = document.querySelector('fieldset')!;
    fieldset.disabled = true;
    await el.updateComplete;
    expect(el.isDisabled).toBe(true);
    expect(el.disabled).toBe(false);
    expect(el.getAttribute('aria-disabled')).toBe('true');
    expect(el.hasAttribute('tabindex')).toBe(false);
    el.click();
    await el.updateComplete;
    expect(el.checked).toBe(false);
    // A disabled control is left out of the form data, as native ones are.
    expect([...new FormData(el.form!)]).toEqual([]);
    fieldset.disabled = false;
    await el.updateComplete;
    expect(el.isDisabled).toBe(false);
    expect(el.getAttribute('tabindex')).toBe('0');
  });

  it('is labelled by <label for> and a wrapping <label>', async () => {
    const el = await mount<TestCheck>(
      '<form><label for="c">Agree</label><test-check id="c"></test-check><label>Wrap <test-check></test-check></label></form>',
      'test-check',
    );
    expect([...el.labels].map((l) => l.textContent)).toEqual(['Agree']);
    const wrapped = document.querySelectorAll('test-check')[1] as TestCheck;
    expect(wrapped.labels).toHaveLength(1);
  });

  it('clicking a label clicks it once, as for a native checkbox', async () => {
    const el = await mount<TestCheck>(
      '<label><span id="text">Agree</span> <test-check>box</test-check></label>',
      'test-check',
    );
    document.getElementById('text')!.click();
    await el.updateComplete;
    expect(el.checked).toBe(true);
    // Clicking the control itself, inside its label, must not toggle twice.
    el.click();
    await el.updateComplete;
    expect(el.checked).toBe(false);
  });

  it('takes part in constraint validation', async () => {
    const el = await mount<TestCheck>(
      '<form><test-check name="a" required></test-check></form>',
      'test-check',
    );
    expect(el.willValidate).toBe(true);
    expect(el.checkValidity()).toBe(false);
    expect(el.validity.valueMissing).toBe(true);
    expect(el.validationMessage).toBe('Tick this box');
    expect(el.form!.checkValidity()).toBe(false);
    el.click();
    await el.updateComplete;
    expect(el.checkValidity()).toBe(true);
    el.setCustomValidity('Not today');
    expect(el.validity.customError).toBe(true);
    el.setCustomValidity('');
    expect(el.checkValidity()).toBe(true);
  });

  it('submits the form like a native submit button, with its name and value', async () => {
    const el = await mount<TestSubmit>(
      '<form><input name="q" value="cats" /><test-submit name="action" value="search">Go</test-submit></form>',
      'test-submit',
    );
    let submitted: [string, FormDataEntryValue][] | null = null;
    el.form!.addEventListener('submit', (event) => {
      event.preventDefault();
      submitted = [...new FormData(el.form!, event.submitter)];
    });
    el.click();
    expect(submitted).toEqual([
      ['q', 'cats'],
      ['action', 'search'],
    ]);
    // The stand-in button is gone again.
    expect(el.form!.querySelectorAll('button')).toHaveLength(0);
  });

  it('does not submit an invalid form, as a native submit button would not', async () => {
    const el = await mount<TestSubmit>(
      '<form><input name="q" required /><test-submit>Go</test-submit></form>',
      'test-submit',
    );
    let submits = 0;
    el.form!.addEventListener('submit', (event) => {
      event.preventDefault();
      submits++;
    });
    el.click();
    expect(submits).toBe(0);
  });
});

export {TestCheck, TestSubmit};
