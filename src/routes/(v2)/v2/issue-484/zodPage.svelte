<script lang="ts">
	import { superForm, defaults } from '$lib/index.js';
	import { zod } from '$lib/adapters/zod.js';
	import { loginZodSchema } from './schemas.js';

	const { form, errors, message, constraints, enhance } = superForm(defaults(zod(loginZodSchema)), {
		SPA: true,
		validators: zod(loginZodSchema),
		onUpdate({ form }) {
			if (form.valid) {
				// TODO: Call an external API with form.data, await the result and update form
			}
		}
	});
</script>

<h1>Edit user</h1>

{#if $message}<h3>{$message}</h3>{/if}

<form method="POST" use:enhance>
	<label>
		Name<br />
		<input
			aria-invalid={$errors.name ? 'true' : undefined}
			bind:value={$form.name}
			{...$constraints.name}
		/>
	</label>
	{#if $errors.name}<span class="invalid">{$errors.name}</span>{/if}

	<label>
		E-mail<br />
		<input
			type="email"
			aria-invalid={$errors.email ? 'true' : undefined}
			bind:value={$form.email}
			{...$constraints.email}
		/>
	</label>
	{#if $errors.email}<span class="invalid">{$errors.email}</span>{/if}
	<br />
	<button>Submit</button>
</form>
