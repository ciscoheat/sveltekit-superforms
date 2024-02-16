<script lang="ts">
	import { superForm } from '$lib/client/index.js';
	import type { PageData } from './$types.js';

	export let data: PageData;

	const { form, errors, message, enhance, submitting, delayed, timeout } = superForm(data.form, {
		delayMs: 4000,
		timeoutMs: 7000
	});
</script>

{#if $message}<h4>{$message}</h4>{/if}

<form method="POST" use:enhance>
	<label>
		Name: <input name="name" bind:value={$form.name} />
		{#if $errors.name}<span class="invalid">{$errors.name}</span>{/if}
	</label>
	<div>
		<button>Submit</button>
		<div>
			{#if $timeout}
				STATE-TIMEOUT
			{:else if $delayed}
				STATE-DELAYED
			{:else if $submitting}
				STATE-SUBMITTING
			{/if}
		</div>
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
