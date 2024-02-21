<script lang="ts">
	import { page } from '$app/stores';
	import { superForm } from '$lib/client/index.js';
	import type { PageData } from './$types.js';
	import { schema } from './schema.js';
	import * as flashModule from 'sveltekit-flash-message/client';
	import { zod } from '$lib/adapters/zod.js';

	export let data: PageData;

	type Message = { status: 'success' | 'error'; text: string };

	function yourSuperForm<T extends Record<string, unknown>>(
		...params: Parameters<typeof superForm<T, Message>>
	) {
		return superForm<T, Message>(params[0], {
			delayMs: 300,
			flashMessage: {
				module: flashModule,
				onError({ result, flashMessage }) {
					flashMessage.set({
						status: 'error',
						text: result.error.message
					});
				}
			},
			...params[1]
		});
	}

	const { form, errors, enhance, message } = yourSuperForm(data.form, {
		dataType: 'json',
		onUpdate(event) {
			// eslint-disable-next-line svelte/valid-compile
			if ($page.url.searchParams.has('cancel')) event.cancel();
		},
		validators: zod(schema)
	});
</script>

<h2>Nested forms</h2>

{#if $message}<h4>{$message}</h4>{/if}

<form method="POST" use:enhance>
	<!-- eslint-disable-next-line @typescript-eslint/no-unused-vars -->
	{#each $form.tags as _, i}
		<div>
			<input type="number" data-invalid={$errors.tags?.[i]?.id} bind:value={$form.tags[i].id} />
			<input data-invalid={$errors.tags?.[i]?.name} bind:value={$form.tags[i].name} />
			{#if $errors.tags?.[i]?.id}
				<br />
				<span class="invalid">{$errors.tags[i].id}</span>
			{/if}
			{#if $errors.tags?.[i]?.name}
				<br />
				<span class="invalid">{$errors.tags[i].name}</span>
			{/if}
		</div>
	{/each}
	<button>Submit</button>
	<span
		><input type="checkbox" name="redirect" bind:checked={$form.redirect} /> Redirect on success</span
	>
</form>

<style lang="scss">
	button {
		margin-right: 20px;
	}

	input:not([type='checkbox']) {
		width: 100px;
	}

	.invalid {
		color: red;
	}
</style>
