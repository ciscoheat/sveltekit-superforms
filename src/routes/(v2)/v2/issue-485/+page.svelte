<script lang="ts">
	import { page } from '$app/stores';
	import { superForm, defaults, setError } from '$lib/index.js';
	import SuperDebug from '$lib/index.js';
	import { zod } from '$lib/adapters/zod.js';
	import { schema } from './schema.js';
	import { debounce } from 'throttle-debounce';

	let isSuccess = true;
	let shouldThrowIfNotSuccess = true;
	let defaultStatus = false;

	const { form, errors, message, enhance, submit, submitting } = superForm(
		defaults({ email: 'test@test.com', name: 'aaa' }, zod(schema)),
		{
			onError({ result }) {
				console.log('=== onError ===');

				$message = JSON.stringify(result.error, null, 2);

				// Cast the error, as its type isn't unknown.
				const error = result.error as unknown as {
					status: number;
					errors: Record<string, string[]>;
				} & Record<string, unknown>;

				if (!defaultStatus) result.status = error.status;
				$errors = error.errors;
			},
			async onUpdate({ form, result }) {
				console.log('=== onUpdate ===');

				if (!form.valid) {
					console.log('Invalid form, returning early.');
					return;
				}

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

					console.log('shouldThrow', shouldThrowIfNotSuccess);

					if (shouldThrowIfNotSuccess) {
						// 3. This will update the status in the next release:
						throw madeupProblemDetails;
					}

					setError(form, 'name', ['random error']);
					if (!defaultStatus) result.status = 423;
					result.type = 'failure';
					// 3. Cannot set data to anything else than a SuperValidated object. In general, tamper as little as possible with the result
					// 4. Focus will be kept when this is commented out.
					//result.data = madeupProblemDetails;
				}
			},
			SPA: true,
			validators: zod(schema),
			resetForm: false
		}
	);

	const debouncedSubmit = debounce(500, submit);
</script>

<SuperDebug data={$form} />

<h3>onError testing</h3>

<div>
	<input type="checkbox" bind:checked={isSuccess} /> Succeed
	<br />
	<input type="checkbox" bind:checked={shouldThrowIfNotSuccess} /> Throw if not success
	<br />
	<input type="checkbox" bind:checked={defaultStatus} /> Status 400 on error
</div>

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
