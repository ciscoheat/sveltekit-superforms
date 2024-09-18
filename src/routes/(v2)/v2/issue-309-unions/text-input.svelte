<script lang="ts" module>
	type T = Record<string, unknown>;
</script>

<script lang="ts" generics="T extends Record<string, unknown>">
	import { formFieldProxy, type FormPathLeaves, type SuperForm } from '$lib/index.js';

	export let superForm: SuperForm<T, unknown>;
	export let field: FormPathLeaves<T>;

	const { value, errors, constraints } = formFieldProxy(superForm, field);
</script>

<input
	type="text"
	name={field?.toString()}
	data-invalid={$errors}
	bind:value={$value}
	{...$constraints}
/>
