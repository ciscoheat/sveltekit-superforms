<script lang="ts">
	import { superForm, type SuperForm } from '$lib/client/index.js';
	import type { PageData } from './$types.js';
	import SuperDebug from '$lib/client/SuperDebug.svelte';
	import type { schema } from './schemas.js';
	import { page } from '$app/stores';
	import type { z } from 'zod';

	export let data: PageData;

	let resets = 0;

	const superform: SuperForm<z.infer<typeof schema>> = superForm(data.form, {
		// eslint-disable-next-line svelte/valid-compile
		resetForm: $page.url.searchParams.has('function')
			? () => {
					console.log('Reset...');
					return true;
				}
			: true,
		onUpdated({ form }) {
			if (form.valid) resets = resets + 1;
		}
	});

	const { form, enhance, errors, reset } = superform;

	function resetForm() {
		console.log('Reset!');
		reset({
			data: {
				points: 4
			}
		});
	}
</script>

<SuperDebug data={$form} />

<div>Resets: {resets}</div>

<div>Points: {$form.points}</div>

<form method="POST" use:enhance>
	<input type="hidden" name="points" value="0" /><br />
	<input type="text" name="name" bind:value={$form.name} /><br />
	{#if $errors.name}<span>{$errors.name}</span><br />{/if}
	<button>Submit</button>
	<button type="button" on:click={resetForm}>Client reset</button>
</form>

<style lang="scss">
	form {
		margin: 2rem 0;
	}
</style>
