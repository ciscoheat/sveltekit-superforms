<script lang="ts">
	import { page } from '$app/stores';
	import SuperDebug from '$lib/client/SuperDebug.svelte';
	import { superForm } from '$lib/index.js';

	export let data;

	let error: string;

	export const spForm = superForm(data.form, {
		onError: (e) => {
			console.log(e.result);
			// @ts-expect-error Does not follow the App.Error shape
			error = 'code' in e.result.error ? e.result.error.code : e.result.error.message;
		},
		taintedMessage: false
	});

	const { enhance, form } = spForm;

	$: action =
		$form.exception == 'json'
			? '/v2/app-error/json'
			: $form.exception == 'plain'
				? '/v2/app-error/plain'
				: undefined;

	// eslint-disable-next-line svelte/valid-compile
	$page;
</script>

<SuperDebug data={$form} />

<p id="error">ERROR:{error}:{$page.status}</p>

<form method="POST" use:enhance {action}>
	Name: <input name="name" bind:value={$form.name} />
	<ul style="list-style-type:none">
		<li>
			<input type="radio" name="exception" value="error" bind:group={$form.exception} /> SvelteKit error
			(502)
		</li>
		<li>
			<input type="radio" name="exception" value="exception" bind:group={$form.exception} /> Exception
			(500)
		</li>
		<li>
			<input type="radio" name="exception" value="json" bind:group={$form.exception} /> 430 JSON response,
			with 429 status (429)
		</li>
		<li>
			<input type="radio" name="exception" value="plain" bind:group={$form.exception} /> 417 error response
			(500)
		</li>
	</ul>
	<button type="submit">Save</button>
</form>
