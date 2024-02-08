<script lang="ts">
	import { page } from '$app/stores';
	import { superForm } from '$lib/client/index.js';

	export let data;

	const applyAction = $page.url.searchParams.has('apply');

	const { message, enhance, submitting } = superForm(data.form, {
		applyAction,
		taintedMessage: false
	});
</script>

{#if $message}<h4>{$message}</h4>{/if}

<form method="POST" use:enhance>
	<div>
		<button>Submit</button>
	</div>
	{#if $submitting}<div>SUBMITTING</div>{/if}
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
