# Changelog

Headlines: Added, Changed, Deprecated, Removed, Fixed, Security

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

TODO:

- superValidateSync cannot use superValidate anymore since TypeSchema is async.
- Remove fields options for setting tainted
- Default options should follow SvelteKit: resetForm: true and taintedMessage: false (only error behavior is kept)

## [Unreleased]

### Removed

- superForm.fields

### Changed

- Adapters required, `superValidate(zod(schema))` instead of `superValidate(schema)`.
- Fields with default values don't have `required` in their constraints anymore.
- Unions must have an explicit default value.
- If no data, default values aren't parsed with the default data (no side-effects for default values)

### Issues

Strict mode/non-strict mode behavior:

1. Non-existing fields will coerce to their default value.
2. Non-existing fields will fail validation, unless default.
