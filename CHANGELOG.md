# Changelog

Headlines: Added, Changed, Deprecated, Removed, Fixed, Security

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.12.0] - 2023-12-14

### Added

- Support for Zod [branded types](https://zod.dev/?id=brand) in schemas. ([#286](https://github.com/ciscoheat/sveltekit-superforms/pull/286))
- Peer dependencies updated to support SvelteKit 2. ([#299](https://github.com/ciscoheat/sveltekit-superforms/issues/299))

### Fixed

- Tainted fields were set to undefined when not needed, unwantingly triggering client-side validation.
- Schema transformations now updates the form data depending on input type. Checkboxes, radio buttons and selects updates the data immediately. Other inputs waits until blurred. ([#298](https://github.com/ciscoheat/sveltekit-superforms/issues/298))
- In [SPA mode](https://superforms.rocks/concepts/spa), the `novalidate` attribute now only disables the browser validation constraints, not the entire client-side validation. ([#297](https://github.com/ciscoheat/sveltekit-superforms/discussions/297))
- Errors thrown in hooks are now handled properly by `onError`. Status will always be 500 though. ([#292](https://github.com/ciscoheat/sveltekit-superforms/issues/292))

## [1.11.0] - 2023-11-28

### Added

- A `fieldErrors` store is added to [arrayProxy](https://superforms.rocks/api#arrayproxysuperform-fieldname-options), so field errors (for items in the array, not the array itself) can be accessed.

### Fixed

- When cancelling a request, timers were cancelled too early in [SPA mode](https://superforms.rocks/concepts/spa) and when [client-side validation](https://superforms.rocks/concepts/client-validation) failed.
- [Proxies](https://superforms.rocks/concepts/proxy-objects) didn't set or update a nested path unless it previously existed.
- When the [taint option](https://superforms.rocks/concepts/tainted#tainted-store) was set to `false` or `untaint-all`, client-side validation was prevented.
- The `novalidate` and `formnovalidate` attributes on forms and buttons weren't respected. ([#287](https://github.com/ciscoheat/sveltekit-superforms/issues/287))

## [1.10.2] - 2023-11-14

### Fixed

- Timers weren't starting until after [onSubmit](https://superforms.rocks/concepts/events#onsubmit), which allowed multiple form submissions on longer async operations. ([#284](https://github.com/ciscoheat/sveltekit-superforms/issues/284))
- Fixed constraints on fields that starts with a number. ([#285](https://github.com/ciscoheat/sveltekit-superforms/issues/285))

## [1.10.1] - 2023-11-07

### Added

- Added `arrayProxy`, for proxying arrays and their errors in the form data.
- Added `FormPathArrays` type, enumerating all arrays in an object as string accessors. Used to access `arrayProxy` in a type-safe manner.
- `formFieldProxy` now has a `taint` option, in case a modification should not taint the form.

## [1.9.0] - 2023-10-31

### Added

- In `app.d.ts`, by declaring namespace `App.Superforms` with a `type Message`, [status messages](https://superforms.rocks/concepts/messages) will always be set to that type. ([#261](https://github.com/ciscoheat/sveltekit-superforms/issues/261))
- Added `FormResult<T>`, which can be used in [onResult](https://superforms.rocks/concepts/events#onresult) to make the ActionResult strongly typed.
- [SuperDebug](https://superforms.rocks/super-debug) now has a `collapsed` prop, to make it initially collapsed. Use together with `collapsible`. ([#279](https://github.com/ciscoheat/sveltekit-superforms/issues/279))

### Fixed

- Schema `transform` operations weren't applied in [SPA forms](https://superforms.rocks/concepts/spa) and when posting to the server with client-side [validators](https://superforms.rocks/concepts/client-validation#validators) enabled.

## [1.8.0] - 2023-10-02

### Fixed

- [Array errors](https://superforms.rocks/concepts/error-handling#form-level-and-array-errors) were always added, even if the array or any data in it hadn't tainted the form.

### Added

- [formFieldProxy](https://superforms.rocks/components#using-a-formfieldproxy) now contains a proxy for `tainted`.

## [1.7.4] - 2023-09-29

### Fixed

- Timing issue in [SPA mode](https://superforms.rocks/concepts/spa) displayed errors for valid data, when submitting a form by pressing enter.

## [1.7.3] - 2023-09-28

### Fixed

- [SuperDebug](https://superforms.rocks/super-debug): Collapsible bar was a submit button and didn't toggle the collapsed status properly.

## [1.7.2] - 2023-09-23

### Fixed

- Array and form-level errors didn't respect `submit-only` as [validationMethod](https://superforms.rocks/concepts/client-validation#validationmethod). ([#270](https://github.com/ciscoheat/sveltekit-superforms/issues/270))
- The [customValidity](https://superforms.rocks/concepts/error-handling#customvalidity) option didn't respect `submit-only` and `onblur` as validationMethod.

## [1.7.1] - 2023-09-19

### Fixed

- Regression: Forms didn't display validation errors when javascript was disabled.

## [1.7.0] - 2023-09-16

### Fixed

- Type error with `formFieldProxy` when using a strongly typed status message. ([#260](https://github.com/ciscoheat/sveltekit-superforms/issues/260))
- Nested Superforms validators didn't work when a field was missing compared to the schema. ([#266](https://github.com/ciscoheat/sveltekit-superforms/issues/266))

### Added

- Added `preprocessed` option to superValidate, for handling the processing/coercion of posted form fields manually.

## [1.6.1] - 2023-08-22

### Fixed

- Client-side validation didn't take refine into account on a successful validation, not clearing all errors.

## [1.6.0] - 2023-08-18

### Fixed

- Client-side validation wasn't resetted properly, when a component containing a form was destroyed and mounted again.
- Removed debug statement left from 1.5.3

### Added

- Added `cookieOptions` to `actionResult`, for customizing the cookie when setting a [flash message](https://superforms.rocks/flash-messages).
- [SuperDebug](https://superforms.rocks/super-debug) now has a `collapsible` prop, that will make the component collapsible on a per-route basis.

## [1.5.3] - 2023-08-16

### Fixed

- Array-level errors weren't typed correctly when changing the cardinality of an array field in the schema (for example with `nonempty`).
- `customValidity` now works with `select`, `textarea` and `button`, not just `input`.
- SuperDebug looks a bit better now when there is no css styling on the page.

## [1.5.2] - 2023-08-15

### Fixed

- Forms in components weren't resetted properly when destroyed and mounted again.

## [1.5.1] - 2023-08-09

### Fixed

- In rare cases, timers weren't resetted when redirecting to the same route.
- Client-side validation was ignored when a data property was missing or didn't match the schema type. It now fails with a console error. ([#243](https://github.com/ciscoheat/sveltekit-superforms/issues/243))

## [1.5.0] - 2023-07-23

### Fixed

- A boolean schema field didn't accept a boolean `false` value when posted, it was coerced as `true`.
- A SuperDebug truncated string showed only the whole string length, not the truncated.

### Added

- Added `customValidity` option to `superForm`, which will use the browser's validation message reporting for validation errors. More information and an example [here](https://superforms.rocks/concepts/error-handling#customvalidity).
- Added `emptyIfZero` option to `numberProxy` and `intProxy`.

## [1.4.0] - 2023-07-20

### Fixed

- When multiple forms exists with the same id, the warning is now displayed on `superForm` instantiation, not just when new form data is received.
- Fixed client-side validation for `Date` schema fields. ([#232](https://github.com/ciscoheat/sveltekit-superforms/issues/232))
- `numberProxy` and `intProxy` now works with the `empty` option. ([#232](https://github.com/ciscoheat/sveltekit-superforms/issues/232))
- Fixed timer state in combination with navigation events.

### Added

- Added `delimiter` option to `numberProxy`.

## [1.3.0] - 2023-07-14

### Fixed

- Fixed persisting form data when component used data from `$page` in combination with `onDestroy`. ([#164](https://github.com/ciscoheat/sveltekit-superforms/issues/164), thank you to everyone in that thread!)
- Fixed exception message when the `dataType` option isn't set to `'json'` and the schema contains a nested object. ([#225](https://github.com/ciscoheat/sveltekit-superforms/issues/225))
- Superforms are now ignoring normal SvelteKit form actions when they are posted. ([#230](https://github.com/ciscoheat/sveltekit-superforms/issues/230))

### Added

- More configuration options, customizable styling, automatic promise and store support for [SuperDebug](https://superforms.rocks/super-debug), thanks to [Josue](https://github.com/J-Josu)!

## [1.2.0] - 2023-07-06

### Added

- The `scrollToError` option can now take the same parameters as [scrollIntoView](https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollIntoView), which makes it work for nested scrollbars.
- Added `setError` signature, to more conveniently set a form-level error: `setError(form, 'Form-level error message')`

### Fixed

- If the `resetForm` option was enabled, the form was reset even if `fail` was returned.

## [1.1.3] - 2023-06-29

### Fixed

- Form-level errors couldn't be overwritten.
- Array-level errors couldn't be added with `setError`.
- Native string enums weren't working when posting the actual string value.

## [1.1.2] - 2023-06-24

### Added

- Svelte 4 compatibility.

## [1.1.1] - 2023-06-20

### Fixed

- Set comparison added in 1.1.0 wasn't fully functional.

## [1.1.0] - 2023-06-20

### Added

- Support for `Set` in schemas, using `z.set()`. ([#194](https://github.com/ciscoheat/sveltekit-superforms/issues/194))

### Fixed

- Nested array and object-level errors are now all cleared on a successful client-side validation. ([#196](https://github.com/ciscoheat/sveltekit-superforms/issues/196))
- Boolean fields with a default value of `true` always returned `true` when validating.
- Fixed infinite deep type instantiation on `message`. ([#143](https://github.com/ciscoheat/sveltekit-superforms/issues/143), thanks to [Alisson Cavalcante Agiani](https://github.com/thelinuxlich))
- Fixed typesVersions map that caused incorrect auto-import paths ([#191](https://github.com/ciscoheat/sveltekit-superforms/pull/191), thanks to [CokaKoala](https://github.com/AdrianGonz97))

## [1.0.0] - 2023-06-12

### Added

- New Superforms domain! https://superforms.rocks

## [1.0.0-rc.5]

### Fixed

- When a redirect response is received, form timers will not reset until after navigation or `onDestroy`.
- Fixed prototype mismatch for Zod schemas in different modules.
- SuperDebug color scheme updated. (Thanks to [gregorymcmillan](https://github.com/gregorymcmillan))

## [1.0.0-rc.4]

### Changed

- It's not possible to send arbitrary data to `superForm` anymore, a `SuperValidated` structure is required, which is returned from `superValidate` on the server and `superValidateSync`, so in most cases this is not a problem.
- Reverted that `message/setMessage` and `setError` will throw an error if status is lower than 400. Using a range error type check instead.

### Fixed

- Fixed flash messages being displayed early. This update also means that at least [sveltekit-flash-message](https://github.com/ciscoheat/sveltekit-flash-message) 1.0.0-rc.3 is required to work together with Superforms.
- Form data was reset to its previous state when `error` was thrown.
- Form-level errors can be added with `setError`, using an empty string as path.

## [1.0.0-rc.3]

### Removed

- For type safety, you cannot send `null` or `undefined` to `superForm` anymore. Use `superValidate`, or pass a complete data object to `superForm`. Default values can be added with the `defaultValues` function.
- The `valid` option is removed from `message`, any status >= 400 will return a fail.

### Changed

- `message/setMessage` and `setError` will now throw an error if the status option is below 400.

### Added

- Arrays and objects in the schema can now have errors! They can be found at `field._errors` in the `$errors` store.
- `validate` will now validate the whole form when it's called with no arguments.
- Support for `passthrough()` on a schema, `superValidate` will allow extra keys in that case.

## [1.0.0-rc.2]

### Changed

- As with effects, array and object errors now forces the whole Zod schema to be validated client-side.
- The `Validation` type is now called `SuperValidated`.
- `StringPath` and `StringPathLeaves` are renamed to `FormPath` and `FormPathLeaves`.

### Removed

- The `$valid`, `$empty` and `$firstError` stores are removed from the client, they weren't that useful. `allErrors` can be used instead, together with the `$posted` store.
- `empty` is removed from `SuperForm`

### Fixed

- Async validation works again for custom validators and `superValidate`.

### Added

- Added a `posted` store, a boolean which is false if the form hasn't been posted during its current lifetime.
- `reset` now has an additional `data` option that can be used to re-populate the form with data, and `id` to set a different form id.
- `intProxy`, `numberProxy`, `dateProxy` and `stringProxy` now have an `empty` option, so empty values can be set to `null` or `undefined`.

## [1.0.0-rc.1]

### Changed

- Explicitly setting a form `id` for multiple forms is not required anymore when using `use:enhance`, unless the forms are using the same schema. An id can be specified in the options or in a hidden form field called `__superform_id`.
- `setError` doesn't handle form-level errors anymore, use refine/superRefine on the schema, or the `message` helper.
- `FieldPath` is gone - the following methods are now using a string accessor like `tags[2].id` instead of an array like `['tags', 2, 'id']`: `validate`, `setError` and all proxy methods (ending with `Proxy`). This also applies to generic components.
- The signature for `allErrors` and `firstError` has changed to `{ path: string; messages: string[] }`.
- The literal `"any"` is now an allowed value in `step` for constraints.
- Multiple `regex` and `step` is now allowed in a schema. A warning will be emitted by default, that can be turned off.
- The signature for `options.resetForm` has changed to `boolean | () => boolean` (it was async before).
- The undocumented `defaultData` is now called `defaultValues`.
- Added `[aria-invalid="true"]` to `errorSelector` option.
- `options.resetForm` now works without `use:enhance`!

### Removed

- `options.noErrors` is removed. Use `options.errors` instead.
- The virtually unused `meta` has been removed. Use the Zod schema directly instead for reflection.

### Fixed

- Fixed deprecation notices for `use:enhance`.

### Added

- Added `superValidateSync`, useful in components for SPA:s.
- Added `defaultValues`, which takes a schema and returns the default values for it.
- Support for `ZodPipeline`.

## [0.8.7] - 2023-05-22

### Fixed

- `onUpdate` didn't cancel `applyAction` and `invalidateAll`.
- Hopefully fixed excessively deep infinity type instantiation on `message` helper.
- Removed `errors.clear` optional parameter `undefinePath`, which was left there by mistake.

### Added

- `onUpdate` now has `formEl` in its signature.

## [0.8.6] - 2023-05-06

### Fixed

- Posting without Javascript enabled in the browser didn't detect new validation data.

## [0.8.5] - 2023-05-04

### Fixed

- `capture` and `restore` are now hoisted functions.
- Fixed timing issues with radio buttons and validation with side-effects.
- Using standard array access to fix problems with iOS and iPadOS <= 15.3
- Fixed client validation problems with multi-select fields.
- Client validation now runs properly when `$form` is modified directly by assignment.

## [0.8.4] - 2023-04-27

### Fixed

- Select fields had some timing issue, but should now work properly with client-side validation.
- Fixed a few problems with error/tainted checking for client-side validation.
- Typing should now work properly with schema fields containing [union types](https://zod.dev/?id=unions).

## [0.8.3] - 2023-04-26

### Fixed

- Realtime validation now takes `refine` and `superRefine` fully into account. If a schema uses them, the whole schema will be validated, to ensure that side effects are propagated to the correct fields.

## [0.8.2] - 2023-04-24

### Fixed

- `allErrors` stopped working when realtime validation errors were cleared.
- Large payloads with `dataType: 'json'` still didn't work, fixed now.

## [0.8.1] - 2023-04-24

### Fixed

- Realtime validation didn't work for Zod schemas without effects.

## [0.8.0] - 2023-04-22

### Changed

- Client-side validators now works in realtime, based on "reward early, validate late": If no field error, validate on `blur`. If field error exists, validate on `input`.

### Removed

- The rarely used `update` function is removed. Use `form` instead, which now has an option for not tainting the affected fields.

### Fixed

- `tainted` wasn't updated properly for array data.
- `dataType: 'json'` now handles large (+1Mb) payloads.

### Added

- Added `validate` to `superForm`, which can be used to validate any field, at any time.
- Client-side validation can be customized with the `validationMethod: 'auto' | 'oninput' | 'onblur' | 'submit-only'` option.
- The option `{ taint: boolean | 'untaint' | 'untaint-all' }` has been added to `form.set` and `form.update`.
- The `resetForm` option can now take an `async () => boolean` function to determine whether the form should be resetted or not.

## [0.7.1] - 2023-04-17

### Fixed

- Zod client-side validation wasn't always detected with minified builds.

## [0.7.0] - 2023-04-16

### Added

- Single page application (SPA) support! Super easy to add with the `SPA: true` option in `superForm`.

### Changed

- Event chain is fully propagated when client-side validators fail. (Previously, it stopped after `onSubmit`)
- `form` argument in `onUpdated` is now `Readonly`, to signify that it won't affect stores at this point.
- The default `onError` event now emits a console warning on `ActionResult` errors. Implement `onError` to handle errors in a user-friendly way.
- The `noErrors` function is removed, use the `errors` option of `superValidate` instead.

## [0.6.18] - 2023-04-14

### Fixed

- When `dataType = 'json'`, file data is now returned when it has the same name as a schema field.

### Added

- Flash messages can now be sent in `actionResult`.

## [0.6.17] - 2023-04-13

### Added

- `options` are now returned from `superForm`.

## [0.6.16] - 2023-04-12

### Fixed

- `fieldProxy` and `formFieldProxy` are now exported from `sveltekit-superforms/client`.

## [0.6.15] - 2023-04-12

### Fixed

- Fixed timing for auto-focus on error field.
- All types now handle schemas with effects.

### Added

- Added `errors` option for `superValidate`

### Deprecated

- superValidate: `noErrors` is deprecated, use the `errors` option instead.
- Use `SuperForm` instead of `EnhancedForm`.

## [0.6.14] - 2023-04-10

### Fixed

- Tainted check errored for nested properties.
- Fixed form-level errors on client.

### Removed

- Removed undocumented support for array validation errors.

## [0.6.13] - 2023-04-07

### Fixed

- Tainted store check fixed for multiple updates.

## [0.6.12] - 2023-04-07

### Fixed

- Form-level errors sometimes made `$errors` become an array.

## [0.6.11] - 2023-04-07

### Added

- `$tainted` store is now writable.

## [0.6.10] - 2023-04-06

### Fixed

- If POST request body has already been used, an error is thrown instead of returning an empty object.

### Added

- Finally, `event` is no longer needed in the function call to `superValidate` for empty forms. Just pass the schema as the first parameter.

### Deprecated

- The `EnhancedForm` type should now be referred to as `SuperForm`.

## [0.6.9] - 2023-04-06

### Fixed

- It's now possible to use schemas modified with refine/superrefine/transform as a type parameter to `superValidate`.

### Added

- `URL` and `URLSearchParams` can now be passed to `superValidate`.

## [0.6.8] - 2023-04-04

### Fixed

- Form wasn't reset properly after more than one reset.

## [0.6.7] - 2023-04-03

### Fixed

- Stores weren't updated until after `onUpdated` was called.

### Added

- Implicit default value for `ZodRecord` (empty object)
- UTC date/time formats for `dateProxy`.
- Form-level Zod issues, can be added with `refine` on the schema, accessed by `$errors._errors`.

## [0.6.6] - 2023-03-31

### Added

- Added the Superforms website! https://superforms.vercel.app/
- Added `valid` option to `message`, so form validity can be set at the same time as returning a message.

## [0.6.5] - 2023-03-27

### Fixed

- Follow ESM import standards ([#78](https://github.com/ciscoheat/sveltekit-superforms/issues/78))

## [0.6.4] - 2023-03-26

### Added

- `message` helper on the server, to make it easier to send a message with the form.
- `options.syncFlashMessage` when using [sveltekit-flash-message](https://github.com/ciscoheat/sveltekit-superforms#sveltekit-flash-message-support), to sync the flash message with `form.message`, so you don't have to use both.

### Fixed

- Zod schemas on client now accepts `ZodEffects` (refine/transform/superRefine).
- Empty data gives no errors when `ZodEffects` are used.
- `formId` wasn't updated properly.

## [0.6.3] - 2023-03-23

### Fixed

- Array values wasn't coerced to their correct type if empty, i.e. strings were resolved to `[]` instead of `""`.

## [0.6.2] - 2023-03-22

### Added

- Support for [snapshots](https://kit.svelte.dev/docs/snapshots) with the `capture` and `restore` functions, returned from `superForm`.
- Added `options.selectErrorText` for selecting all text in the first invalid text field, instead of just focusing on it and the cursor is placed at the end of the text.
- `use:enhance` can now take all events as a parameter, in case you want to pass it on to other components.
- Added a `formId` store to `superForm`, which can be used to change the form id, in case of complicated multi-form scenarios.

### Fixed

- `superValidate` didn't use async validation, on Node! How embarrassing, but fixed now.

## [0.6.1] - 2023-03-20

### Fixed

- For internal data cloning, if `structuredClone` is not available, using [devalue](https://github.com/Rich-Harris/devalue) instead.
- Multiple forms should now be detected in `page.form` even when javascript is disabled.
- Removed some debug messages.

## [0.6.0] - 2023-03-19

### Changed

- `form.message` is now default `any` type, and uses `undefined` instead of `null` to signify no value. This means that `superValidate` and `superForm`, as well as some of the types, like `Validation` and `FormOptions`, can take a second generic parametr that can specify the `message` type.
- `options.onError` can now only be set to `apply`, or a callback `({result, message}) => void` for handling the error result. It does not automatically set the error message anymore, since it can be of any type.
- Default value for `options.defaultValidator` is now `keep`, to give the user better error feedback.
- The signature for `allErrors` and `firstError` is now `{ path: string[], message: string }`.
- If `options.dataType` isn't set to `json` and a nested object is detected in the data sent to `superForm`, an error will be thrown.
- The callback for `options.flashMessage.onError` now follows the same signature as `options.onError`.
- `SuperFormError` is thrown instead of `Error`.
- The `fields` store lists all top-level fields as an object, with writable stores for `value`, `errors` and `constraints`, so they can be passed to sub-components.

### Added

- `options.validators` now also accepts a Zod schema, for complete client-side validation!
- `errors`, `constraints` and `tainted` now supports nested data structures!
- `superValidate` now accepts schemas modified with `refine/superRefine/transform`.
- Added `meta` store, which is populated when `options.includeMeta = true` in `superValidate`.

### Removed

- The undocumented `defaults` option of `superValidate` is removed, it can be replaced with `transform/refine/superRefine` in the validation schema.
- `formdata` is removed from `options.dataType`. Use `json` instead, it will cover all cases except some very narrow ones.
- The `update` parameter in `onResult` is removed. It has the same effect as not cancelling the event, so it's redundant.
- Proxies cannot set an initial value to avoid interfering with `tainted`, so the last parameter when creating a proxy is removed.

### Fixed

- Using `onDestroy` to unsubscribe from the `page` store, preventing memory leaks.
- `onSubmit` wasn't called with `await`.
- Default data is now cloned, not just referenced.
- Last but not least, a big thanks to [Dale Ryan](https://github.com/lnfel) for making the `SuperDebug` component even more super!

## [0.5.25] - 2023-03-14

### Fixed

- Default values didn't exist for nested entities.

## [0.5.24] - 2023-03-13

### Added

- `reset` now takes a `keepMessage` property, to optionally avoid clearing the message.

## [0.5.23] - 2023-03-10

### Fixed

- Redirecting to a page with no validation form caused an error.

## [0.5.22] - 2023-03-10

### Changed

- Removed `crypto` dependency, prevented Cloudflare deployment.

## [0.5.21] - 2023-03-09

### Added

- Support for multiple forms, using the `id` option. [FAQ entry](https://github.com/ciscoheat/sveltekit-superforms/wiki/FAQ#are-multiple-forms-on-the-same-page-supported).
- `setError` now takes a `status` option, default is `400`.

### Fixed

- `actionResult` now returns a proper error if a `string` is used when creating an `error` result.

## [0.5.20] - 2023-03-08

### Fixed

- Form was untainted on `error` response.

## [0.5.19] - 2023-03-07

### Added

- Allowed coercion of default values to avoid schema duplication.

## [0.5.18] - 2023-03-07

### Added

- Support for [native enums](https://zod.dev/?id=native-enums) in validation schemas.

### Fixed

- A default value accidentally removed the `required` constraint.
- Client-side validation now handles falsy values, not removing the error message when it's not supposed to.

## [0.5.17] - 2023-03-04

### Fixed

- Form didn't reset to initial values.
- Reset also cleared last message.

## [0.5.16] - 2023-03-01

### Fixed

- Checking for missing fields only if no `FormData` exists.
- Correct comparison for client-side `Date` validation.
- Timers were waiting for `onUpdated`.
- Improved cacheability for validation data.

## [0.5.15] - 2023-02-28

### Added

- Added a `fields` store, which can be used to loop through all fields in the form.
- `options.validators` can now also return `string[]`.

### Fixed

- `valid` store return from `superForm` was incorrectly named `validated`.
- Client-side validators were still overwriting errors passed from the server.

## [0.5.14] - 2023-02-28

### Fixed

- Client-side validators were overwriting errors passed from the server.
- Cleared timers after submit is complete.

## [0.5.13] - 2023-02-28

### Added

- Options to date proxy and boolean proxy.

### Fixed

- Date proxy now working properly.
- `SuperDebug` date output now handles invalid dates.

## [0.5.12] - 2023-02-28

### Fixed

- Reset form also on redirect, if `options.resetForm` is set.
- Check if value passed to `superForm` is a validation object.

## [0.5.11] - 2023-02-27

### Added

- `superValidate.constraints` with attributes that maps directly to the [HTML5 form validation standard](https://developer.mozilla.org/en-US/docs/Learn/Forms/Form_validation).

## [0.5.10] - 2023-02-26

### Added

- [Proxy objects](https://github.com/ciscoheat/sveltekit-superforms#proxy-objects), for converting string data to other types.
- `superForm.tainted` - A readable store for checking if form is modified.
- If the schema type is `array`, multiple form values with the same name are now added to it.

### Fixed

- Data returned from `superValidate` is now guaranteed to have all fields populated.

## [0.5.9] - 2023-02-25

### Fixed

- `ZodEnum` is now handled properly.
- Support for [sveltekit-flash-message](https://www.npmjs.com/package/sveltekit-flash-message) is back.
- Improved styles for `SuperDebug`.

## [0.5.8] - 2023-02-23

### Deprecated

- Removed flash message support until a better module loading solution is found.

## [0.5.7] - 2023-02-23

### Fixed

- Displaying a flash message is now prevented when cancelling the update.
- Removed sass from `SuperDebug`.

## [0.5.5] - 2023-02-23

### Fixed

- Posting without `use:enhance` now works again.

## [0.5.0] - 2023-02-23

### Added

- Support for [sveltekit-flash-message](https://www.npmjs.com/package/sveltekit-flash-message)

### Changed

- `options.defaultValidator` now has default value `clear`.

## [0.4.0] - 2023-02-22

### Changed

- `form.validated` renamed to `form.valid`, and is now `false` for empty entities.

## [0.3.0] - 2023-02-22

### Changed

- Renamed `validation` to `form` in the `onUpdate` and `onUpdated` events.

### Added

- `taintedMessage` now accepts `null`.

## [0.2.0] - 2023-02-22

### Changed

- Renamed `form.success` to `form.validated`.

## [0.1.0] - 2023-02-21

### Added

- Initial release
