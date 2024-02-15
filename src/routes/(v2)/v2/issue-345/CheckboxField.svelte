<script lang="ts" context="module">
	type UnknownRecord = Record<string, unknown>;

	type T = UnknownRecord;
</script>

<script lang="ts" generics="T extends UnknownRecord">
	import type { Writable } from 'svelte/store';
	import type { FormPathLeaves } from '$lib/index.js';
	import { formFieldProxy, type SuperForm } from '$lib/index.js';
	import CheckboxComponent from './CheckboxComponent.svelte';
	export let form: SuperForm<T>;
	export let field: FormPathLeaves<T>;

	const { value, errors } = formFieldProxy(form, field);
	$: boolValue = value as Writable<boolean>;
</script>

<CheckboxComponent bind:checked={$boolValue} />
