# Changelog

Headlines: Added, Changed, Deprecated, Removed, Fixed, Security

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
