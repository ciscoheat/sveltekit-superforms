<script lang="ts">
	import { superForm, type FormResult, type SuperValidated } from '$lib/client/index.js';
	import type { PageData, ActionData } from './$types.js';
	import SuperDebug from '$lib/client/SuperDebug.svelte';
	import { schema } from './schemas.js';
	import { page } from '$app/stores';
	import InputField from './input-field.svelte';
	import { zod } from '$lib/adapters/zod.js';

	export let data: PageData;

	const { form, errors, message, tainted, enhance } = superForm(data.form, {
		dataType: 'json',
		validators: zod(schema),
		onError: (event) => {
			console.log('onError', event);
		},
		onResult: (event) => {
			if (event.result.type == 'failure') {
				const action = event.result.data as NonNullable<ActionData>;
				const n: number = action.test;
				const f: SuperValidated<Record<string, unknown>> = action.form;
				n;
				f;
				event.result.data?.form.data.email;
			}
			console.log('onResult', event);
		},
		onUpdate({ result }) {
			const action = result.data as FormResult<ActionData>;
			const n: number = action.test;
			// @ts-expect-error SuperValidated should not exist
			const f: SuperValidated<Record<string, unknown>> = action.form;
			n;
			f;
		},
		onSubmit: (args) => {
			console.log('onSubmit', args);
		}
	});

	$: {
		//console.log('current form', $form, 'errors', $errors);
	}

	$: errorOutput = `ERRORS ${JSON.stringify($errors, null)}`;
</script>

<SuperDebug data={{ $form, $errors, $tainted }} />

<h3>Superforms testing ground</h3>

{#if $message}
	<!-- eslint-disable-next-line svelte/valid-compile -->
	<div class="status" class:error={$page.status >= 400} class:success={$page.status == 200}>
		{$message}
	</div>
{/if}

{#if $errors}
	<div class="errors status" class:error={$page.status >= 400} class:success={$page.status == 200}>
		{errorOutput}
	</div>
{/if}
<form method="POST" enctype="multipart/form-data" use:enhance>
	<InputField label="Name" bind:value={$form.name} errors={$errors.name} />
	<br />
	<label>
		Email<br />
		<input name="email" type="email" data-invalid={$errors.email} bind:value={$form.email} />
		{#if $errors.email}<span class="invalid">{$errors.email}</span>{/if}
	</label>
	<br />

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
