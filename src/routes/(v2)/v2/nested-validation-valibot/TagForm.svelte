<script lang="ts">
	import { page } from '$app/stores';
	import { superForm } from '$lib/client/index.js';
	import SuperDebug from '$lib/client/SuperDebug.svelte';
	import { schema } from './schema.js';
	import * as flashModule from 'sveltekit-flash-message/client';
	import { onMount } from 'svelte';
	import type { SuperValidated, Infer } from '$lib/index.js';
	import { valibotClient } from '$lib/adapters/valibot.js';

	export let data: SuperValidated<Infer<typeof schema>>;
	export let validator: 'valibot';

	export let output: (string[] | undefined)[] = [];
	export let validated: SuperValidated<Infer<typeof schema>> | undefined = undefined;

	// eslint-disable-next-line svelte/valid-compile
	$: testMode = $page.url.searchParams.has('test');
	$: custom = $page.url.searchParams.has('custom');

	const { form, errors, enhance, message, tainted, validateForm, validate } = superForm(data, {
		taintedMessage: null,
		dataType: 'json',
		onUpdate(event) {
			if ($page.url.searchParams.has('cancel')) event.cancel();
		},
		validators: valibotClient(schema),
		flashMessage: {
			module: flashModule,
			onError({ result, flashMessage }) {
				flashMessage.set({
					type: 'error',
					message: result.error.message
				});
			}
		}
	});

	// validate tests
	onMount(async () => {
		if (!testMode) return;

		validated = await validateForm();

		await validate('tags[0].name', {
			value: 'p',
			update: 'errors',
			errors: 'Custom error'
		});

		if (custom) return;

		output = [...output, await validate('name')];

		output = [
			...output,
			await validate('tags[2].id', {
				value: 2
			})
		];

		output = [
			...output,
			(await validate('tags[0].id', {
				update: 'errors',
				value: 7
			})) ?? ['Update errors OK']
		];

		const errors = await validate('tags[1].id');
		if (errors?.length == 1 && errors[0] == 'Number must be greater than or equal to 3') {
			output = [...output, ['Error check OK']];
		} else {
			output = [...output, ['FAIL']];
		}

		const errors2 = await validate('tags[1].id', {
			value: 0,
			update: false
		});
		if (errors2?.length == 1 && errors2[0] == 'Number must be greater than or equal to 3') {
			output = [...output, ['Error check 2 OK']];
		} else {
			output = [...output, ['FAIL']];
		}
	});
</script>

<form method="POST" use:enhance>
	{#if testMode}
		<SuperDebug data={$tainted} />
	{/if}

	{#if $message}<h4>{$message}</h4>{/if}
	<input type="hidden" name="id" value={validator} />
	<small>{validator} validation</small>

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
	<div>
		Name: <input
			type="text"
			aria-invalid={$errors.name ? 'true' : undefined}
			name="name"
			bind:value={$form.name}
		/>
		{#if $errors.name}<br /><span class="invalid">{$errors.name}</span>{/if}
	</div>

	<button>Submit</button>
</form>

<style lang="scss">
	button {
		margin-right: 20px;
	}

	:global(input:not([type='checkbox'])) {
		width: 100px;
	}

	.invalid {
		color: red;
	}
</style>
