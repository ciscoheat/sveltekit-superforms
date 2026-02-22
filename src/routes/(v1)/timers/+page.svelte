<script lang="ts">
	import { superForm } from '$lib/client/index.js';
	import type { PageData } from './$types.js';

	export let data: PageData;

	const { form, errors, message, enhance, submitting, delayed, timeout } = superForm(data.form, {
		delayMs: 1000,
		timeoutMs: 2000
	});

	let states: string[] = [];
	let start = 0;

	submitting.subscribe(($submitting) => {
		if ($submitting) {
			start = Date.now();
			states = ['#0#SUBMITTING'];
		}
	});
	delayed.subscribe(($delayed) => {
		if ($delayed) states = [...states, `#${Date.now() - start}#DELAYED`];
	});
	timeout.subscribe(($timeout) => {
		if ($timeout) states = [...states, `#${Date.now() - start}#TIMEOUT`];
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
		<div id="states">{states}</div>
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
