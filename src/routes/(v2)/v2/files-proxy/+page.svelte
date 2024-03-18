<script lang="ts">
	import { zod } from '$lib/adapters/zod.js';
	import { schema } from './schema.js';
	import { fileProxy, filesFieldProxy, superForm } from '$lib/client/index.js';
	import SuperDebug from '$lib/client/SuperDebug.svelte';

	export let data;

	let show = true;

	const superform = superForm(data.form, {
		validators: zod(schema),
		resetForm: true
	});
	const { form, tainted, message, enhance, errors } = superform;

	const files = filesFieldProxy(superform, 'images');
	const { values, valueErrors } = files;

	const file = fileProxy(form, 'image');

	/////////////////////////////////////////////////////////////////////////////

	function changeFileWithProxy() {
		file.set(new File(['1234566'], 'test.txt', { type: 'text/plain' }));
	}

	function changeFileDirectly() {
		$form.image = new File(['1234566'], 'test.txt', { type: 'text/plain' });
	}

	function clearFileDirectly() {
		// @ts-expect-error Not nullable
		$form.image = null;
		$form.image = undefined;
	}

	function clearFileWithProxy() {
		// @ts-expect-error Not nullable
		file.set(null);
		file.set(undefined);
	}

	/////////////////////////////////////////////////////////////////////////////

	function changeFilesWithProxy() {
		const newFiles = [new File(['1234566'], 'test1.txt', { type: 'text/plain' })];
		files.values.set(newFiles);
		files.values.update(($files) => [
			...($files ?? []),
			new File(['7890123'], 'test2.txt', { type: 'text/plain' })
		]);
	}

	function changeFilesDirectly() {
		$form.images = [
			new File(['1234566'], 'test1.txt', { type: 'text/plain' }),
			new File(['7890123'], 'test2.txt', { type: 'text/plain' })
		];
	}

	function emptyFilesDirectly() {
		$form.images = [];
	}

	function emptyFilesWithProxy() {
		files.values.set([]);
	}

	function clearFilesDirectly() {
		// @ts-expect-error Not optional
		$form.images = undefined;
		// @ts-expect-error Not nullable
		$form.images = null;
	}

	function clearFilesWithProxy() {
		// @ts-expect-error Not optional
		files.values.set(undefined);
		// @ts-expect-error Not nullable
		files.values.set(null);
	}

	/////////////////////////////////////////////////////////////////////////////
</script>

<SuperDebug data={{ $form, $tainted, $errors }} />

{#if $message}<h4>{$message}</h4>{/if}

<div id="file">FILE:{$form.image ? $form.image.name : String($form.image)}</div>
<div id="files">
	FILES:{$form.images
		? $form.images.length
			? $form.images.map((f) => f.name)
			: 'empty'
		: String($form.images)}
</div>

<div>
	<button on:click={() => (show = !show)}>Toggle form</button>
</div>

{#if show}
	<form method="POST" enctype="multipart/form-data" use:enhance>
		<label>
			Upload files, max 10 Kb: <input
				multiple
				bind:files={$values}
				accept="image/png, image/jpeg"
				name="images"
				type="file"
			/>
			<ul class="invalid">
				{#each $valueErrors as error, i}
					{#if error}
						<li>Image {i + 1}: {error}</li>
					{/if}
				{/each}
			</ul>
		</label>
		<label>
			Upload one file, max 10 Kb: <input
				bind:files={$file}
				accept="image/png, image/jpeg"
				name="image"
				type="file"
			/>
			{#if $errors.image}
				<div class="invalid">{$errors.image}</div>
			{/if}
		</label>
		<div class="buttons">
			<div><button>Submit</button></div>
			<div class="button-group">
				<b>Single file</b>
				<div>
					<button type="button" on:click={changeFileDirectly}>Change file directly</button>
					<button type="button" on:click={changeFileWithProxy}>Change file with proxy</button>
				</div>
				<div>
					<button type="button" on:click={clearFileDirectly}>Clear file directly</button>
					<button type="button" on:click={clearFileWithProxy}>Clear file with proxy</button>
				</div>
			</div>
			<div class="button-group">
				<b>Multiple files</b>
				<div>
					<button type="button" on:click={changeFilesDirectly}>Change files directly</button>
					<button type="button" on:click={changeFilesWithProxy}>Change files with proxy</button>
				</div>
				<div>
					<button type="button" on:click={emptyFilesDirectly}>Empty files directly</button>
					<button type="button" on:click={emptyFilesWithProxy}>Empty files with proxy</button>
				</div>
				<div>
					<button type="button" on:click={clearFilesDirectly}>Clear files directly</button>
					<button type="button" on:click={clearFilesWithProxy}>Clear files with proxy</button>
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
