<script lang="ts">
	import { untrack } from 'svelte';
	import { toStore } from 'svelte/store';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import SuperDebug, { superForm } from '$lib/index.js';

	let { data } = $props();

	const form = superForm(
		untrack(() => data.form),
		{
			dataType: 'json',
			scrollToError: true,
			autoFocusOnError: 'detect',
			taintedMessage: false,
			validationMethod: 'submit-only',
			resetForm: false,
			invalidateAll: false,
			applyAction: true,
			delayMs: 500,
			timeoutMs: 1000,
			onResult(event) {
				console.log('onResult', event);
			}
		}
	);
	const { enhance, submitting, delayed, timeout } = form;

	const time = () => new Date().toISOString();

	toStore(() => ({ ...page })).subscribe((v) =>
		console.log(`${time()}: Page store update`, { page: v })
	);
	afterNavigate((p) => console.log('afterNavigate', p));
</script>

<form method="post" use:enhance action="/v2/issue-622/bad?start">
	<button>Submit</button>
</form>

<SuperDebug data={{ $submitting, $delayed, $timeout }} />
