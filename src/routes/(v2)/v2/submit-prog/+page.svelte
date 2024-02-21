<script lang="ts">
	import { page } from '$app/stores';
	import { superForm } from '$lib/client/index.js';

	export let data;

	const { form, errors, message, enhance, submit, posted } = superForm(data.form, {
		taintedMessage: false
	});

	// eslint-disable-next-line svelte/valid-compile
	const isEnhanced = $page.url.searchParams.has('enhance');
	const enhanced = isEnhanced ? enhance : () => {};
</script>

<p>{isEnhanced ? 'Enhanced!' : 'No-enhance!'}</p>

<p>{$posted ? 'Posted!' : 'Not-posted!'}</p>

{#if $message}<h4>{$message}</h4>{/if}

<form method="POST" use:enhanced>
	<label>
		Name: <input
			name="name"
			bind:value={$form.name}
			aria-invalid={$errors.name ? 'true' : undefined}
			on:blur={(e) => {
				if (e.currentTarget.value.length > 3) {
					submit(isEnhanced ? undefined : e.currentTarget);
				}
			}}
		/>
		{#if $errors.name}<span class="invalid">{$errors.name}</span>{/if}
	</label>
	<button type="button" on:click={(e) => submit(isEnhanced ? undefined : e.currentTarget)}
		>Programmatic submit</button
	>
	<div>Enter more than three characters and blur to submit.</div>
</form>

<style lang="scss">
	form {
		margin: 2rem 0;

		input {
			background-color: #dedede;
		}

		.invalid {
			color: crimson;
		}
	}
</style>
