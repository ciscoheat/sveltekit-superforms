<script lang="ts">
	import { superForm } from '$lib/client/index.js';
	import SuperDebug from '$lib/client/SuperDebug.svelte';
	import CheckBox from './CheckBox.svelte';

	export let data;

	const theForm = superForm(data.form, {
		taintedMessage: false,
		onChange({ paths, set, get }) {
			for (const path of paths) {
				if (path == 'accept') {
					// @ts-expect-error Type error
					set('extra', 'a string', { taint: false });
					set('extra', 12, { taint: false });
				} else if (path == 'extra') {
					if (get(path) == 12) {
						set('extra', 123, { taint: false });
					}
				}
			}
			console.log(paths);
		}
	});

	const { form, errors, tainted, message, enhance } = theForm;
</script>

<SuperDebug data={{ $form, $errors, $tainted }} />

{#if $message}<h4>{$message}</h4>{/if}

<p>Extra:{$form.extra}</p>

<p>Tainted:{Boolean($tainted?.extra)}</p>

<form method="POST" use:enhance>
	<input type="hidden" name="extra" bind:value={$form.extra} />
	<div>Accept: <CheckBox form={theForm} field="accept" /></div>
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
	}
</style>
