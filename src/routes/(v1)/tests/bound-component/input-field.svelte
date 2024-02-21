<script lang="ts">
	//export let field
	export let value: string;
	export let errors: string[] | undefined;
	export let label: string;
</script>

<label>
	{label}<br />
	<input type="text" data-invalid={errors} bind:value />
</label>
{#if errors}<span class="invalid">{errors}</span>{/if}

<button
	on:click={(e) => {
		e.preventDefault();
		value = 'I am valid';
	}}>reset</button
>

<style lang="scss">
	.invalid {
		color: orangered;
	}
</style>
