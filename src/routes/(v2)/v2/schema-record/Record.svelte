<script lang="ts" context="module">
	type T = Record<string, unknown>;
</script>

<script lang="ts" generics="T extends Record<string, unknown>">
	import SuperDebug from '$lib/client/SuperDebug.svelte';
	import { type SuperForm, type FormPath, fieldProxy } from '$lib/index.js';
	import type { string } from 'joi';
	import { get, type Readable } from 'svelte/store';

	export let form: SuperForm<T>;
	export let field: FormPath<T>;

	const value = fieldProxy(form, field);
	const errors = fieldProxy(form.errors, field as any) as unknown as Readable<
		Record<string, string[] | unknown>
	>;
	//$: ({ value, errors } = formFieldProxy(form, field));
</script>

<SuperDebug data={{ errors: $errors, message: get(form.form).message }} />

{#each Object.entries($value as Record<string, string>) as [key, data]}
	<label>
		{field}:
		<input name={field} bind:value={$value[key]} aria-invalid={$errors ? 'true' : undefined} />
		{#if $errors?.[key]}<span class="invalid">{$errors[key]}</span>{/if}
	</label>
{/each}

<style>
	input {
		background-color: #dedede;
	}

	.invalid {
		color: crimson;
	}
</style>
