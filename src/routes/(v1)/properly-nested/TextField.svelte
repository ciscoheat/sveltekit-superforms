<script lang="ts" module>
	type T = Record<string, unknown>;
</script>

<script lang="ts" generics="T extends Record<string, unknown>">
	import { formFieldProxy, type SuperForm } from '$lib/index.js';
	import type { FormPathLeaves } from '$lib/stringPath.js';

	export let form: SuperForm<T, unknown>;
	export let field: FormPathLeaves<T>;

	const { path, value, errors, constraints } = formFieldProxy(form, field);
</script>

<label>
	{String(path)}<br />
	<input
		type="text"
		data-invalid={$errors}
		bind:value={$value}
		{...$constraints}
		{...$$restProps}
	/>
</label>
{#if $errors}<span class="invalid">{$errors}</span>{/if}

<style lang="scss">
	.invalid {
		color: orangered;
	}
</style>
