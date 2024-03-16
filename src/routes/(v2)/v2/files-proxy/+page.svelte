<script lang="ts">
	import { zod } from '$lib/adapters/zod.js';
	import { schema } from './schema.js';
	import { fileProxy, filesProxy, superForm } from '$lib/client/index.js';
	import SuperDebug from '$lib/client/SuperDebug.svelte';

	export let data;

	let show = true;

	const superform = superForm(data.form, {
		validators: zod(schema)
	});
	const { form, tainted, message, enhance } = superform;

	const { files, valueErrors } = filesProxy(superform, 'images');
	const { file, errors } = fileProxy(superform, 'image');

	function changeFileWithProxy() {
		file.set(new File(['1234566'], 'test.txt', { type: 'text/plain' }));
	}

	function changeFileDirectly() {
		$form.image = new File(['1234566'], 'test.txt', { type: 'text/plain' });
	}

	function clearFileDirectly() {
		// @ts-expect-error Not nullable
		$form.image = null;
	}

	function clearFileWithProxy() {
		// @ts-expect-error Not nullable
		file.set(null);
	}

	///////////////////////////////////////

	function changeFiles() {
		const newFiles = [
			new File(['1234566'], 'test1.txt', { type: 'text/plain' }),
			new File(['7890123'], 'test2.txt', { type: 'text/plain' })
		];
		files.set(newFiles);
	}
</script>

<SuperDebug data={{ $form, $tainted, files, valueErrors }} />

{#if $message}<h4>{$message}</h4>{/if}

<div id="file">FILE:{$form.image ? $form.image.name : 'null'}</div>

<div>
	<button on:click={() => (show = !show)}>Toggle form</button>
</div>

{#if show}
	<form method="POST" enctype="multipart/form-data" use:enhance>
		<label>
			Upload files, max 10 Kb: <input
				multiple
				bind:files={$files}
				accept="image/png, image/jpeg"
				name="images"
				type="file"
			/>
			{#if $valueErrors}
				<ul class="invalid">
					{#each $valueErrors as error, i}
						<li>Image {i + 1}: {error}</li>
					{/each}
				</ul>
			{/if}
		</label>
		<label>
			Upload one file, max 10 Kb: <input
				bind:files={$file}
				accept="image/png, image/jpeg"
				name="images"
				type="file"
			/>
			{#if $errors}
				<div class="invalid">{$errors}</div>
			{/if}
		</label>
		<div class="buttons">
			<div><button>Submit</button></div>
			<div>
				<button type="button" on:click={changeFiles}>Change files</button>
			</div>
			<div class="button-group">
				<div>
					<button type="button" on:click={changeFileDirectly}>Change file directly</button>
					<button type="button" on:click={changeFileWithProxy}>Change file with proxy</button>
				</div>
				<div>
					<button type="button" on:click={clearFileDirectly}>Clear file directly</button>
					<button type="button" on:click={clearFileWithProxy}>Clear file with proxy</button>
				</div>
			</div>
		</div>
	</form>
{/if}

<style lang="scss">
	.buttons {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.button-group {
		margin: 1rem 0;
		border: 2px dashed #1d7484;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

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