<script lang="ts">
	import { zod } from '$lib/adapters/zod.js';
	import { superForm } from '$lib/client/index.js';
	import { schema } from './schema.js';

	export let data;

	const { form, errors, message, enhance } = superForm(data.form, {
		taintedMessage: false,
		dataType: 'json',
		validators: zod(schema),
		onSubmit({ jsonData, validators, formData }) {
			if (formData.has('skip')) validators(false);
			jsonData({ ...$form, email: 'no-email' });
		}
	});
</script>

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
		<input type="checkbox" name="skip" /> Skip client-side validation<br />
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
