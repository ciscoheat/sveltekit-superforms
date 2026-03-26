<script lang="ts">
	import { fileProxy, superForm } from '$lib/client/index.js';
	import SuperDebug from '$lib/client/SuperDebug.svelte';

	export let data;

	const { form, errors, tainted, message, enhance, capture, restore } = superForm(data.form, {
		taintedMessage: false
	});

	//export const snapshot = { capture, restore };

	let file = fileProxy(form, 'image');

	const addFiles = async () => {
		form.update(
			($form) => {
				$form.images = [new File(['123123'], 'test2.png'), new File(['123123'], 'test3.png')];
				$form.undefImage = new File(['123123'], 'test4.png');
				return $form;
			},
			{ taint: false }
		);
	};

	export const snapshot = { capture, restore };
</script>

<SuperDebug data={{ $form, $tainted }} />

{#if $message}<h4>{$message}</h4>{/if}

<button on:click={() => addFiles()}>Add files</button>

<form method="POST" enctype="multipart/form-data" use:enhance>
	<label>
		File: <input
			type="file"
			name="name"
			bind:files={$file}
			aria-invalid={$errors.image ? 'true' : undefined}
		/>
		{#if $errors.image}<span class="invalid">{$errors.image}</span>{/if}
	</label>
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
