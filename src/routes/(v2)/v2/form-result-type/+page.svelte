<script lang="ts">
	import { superForm } from '$lib/client/index.js';
	import type { ActionData, PageData } from './$types.js';

	export let data: PageData;

	const { form, errors, message, enhance } = superForm(data.form, {
		taintedMessage: false,
		resetForm: true,
		onUpdate(event) {
			const data = event.result.data as NonNullable<ActionData>;
			if (data.fail && event.result.data) {
				event.result.data.form.message = 'FAIL';
			} else {
				event.form.message = data.code;
			}
		}
	});
</script>

{#if $message}<h4 id="message">{$message}</h4>{/if}

<form method="POST" use:enhance>
	<div>
		<input type="radio" name="dir" value="north" bind:group={$form.dir} /> North<br />
		<input type="radio" name="dir" value="south" bind:group={$form.dir} /> South<br />
		<input type="radio" name="dir" value="east" bind:group={$form.dir} /> East<br />
		<input type="radio" name="dir" value="west" bind:group={$form.dir} /> West (reset)<br />
		{#if $errors.dir}<span class="invalid">{$errors.dir}</span>{/if}
	</div>
	<div>
		<button>Submit</button>
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
