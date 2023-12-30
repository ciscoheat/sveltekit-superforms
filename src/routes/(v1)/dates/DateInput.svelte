<script lang="ts">
	import type { FormField } from '$lib/index.js';

	type T = $$Generic<AnyZodObject>;
	type P = $$Generic<keyof z.infer<T>>;

	export let field: FormField<T, P>;

	$: value = field.value;
	$: errors = field.errors;
	$: label = field.name;
</script>

<label>
	{label}<br /><input type="date" bind:value={$value} name={field.name} data-invalid={$errors} />
	{#if $errors}<span class="invalid">{$errors}</span>{/if}
</label>

<style lang="scss">
	[data-invalid],
	.invalid {
		color: red;
	}
</style>
