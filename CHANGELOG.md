# Changelog

Headlines: Added, Changed, Deprecated, Removed, Fixed, Security

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.12] - 2023-02-27

### Fixed

- Reset form also on redirect, if `options.resetForm` is set.

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
