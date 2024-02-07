# Changelog

Headlines: Added, Changed, Deprecated, Removed, Fixed, Security

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0-alpha.1] - 2024-01-10

### Removed

- `superForm.fields`
- `fields` options for setting tainted.
- `message` parameter in `onError` event.

### Changed

- Adapters required, `superValidate(zod(schema))` instead of `superValidate(schema)`. If type parameters are used, it must now be wrapped with `z.infer` for Zod schemas.
- Default options now follow SvelteKit more closely: `resetForm: true` and `taintedMessage: false`. Add `define: { SUPERFORMS_LEGACY: true }` in `vite.config.ts` to keep the old behavior.
- `superValidateSync` is renamed to `defaults`, returning default values for the schema, and **does no validation anymore**. Use `+page.ts` if initial validation is required, as described on the [SPA page](https://superforms.rocks/concepts/spa#using-pagets-instead-of-pageserverts).
- `arrayProxy`: `fieldErrors` renamed to `valueErrors`.
- Enums must have an explicit default value in the schema.
- Numeric enums cannot be parsed with their string values anymore.
- Superform validator functions requires the `superform` adapter, and the input parameter can now be `undefined`.
- If no data, the default values aren't parsed with the schema (i.e. no side-effects for default values).
- Fields with default values don't have `required` in their constraints anymore.
- Form id cannot be `undefined` anymore, must be `string`. (Set automatically by default now).
- `flashMessage.onError.message` option in `superForm` renamed to `flashMessage.onError.flashMessage`.
- `constraints` are now optional in the `SuperValidated` type, and are returned only when loading data, not posting. This is only relevant when you modify constraints before calling `superForm`.
- Removed the `defaultValidators` option, `'clear'` can now be set directly on `validators` instead.
- Removed the `emptyIfZero` setting from `numberProxy` and `intProxy`.
- `validate()` called with no arguments is renamed to `validateForm()` and can take two extra options.

### Added

- Support for unions in schemas. Unions must have an explicit default value, and multi-type unions can only be used with `dataType: 'json'` set.
- `superForm.isTainted(path?)` and `superForm.isTainted($tainted)`
- `superValidate.options.allowFiles` which makes `setError` and `message` remove files automatically by default. Use `removeFiles` on the returned object in other cases.
- SuperDebug now displays `File` and `FileList`.
- All proxies can now take the whole `superForm` object with an extra `taint` option.
- `zeroIfEmpty` option added to `intProxy` and `numberProxy`, to handle empty text inputs better.
- `taintedMessage` can now be an (async) function returning `true` if navigation should happen despite the form being tainted.
- `onChange` event, that returns a list of modified fields whenever `$form` is updated.
- Added `'zero'` to the empty option of `numberProxy` and `intProxy`. Added `initiallyEmptyIfZero` option.
