<script module lang="ts">
	import type { FormPathLeaves } from '$lib/index.js';
	type T = Record<string, unknown>;
</script>

<script generics="T extends Record<string, unknown>" lang="ts">
	import { numberProxy, type SuperForm } from '$lib/index.js';

	export let form: SuperForm<T>;
	export let name: FormPathLeaves<T>;

	const proxy = numberProxy(form, name, { empty: 'zero', initiallyEmptyIfZero: true });
</script>

<input {name} {...$$restProps} type="number" bind:value={$proxy} />

<style>
	input {
		background-color: #dedede;
	}

	.invalid {
		color: crimson;
	}
</style>
