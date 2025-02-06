# Changelog

Headlines: Added, Changed, Deprecated, Removed, Fixed, Security

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Exported `SuperValidateOptions` type.
- Exported `MergeUnion`, `MergeFormUnion` and a `mergeFormUnion` utility, for handling discriminated unions in forms.

## [2.23.1] - 2025-01-21

### Removed

- Rolled back runes option for SuperDebug, it wasn't compatible with Svelte 4.

## [2.23.0] - 2025-01-21

### Added

- `dateProxy` now has a `step` option, to support seconds (when [not divisible by 60](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/time#using_the_step_attribute)).
- [SuperDebug](https://superforms.rocks/super-debug) now opts out of runes mode as default.

### Fixed

- Fixed `dateProxy` for `time` formats, previously it returned an invalid date. If you only care about the time part in the date, use `time-utc` as format to avoid timezone changes.
- Vite 6 bundling fixed by introducing a `default` field into exports in package.json.

### Changed

- [Arktype 2.0](https://arktype.io/) is finally released! Adapter updated, please check it out, it's validation on the next level.
- Arktype is now displaying errors with `problem` instead of `message`, for nicer output.
- Zod peerDependency updated to 3.24.1 to be compatible with its latest fix.
- VineJS adapter updated to 3.0.0.

## [2.22.1] - 2024-12-16

### Fixed

- The [transport feature](https://superforms.rocks/concepts/nested-data#arbitrary-types-in-the-form) released in 2.22.0 didn't fully handle classes. It should work better now, but the classes must be quite simple to work. Let me know if you have any problems with a certain class.
- Fixed Decimal.js detection in [SuperDebug](https://superforms.rocks/super-debug).

## [2.22.0] - 2024-12-15

### Added

- Support for Zod 3.24 and `Infer` improvements for all adapters, by no other than the Zod creator himself, [Colin McDonnell](https://github.com/colinhacks)! What a christmas present! 🎄
- Arbitrary types can now be used in the form with the [transport](https://svelte.dev/docs/kit/hooks#Universal-hooks-transport) feature in SvelteKit hooks. There is a `transport` option both for `superValidate` and `superForm` that the `transport` export in `hooks.ts` can be directly used in. **Note:** Requires SvelteKit `^2.11.0`.

### Fixed

- `z.bigint()` was interpreted as a number instead of a [BigInt](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt).

### Changed

- Effect updated to require `^3.10.0`. **Only the `effect` package is required now**, not `@effect/schema` as before. See the 3.10 [release notes](https://effect.website/blog/releases/effect/310/) for details.

## [2.21.1] - 2024-12-04

### Fixed

- Default values for nested discriminated unions didn't work.

## [2.21.0] - 2024-12-01

### Fixed

- All properties for object unions weren't added to the adapter defaults.

### Changed

- Typebox updated to require `^0.34.9` (hoping for a stable release soon).

## [2.20.1] - 2024-11-15

### Changed

- Valibot updated to require `1.0.0-beta.3` (hoping for a stable release soon).
- Arktype updated to require `2.0.0-rc.23` (hoping for a stable release soon).

### Added

- Support for Vine 2.0.

### Fixed

- [customRequest](https://superforms.rocks/concepts/events#customrequest) didn't cancel when client-side validation failed.

## [2.20.0] - 2024-10-18

### Added

- New validation library: [Effect](https://effect.website/)!

### Changed

- `@typeschema/class-validator` version bump to `^0.3.0`.

## [2.19.1] - 2024-10-05

### Added

- Exported `ClientValidationAdapter` from `sveltekit-superforms/adapters`.

### Fixed

- Result can now be modified in [onError](https://superforms.rocks/concepts/events#onerror), for setting a status code for example.
- Status codes above 400 but below 500 were not applied to the page status when the result was modified in `onUpdate`.

## [2.19.0] - 2024-09-18

### Changed

- Arktype updated to require `2.0.0-rc.8`, fixing some types (last update before 2.0).

### Deprecated

- The `failStatus` and SPA action form (`string`) options of [single page application mode](https://superforms.rocks/concepts/spa) are now deprecated. `failStatus` is rarely used, and SPA action form can be created just by setting [invalidateAll](https://superforms.rocks/concepts/enhance#invalidateall) and [applyAction](https://superforms.rocks/concepts/enhance#applyaction) to `false`. See [this example](https://github.com/ciscoheat/superforms-examples/blob/username-available-zod/src/routes/%2Bpage.svelte) for details.

### Added

- Exceptions thrown in the `onSubmit`, `onResult` and `onUpdate` [events](https://superforms.rocks/concepts/events) will now be caught and sent to `onError`, if it exists.

### Fixed

- Updating the same variable to the same value prevented the [onChange](https://superforms.rocks/concepts/events#onchange) event from being triggered.
- Factorized [SuperDebug](https://superforms.rocks/super-debug) clipboard script

## [2.18.1] - 2024-09-13

### Added

- New validation library: [class-validator](https://github.com/typestack/class-validator)!
- Exported `SuperFormData` and `SuperFormErrors` types for superForm.
- Exported `ZodObjectType`, `ZodObjectTypes` and `ZodValidation` types for the Zod adapter.
- [customRequest](https://superforms.rocks/concepts/events#customrequest) can now handle an `ActionResult` as well, for better error handling.

### Fixed

- Using [setError](https://superforms.rocks/concepts/error-handling#seterror) in the load function and navigating to the same page client-side removed the errors.

## [2.17.0] - 2024-08-13

### Deprecated

- `posted` is deprecated, due to inconsistencies between server and client validation, and SPA mode. It will be removed in v3. Use a [status message](https://superforms.rocks/concepts/messages) or return your own data in the form action to handle form post status.

### Added

- `descriptionAsErrors` option for the JSON Schema validator, so you can specify error messages directly in the schema with the `description` field.

### Fixed

- File uploads required extra configuration for the valibot adapter, now it works directly.
- Events added in `enhance` weren't cleaned up when the form was destroyed. Note that this _could_ be deprecated in a future version. It's advised to use events only when calling `superForm`, not with `enhance`.

## [2.16.1] - 2024-07-18

### Changed

- Arktype updated to require `2.0.0-beta.0`, which should fix some typing issues with the adapter.

## [2.16.0] - 2024-07-09

### Added

- New validation library: [Superstruct](https://docs.superstructjs.org/)!
- `customRequest` added to the [onSubmit](https://superforms.rocks/concepts/events#onsubmit) options, that lets you use a custom [fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) or [XMLHttpRequest](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest) when submitting the form. Very useful for progress bars when uploading large files.

### Fixed

- Type inference for validation errors didn't include `_errors` for all objects, only for arrays.

## [2.15.2] - 2024-06-26

### Changed

- Valibot minimum dependency is now `>=0.33.0` to fix a type issue. Please follow the [migration guide](https://valibot.dev/guides/migrate-to-v0.31.0/) to update your Valibot schemas if your version is below v0.31.0.

## [2.15.1] - 2024-06-10

### Changed

- Valibot updated to `0.31.0`, which ends support for any version below that. Please follow the [migration guide](https://valibot.dev/guides/migrate-to-v0.31.0/) to update your Valibot schemas.

### Fixed

- Inlined the [SuperDebug](https://superforms.rocks/super-debug) css, to prevent it from being automatically bundled due to it being a default import.
- The [customValidity](https://superforms.rocks/concepts/error-handling#customvalidity) option now handles object errors, and can refer to any part of the schema.
- Arktype code wasn't excluded from bundle due to not being dynamically loaded.

## [2.14.0] - 2024-05-26

### Added

- `errorMap` option for the Zod adapter, for simplified error handling in localization. ([Zod docs](https://zod.dev/ERROR_HANDLING?id=customizing-errors-with-zoderrormap))

### Fixed

- `isTainted` now works with undefined values in the `$tainted` store.
- Fixed default properties for Record in schemas.

## [2.13.1] - 2024-05-07

### Fixed

- `FormPath` now extends only basic objects and arrays, avoiding issues with classes, all built-in objects like `File` and `Date`, and special "branded" types that validation libraries are using. Thanks to [Matt DeKok](https://github.com/sillvva) for this fix!
- [SuperDebug](https://superforms.rocks/super-debug) always renders left-to-right now.
- Discriminated unions for the form itself weren't including the union keys for the schema, when parsing the form data.
- `devalue` updated to `^5.0.0` to handle invalid dates.

## [2.13.0] - 2024-05-03

### Added

- Support for "raw" [JSON Schema](https://json-schema.org/) validation with the new [schemasafe](https://github.com/ExodusMovement/schemasafe) adapter. Thanks to sukeshpabolu for the initial work on this!

### Fixed

- Errors weren't reset properly when the form was resetted, causing client-side validation to behave like the field was tainted.

## [2.12.6] - 2024-04-23

### Fixed

- The Zod adapter didn't handle reused schemas ($ref) properly.

## [2.12.5] - 2024-04-16

### Fixed

- The "GET to POST" modification for `use:enhance` was only intended for SPA mode to fully support progressive enhancement, so it now properly checks for that before adding the missing `method="POST"` attribute on the form.
- The tainted message didn't trigger on page refresh or closing a tab in the browser.

## [2.12.4] - 2024-04-09

### Fixed

- `FormPathLeaves` caused a memory leak when using `svelte-package`.

## [2.12.3] - 2024-04-08

### Fixed

- [SuperDebug](https://superforms.rocks/super-debug) support for `Map` and `Set`.
- `submit` method now falls back to submit, if no support for requestSubmit in browser.
- `isTainted` now handles the type of `$tainted` in generic components.
- `id` option for superForm (not superValidate) wasn't used in multiple form scenarios.

## [2.12.2] - 2024-03-29

### Fixed

- Fixed `FormResult` type that can be used in `onUpdate`, it didn't filter out SuperValidated.

## [2.12.0] - 2024-03-28

### Added

- [SPA action form](https://superforms.rocks/concepts/spa#spa-action-form) now supports form elements as well, by adding its `use:enhance` on all related forms.

### Fixed

- Fixed type inference for `FormPath` with nested arrays. Error output improved as well.
- If method is "GET" or doesn't exist on an enhanced form, it's now automatically set to "POST".

## [2.11.0] - 2024-03-22

### Added

- The `ActionResult` for success or failure is now added to the `onUpdate` event in the `result` property. Can be used to more easily access the `ActionData`.
- Added a `fail` function, works the same as the SvelteKit fail, but removes files and sets `form.valid` to `false`.
- `options.config` added to the Zod adapter, so the JSON Schema generation can be customized.

### Fixed

- [Snapshots](https://superforms.rocks/concepts/snapshots) couldn't handle files. They are now reverted to their default value when captured and restored in a snapshot, including the tainted state for these fields.

## [2.10.6] - 2024-03-20

### Changed

- The [clearOnSubmit](https://superforms.rocks/concepts/submit-behavior#clearonsubmit) option didn't clear the errors when supposed to. To avoid a breaking change, **the default option for clearOnSubmit is now** `message`, not `errors-and-message`, as it didn't work anyway.

### Fixed

- the `event.result.error` signature in [onError](https://superforms.rocks/concepts/events#onerror) was incorrect, it doesn't always match `App.Error`. It is now a union between `App.Error`, The built-in JS `Error` class, and the default App.Error signature `{ message: string }`.

## [2.10.5] - 2024-03-18

### Added

- `fileProxy`, `filesProxy`, `fileFieldProxy` and `filesFieldProxy`, so `File` objects can be used with `bind:files` on the input field. See [file uploads](https://superforms.rocks/concepts/files) for examples.
- Exported `FormPathLeavesWithErrors`, for the `setError` function.

### Fixed

- Support for `instance` and `special` validators for Valibot, which now enables File validation for Valibot!
- `taintedMessage` didn't always work when navigating with the History API.
- `tainted` didn't untaint automatically when using arrays.
- Client-side validation triggered for incorrect fields when starting with the same name.

## [2.9.0] - 2024-03-12

### Added

- "SPA action mode", the `SPA` option can now take a string, corresponding to a form action, and it will post there, even without a html form on the page. Especially useful for debounced server checks like available usernames.

### Fixed

- Fixed types for constraints, tainted and errors when using intersections and unions in schemas.
- Fixed SuperDebug collapsed height by preventing global css leak.
- Redirect in SPA mode cancelled normal redirects, preventing applyAction.
- Default objects sent to `superForm` returned a form with an empty id, causing collisions, it is now a random string.
- `customValidity` didn't clear without client-side validators.

## [2.8.1] - 2024-03-07

### Added

- Clipboard copy button for [SuperDebug](https://superforms.rocks/super-debug). Also fixed height when collapsed without label.

### Fixed

- Storybook fix for missing `page` store.

## [2.8.0] - 2024-03-05

### Added

- Support for object unions, with implicit default values.
- Experimental [storybook](https://storybook.js.org/recipes/@sveltejs/kit#@sveltejs/kit) support.

### Fixed

- It wasn't possible to directly assign `undefined` to a field in the `$errors` store.
- Intersections in Zod schemas weren't handled properly.
- It wasn't possible to change the reference to the result in `onResult`.

## [2.7.0] - 2024-03-03

### Added

- `newState` option for `reset`, to set a new state for future resets. Can be used instead of the `data` option.

### Fixed

- Empty file entries didn't return `null` for nullable schema fields. **Ensure that all required file fields aren't set to nullable.**
- Allowed `string` index in `$errors` and `$tainted`.
- `submit` can now be passed directly to event handlers.
- Updated to latest `valibot-json-schema`, with support for [enum\_](https://valibot.dev/guides/enums/), amongst others.
- Zod adapter now supports `ZodType`.

## [2.6.2] - 2024-02-25

### Fixed

- Schema literals weren't treated as their `typeof` type, which prevented multi-type union detection.
- `FormPath` and `FormPathLeaves` didn't narrow the types correctly for `Date`, `Set` and `File`.
- `stringProxy` didn't accept `FormPathLeaves` as path.
- Fixed removal of uploads for empty files (as is the default for empty file inputs), they are now ignored.
- Exported `Schema` type, for any supported validation schema.

## [2.6.1] - 2024-02-24

### Added

- Type narrowing for `FormPath` and its relatives, to filter the paths based on a specific type, like `FormPathLeaves<T, Date>`.
- Proxy types: `FieldProxy`, `FormFieldProxy` and `ArrayProxy`.
- Added `invalidateAll` option `'force'`, to always use the load function form data, instead of the one returned from the form action. Useful when updating the form data partially, to ensure that the data is refreshed from the server (a "pessimistic" update compared to the default, which is optimistic). Setting this also bases the `reset` function on the latest load function data returned for the form.

### Fixed

- `defaults` didn't infer the input type, and didn't generate correct `SuperValidated` data, making `superForm` confused. Also fixed type signature and removed the `jsonSchema` option that wasn't applicable.
- Using `goto` in events didn't work when the target page redirected.
- `FormPath` and `FormPathLeaves` didn't handle fields with type `unknown` and `any`.
- Missing boolean fields were valid in strict mode.

## [2.5.0] - 2024-02-21

### Added

- `get` and `set` accessor for `onChange`.
- `submit` method for `superForm`, a convenience instead of using [requestSubmit](https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement/requestSubmit). Requires `use:enhance` or that a `HTMLElement` inside the form (or the form itself) is passed as an argument.

### Fixed

- Type parameter was missing in `ChangeEvent`, which should be of the inferred schema type.
- Type for `onChange.paths` wasn't strongly typed to `FormPath`.
- Initial data was dereferenced after calling `superForm`, so it wasn't possible to update it when using `reset`.
- `FormOptions` type required a type parameter that should've been defaulted to `Record<string, unknown>`.
- Auto-overflow on [SuperDebug](https://superforms.rocks/super-debug), for small spaces.

## [2.4.0] - 2024-02-20

### Added

- Added `config` option to Valibot adapter, for the [SchemaConfig](https://valibot.dev/api/SchemaConfig/) type.

### Fixed

- Nullable fields weren't always detected in JSON Schemas.
- Constraints weren't added when using default values for Arktype, Vine and Valibot schemas.
- Fixed null support for Joi, Arktype and Vine schemas.

## [2.3.0] - 2024-02-18

### Fixed

- Depending on the JSON Schema, dates were sometimes set to `undefined` when posting invalid data.

### Added

- `onSubmit.jsonData`, to override what's being submitted, when dataType is set to `'json'` and validation succeeds for `$form`.
- `onSubmit.validators`, to temporarily override validators for the current submission.

## [2.2.1] - 2024-02-16

### Fixed

- Added `focusOnError` option to `SuperForm.validateForm` type (it was only in the implementation).
- Enums could not be detected as an invalid value if the posted value was an empty string, instead it defaulted to the enum first value.
- `$posted` was reset by mistake to `false` after posting, when `resetForm` option was true.

## [2.2.0] - 2024-02-15

### Added

- [VineJS](https://vinejs.dev/) adapter!
- Added `focusOnError` option to `validateForm`, default `true`.

### Fixed

- Autofocus is now working when using `validateForm({ update: true })`.
- Default values are now applied properly for single-type unions, even a mix of integers and numbers.
- SuperStruct types, `$errors` primarily, didn't handle nested data properly.

### Changed

- The inferred type parameters were swapped in `message`, it can now be used to specify the message type.

## [2.1.0] - 2024-02-12

### Fixed

- Enums can now be required again, as they don't need an explicit default value anymore. If no explicit default value exists, the first enum value will be used.
- Empty arrays were set to `undefined` when using `dataType: 'json'`.

## [2.0.0] - 2024-02-11

### Removed

- `superForm.fields` was a rarely used and lesser version of `formFieldProxy`, switch to that instead.
- Removed `fields` options when setting tainted status.
- Remvoed `message` parameter in `onError` event, use `$message` directly instead.

### Changed

- Adapters required for validation! Import from `sveltekit-superforms/adapters` and use `superValidate(zod(schema))` instead of `superValidate(schema)`. If type parameters are used, it must now be wrapped with `Infer` for schemas.
- Default `superForm` options now follow SvelteKit more closely: `resetForm: true` and `taintedMessage: false` are default now. Add `define: { SUPERFORMS_LEGACY: true }` in `vite.config.ts` to keep the old behavior.
- `superValidateSync` is renamed to `defaults`. It returns [default values](https://superforms.rocks/default-values/) for the schema, and **does no validation anymore**. Use `+page.ts` if initial validation is required, as described on the [SPA page](https://superforms.rocks/concepts/spa#using-pagets-instead-of-pageserverts).
- `arrayProxy`: `fieldErrors` renamed to `valueErrors`.
- Enums must have an explicit default value in the schema.
- Numeric enums cannot be parsed with their string values anymore.
- Superform validator functions, previously just an object with functions, requires the `superformClient` adapter. The input for the validator functions can now be `undefined`.
- If `superValidate` is called with just the schema, the default values aren't validated (i.e. no side-effects for default values) unless `errors` is set to `true`.
- Properties with default values don't have `required` in their constraints anymore.
- Form id cannot be `undefined` anymore, must be `string`. (Set automatically by default now).
- `flashMessage.onError.message` option in `superForm` renamed to `flashMessage.onError.flashMessage`.
- `constraints` are now optional in the `SuperValidated` type, and are returned only when loading data, not posting. This is only relevant if you modify constraints before calling `superForm`.
- Removed the `defaultValidators` option, `'clear'` can now be set directly on `validators` instead.
- Removed the `emptyIfZero` setting from `numberProxy` and `intProxy`.
- `validate()` called with no arguments is renamed to `validateForm()` and can take two extra options, `update` and `schema`.

### Added

- Support for unions in schemas. A union must have an explicit default value, and multi-type unions can only be used with `dataType: 'json'` set.
- Added `superForm.isTainted(path?)` and `superForm.isTainted($tainted)` for better [tainted fields check](https://superforms.rocks/concepts/tainted/).
- [File upload support](https://superforms.rocks/concepts/files/)! Use `withFiles` when returning in form actions: `return withFiles({ form })`.
- [SuperDebug](https://superforms.rocks/super-debug/) now displays `File` and `FileList`.
- All [proxies](https://superforms.rocks/concepts/proxy-objects/) can now take the whole `superForm` object (previously only the `form` store was accepted), with an extra `taint` option to prevent tainting.
- `taintedMessage` can now be an async function resolving to `true` if navigation should be allowed, despite the form being tainted.
- Added an `onChange` event to `superForm`, that returns a list of modified fields whenever `$form` is updated.
- Added `'zero'` to the empty option of `numberProxy` and `intProxy`. Also added `initiallyEmptyIfZero` option, to show the placeholder for numeric inputs, which would otherwise display `0`.
