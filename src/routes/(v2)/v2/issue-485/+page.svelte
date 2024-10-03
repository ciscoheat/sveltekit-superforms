<script lang="ts">
	import { page } from '$app/stores';
	import { superForm, defaults, setError } from '$lib/index.js';
	import SuperDebug from '$lib/index.js';
	import { zod } from '$lib/adapters/zod.js';
	import { schema } from './schema.js';
	import { debounce } from 'throttle-debounce';

	const { form, errors, message, enhance, submit, submitting } = superForm(
		defaults({ email: 'test@test.com' }, zod(schema)),
		{
			onError(event) {
				console.log('=== onError ===');

				/* 
					1. It's not possible to use the SuperValidated data from onError, 
					as it can be caught in onSubmit where it doesn't exist.
					
					You need to update the stores directly.
				*/
				$message = JSON.stringify(event, null, 2);

				// Cast the error, as its type isn't unknown.
				const error = event.result.error as Record<string, unknown>;

				$errors = error.errors as Record<string, string[]>;
			},
			async onUpdate({ form, result }) {
				console.log('=== onUpdate ===');

				if (!form.valid) {
					console.log('Invalid form, returning early.');
					return;
				}

				const isSuccess = Math.random() >= 0.5;
				console.log('isSuccess', isSuccess);

				if (isSuccess) {
					// 2. Updating form.data does work, the data wasn't modified in your example:
					// 5. This only works if resetForm: false. Otherwise the form will reset.
					form.data = {
						name: form.data.name + ' Updated',
						email: form.data.email.replace('.com', '.org')
					};
				} else {
					const madeupProblemDetails = {
						type: 'https://example.com/probs/validation-error',
						title: 'Validation Error',
						status: 422,
						detail: 'There are validation errors in your request.',
						instance: '/your/instance/uri',
						errors: {
							name: ['String must contain at least 2 character(s)'],
							email: ['Invalid email']
						}
					};

					const shouldThrow = Math.random() >= 0.5;
					console.log('shouldThrow', shouldThrow);

					if (shouldThrow) {
						// 3. This will update the status in the next release:
						result.status = 422;
						throw madeupProblemDetails;
					}

					setError(form, 'name', ['random error']);
					result.status = 422;
					result.type = 'failure';
					// 3. Cannot set data to anything else than a SuperValidated object. In general, tamper as little as possible with the result
					// 4. Focus will be kept when this is commented out.
					//result.data = madeupProblemDetails;
				}
			},
			SPA: true,
			validators: zod(schema),
			resetForm: true
		}
	);

	const debouncedSubmit = debounce(500, submit);
</script>

<SuperDebug data={$form} />

<h3>Superforms testing ground - Zod</h3>

{#if $message}
	<pre
		class="status"
		class:error={$page.status >= 400}
		class:success={$page.status == 200}>{$message}</pre>
{/if}

<form method="POST" use:enhance data-sveltekit-keepfocus>
	<label>
		Name<br />
		<input
			name="name"
			aria-invalid={$errors.name ? 'true' : undefined}
			bind:value={$form.name}
			on:input={debouncedSubmit}
		/>
		{#if $errors.name}<span class="invalid">{$errors.name}</span>{/if}
	</label>

	<label>
		Email<br />
		<input
			name="email"
			type="email"
			aria-invalid={$errors.email ? 'true' : undefined}
			bind:value={$form.email}
		/>
		{#if $errors.email}<span class="invalid">{$errors.email}</span>{/if}
	</label>

	<button
		>{#if $submitting}
			Saving...
		{:else}
			Save
		{/if}</button
	>
</form>

<hr />
<p>
	💥 <a target="_blank" href="https://superforms.rocks">Created with Superforms for SvelteKit</a> 💥
</p>

<style>
	.invalid {
		color: red;
	}

	.status {
		color: white;
		padding: 4px;
		padding-left: 8px;
		border-radius: 2px;
		font-weight: 500;
	}

	.status.success {
		background-color: seagreen;
	}

	.status.error {
		background-color: #ff2a02;
	}

	input {
		background-color: #ddd;
	}

	a {
		text-decoration: underline;
	}

	hr {
		margin-top: 4rem;
	}

	form {
		padding-top: 1rem;
		padding-bottom: 1rem;
	}
</style>
