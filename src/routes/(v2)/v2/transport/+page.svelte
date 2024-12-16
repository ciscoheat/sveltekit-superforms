<script lang="ts">
	import { superForm } from '$lib/client/index.js';
	import SuperDebug from '$lib/client/SuperDebug.svelte';
	import { Decimal } from 'decimal.js';
	import type { FormEventHandler } from 'svelte/elements';
	import { zod } from '$lib/adapters/zod.js';
	import { schema } from './schema.js';
	import { transport } from '../../../../hooks.js';

	export let data;

	const { form, errors, tainted, message, enhance } = superForm(data.form, {
		taintedMessage: false,
		dataType: 'json',
		transport,
		validators: zod(schema)
	});

	const updateLuckyNumber: FormEventHandler<HTMLInputElement> = (e) => {
		try {
			$form.luckyNumber = new Decimal(e.currentTarget.value);
		} catch (error) {
			// What to do?
		}
	};
</script>

<SuperDebug data={{ $form, $errors, $tainted }} />

{#if $message}<h4>{$message}</h4>{/if}

<p id="record">$form.id: {$form.id}</p>

<form method="POST" use:enhance>
	<label>
		Name: <input
			name="name"
			bind:value={$form.name}
			aria-invalid={$errors.name ? 'true' : undefined}
		/>
		{#if $errors.name}<span class="invalid">{$errors.name}</span>{/if}
	</label>
	<label>
		Lucky number: <input
			step="any"
			type="number"
			name="email"
			value={$form.luckyNumber.toNumber()}
			oninput={updateLuckyNumber}
			aria-invalid={$errors.luckyNumber ? 'true' : undefined}
		/>
		{#if $errors.luckyNumber}<span class="invalid">{$errors.luckyNumber}</span>{/if}
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
