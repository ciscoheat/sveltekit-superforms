<script lang="ts" module>
	type T = Record<string, unknown>;
</script>

<script lang="ts" generics="T extends Record<string, unknown>">
	import { formFieldProxy, type FormPathLeaves, type SuperForm } from '$lib/index.js';
	import Input from './Input.svelte';

	export let form: SuperForm<T>;
	export let name: FormPathLeaves<T>;

	const { value } = formFieldProxy(form, name);
</script>

<Input bind:value={$value} />
<!-- <input bind:value={$value} /> -->
