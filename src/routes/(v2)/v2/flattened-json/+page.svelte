<script lang="ts">
	import { superForm } from '$lib/index.js';
	import SuperDebug from '$lib/index.js';

	export let data;

	const { form, enhance, message, errors } = superForm(data.form, {
		dataType: 'json'
	});
</script>

<form method="POST" action="?/submit">
	{$message}
	{JSON.stringify($errors)}
	<main class="flex flex-col gap-y-8">
		<fieldset name="Author">
			<legend class="px-2">Author</legend>
			<label>
				First Name
				<input type="text" name="firstName" bind:value={$form.firstName} />
			</label>
			<label>
				Last Name
				<input type="text" name="lastName" bind:value={$form.lastName} />
			</label>
			<label>
				Birthday
				<input type="date" name="birthday" bind:value={$form.birthday} />
			</label>
			{#if $form.books}
				{#each $form.books as _, i}
					<fieldset name={$form.books[i].title}>
						<legend>{$form.books[i].title}</legend>
						<label>
							Title
							<input type="text" name={`books[${i}].title`} bind:value={$form.books[i].title} />
						</label>
						<label>
							Publishing Date
							<input
								type="date"
								name={`books[${i}].publishingDate`}
								bind:value={$form.books[i].publishingDate}
							/>
						</label>
						{#each $form.books[i]?.chapters ?? [] as chapter, j}
							<fieldset name={`Chapter ${j + 1}`}>
								<legend>Chapter {j + 1}</legend>
								{#if $form.books[i]?.chapters?.[j]}
									<label>
										Pages
										<input
											type="number"
											name={`books[${i}].chapters[${j}].pages`}
											bind:value={$form.books[i].chapters[j].pages}
										/>
									</label>

									<fieldset name={`Events`}>
										<legend>Events</legend>
										{#each $form.books[i]?.chapters?.[j].events ?? [] as _, k}
											{#if $form.books[i]?.chapters?.[j]?.events?.[k] !== undefined}
												<label
													>events <input
														type="text"
														name={`books[${i}].chapters[${j}].events`}
														bind:value={$form.books[i].chapters[j].events[k]}
													/></label
												>
											{/if}
										{/each}
									</fieldset>
									<button
										formaction="?/add-event"
										name={`books[${i}].chapters[${j}].addEvent`}
										value="true"
										on:click={() => {
											const chapter = $form.books?.[i]?.chapters?.[j];
											if (chapter) {
												chapter.addEvent = true;
											}
										}}>Add Event</button
									>
									<button
										formaction="?/partial-update"
										name={`books[${i}].chapters[${j}].events[${chapter.events?.length ?? 0}]`}
										value=""
										on:click={() => {
											const chapter = $form.books?.[i]?.chapters?.[j];
											if (chapter) {
												if (!chapter.events) {
													chapter.events = [];
												}
												chapter.events[chapter.events?.length ?? 0] = '';
											}
										}}>Add Event via name</button
									>
								{/if}
							</fieldset>
						{/each}
						<button
							formaction="?/add-chapter"
							name="bookIndex"
							value={$form.bookIndex}
							on:click={() => ($form.bookIndex = i)}>Add Chapter</button
						>
					</fieldset>
				{/each}
			{/if}
			<button formaction="?/add-book" type="submit">Add book</button>
		</fieldset>
	</main>
	<footer class="my-8">
		<button class="border rounded-md px-2 py-1 bg-green-300" type="submit">Save Data</button>
	</footer>
</form>

<SuperDebug data={form} />
