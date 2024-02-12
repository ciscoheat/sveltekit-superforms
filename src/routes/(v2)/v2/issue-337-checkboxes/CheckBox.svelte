<script lang="ts" context="module">
	type T = Record<string, unknown>;
</script>

<script lang="ts" generics="T extends Record<string, unknown>">
	import { formFieldProxy, type SuperForm, type FormPathLeaves } from '$lib/index.js';
	import type { Writable } from 'svelte/store';

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	export let form: SuperForm<T, any>;
	export let field: FormPathLeaves<T>;

	const { value, constraints } = formFieldProxy(form, field);
	$: boolValue = value as Writable<boolean>;
</script>

<input
	name={field}
	type="checkbox"
	class="checkbox"
	bind:checked={$boolValue}
	{...$constraints}
	{...$$restProps}
/>
