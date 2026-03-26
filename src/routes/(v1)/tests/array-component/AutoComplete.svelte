<script lang="ts" module>
	type T = Record<string, unknown>;
</script>

<script lang="ts" generics="T extends Record<string, unknown>">
	import type { FormPathArrays } from '$lib/index.js';
	import type { SuperForm } from '$lib/client/index.js';
	import { arrayProxy } from '$lib/client/index.js';

	export let form: SuperForm<T>;
	export let field: FormPathArrays<T>;
	export let options: { value: string; label: string }[];
	export let label = '';
	export let taint = true;

	const { values, errors, valueErrors: fieldErrors } = arrayProxy(form, field, { taint });
</script>

{#if label}<label for={field}>{label}</label>{/if}

<!-- Note that the selected attribute is required for this to work without JS -->
<select multiple name={field} bind:value={$values}>
	{#each options as option}
		<option value={option.value} selected={$values && $values.includes(option.value)}
			>{option.label}</option
		>
	{/each}
</select>

<button
	type="button"
	on:click={() => {
		$fieldErrors = [];
	}}>Change errors</button
>

{#if $errors}<p class="invalid">{$errors}</p>{/if}

{#each $fieldErrors as $err, i}
	{#if $err && $values}
		<p class="invalid">Item {$values[i]}: {$err}</p>
	{/if}
{/each}

<style>
	.invalid {
		color: crimson;
	}
</style>
