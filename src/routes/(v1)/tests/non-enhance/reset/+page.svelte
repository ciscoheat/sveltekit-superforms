<script lang="ts">
	import { superForm } from '$lib/client/index.js';
	import type { PageData } from './$types.js';
	import SuperDebug from '$lib/client/SuperDebug.svelte';

	export let data: PageData;

	const { form, errors, message } = superForm(data.form, {
		resetForm: true
	});
</script>

<SuperDebug data={$form} />

{#if $message}<h4>{$message}</h4>{/if}

<form method="POST">
	<label>Name: <input name="name" bind:value={$form.name} /></label>
	{#if $errors.name}<span class="invalid">{$errors.name}</span>{/if}
	<div>
		<button>Submit</button>
	</div>
</form>

<style lang="scss">
	.invalid {
		color: red;
	}
	form {
		margin: 2rem 0;
	}
</style>
