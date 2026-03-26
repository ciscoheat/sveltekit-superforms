<script lang="ts">
	import { page } from '$app/stores';
	import { zod } from '$lib/adapters/zod.js';
	import { superForm } from '$lib/client/index.js';
	import SuperDebug from '$lib/client/SuperDebug.svelte';
	import { get } from 'svelte/store';
	import { schema } from './schema.js';

	export let data;

	const Days = [
		'Saturday',
		'Sunday',
		'Monday',
		'Tuesday',
		'Wednesday',
		'Thursday',
		'Friday',
		'Nowayday'
	];

	const { form, errors, message, tainted, enhance } = superForm(data.form, {
		validators: zod(schema)
	});

	const status = get(page).status;
</script>

<SuperDebug data={{ $form, $errors, $tainted }} />

<h3>Superforms testing ground</h3>

{#if $message}
	<div class="status" class:error={status >= 400} class:success={status == 200}>
		{$message}
	</div>
{/if}

<button on:click={() => ($form.days = [...$form.days, 3])}>Set Tuesday</button>

<form method="POST" use:enhance>
	<label>
		Name<br />
		<input name="name" aria-invalid={$errors.name ? 'true' : undefined} bind:value={$form.name} />
		{#if $errors.name}<span class="invalid">{$errors.name}</span>{/if}
	</label>

	<div class="checkboxes">
		{#each Days as day, i}
			<div class="checkbox">
				<input
					id="wday-{i}"
					type="checkbox"
					name="days"
					value={i}
					bind:group={$form.days}
					class="w-4 h-4 text-skin-accent bg-skin-fg rounded focus:ring-skin-accent focus:ring-2 cursor-pointer"
				/>
				<label for="wday-{i}" class="ml-2 text-sm font-medium cursor-pointer">
					{day}
				</label>
			</div>
		{/each}
	</div>
	<p class="invalid">{$errors.days?._errors || 'No error'}</p>
	<p class="values">
		{#if $errors.days?.[0]}{$errors.days[0]}{/if}
	</p>
	<button>Submit</button>
</form>

<hr />
<p>
	<a target="_blank" href="https://superforms.rocks/api">API Reference</a>
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
	.checkbox {
		display: flex;
	}
</style>
