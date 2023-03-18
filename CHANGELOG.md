# Changelog

Headlines: Added, Changed, Deprecated, Removed, Fixed, Security

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.6.0] - 2023-03-17

### Changed

- `form.message` is now of `any` type, and uses `undefined` instead of `null` to signify no value.
- `options.onError` can now only be set to `apply`, or a callback `(result, message) => void` for handling the error result. It does not automatically set the error message anymore, since it can be of any type.
- The signature for `allErrors` and `firstError` is now `{ path: string[], message: string }`.
- `SuperFormError` is thrown instead of `Error`.
- The callback for `options.flashMessage.onError` now follows the same signature as `options.onError`.
- If `options.dataType` isn't set to `json` and a nested object is detected in the data sent to `superForm`, an error will be thrown.

### Added

- `options.validators` now accepts a Zod schema, for complete client-side validation!
- `errors`, `constraints` and `tainted` now supports nested data structures!
- `superValidate` now accepts schemas modified with `refine/superRefine/transform`.
- Added `meta` store, which is populated when `options.includeMeta = true` in `superValidate`.

### Removed

- The undocumented `defaults` option of `superValidate` is removed, it can be replaced with `transform/refine` in the validation schema.
- `formdata` is removed from `options.dataType`. Use `json` instead, it will cover all cases except some very narrow ones.
- The `update` parameter in `onResult` is removed. It has the same effect as not cancelling the event, so it's redundant.

### Fixed

- Using `onDestroy` to unsubscribe from `page`.
- The `fields` store properly lists all top-level fields as an object, so they can be passed to sub-components.
- `onSubmit` wasn't called with `await`.
- Default data is now copied properly, not just referenced.
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
