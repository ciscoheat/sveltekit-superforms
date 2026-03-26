<!-- +page.svelte -->
<script lang="ts">
	import { page } from '$app/stores';
	import { defaults, superForm } from '$lib/index.js';
	import { zod } from '$lib/adapters/zod.js';
	import SuperDebug from '$lib/index.js';
	import { inviteUserToGroupSchema } from './schema.js';
	import Form from './Form.svelte';

	export let data;

	const { form, errors, message, enhance } = superForm(defaults(zod(inviteUserToGroupSchema)), {
		dataType: 'json',
		validators: zod(inviteUserToGroupSchema)
	});
</script>

<SuperDebug data={$form} />

<h3>Add user</h3>

{#if $message}
	<!-- eslint-disable-next-line svelte/valid-compile -->
	<div class="status" class:error={$page.status >= 400} class:success={$page.status == 200}>
		{$message}
	</div>
{/if}

<form method="POST" use:enhance action="?/invite">
	<label>
		Username<br />
		<input
			name="username"
			aria-invalid={$errors.username ? 'true' : undefined}
			bind:value={$form.username}
		/>
		{#if $errors.username}<span class="invalid">{$errors.username}</span>{/if}
	</label>

	<button>Submit</button>
</form>

{#key data.group}
	<Form group={data.group} />
{/key}

<!-- {#key data.group}
	<FixedForm group={data.group} />
{/key} -->

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
