# Component catalog

This is the full list of what Google ships for Material 3 (M3) and Material 3 Expressive (M3E) on Android. Each row is one web component we will build by hand. The list is taken straight from the source:

- Jetpack Compose Material3: `androidx/androidx` @ `05311d19b0b2` (2026-10-22), `compose/material3/material3/src/commonMain`
- MDC Android: `material-components/material-components-android` @ `66b0eeb53afe` (2026-10-16), `lib/java/com/google/android/material`

Compose is the main reference because it has the newest Expressive work. MDC Android fills the few gaps (side sheet, docked toolbar).

**Legend.** Gen: `M3` is baseline Material 3, `M3E` was added or reworked by Expressive. Status: `☐` not started, `◐` in progress, `☑` done.

The order of the sections is the order we build in. Later components reuse earlier ones (for example, the menu uses list items, and the app bar uses icon buttons).

## 0. Foundations

| #    | Item                                                                  | Web output                  | Compose source                                      | MDC source                      | Gen                   | Status        |
| ---- | --------------------------------------------------------------------- | --------------------------- | --------------------------------------------------- | ------------------------------- | --------------------- | ------------- |
| 0.1  | Design tokens (palette, color, type, shape, elevation, state, motion) | `@rx-m3e/tokens` CSS + JSON | `tokens/*.kt` (119 objects)                         | `theme/`, `color/`              | M3 + M3E              | ☑             |
| 0.2  | Theme and dynamic color (seed color to scheme, contrast levels)       | `rx-theme`, `applyTheme()`  | `MaterialTheme.kt`, `ColorScheme.kt`                | `color/`                        | M3 + M3E              | ☐             |
| 0.3  | Expressive motion scheme (spring easings)                             | `--md-sys-motion-spring-*`  | `MotionScheme.kt`, `ExpressiveMotionTokens.kt`      | `motion/`                       | M3E                   | ◐ tokens only |
| 0.4  | Elevation shadows                                                     | `rx-elevation`              | `internal/Elevation.kt`                             | `elevation/`, `shadow/`         | M3                    | ☐             |
| 0.5  | State layer + ripple                                                  | `rx-ripple`                 | `Ripple.kt`                                         | `ripple/`                       | M3                    | ☐             |
| 0.6  | Focus ring                                                            | `rx-focus-ring`             | (foundation)                                        | `focus/`                        | M3                    | ☐             |
| 0.7  | Icon                                                                  | `rx-icon`                   | `Icon.kt`                                           | `imageview/`                    | M3                    | ☐             |
| 0.8  | Surface                                                               | `rx-surface`                | `Surface.kt`                                        | `card/` (MaterialCardView base) | M3                    | ☐             |
| 0.9  | Typography / Text                                                     | typescale CSS classes       | `Text.kt`, `Typography.kt`                          | `textview/`                     | M3 + M3E (emphasized) | ☐             |
| 0.10 | Shapes + shape morphing (35 expressive shapes)                        | `rx-shape`, `morph()`       | `MaterialShapes.kt`, `Shapes.kt`, `graphics-shapes` | `shape/`                        | M3E                   | ☐             |
| 0.11 | Scrim                                                                 | `rx-scrim`                  | `Scrim.kt`                                          | —                               | M3                    | ☐             |

The 35 expressive shapes in `MaterialShapes.kt`: Circle, Square, Slanted, Arch, Fan, Arrow, SemiCircle, Oval, Pill, Triangle, Diamond, ClamShell, Pentagon, Gem, Sunny, VerySunny, Cookie (4, 6, 7, 9, 12 sided), Clover (4, 8 leaf), Burst, SoftBurst, Boom, SoftBoom, Flower, Puffy, PuffyDiamond, Ghostish, PixelCircle, PixelTriangle, Bun, Heart.

## 1. Actions

