// Shared internals for the components: semantics, keyboard, forms, focus
// groups and touch targets. Exported for people building their own
// components on top of the library.
export {addActivation, type ActivationKind, type ActivationOptions} from './activation.js';
export {isRtl} from './dir.js';
export {redispatchEvent} from './events.js';
export {
  FormAssociated,
  resetForm,
  submitForm,
  type FormAssociatedElement,
  type FormAssociatedMembers,
  type FormAssociatedHooks,
} from './form-associated.js';
export {ComposeRole, HostSemanticsController, type Semantics} from './host-semantics.js';
export {RovingTabindexController, type RovingTabindexOptions} from './roving-tabindex.js';
export {MinimumInteractiveComponentSize, minimumInteractiveComponentSize} from './touch-target.js';
