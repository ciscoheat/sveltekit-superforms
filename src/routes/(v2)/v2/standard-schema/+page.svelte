<script lang="ts">
	import { page } from '$app/state';
	import { standardClient } from '$lib/adapters/standard.js';
	import SuperDebug, { superForm } from '$lib/index.js';
	import { valibotSchema, zodSchema } from './schema.js';

	const { data } = $props();

	const {
		form: valibotForm,
		errors: valibotErrors,
		message: valibotMessage,
		enhance: valibotEnhance
	} = superForm(data.valibotForm, {
		validators: standardClient(valibotSchema)
	});

	const {
		form: zodForm,
		errors: zodErrors,
		message: zodMessage,
		enhance: zodEnhance
	} = superForm(data.zodForm, {
		validators: standardClient(zodSchema)
	});
</script>

<SuperDebug data={$valibotForm} />

<h3>Nullable Valibot schema</h3>

{#if $valibotMessage}
	<!-- eslint-disable-next-line svelte/valid-compile -->
	<div class="status" class:error={page.status >= 400} class:success={page.status == 200}>
		{$valibotMessage}
	</div>
{/if}

<form method="POST" action="?/valibot" use:valibotEnhance>
	<label>
		Name<br />
		<input
			name="name"
			aria-invalid={$valibotErrors.name ? 'true' : undefined}
			bind:value={$valibotForm.name}
		/>
		{#if $valibotErrors.name}<span class="invalid">{$valibotErrors.name}</span>{/if}
	</label>

	<label>
		Email<br />
		<input
			name="email"
			type="email"
			aria-invalid={$valibotErrors.email ? 'true' : undefined}
			bind:value={$valibotForm.email}
		/>
		{#if $valibotErrors.email}<span class="invalid">{$valibotErrors.email}</span>{/if}
	</label>

	<button>Submit</button>
</form>

<SuperDebug data={$zodForm} />

<h3>Nullable Zod schema</h3>

{#if $zodMessage}
	<!-- eslint-disable-next-line svelte/valid-compile -->
	<div class="status" class:error={page.status >= 400} class:success={page.status == 200}>
		{$zodMessage}
	</div>
{/if}

<form method="POST" action="?/zod" use:zodEnhance>
	<label>
		Name<br />
		<input
			name="name"
			aria-invalid={$zodErrors.name ? 'true' : undefined}
			bind:value={$zodForm.name}
		/>
		{#if $zodErrors.name}<span class="invalid">{$zodErrors.name}</span>{/if}
	</label>

	<label>
		Email<br />
		<input
			name="email"
			type="email"
			aria-invalid={$zodErrors.email ? 'true' : undefined}
			bind:value={$zodForm.email}
		/>
		{#if $zodErrors.email}<span class="invalid">{$zodErrors.email}</span>{/if}
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
