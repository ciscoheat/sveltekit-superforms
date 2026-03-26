<script lang="ts">
	import { superForm } from '$lib/client/index.js';
	import SuperDebug from '$lib/client/SuperDebug.svelte';

	export let data;

	const { form, errors, tainted, message, enhance, reset } = superForm(data.form, {
		taintedMessage: false
	});

	function newResetData() {
		data.form.data.name = 'Reset';
		data.form.data.email = 'Me';
		reset();
	}
</script>

<SuperDebug data={{ $form, $errors, $tainted }} />

{#if $message}<h4>{$message}</h4>{/if}

<form method="POST" use:enhance>
	<label>
		Name: <input
			name="name"
			bind:value={$form.name}
			aria-invalid={$errors.name ? 'true' : undefined}
		/>
		{#if $errors.name}<span class="invalid">{$errors.name}</span>{/if}
	</label>
	<label>
		Email: <input
			name="email"
			bind:value={$form.email}
			aria-invalid={$errors.email ? 'true' : undefined}
		/>
		{#if $errors.email}<span class="invalid">{$errors.email}</span>{/if}
	</label>
	<div>
		<button type="button" on:click={() => reset()}>Reset</button>
		<button type="button" on:click={newResetData}>New reset</button>
	</div>
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
