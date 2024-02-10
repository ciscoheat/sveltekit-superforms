<script lang="ts">
	import { superForm } from '$lib/client/index.js';
	import SuperDebug from '$lib/client/SuperDebug.svelte';
	import { zod, zodClient } from '$lib/adapters/zod.js';
	import { step1, step2, step3 } from './schema.js';
	import { z } from 'zod';

	let { data } = $props();

	const invalidSchema = z.object({
		nope: z.number()
	});

	const invalidSchema2 = z.object({
		name: z.string().nullable()
	});

	const steps = [zodClient(step1), zod(step2), zod(step3)];

	const { form, errors, tainted, message, enhance, options, validateForm } = superForm(data.form, {
		taintedMessage: false,
		validators: steps[0],
		resetForm: true,
		onUpdated({ form }) {
			if (form.valid) step = 1;
		}
	});

	// @ts-expect-error Type check
	options.validators = zod(invalidSchema);
	// @ts-expect-error Type check
	options.validators = zod(invalidSchema2);
	// Reset back to original
	options.validators = steps[0];

	let step = $state(1);

	$effect(() => {
		options.validators = steps[step - 1];
	});

	async function nextStep() {
		const status = await validateForm({ update: true });
		if (status.valid) step++;
	}

	async function prevStep() {
		step--;
	}
</script>

{#if $message}<h4>{$message}</h4>{/if}

<form method="POST" use:enhance>
	{#if step == 1}
		<label>
			Name: <input
				name="name"
				bind:value={$form.name}
				aria-invalid={$errors.name ? 'true' : undefined}
			/>
			{#if $errors.name}<span class="invalid">{$errors.name}</span>{/if}
		</label>
		<button type="button" onclick={nextStep}>Next</button>
	{:else}
		<input type="hidden" name="name" bind:value={$form.name} />
	{/if}

	{#if step == 2}
		<label>
			Points: <input
				type="number"
				name="points"
				bind:value={$form.points}
				aria-invalid={$errors.points ? 'true' : undefined}
			/>
			{#if $errors.points}<span class="invalid">{$errors.points}</span>{/if}
		</label>
		<button type="button" onclick={prevStep}>Prev</button>
		<button type="button" onclick={nextStep}>Next</button>
	{:else}
		<input type="hidden" name="points" bind:value={$form.points} />
	{/if}

	{#if step == 3}
		<label>
			Email: <input
				name="email"
				bind:value={$form.email}
				aria-invalid={$errors.email ? 'true' : undefined}
			/>
			{#if $errors.email}<span class="invalid">{$errors.email}</span>{/if}
		</label>
		<button type="button" onclick={prevStep}>Prev</button>
		<button>Submit</button>
	{/if}
</form>

<SuperDebug data={{ $form, $errors, $tainted }} />

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
