<script lang="ts">
	import { zod, zodClient } from '$lib/adapters/zod.js';
	import { defaults, superForm } from '$lib/client/index.js';
	import SuperDebug from '$lib/client/SuperDebug.svelte';
	import { schema } from './schema.js';
	import { page } from '$app/stores';
	//import { zod } from '$lib/adapters/zod.js'
	//import { schema } from './schema.js';

	export let data;

	const { form, errors, tainted, message, enhance, formId } = superForm(data.form, {
		validators: zodClient(schema),
		taintedMessage: false,
		resetForm: true
	});

	const {
		form: formData,
		errors: errors2,
		formId: formId2,
		enhance: enhance2,
		posted
	} = superForm(defaults(zod(schema)), {
		id: 'abc',
		taintedMessage: false,
		invalidateAll: false,
		resetForm: true,
		validators: zodClient(schema)
	});

	// eslint-disable-next-line svelte/valid-compile
	$page;
</script>

<SuperDebug data={{ $form, $errors, $tainted }} />

{JSON.stringify($page.form)}

{#if $message}<h4>{$message}</h4>{/if}

<form method="POST" use:enhance>
	<div>FORMID:{$formId}:</div>
	<div>POSTED:{$posted}:</div>
	<label>
		Name: <input
			name="name"
			bind:value={$form.name}
			aria-invalid={$errors.name ? 'true' : undefined}
		/>
		{#if $errors.name}<span class="invalid">{$errors.name}</span>{/if}
	</label>
	<label>
		Email: <input
			name="email"
			bind:value={$form.email}
			aria-invalid={$errors.email ? 'true' : undefined}
		/>
		{#if $errors.email}<span class="invalid">{$errors.email}</span>{/if}
	</label>
	<div>
		<button>Submit</button>
	</div>
</form>

<form method="POST" use:enhance2>
	<div>FORMID:{$formId2}:</div>
	<div>POSTED:{$posted}:</div>
	<label>
		Name2: <input name="name" bind:value={$formData.name} />
		{#if $errors2.name}<span class="invalid">{$errors2.name}</span>{/if}
	</label>
	<label>
		Email: <input
			name="email"
			bind:value={$formData.email}
			aria-invalid={$errors2.email ? 'true' : undefined}
		/>
		{#if $errors2.email}<span class="invalid">{$errors2.email}</span>{/if}
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
