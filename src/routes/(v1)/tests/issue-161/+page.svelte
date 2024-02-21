<script lang="ts">
	import { superForm } from '$lib/client/index.js';
	import type { PageData } from './$types.js';
	//import SuperDebug from '$lib/client/SuperDebug.svelte';
	import { page } from '$app/stores';
	import { schema } from './schema.js';
	import { zod } from '$lib/adapters/zod.js';

	export let data: PageData;

	const { form, errors, message, enhance } = superForm(data.form, {
		dataType: 'json',
		validators: zod(schema)
	});

	function addPerson() {
		form.update(
			($form) => {
				$form.persons = [...$form.persons, { name: '' }];
				return $form;
			},
			{ taint: false }
		);
	}
</script>

<h3>#161</h3>

{#if $message}
	<!-- eslint-disable-next-line svelte/valid-compile -->
	<div class="status" class:error={$page.status >= 400} class:success={$page.status == 200}>
		{$message}
	</div>
{/if}

<form method="POST" use:enhance>
	{#if $errors._errors}
		<div class="status error">{$errors._errors}</div>
	{/if}

	<!-- eslint-disable-next-line @typescript-eslint/no-unused-vars -->
	{#each $form.persons as _, i}
		<label>
			Name:
			<input
				name="name"
				data-invalid={$errors.persons?.[i]?.name}
				bind:value={$form.persons[i].name}
			/>
			{#if $errors.persons?.[i]?.name}<span class="invalid">{$errors.persons?.[i]?.name}</span>{/if}
		</label>
	{/each}

	<button on:click|preventDefault={addPerson}>Add person</button>
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
</style>
