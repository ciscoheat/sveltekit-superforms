<script lang="ts">
	import { superForm } from '$lib/client/index.js';
	import SuperDebug from '$lib/client/SuperDebug.svelte';
	import { schema } from './schema.js';
	import type { PageData } from './$types.js';
	import { zod } from '$lib/adapters/zod.js';

	export let data: PageData;

	const { form, errors, tainted, enhance } = superForm(data.form, {
		validators: zod(schema)
	});
</script>

<h3>Superforms bug reporting</h3>

<SuperDebug data={{ $form, $errors, $tainted }} />

<form method="POST" use:enhance>
	<label>
		Name (type 'form' to trigger form error)<br />
		<input name="name" data-invalid={$errors.name} bind:value={$form.name} />
		{#if $errors.name}<span class="invalid">{$errors.name}</span>{/if}
	</label>
	<label>
		Password<br />
		<input name="password" data-invalid={$errors.password} bind:value={$form.password} />
		{#if $errors.password}<span class="invalid">{$errors.password}</span>{/if}
	</label>
	<label>
		Confirm password<br />
		<input
			name="confirmedPassword"
			data-invalid={$errors.confirmedPassword}
			bind:value={$form.confirmedPassword}
		/>
		{#if $errors.confirmedPassword}<span class="invalid">{$errors.confirmedPassword}</span>{/if}
	</label>
	<div>
		Form error here:
		{#if $errors._errors}<span class="invalid">{$errors._errors}</span>{/if}
	</div>
	<button>Submit</button>
</form>

<hr />
<p>
	To make the bug hunting as easy as possible, fork this project and create a MRE, then link to it
	on the <a href="https://github.com/ciscoheat/sveltekit-superforms/issues">Superforms issue page</a
	>.
</p>

<style>
	.invalid {
		color: red;
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
</style>
