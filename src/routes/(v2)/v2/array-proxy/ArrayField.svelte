<script lang="ts" module>
	type T = Record<string, unknown>;
	type F = FormPathArrays<T>;
</script>

<script lang="ts" generics="T extends Record<string, unknown>, F extends FormPathArrays<T>">
	import { arrayProxy, type ArrayProxy } from '$lib/index.js';
	import type { SuperForm, FormPathArrays, FormPathType } from '$lib/index.js';

	export let form: SuperForm<T>;
	export let field: F;
	export let newValue: FormPathType<T, F> extends (infer S)[] ? S : never;

	const { values, errors, valueErrors } = arrayProxy(form, field) satisfies ArrayProxy<
		typeof newValue
	>;
</script>

<div>
	<ol>
		<!-- eslint-disable-next-line @typescript-eslint/no-unused-vars -->
		{#each $values as _, i}
			<li>
				<button type="button" title="Delete" on:click={() => ($values = $values.toSpliced(i, 1))}>
					✖️
				</button>
				{#if $valueErrors && $valueErrors[i]}
					<div role="alert">{$valueErrors[i]}</div>
				{/if}
			</li>
		{/each}
		<button type="button" on:click={() => ($values = [...$values, newValue])}> Add </button>
	</ol>
	{#if $errors}
		<div role="alert">{$errors}</div>
	{/if}
</div>
