<script lang="ts">
	import type { InputConstraint } from '$lib/index.js';

	export let value: string | number;

	export let type: 'text' | 'number' = 'text';
	export let label: string | undefined = undefined;
	export let errors: string[] | undefined = undefined;
	export let constraints: InputConstraint | undefined = undefined;
</script>

<div>
	<label>
		{#if label}<span>{label}</span><br />{/if}
		{#if type == 'text'}
			<input type="text" bind:value {...constraints} {...$$restProps} />
		{:else}
			<input type="number" bind:value {...constraints} {...$$restProps} />
		{/if}
	</label>
	{#if errors}<span class="invalid">{errors}</span>{/if}
</div>

<style lang="scss">
	input,
	label {
		margin-bottom: 0;
	}

	.invalid {
		color: indianred;
	}
</style>
