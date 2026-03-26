<script lang="ts">
	import { superForm } from '$lib/client/index.js';
	import SuperDebug from '$lib/client/SuperDebug.svelte';
	//import { zod } from '$lib/adapters/zod.js'
	//import { schema } from './schema.js';
	import * as flashModule from 'sveltekit-flash-message/client';

	export let data;

	const { form, errors, tainted, enhance } = superForm(data.form, {
		taintedMessage: false,
		flashMessage: { module: flashModule },
		syncFlashMessage: true
	});
</script>

<SuperDebug data={{ $form, $errors, $tainted }} />

<form method="POST" use:enhance>
	<p>Enter "redirect" to redirect instead of using message.</p>
	<label>
		<input name="name" bind:value={$form.name} aria-invalid={$errors.name ? 'true' : undefined} />
		{#if $errors.name}<span class="invalid">{$errors.name}</span>{/if}
	</label>
	<div>
		<button>Submit</button>
	</div>
</form>

<style lang="scss">
	form {
		margin: 2rem 0;

		input {
			background-color: #dedede;
		}

		.invalid {
			color: crimson;
		}
	}
</style>
