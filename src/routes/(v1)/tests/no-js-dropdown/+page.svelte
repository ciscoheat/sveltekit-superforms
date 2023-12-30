<script lang="ts">
	import { superForm } from '$lib/client/index.js';
	import SuperDebug from '$lib/client/SuperDebug.svelte';

	export let data;

	const { form, errors, enhance, message } = superForm(data.form, {
		clearOnSubmit: 'none'
	});

	let menu = ['Cookies and cream', 'Mint choc chip', 'Raspberry ripple'];
</script>

<SuperDebug data={$form} />

<form method="POST" use:enhance>
	<h2>Size</h2>

	<select name="scoops" bind:value={$form.scoops}>
		{#each ['One scoop', 'Two scoops', 'Three scoops'] as scoop, i}
			<option value={i + 1} selected={$form.scoops == i + 1}>{scoop}</option>
		{/each}
	</select>

	{#if $errors.scoops}<p>{$errors.scoops}</p>{/if}

	<h2>Flavours</h2>

	{#each menu as flavour}
		<label>
			<input type="checkbox" bind:group={$form.flavours} name="flavours" value={flavour} />
			{flavour}
		</label>
	{/each}

	{#if $errors.flavours?._errors}<p>{$errors.flavours._errors}</p>{/if}

	{#if $message}<p>{$message}</p>{/if}
	<button>Submit</button>
</form>

<p class="info">
	<a href="https://svelte.dev/tutorial/group-inputs" target="_blank"
		>Original code from Svelte documentation</a
	>
</p>

<style>
	.info {
		border-top: 1px solid gray;
		margin-top: 4rem;
	}
</style>
