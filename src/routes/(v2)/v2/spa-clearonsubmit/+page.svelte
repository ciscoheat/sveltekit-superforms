<script lang="ts">
	import { page } from '$app/stores';
	import { defaults, superForm } from '$lib/index.js';
	import SuperDebug from '$lib/index.js';
	import { valibot } from '$lib/adapters/valibot.js';
	import { schema } from './schema.js';

	const data = defaults(valibot(schema));
	data.errors.name = ['Default error'];
	data.message = 'Submit form to remove this message.';

	const { form, errors, message, enhance, submitting } = superForm(data, {
		SPA: true,
		validators: valibot(schema),
		clearOnSubmit: 'errors-and-message',
		async onUpdate({ form }) {
			// Slow external API request
			await new Promise((res) => setTimeout(res, 4000));
			if (form.valid) form.message = 'IT WORKS';
		}
	});
</script>

<SuperDebug data={$form} />

<h3>SPA clear on submit</h3>

{#if $message}
	<!-- eslint-disable-next-line svelte/valid-compile -->
	<div class="status" class:error={$page.status >= 400} class:success={$page.status == 200}>
		{$message}
	</div>
{/if}

<form method="POST" use:enhance>
	<label>
		Name<br />
		<input name="name" aria-invalid={$errors.name ? 'true' : undefined} bind:value={$form.name} />
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

	<div class="submit">
		<button>Submit</button>
		{#if $submitting}Loading...{/if}
	</div>
</form>

<hr />
<p>
	💥 <a target="_blank" href="https://superforms.rocks">Created with Superforms for SvelteKit</a> 💥
</p>

<style>
	.submit {
		display: flex;
		align-items: center;
	}

	.submit button {
		margin: 0 0.5rem;
	}

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
