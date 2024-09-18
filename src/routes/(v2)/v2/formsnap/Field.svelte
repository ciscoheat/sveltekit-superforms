<script lang="ts" module>
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	import type { FormPath } from '$lib/index.js';
	type T = Record<string, unknown>;
	type U = unknown;
</script>

<script lang="ts" generics="T extends Record<string, unknown>, U extends FormPath<T>">
	import type { SuperForm } from '$lib/index.js';
	// eslint-disable-next-line svelte/valid-compile
	export let form: SuperForm<T>;
	// eslint-disable-next-line svelte/valid-compile
	export let name: U;

	console.log(form, name);
</script>

<!--
@component
## Field
A component that provides the necessary context for a form field.

- [Field Documentation](https://formsnap.dev/docs/components/field)

### Slot Props
- `value` - The value of the field.
- `errors` - The errors of the field.
- `tainted` - The tainted state of the field.
- `constraints` - The constraints of the field.

@param {SuperForm} form - The form object.
@param {FormPath<T>} name - The name of the field.
-->

<slot />
