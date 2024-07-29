<script lang="ts" context="module">
	type T = Record<string, unknown>;
</script>

<script lang="ts" generics="T extends Record<string, unknown>">
	import { formFieldProxy, type SuperForm, type FormPathLeaves } from '$lib/index.js';

	export let form: SuperForm<T>;
	export let field: FormPathLeaves<T>;

	$: ({ value, errors } = formFieldProxy(form, field));
</script>

<label>
	{field}: <input name={field} bind:value={$value} aria-invalid={$errors ? 'true' : undefined} />
	{#if $errors}<span class="invalid">{$errors}</span>{/if}
</label>

<style>
	input {
		background-color: #dedede;
	}

	.invalid {
		color: crimson;
	}
</style>
