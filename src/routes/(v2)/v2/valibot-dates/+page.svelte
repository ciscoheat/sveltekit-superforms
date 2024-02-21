<script lang="ts">
	import { page } from '$app/stores';
	import { dateProxy, superForm } from '$lib/index.js';

	export let data;

	let logForm = superForm(data.form, {
		taintedMessage: false,
		resetForm: false,
		// eslint-disable-next-line svelte/valid-compile
		dataType: $page.url.searchParams.has('json') ? 'json' : 'form'
	});

	const { form, constraints, errors, enhance, posted } = logForm;
	const proxyDate = dateProxy(form, 'date', { format: 'datetime-local' });
</script>

<form method="post" action="?/test" use:enhance>
	<p>
		<input
			name="date"
			type="datetime-local"
			bind:value={$proxyDate}
			aria-invalid={$errors.date ? 'true' : undefined}
			{...$constraints.date}
		/>
		Select a date
	</p>
	<p>
		<input type="text" bind:value={$form.missing} />
		Leave blank to produce error
	</p>
	<p>
		<button type="submit">Test</button>
	</p>
	<p>
		If the schema produces an error in the form action, the date becomes undefined, even if a value
		was selected.
	</p>
</form>

{#if $posted}
	<p>DATE:{$form.date?.toISOString().slice(0, 10)}</p>
{/if}
