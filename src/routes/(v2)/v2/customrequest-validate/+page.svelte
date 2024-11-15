<script lang="ts">
	import { zod } from '$lib/adapters/zod.js';
	import { superForm } from '$lib/index.js';
	import SuperDebug from '$lib/index.js';
	import type { PageData } from './$types.js';
	import { schema } from './schema.js';

	export let data: PageData;

	const { form, errors, message, enhance } = superForm(data.form, {
		taintedMessage: null,
		validators: zod(schema),
		onSubmit({ customRequest }) {
			return customRequest(async (input) => {
				const formEntriesUrlEncoded = new URLSearchParams();
				for (const [key, value] of input.formData.entries()) {
					if (typeof value === 'string') {
						formEntriesUrlEncoded.append(key, value);
					}
				}

				const response = await fetch(input.action, {
					method: 'POST',
					body: formEntriesUrlEncoded,
					headers: {
						'x-sveltekit-action': 'true',
						Accept: 'application/json',
						'Content-Type': 'application/x-www-form-urlencoded'
					},
					credentials: 'include'
				});

				console.log('sent');

				return response;
			});
		}
	});
</script>

<SuperDebug data={{ $form, $errors }} />

<h2>customRequest check</h2>

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