| #    | Component        | Web element(s)                                                                           | Variants                                                                                              | Compose source                           | MDC source                                          | Gen      | Status |
| ---- | ---------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------- | --------------------------------------------------- | -------- | ------ |
| 1.1  | Button           | `rx-button`                                                                              | filled, tonal, elevated, outlined, text; sizes XS, S, M, L, XL; round or square; shape morph on press | `Button.kt`                              | `button/`                                           | M3 + M3E | ☐      |
| 1.2  | Toggle button    | `rx-toggle-button`                                                                       | filled, tonal, elevated, outlined; selected shape morph                                               | `ToggleButton.kt`                        | `button/`                                           | M3E      | ☐      |
| 1.3  | Icon button      | `rx-icon-button`                                                                         | standard, filled, tonal, outlined; toggle; sizes XS to XL; narrow, default, wide                      | `IconButton.kt`, `IconButtonDefaults.kt` | `button/`                                           | M3 + M3E | ☐      |
| 1.4  | Button group     | `rx-button-group`                                                                        | standard, connected; single or multi select                                                           | `ButtonGroup.kt`                         | `button/MaterialButtonGroup`                        | M3E      | ☐      |
| 1.5  | Split button     | `rx-split-button`                                                                        | sizes XS to XL; filled, tonal, elevated, outlined                                                     | `SplitButton.kt`                         | `button/MaterialSplitButton`                        | M3E      | ☐      |
| 1.6  | Segmented button | `rx-segmented-button`, `rx-segmented-button-set`                                         | single, multi select                                                                                  | `SegmentedButton.kt`                     | `button/MaterialButtonToggleGroup`                  | M3       | ☐      |
| 1.7  | FAB              | `rx-fab`                                                                                 | small (legacy), baseline, medium, large; primary, secondary, tertiary containers                      | `FloatingActionButton.kt`                | `floatingactionbutton/`                             | M3 + M3E | ☐      |
| 1.8  | Extended FAB     | `rx-fab` with `label`                                                                    | small, medium, large; expand/collapse                                                                 | `FloatingActionButton.kt`                | `floatingactionbutton/ExtendedFloatingActionButton` | M3 + M3E | ☐      |
| 1.9  | FAB menu         | `rx-fab-menu`, `rx-fab-menu-item`                                                        | toggle FAB, up to 6 items                                                                             | `FloatingActionButtonMenu.kt`            | `floatingactionbutton/`                             | M3E      | ☐      |
| 1.10 | Chips            | `rx-assist-chip`, `rx-filter-chip`, `rx-input-chip`, `rx-suggestion-chip`, `rx-chip-set` | flat, elevated                                                                                        | `Chip.kt`                                | `chip/`                                             | M3       | ☐      |

## 2. Communication

| #   | Component          | Web element(s)                               | Variants                                  | Compose source                                     | MDC source           | Gen      | Status |
| --- | ------------------ | -------------------------------------------- | ----------------------------------------- | -------------------------------------------------- | -------------------- | -------- | ------ |
| 2.1 | Badge              | `rx-badge`                                   | small dot, large with count               | `Badge.kt`                                         | `badge/`             | M3       | ☐      |
| 2.2 | Progress indicator | `rx-linear-progress`, `rx-circular-progress` | determinate, indeterminate; flat or wavy  | `ProgressIndicator.kt`, `WavyProgressIndicator.kt` | `progressindicator/` | M3 + M3E | ☐      |
| 2.3 | Loading indicator  | `rx-loading-indicator`                       | plain, contained; morphing shapes         | `LoadingIndicator.kt`                              | `loadingindicator/`  | M3E      | ☐      |
| 2.4 | Snackbar           | `rx-snackbar`, `rx-snackbar-host`            | single line, two line, action, close icon | `Snackbar.kt`, `SnackbarHost.kt`                   | `snackbar/`          | M3       | ☐      |
| 2.5 | Tooltip            | `rx-tooltip`                                 | plain, rich                               | `Tooltip.kt`                                       | `tooltip/`           | M3       | ☐      |
| 2.6 | Pull to refresh    | `rx-pull-to-refresh`                         | indicator, expressive loading indicator   | `pulltorefresh/PullToRefresh.kt`                   | —                    | M3 + M3E | ☐      |

## 3. Containment

