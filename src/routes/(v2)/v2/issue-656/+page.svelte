<script lang="ts">
	import { page } from '$app/state';
	import { superForm } from '$lib/index.js';
	import SuperDebug from '$lib/index.js';

	let { data } = $props();

	const form = superForm(data.form);
	const { form: formData, errors, message, enhance, tainted, isTainted } = form;

	const reset = (name: string) => {
		const data = Object.fromEntries(Object.entries($formData).filter(([k]) => k !== name));
		form.reset({ data });
	};
</script>

<div id="debug">
	<code>$formData</code>
	<code>$tainted</code>
	<SuperDebug data={$formData} />
	<SuperDebug data={$tainted} />
</div>

<h3>Superforms testing ground - Zod</h3>

{#if $message}
	<!-- eslint-disable-next-line svelte/valid-compile -->
	<div class="status" class:error={page.status >= 400} class:success={page.status == 200}>
		{$message}
	</div>
{/if}

<form method="POST" use:enhance>
	<label>
		Name
		<div class="field">
			<input
				name="name"
				aria-invalid={$errors.name ? 'true' : undefined}
				bind:value={$formData.name}
			/>
			{@render Reset('name')}
		</div>
		{#if $errors.name}<span class="invalid">{$errors.name}</span>{/if}
	</label>

	<label>
		Email<br />
		<div class="field">
			<input
				name="email"
				type="email"
				aria-invalid={$errors.email ? 'true' : undefined}
				bind:value={$formData.email}
			/>
			{@render Reset('email')}
		</div>
		{#if $errors.email}<span class="invalid">{$errors.email}</span>{/if}
	</label>

	<button>Submit</button>
</form>

{#snippet Reset(name: string)}
	{@const a = ($tainted as Record<string, boolean>)?.[name]}
	{@const b = isTainted(a)}
	<button type="button" class={{ untainted: !b }} onclick={() => reset(name)}> Reset </button>
	<code>{JSON.stringify({ tainted: a, isTainted: b })}</code>
{/snippet}

<hr />
<p>
	💥 <a target="_blank" href="https://superforms.rocks">Created with Superforms for SvelteKit</a> 💥
</p>

<style>
	#debug {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		column-gap: 1rem;
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

	.field {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	input {
		background-color: #ddd;
		margin: 0;
	}

	button {
		&.untainted {
			opacity: 50%;
		}
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
