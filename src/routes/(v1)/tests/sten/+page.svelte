<script lang="ts">
	import { z } from 'zod';
	import { page } from '$app/stores';
	import { superForm } from '$lib/client/index.js';
	import { zod } from '$lib/adapters/zod.js';

	const postSchema = z.object({
		questions: z
			.object({
				text: z.string(),
				generated: z.boolean()
			})
			.array()
			.min(1, {
				message: 'Must have at least one question'
			})
	});

	// eslint-disable-next-line svelte/valid-compile
	const { form } = superForm<z.infer<typeof postSchema>>($page.data.form, {
		taintedMessage: 'Are you sure you want to leave?',
		validators: zod(postSchema),
		resetForm: true
		//dataType: 'json'
	});

	//let tooManyQuestions = false;
	let query = '';

	function addQuestion() {
		if (!query) {
			console.log('return');
			return;
		}
		if ($form.questions.length >= 10) {
			//tooManyQuestions = true;
			return;
		}
		$form.questions = [...$form.questions, { text: query, generated: false }];
		query = '';
		console.log('addQuestion', $form);
	}

	function removeQuestion(index: number) {
		$form.questions.splice(index, 1);
		$form.questions = $form.questions;
		if ($form.questions.length <= 10) {
			//tooManyQuestions = false;
		}
	}
</script>

<h1>Welcome to SvelteKit</h1>

<form method="POST" class="sm:p-4 md:p-8">
	<div class="mt-2 flex flex-row">
		<input
			bind:value={query}
			type="text"
			class="block w-full rounded-md border-0 bg-white/5 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6"
		/>
		<button type="button" on:click={addQuestion} class="m-2 h-7 w-7 cursor-pointer">Add</button>
		<!-- eslint-disable-next-line @typescript-eslint/no-unused-vars -->
		{#each $form.questions as _, index}
			<div class="col-span-full">
				<div class="my-2 flex flex-col">
					<label for="questions" class="font-dmsans text-sm text-white">Question {index}</label>
					<div class="mt-2 flex flex-row">
						<input
							type="text"
							id={`q_${index}`}
							bind:value={$form.questions[index].text}
							name="questions"
							class="block w-full rounded-md border-0 bg-white/5 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6"
						/>
						<button
							type="button"
							class="m-2 h-7 w-7 cursor-pointer text-red-600"
							on:click={() => removeQuestion(index)}>Remove</button
						>
					</div>
				</div>
			</div>
		{/each}
	</div>
	<button
		type="submit"
		class="rounded-md bg-indigo-500 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
		>Save</button
	>
</form>
