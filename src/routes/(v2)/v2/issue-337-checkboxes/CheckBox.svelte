<script lang="ts" module>
	type T = Record<string, unknown>;
</script>

<script lang="ts" generics="T extends Record<string, unknown>">
	import {
		formFieldProxy,
		type FormFieldProxy,
		type SuperForm,
		type FormPathLeaves
	} from '$lib/index.js';

	export let form: SuperForm<T>;
	export let field: FormPathLeaves<T, boolean>;

	const { value, constraints } = formFieldProxy(form, field) satisfies FormFieldProxy<boolean>;
</script>

<input
	name={field}
	type="checkbox"
	class="checkbox"
	bind:checked={$value}
	{...$constraints}
	{...$$restProps}
/>
