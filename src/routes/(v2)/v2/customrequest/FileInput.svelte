<script lang="ts">
	import type { InputConstraint } from '$lib/index.js';

	export let value: File | File[] | null;
	export let name: string;
	export let label: string | undefined = undefined;
	export let errors: string[] | undefined = undefined;
	export let constraints: InputConstraint | undefined = undefined;

	const input = (e: Event) => {
		const file = (e.currentTarget as HTMLInputElement).files?.item(0) ?? null;
		value = file;
	};
</script>

<label for={name}>{label}</label>
<input
	{name}
	id={name}
	type="file"
	on:change={input}
	aria-invalid={errors ? 'true' : undefined}
	{...constraints}
	{...$$restProps}
/>
{#if errors}<span class="error">{errors}</span>{/if}

<style>
	.error {
		color: red;
	}

	input {
		margin-bottom: 0;
	}
</style>
