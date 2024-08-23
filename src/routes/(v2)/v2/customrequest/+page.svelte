<script lang="ts">
	import { page } from '$app/stores';
	import { zod } from '$lib/adapters/index.js';
	import { superForm, superValidate, message as formMessage } from '$lib/index.js';
	import SuperDebug from '$lib/index.js';
	import type { PageData } from './$types.js';
	import { type ActionResult, type SubmitFunction } from '@sveltejs/kit';
	import { schema } from './schema.js';

	export let data: PageData;

	async function sleep(ms: number) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	async function post(message: string) {
		// calling an external API that does not return an action result response.
		const number = Math.floor(Math.random() * 100);
		if (number < 50) throw new Error('Random error');

		if (number > 50 && number < 80) return { code: 'message-might-be-jackpot', message } as const;
		return { code: 'message-posted', message } as const;
	}

	function success<T>(data: T) {
		return {
			type: 'success',
			status: 200,
			data
		} as ActionResult;
	}

	function error<T>(status: number, data: T): ActionResult {
		return {
			type: 'error',
			status,
			error: data
		};
	}

	async function submitMessage(input: Parameters<SubmitFunction>[0]) {
		await sleep(1000);

		const formData = input.formData;
		console.log('posting form', formData);

		const form = await superValidate(formData, zod(schema));
		console.log('validated form', form);

		if (!form.valid) return error(400, { form });
		
		try {
			const result = await post(form.message)
			
			if (result.code === 'message-might-be-jackpot') {
				return success(formMessage(form, 'You might be a jackpot!'));
			} else {
				return success(formMessage(form, `Message posted: ${result.message}`));
			}

		} catch (e) {
			return error(400, { form });
		}
	}

	const { form, errors, message, enhance } = superForm(data.form, {
		taintedMessage: null,
		onSubmit({ customRequest }) {
			customRequest(submitMessage);
		}
	});
</script>

<SuperDebug data={$form} />

<h3>Superforms testing ground - Zod</h3>

{#if $message}
	<!-- eslint-disable-next-line svelte/valid-compile -->
	<div class="status" class:error={$page.status >= 400} class:success={$page.status == 200}>
		{$message}
	</div>
{/if}

<form method="POST" use:enhance>
	<textarea name="message" bind:value={$form.message}></textarea>

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
