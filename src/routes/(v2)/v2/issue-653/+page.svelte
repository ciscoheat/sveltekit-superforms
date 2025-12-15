<script lang="ts">
	import { page } from '$app/state';
	import { superForm } from '$lib/index.js';
	import SuperDebug from '$lib/index.js';

	let { data } = $props();

	const { form, errors, message, enhance } = superForm(data.form, {
		taintedMessage: null,
		resetForm: true,
		dataType: 'json'
	});
</script>

<SuperDebug data={$form} />

<h3>Superforms - Discriminated union</h3>

{#if $message}
	<div class="status" class:error={page.status >= 400} class:success={page.status == 200}>
		{$message}
	</div>
{/if}

<form method="POST" use:enhance>
	<label>
		<select name="type" bind:value={$form.type}>
			{#each ['Type', 'empty', 'extra'] as value, i}
				<option value={i ? value : ''} selected={$form.type == value}>{value}</option>
			{/each}
		</select>
		{#if $errors.type}<span class="invalid">{$errors.type}</span>{/if}
	</label>
	{#if $form.type === 'extra'}
		<label>
			Extra name<br />
			<input
				name="name"
				type="text"
				aria-invalid={$errors.extra?.name ? 'true' : undefined}
				bind:value={$form.extra.name}
			/>
			{#if $errors.extra?.name}<span class="invalid">{$errors.extra.name}</span>{/if}
		</label>
	{/if}

	<button>Submit</button>
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
