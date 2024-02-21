<script lang="ts">
	import type { PageData } from './$types.js';
	import { page } from '$app/stores';
	import { superForm } from '$lib/client/index.js';
	import { userSchema } from '../users.js';
	import { zod } from '$lib/adapters/zod.js';
	import { superformClient } from '$lib/adapters/superform.js';

	export let data: PageData;

	const { form, errors, enhance, delayed, message, posted } = superForm(data.form, {
		// eslint-disable-next-line svelte/valid-compile
		validators: $page.url.searchParams.has('zod')
			? zod(
					userSchema.extend({
						id: userSchema.shape.id.optional()
					})
				)
			: superformClient({
					name: (name?: string) => (!name || name.length < 2 ? 'Your name is too short' : null),
					email: (email?: string) =>
						!email || !email.includes('@') ? 'Enter a valid email address' : null
				})
	});
</script>

<a href="/">&lt; Back to start</a>

<h1>Posted check</h1>

<div class="users">
	{#each data.users as user}
		<a href="?id={user.id}">{user.name}</a>
	{/each}
	{#if $form.id}
		<form action="/crud">
			<button>Create new</button>
		</form>
	{/if}
</div>

{#if $message}
	<h3 class:invalid={$page.status >= 400}>{$message}</h3>
{/if}

<h2>{!$form.id ? 'Create' : 'Update'} user</h2>

<b>Posted: {$posted}</b>

<form method="POST" use:enhance>
	<input type="hidden" name="id" bind:value={$form.id} />

	<label>
		Name<br />
		<input name="name" aria-invalid={$errors.name ? 'true' : undefined} bind:value={$form.name} />
		{#if $errors.name}<span class="invalid">{$errors.name}</span>{/if}
	</label>

	<label>
		E-mail<br />
		<input name="email" type="email" bind:value={$form.email} />
		{#if $errors.email}<span class="invalid">{$errors.email}</span>{/if}
	</label>

	<button>Submit</button>
	{#if $delayed}Working...{/if}

	{#if $form.id}
		<button
			name="delete"
			value="delete"
			on:click={(e) => !confirm('Are you sure?') && e.preventDefault()}
			class="danger">Delete user</button
		>
	{/if}
</form>

<style>
	.invalid {
		color: red;
	}

	.danger {
		background-color: brown;
	}

	.users {
		columns: 3 150px;
	}

	.users > * {
		display: block;
		white-space: nowrap;
		overflow-x: hidden;
	}

	.users a:hover {
		border-bottom: none;
	}
</style>
