<script lang="ts">
	import { superForm } from '$lib/client/index.js';
	import SuperDebug from '$lib/client/SuperDebug.svelte';

	export let data;

	const { form, errors, tainted, message, enhance } = superForm(data.form, {
		taintedMessage: false
	});
</script>

<SuperDebug data={{ $form, $errors, $tainted }} />

{#if $message}<h4>{$message}</h4>{/if}

<form method="POST" enctype="multipart/form-data" use:enhance>
	<label>
		File: <input
			name="file"
			type="file"
			bind:value={$form.file}
			aria-invalid={$errors.file ? 'true' : undefined}
		/>
		{#if $errors.file}<span class="invalid">{$errors.file}</span>{/if}
	</label>
	<div>
		<button>Submit</button>
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
