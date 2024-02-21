<script lang="ts">
	import { page } from '$app/stores';
	import { superForm } from '$lib/client/index.js';
	import SuperDebug from '$lib/client/SuperDebug.svelte';
	import FieldComponent from './FieldComponent.svelte';
	import { schema } from './schema.js';
	import { zod } from '$lib/adapters/zod.js';

	export let data;

	const pageForm = superForm(data.form, {
		dataType: 'json',
		validators: zod(schema)
		//validationMethod: 'onblur'
	});
	const { form, message, enhance, tainted, errors } = pageForm;
</script>

<SuperDebug data={{ $form, $tainted, $errors }} />

<h3>Superforms testing ground</h3>

{#if $message}
	<!-- eslint-disable-next-line svelte/valid-compile -->
	<div class="status" class:error={$page.status >= 400} class:success={$page.status == 200}>
		{$message}
	</div>
{/if}

<form method="POST" use:enhance>
	<FieldComponent form={pageForm} field="emails" />
	<button>Submit</button>
</form>

<hr />
<p><a target="_blank" href="https://superforms.rocks/api">API Reference</a></p>

<style>
</style>
