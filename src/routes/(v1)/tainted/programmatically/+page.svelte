<script lang="ts">
	import { superForm } from '$lib/client/index.js';
	import SuperDebug from '$lib/client/SuperDebug.svelte';
	import type { PageData } from './$types.js';

	export let data: PageData;

	const { form, errors, enhance, message, tainted } = superForm(data.form, {
		taintedMessage: null
	});

	let menu = ['Cookies and cream', 'Mint choc chip', 'Raspberry ripple'];
</script>

<SuperDebug data={{ $form, $tainted }} />

<form method="POST" use:enhance>
	<h2>Size</h2>

	<label>
		<input type="radio" bind:group={$form.scoops} name="scoops" value={1} />
		One scoop
	</label>

	<label>
		<input type="radio" bind:group={$form.scoops} name="scoops" value={2} />
		Two scoops
	</label>

	<label>
		<input type="radio" bind:group={$form.scoops} name="scoops" value={3} />
		Three scoops
	</label>

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

<hr />

<div class="buttons">
	<button
		on:click={() => {
			form.update(
				($form) => {
					$form.scoops = 3;
					return $form;
				},
				{ taint: false }
			);
		}}>Three scoops, no taint</button
	>

	<button
		on:click={() => {
			form.update(
				($form) => {
					$form.flavours = ['Cookies and cream', 'Mint choc chip'];
					return $form;
				},
				{ taint: false }
			);
		}}>Cookies and mint, no taint</button
	>

	<button
		on:click={() => {
			form.update(
				($form) => {
					$form.scoops = 2;
					return $form;
				},
				{ taint: 'untaint' }
			);
		}}>Two scoops, untaint</button
	>

	<button
		on:click={() => {
			form.update(
				($form) => {
					$form.scoops = 3;
					return $form;
				},
				{ taint: 'untaint-form' }
			);
		}}>Three scoops, untaint all</button
	>
</div>

<style>
	hr {
		margin: 2rem 0;
	}
	.buttons {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
	}
</style>
