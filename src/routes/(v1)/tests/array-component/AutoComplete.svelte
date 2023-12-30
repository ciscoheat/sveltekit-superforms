<script lang="ts" context="module">
	import type { AnyZodObject } from 'zod';
	type T = AnyZodObject;
</script>

<script lang="ts" generics="T extends AnyZodObject">
	import type { z } from 'zod';
	import type { ZodValidation, FormPathArrays } from '$lib/index.js';
	import type { SuperForm } from '$lib/client/index.js';
	import { arrayProxy, type TaintOptions } from '$lib/client/index.js';

	export let form: SuperForm<ZodValidation<T>, unknown>;
	export let field: FormPathArrays<z.infer<T>>;
	export let options: { value: string; label: string }[];
	export let label = '';
	export let taint: TaintOptions = true;

	const { values, errors, fieldErrors } = arrayProxy(form, field, { taint });
</script>

{#if label}<label for={field}>{label}</label>{/if}

<!-- Note that the selected attribute is required for this to work without JS -->
<select multiple name={field} bind:value={$values}>
	{#each options as option}
		<option value={option.value} selected={$values.includes(option.value)}>{option.label}</option>
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
	{#if $err}
		<p class="invalid">Item {$values[i]}: {$err}</p>
	{/if}
{/each}

<style>
	.invalid {
		color: crimson;
	}
</style>
