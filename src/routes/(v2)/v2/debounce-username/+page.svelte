<script lang="ts">
	import { page } from '$app/stores';
	import { superForm } from '$lib/index.js';
	import SuperDebug from '$lib/index.js';
	import { debounce } from 'throttle-debounce';
	import spinner from './spinner.svg?raw';

	export let data;

	const { form, errors, message, enhance } = superForm(data.form, {
		taintedMessage: null
	});

	const {
		submitting,
		submit: submitCheckUsername,
		posted
		//enhance: checkEnhance
	} = superForm(
		{ username: '' },
		{
			SPA: '?/check',
			taintedMessage: null,
			onSubmit({ cancel, formData }) {
				if (!$form.username) cancel();
				formData.set('username', $form.username);
			},
			onUpdated({ form }) {
				$errors.username = form.errors.username;
			}
		}
	);

	const checkUsername = debounce(250, submitCheckUsername);

	// eslint-disable-next-line svelte/valid-compile
	$page;
</script>

<SuperDebug data={{ $form, $posted }} />

<h3>Superforms testing ground - Zod</h3>

{#if $message}
	<div class="status" class:error={$page.status >= 400} class:success={$page.status == 200}>
		{$message}
	</div>
{/if}

<form method="POST" action="?/post" use:enhance>
	<label>
		Username<br />
		<input
			name="username"
			aria-invalid={$errors.username ? 'true' : undefined}
			bind:value={$form.username}
			on:input={checkUsername}
		/>
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{#if $submitting}{@html spinner}{:else if $errors.username}❌{:else if $form.username && $posted}✅{/if}
		{#if $errors.username}<div class="invalid">{$errors.username}</div>{/if}
	</label>

	<button>Submit</button>
</form>

<!--form method="POST" action="?/check" use:checkEnhance>
	<input type="hidden" name="in_form" value="true" />
</form-->

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
