<script lang="ts">
	import { superForm } from '$lib/client/index.js';
	import type { PageData } from './$types.js';
	import * as flashModule from 'sveltekit-flash-message/client';
	import SuperDebug from '$lib/client/SuperDebug.svelte';
	import { schema } from './schema.js';
	import { page } from '$app/stores';
	import { zod } from '$lib/adapters/zod.js';

	export let data: PageData;

	const { form, errors, tainted, message, enhance } = superForm(data.form, {
		taintedMessage: null,
		validators: zod(schema),
		flashMessage: {
			module: flashModule,
			onError: ({ result, flashMessage }) => {
				flashMessage.set({ type: 'error', message: result.error.message });
			}
		}
	});

	// eslint-disable-next-line svelte/valid-compile
	$: action = $page.url.searchParams.has('throw-hooks-error') ? '?throw-hooks-error' : '';
</script>

<SuperDebug data={{ $form, $errors, $tainted }} />

{#if $message}<h4>{$message}</h4>{/if}

<form method="POST" {action} use:enhance>
	<label>
		Name: <input name="name" bind:value={$form.name} />
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