| #    | Component                | Web element(s)            | Variants                                                              | Compose source                                                                        | MDC source                              | Gen      | Status |
| ---- | ------------------------ | ------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------- | -------- | ------ |
| 3.1  | Divider                  | `rx-divider`              | horizontal, vertical, inset                                           | `Divider.kt`                                                                          | `divider/`                              | M3       | ☐      |
| 3.2  | Card                     | `rx-card`                 | filled, elevated, outlined; clickable                                 | `Card.kt`                                                                             | `card/`                                 | M3       | ☐      |
| 3.3  | List                     | `rx-list`, `rx-list-item` | 1, 2, 3 line; leading/trailing slots; segmented (expressive)          | `ListItem.kt`, `ListItemDefaults.kt`                                                  | `listitem/`, `lists/`                   | M3 + M3E | ☐      |
| 3.4  | Dialog                   | `rx-dialog`               | basic, full screen                                                    | `AlertDialog.kt`                                                                      | `dialog/`                               | M3       | ☐      |
| 3.5  | Bottom sheet             | `rx-bottom-sheet`         | standard, modal; drag handle                                          | `BottomSheet.kt`, `ModalBottomSheet.kt`, `BottomSheetScaffold.kt`, `SheetDefaults.kt` | `bottomsheet/`                          | M3       | ☐      |
| 3.6  | Side sheet               | `rx-side-sheet`           | standard, modal                                                       | —                                                                                     | `sidesheet/`                            | M3       | ☐      |
| 3.7  | Drag handle              | `rx-drag-handle`          | horizontal, vertical                                                  | `DragHandle.kt`                                                                       | `bottomsheet/BottomSheetDragHandleView` | M3 + M3E | ☐      |
| 3.8  | Carousel                 | `rx-carousel`             | multi-browse, uncontained, hero, centered hero, full screen; parallax | `carousel/*`                                                                          | `carousel/`                             | M3 + M3E | ☐      |
| 3.9  | Swipe to dismiss         | `rx-swipe-to-dismiss`     | start, end                                                            | `SwipeToDismissBox.kt`                                                                | —                                       | M3       | ☐      |
| 3.10 | Scrollbar / scroll field | `rx-scrollbar`            | —                                                                     | `Scrollbar.kt`, `ScrollField.kt`                                                      | —                                       | M3E      | ☐      |

## 4. Selection and input

| #   | Component                 | Web element(s)                                   | Variants                                                                    | Compose source                                                                                    | MDC source                               | Gen      | Status |
| --- | ------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------- | -------- | ------ |
| 4.1 | Checkbox                  | `rx-checkbox`                                    | checked, indeterminate, error                                               | `Checkbox.kt`                                                                                     | `checkbox/`                              | M3       | ☐      |
| 4.2 | Radio button              | `rx-radio`                                       | —                                                                           | `RadioButton.kt`                                                                                  | `radiobutton/`                           | M3       | ☐      |
| 4.3 | Switch                    | `rx-switch`                                      | with or without icons                                                       | `Switch.kt`                                                                                       | `materialswitch/`                        | M3       | ☐      |
| 4.4 | Slider                    | `rx-slider`                                      | standard, centered, range, vertical; XS to XL track; stops; value indicator | `Slider.kt`                                                                                       | `slider/`                                | M3 + M3E | ☐      |
| 4.5 | Text field                | `rx-filled-text-field`, `rx-outlined-text-field` | text, textarea, password (secure), prefix/suffix, supporting text, counter  | `TextField.kt`, `OutlinedTextField.kt`, `SecureTextField.kt`, `TextFieldDefaults.kt`, `Label.kt`  | `textfield/`                             | M3       | ☐      |
| 4.6 | Menu                      | `rx-menu`, `rx-menu-item`, `rx-menu-group`       | standard, vibrant; selectable, checkable; grouped/segmented; submenu        | `Menu.kt`, `MenuDefaults.kt`                                                                      | `internal/` (popup menus)                | M3 + M3E | ☐      |
| 4.7 | Select (exposed dropdown) | `rx-filled-select`, `rx-outlined-select`         | filled, outlined, autocomplete                                              | `ExposedDropdownMenu.kt`                                                                          | `textfield/MaterialAutoCompleteTextView` | M3       | ☐      |
| 4.8 | Date picker               | `rx-date-picker`                                 | docked, modal, input mode, range                                            | `DatePicker.kt`, `DatePickerDialog.kt`, `DateInput.kt`, `DateRangePicker.kt`, `DateRangeInput.kt` | `datepicker/`                            | M3       | ☐      |
| 4.9 | Time picker               | `rx-time-picker`                                 | dial, input, scroll; vibrant dialog                                         | `TimePicker.kt`, `TimePickerDialog.kt`, `TimeFormat.kt`                                           | `timepicker/`                            | M3 + M3E | ☐      |

