<script lang="ts">
	import SuperDebug from '$lib/client/SuperDebug.svelte';
	import { superForm } from '$lib/index.js';

	let { data } = $props();

	const { form, enhance, errors } = superForm(data.form);
</script>

<form method="POST" use:enhance>
	<div>
		Input <code>morning</code>, <code>noon</code> or <code>evening</code>
		<input name="time" bind:value={$form.time} />
	</div>
	<div>
		<button>Submit</button>
	</div>
</form>

<SuperDebug label="Form data" data={$form} />
<SuperDebug label="Errors" data={$errors} />

<style lang="scss">
	form {
		margin: 2rem 0;

		input {
			background-color: #dedede;
		}
	}
</style>
