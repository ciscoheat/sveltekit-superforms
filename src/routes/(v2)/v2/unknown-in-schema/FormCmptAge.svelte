<script lang="ts" module>
	type T = Record<string, unknown>;
	type Value = number;
</script>

<script lang="ts" generics="T extends Record<string, unknown>">
	import {
		formFieldProxy,
		type SuperForm,
		type FormPathLeaves,
		type FormFieldProxy
	} from '$lib/index.js';

	export let form: SuperForm<T>;
	export let field: FormPathLeaves<T, Value>;

	const { value } = formFieldProxy(form, field) as FormFieldProxy<Value>;
</script>

{$value.toExponential()}
