<script lang="ts">
	import { page } from '$app/stores';
	import { superForm } from '$lib/index.js';
	import SuperDebug from '$lib/index.js';
	import FileInput from './FileInput.svelte';
	import type { PageData } from './$types.js';
	import type { SubmitFunction } from '@sveltejs/kit';

	export let data: PageData;
	let progress = 0;

	function fileUploadWithProgressbar(input: Parameters<SubmitFunction>[0]) {
		return new Promise<XMLHttpRequest>((res) => {
			let xhr = new XMLHttpRequest();

			// listen for upload progress
			xhr.upload.onprogress = function (event) {
				progress = Math.round((100 * event.loaded) / event.total);
				console.log(`File is ${progress}% uploaded.`);
			};

			// handle error
			xhr.upload.onerror = function () {
				console.log(`Error during the upload: ${xhr.status}.`);
			};

			// upload completed successfully
			xhr.onload = function () {
				if (xhr.readyState === xhr.DONE) {
					console.log('Upload completed successfully.');
					progress = 0;
					res(xhr);
				}
			};

			xhr.open('POST', input.action, true);
			xhr.send(input.formData);

			return xhr;
		});
	}

	const { form, errors, message, enhance } = superForm(data.form, {
		taintedMessage: null,
		onSubmit({ customRequest }) {
			customRequest(fileUploadWithProgressbar);
		}
	});
	const acceptedExtensions = '.flac, .mp3';
</script>

<SuperDebug data={$form} />

<h3>Superforms testing ground - Zod</h3>

{#if $message}
	<!-- eslint-disable-next-line svelte/valid-compile -->
	<div class="status" class:error={$page.status >= 400} class:success={$page.status == 200}>
		{$message}
	</div>
{/if}

<form method="POST" enctype="multipart/form-data" use:enhance>
	<FileInput
		name="track"
		label="Track"
		accept={acceptedExtensions}
		bind:value={$form.track}
		errors={$errors.track}
	/>
	<br /><progress max="100" value={progress}>{progress}%</progress>

	<div><button>Submit</button></div>
</form>

<hr />
<p><a target="_blank" href="https://superforms.rocks/api">API Reference</a></p>

<style>
	.status {
		color: white;
		padding: 4px;
		padding-left: 8px;
		border-radius: 2px;
		font-weight: 500;
	}

	.status.success {
		background-color: seagreen;
	}

	.status.error {
		background-color: #ff2a02;
	}

	a {
		text-decoration: underline;
	}

	button {
		margin-top: 1rem;
	}

	hr {
		margin-top: 4rem;
	}

	form {
		padding-top: 1rem;
		padding-bottom: 1rem;
	}
</style>
