# Changelog

Headlines: Added, Changed, Deprecated, Removed, Fixed, Security

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0-alpha.1] - 2024-01-07

### Removed

- superForm.fields
- `fields` options for setting tainted.

### Changed

- Adapters required, `superValidate(zod(schema))` instead of `superValidate(schema)`. If type parameters are used, it must now be wrapped with `z.infer` for Zod schemas.
- Default options now follow SvelteKit more closely: `resetForm: true` and `taintedMessage: false`. Add `define: { SUPERFORMS_LEGACY: true }` in `vite.config.ts` to keep the old behavior.
- `superValidateSync` is renamed to `defaults`, returning default values for the schema, and **does no validation anymore**. Use `+page.ts` if initial validation is required, as described on the [SPA page](https://superforms.rocks/concepts/spa#using-pagets-instead-of-pageserverts).
- `arrayProxy`: `fieldErrors` renamed to `valueErrors`.
- Numeric enums cannot be parsed with their string values anymore.
- Superform validator functions requires the `superform` adapter, and the input parameter can now be `undefined`.
- If no data, the default values aren't parsed with the schema (i.e. no side-effects for default values).
- Fields with default values don't have `required` in their constraints anymore.
- Unions must have an explicit default value in the schema.
- Form id cannot be `undefined` anymore, must be `string`. (It's set automatically by default)

### Added

- `superForm.isTainted(path?)`
- `superValidate.options.allowFiles` which makes `setError` and `message` remove files automatically by default. Use `failAndRemoveFiles` for convenience.
- SuperDebug now displays `File` and `FileList`.