## 5. Navigation

| #   | Component         | Web element(s)                                      | Variants                                                                      | Compose source                                                             | MDC source                           | Gen      | Status |
| --- | ----------------- | --------------------------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------ | -------- | ------ |
| 5.1 | Tabs              | `rx-tabs`, `rx-primary-tab`, `rx-secondary-tab`     | fixed, scrollable; icon and label                                             | `Tab.kt`, `TabRow.kt`                                                      | `tabs/`                              | M3       | ☐      |
| 5.2 | Top app bar       | `rx-top-app-bar`                                    | small, center aligned, medium, large; medium/large flexible; scroll behaviour | `AppBar.kt`, `AppBarRow.kt`, `AppBarColumn.kt`, `AppBarDsl.kt`             | `appbar/`                            | M3 + M3E | ☐      |
| 5.3 | Bottom app bar    | `rx-bottom-app-bar`                                 | standard, flexible                                                            | `AppBar.kt`                                                                | `bottomappbar/`                      | M3 + M3E | ☐      |
| 5.4 | Search            | `rx-search-bar`, `rx-search-view`                   | docked, full screen; app bar with search                                      | `SearchBar.kt`                                                             | `search/`                            | M3 + M3E | ☐      |
| 5.5 | Toolbar           | `rx-floating-toolbar`, `rx-docked-toolbar`          | horizontal, vertical; standard, vibrant; with FAB                             | `FloatingToolbar.kt`                                                       | `floatingtoolbar/`, `dockedtoolbar/` | M3E      | ☐      |
| 5.6 | Navigation bar    | `rx-navigation-bar`, `rx-navigation-bar-item`       | baseline; short (flexible) with vertical or horizontal items                  | `NavigationBar.kt`, `ShortNavigationBar.kt`, `NavigationItem.kt`           | `bottomnavigation/`, `navigation/`   | M3 + M3E | ☐      |
| 5.7 | Navigation rail   | `rx-navigation-rail`, `rx-navigation-rail-item`     | baseline; collapsed, expanded, modal (wide rail)                              | `NavigationRail.kt`, `WideNavigationRail.kt`, `WideNavigationRailState.kt` | `navigationrail/`                    | M3 + M3E | ☐      |
| 5.8 | Navigation drawer | `rx-navigation-drawer`, `rx-navigation-drawer-item` | standard, modal, dismissible                                                  | `NavigationDrawer.kt`                                                      | `navigation/`                        | M3       | ☐      |

## 6. Layout helpers

| #   | Component | Web element(s) | Compose source | Gen | Status |
| --- | --------- | -------------- | -------------- | --- | ------ |
| 6.1 | Scaffold  | `rx-scaffold`  | `Scaffold.kt`  | M3  | ☐      |

## Counts

- Foundations: 11 items
- Components: 44 rows, about 60 custom elements once the sub-elements (items, sets, hosts) are counted
- Compose public functions covered: 156 distinct names (composables plus state factories) across 62 source files
- Token sets available to components: 104 (2,430 tokens) in `packages/tokens/src/tokens.json`

## Left out on purpose

These appear in MDC Android docs but are Material 2 leftovers with no M3 spec: Banner, Data table, Image list, `switchmaterial` (old switch). Compose-only internals (`ComponentStyles.kt`, `PrecisionPointer.kt`, `InteractiveComponentSize.kt`, `HorizontalCenterOptically.kt`) are folded into the components that use them.
