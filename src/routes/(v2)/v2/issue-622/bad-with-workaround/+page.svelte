<script lang="ts">
	import { untrack } from 'svelte';
	import { page } from '$app/stores';
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
			timeoutMs: 10000
		}
	);
	const { enhance, submitting, delayed, timeout } = form;

	const time = () => new Date().toISOString();

	page.subscribe((v) => console.log(`${time()}: Page store update`, { page: v }));
</script>

<form method="post" use:enhance action="/v2/issue-622/bad-with-workaround?start">
	<button>Submit</button>
</form>

<SuperDebug data={{ $submitting, $delayed, $timeout }} />
