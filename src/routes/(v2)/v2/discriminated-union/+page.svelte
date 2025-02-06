<script lang="ts">
	import { page } from '$app/state';
	import { superForm } from '$lib/index.js';
	import { mergeFormUnion } from '$lib/utils.js';
	import SuperDebug from '$lib/index.js';

	let { data } = $props();

	const { form, errors, message, enhance } = superForm(data.form, {
		taintedMessage: null,
		resetForm: true
	});

	// Need to merge union so all fields are available in the form
	const formData = $derived(mergeFormUnion(form));
</script>

<SuperDebug data={$form} />

<h3>Superforms testing ground - Zod</h3>

{#if $message}
	<div class="status" class:error={page.status >= 400} class:success={page.status == 200}>
		{$message}
	</div>
{/if}

<form method="POST" use:enhance>
	<label>
		Type<br />
		<input
			name="type"
			type="text"
			aria-invalid={$errors.type ? 'true' : undefined}
			bind:value={$formData.type}
		/>
		{#if $errors.type}<span class="invalid">{$errors.type}</span>{/if}
	</label>
	<label>
		RoleId<br />
		<input
			name="roleId"
			type="text"
			aria-invalid={$errors.roleId ? 'true' : undefined}
			bind:value={$formData.roleId}
		/>
		{#if $errors.roleId}<span class="invalid">{$errors.roleId}</span>{/if}
	</label>

	<button>Submit</button>
</form>

<hr />
<p><a target="_blank" href="https://superforms.rocks/api">API Reference</a></p>

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
