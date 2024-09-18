<script lang="ts" module>
	type T = Record<string, unknown>;
</script>

<script lang="ts" generics="T extends Record<string, unknown>">
	import { formFieldProxy, type FormPathLeaves, type SuperForm } from '$lib/client/index.js';

	let _class = '';

	export { _class as class };
	export let label: string | undefined = undefined;
	export let field: FormPathLeaves<T>;
	export let form: SuperForm<T>;

	const { value, errors } = formFieldProxy(form, field);
</script>

{#if label !== undefined}
	<label class="label" for={field}>{label}</label>
{/if}
<div class="control">
	<input
		class={'input ' + _class}
		name={field}
		aria-invalid={$errors ? 'true' : undefined}
		placeholder=""
		bind:value={$value}
		{...$$restProps}
	/>
</div>
{#if $errors}
	<p class="help is-danger">{$errors}</p>
{/if}

<style>
	.is-danger {
		color: red;
	}

	input {
		background-color: #e7e7e7;
	}

	input:not(:placeholder-shown):invalid {
		box-shadow: inset 0px 0px 3px 1px #f00;
	}
</style>
