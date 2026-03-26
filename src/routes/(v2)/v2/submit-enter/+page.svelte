<script lang="ts">
	import { superForm } from '$lib/client/index.js';
	import SuperDebug from '$lib/client/SuperDebug.svelte';
	import { schema } from './schema.js';
	import { zod } from '$lib/adapters/zod.js';

	export let data;

	const { form, errors, enhance } = superForm(data.form, {
		validators: zod(schema),
		taintedMessage: false
	});
</script>

<SuperDebug data={$form} />

<h3>Superforms testing ground</h3>

<p>Pressing enter and clicking submit should both display a server-side only error.</p>

<form method="POST" use:enhance>
	<label>
		Name<br />
		<input name="name" aria-invalid={$errors.name ? 'true' : undefined} bind:value={$form.name} />
		{#if $errors.name}<span class="invalid">{$errors.name}</span>{/if}
	</label>

	<label>
		Password<br />
		<input
			name="password"
			type="password"
			aria-invalid={$errors.password ? 'true' : undefined}
			bind:value={$form.password}
		/>
		{#if $errors.password}<span class="invalid">{$errors.password}</span>{/if}
	</label>

	<button>Submit</button>
</form>

<hr />
<p><a target="_blank" href="https://superforms.rocks/api">API Reference</a></p>

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

	form {
		padding-top: 1rem;
		padding-bottom: 1rem;
	}
</style>
