// Shared internals for the components: semantics, keyboard, forms, focus
// groups and touch targets. Exported for people building their own
// components on top of the library.
export {addActivation, type ActivationKind, type ActivationOptions} from './activation.js';
export {
  AnimatedShapeState,
  applyCornerShape,
  clearCornerShape,
  cornerShapesEqual,
  cornerSizeToPx,
  lerpCornerShape,
  parseCornerShape,
  type CornerShape,
  type CornerSize,
} from './animated-shape.js';
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
export {
  InteractionElevationController,
  type InteractionElevationOptions,
  type InteractionElevations,
} from './interaction-elevation.js';
export {InteractionShapeController, type InteractionShapeOptions} from './interaction-shape.js';
export {PressInteractionController, type PressInteractionOptions} from './press-interaction.js';
export {RovingTabindexController, type RovingTabindexOptions} from './roving-tabindex.js';
export {MinimumInteractiveComponentSize, minimumInteractiveComponentSize} from './touch-target.js';
