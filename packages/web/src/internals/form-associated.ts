// Form participation for custom elements, through ElementInternals: the
// element's value goes into its form's FormData, <form>.reset() and
// <fieldset disabled> reach it, <label for> labels it, and constraint
// validation works as on native controls.

import type {LitElement} from 'lit';
import {property, state} from 'lit/decorators.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Constructor<T = object> = abstract new (...args: any[]) => T;

/** What a form-associated element shows to the outside. */
export interface FormAssociatedElement {
  /** The name its value is submitted under. */
  name: string;
  /** Disabled by its own attribute. */
  disabled: boolean;
  /** Disabled by its own attribute or by a disabled <fieldset> around it. */
  readonly isDisabled: boolean;
  readonly form: HTMLFormElement | null;
  readonly labels: NodeList;
  readonly validity: ValidityState;
  readonly validationMessage: string;
  readonly willValidate: boolean;
  checkValidity(): boolean;
  reportValidity(): boolean;
  setCustomValidity(message: string): void;
}

/** The hooks a subclass fills in. */
export interface FormAssociatedHooks {
  /**
   * The value to submit, or null for none (an unchecked checkbox). A
   * FormData submits several entries. `state` is what the browser keeps for
   * restoring the control after navigation; it defaults to the value.
   */
  formValue(): {value: File | string | FormData | null; state?: File | string | FormData | null};
  /** Called by <form>.reset(): go back to the initial value. */
  formReset(): void;
  /** Called when the browser restores the control (back/forward, autofill). */
  formRestore(state: File | string | FormData | null, mode: 'restore' | 'autocomplete'): void;
}

/** The members FormAssociated adds, as a class type for the mixin's return value. */
export declare abstract class FormAssociatedMembers implements FormAssociatedElement {
  static formAssociated: boolean;
  /** @internal */
  readonly internals: ElementInternals;
  name: string;
  disabled: boolean;
  get isDisabled(): boolean;
  get form(): HTMLFormElement | null;
  get labels(): NodeList;
  get validity(): ValidityState;
  get validationMessage(): string;
  get willValidate(): boolean;
  checkValidity(): boolean;
  reportValidity(): boolean;
  setCustomValidity(message: string): void;
  abstract formValue(): ReturnType<FormAssociatedHooks['formValue']>;
  abstract formReset(): void;
  abstract formRestore(
    state: File | string | FormData | null,
    mode: 'restore' | 'autocomplete',
  ): void;
}

/**
 * Makes a Lit element a form-associated custom element. The subclass
 * implements {@link FormAssociatedHooks}; the value is sent to the form after
 * every update. Validity is set through `internals.setValidity`.
 */
export function FormAssociated<T extends Constructor<LitElement>>(Base: T) {
  abstract class FormAssociatedElementImpl extends Base implements FormAssociatedElement {
    static formAssociated = true;

    /** @internal */
    readonly internals: ElementInternals = this.attachInternals();

    @property({reflect: true}) name = '';

    @property({type: Boolean, reflect: true}) disabled = false;

    /** Disabled by an enclosing <fieldset disabled>. */
    @state() private formDisabled = false;

    get isDisabled(): boolean {
      return this.disabled || this.formDisabled;
    }

    get form() {
      return this.internals.form;
    }

    get labels() {
      return this.internals.labels;
    }

    get validity() {
      return this.internals.validity;
    }

    get validationMessage() {
      return this.internals.validationMessage;
    }

    get willValidate() {
      return this.internals.willValidate;
    }

    checkValidity() {
      return this.internals.checkValidity();
    }

    reportValidity() {
      return this.internals.reportValidity();
    }

    setCustomValidity(message: string) {
      if (message) this.internals.setValidity({customError: true}, message);
      else this.internals.setValidity({});
    }

    abstract formValue(): ReturnType<FormAssociatedHooks['formValue']>;
    abstract formReset(): void;
    abstract formRestore(
      state: File | string | FormData | null,
      mode: 'restore' | 'autocomplete',
    ): void;

    protected override updated(changed: Map<PropertyKey, unknown>) {
      super.updated(changed);
      const {value, state = value} = this.formValue();
      this.internals.setFormValue(value, state);
    }

    /** @internal The browser calls this when a <fieldset> around it is disabled or enabled. */
    formDisabledCallback(disabled: boolean) {
      this.formDisabled = disabled;
    }

    /** @internal */
    formResetCallback() {
      this.formReset();
    }

    /** @internal */
    formStateRestoreCallback(
      state: File | string | FormData | null,
      mode: 'restore' | 'autocomplete',
    ) {
      this.formRestore(state, mode);
    }
  }
  return FormAssociatedElementImpl as unknown as Constructor<FormAssociatedMembers> &
    T & {formAssociated: boolean};
}

/**
 * Submits `element`'s form as if a native submit button with the element's
 * name and value were pressed: submit validation runs, a `submit` event
 * fires, and the name/value pair is in the FormData. A custom element can't
 * be a form's submitter itself, so a hidden native button stands in for the
 * moment.
 */
export function submitForm(
  element: HTMLElement & {form: HTMLFormElement | null},
  submitter: {name?: string; value?: string} = {},
) {
  const form = element.form;
  if (!form) return;
  const button = document.createElement('button');
  button.type = 'submit';
  button.hidden = true;
  if (submitter.name) {
    button.name = submitter.name;
    button.value = submitter.value ?? '';
  }
  form.append(button);
  try {
    form.requestSubmit(button);
  } finally {
    button.remove();
  }
}

/** Resets `element`'s form, as a native reset button does. */
export function resetForm(element: HTMLElement & {form: HTMLFormElement | null}) {
  element.form?.reset();
}
