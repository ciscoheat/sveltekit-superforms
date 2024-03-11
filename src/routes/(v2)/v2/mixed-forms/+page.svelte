<script lang="ts">
	import { superForm } from '$lib/client/index.js';
	import SuperDebug from '$lib/client/SuperDebug.svelte';
	//import { zod } from '$lib/adapters/zod.js'
	//import { schema } from './schema.js';

	export let data;

	const { form, errors, tainted, message, enhance } = superForm(data.form, {
		taintedMessage: false
	});

	const {
		form: formData,
		formId,
		enhance: enhance2,
		posted
	} = superForm({ name: '' }, { taintedMessage: false, invalidateAll: false });
</script>

<SuperDebug data={{ $form, $errors, $tainted }} />

{#if $message}<h4>{$message}</h4>{/if}

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
	<div>FORMID:{$formId}:</div>
	<div>POSTED:{$posted}:</div>
	<label>
		Name2: <input name="name" bind:value={$formData.name} />
	</label>
	<input type="hidden" name="email" value="test@example.com" />
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
