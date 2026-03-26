<script lang="ts">
	import { page } from '$app/stores';
	import { superForm } from '$lib/index.js';
	import SuperDebug from '$lib/index.js';
	//import CheckboxComponent from './CheckboxComponent.svelte';
	import CheckboxField from './CheckboxField.svelte';

	export let data;

	const form = superForm(data.form, { taintedMessage: false });

	const { form: formStore, message, enhance } = form;
</script>

<SuperDebug data={$formStore} />

<h3>Superforms testing ground - Zod</h3>

{#if $message}
	<!-- eslint-disable-next-line svelte/valid-compile -->
	<div class="status" class:error={$page.status >= 400} class:success={$page.status == 200}>
		{$message}
	</div>
{/if}

<form method="POST" use:enhance>
	<!-- CheckboxComponent bind:checked={$formStore.checkbox} /-->

	<!-- Comment the above line, uncomment this line, and reload to cause the failure on SSR (infinite loop). -->
	<CheckboxField {form} field="checkbox" description="checkbox" />

	<button>Submit</button>
</form>

<hr />
<p><a target="_blank" href="https://superforms.rocks/api">API Reference</a></p>

<style>
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
