# Changelog

Headlines: Added, Changed, Deprecated, Removed, Fixed, Security

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- Autofocus is now set when using `validateForm({ update: true })`.
- Default values are now applied properly for single-type unions, even a mix of integers and numbers.

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
