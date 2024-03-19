<script lang="ts">
	import { superForm, defaults, arrayProxy } from '$lib/client/index.js';
	import { zod as adapter } from '$lib/adapters/zod.js';

	import * as zod from 'zod';
	import SuperDebug from '$lib/client/SuperDebug.svelte';

	const schema = zod.object({
		people: zod
			.object({
				firstName: zod.string().min(1),
				lastName: zod.string().min(1)
			})
			.array()
	});

	const pageForm = superForm(defaults(adapter(schema)), {
		SPA: true,
		validators: adapter(schema),
		taintedMessage: null
	});

	const { form, enhance, errors, tainted } = pageForm;

	const { values } = arrayProxy(pageForm, 'people', { taint: false });

	function addPerson() {
		$values = [...$values, { firstName: '', lastName: '' }];
	}
</script>

<SuperDebug data={$tainted} />

<button on:click={addPerson}>Add Person</button>

<form method="POST" use:enhance>
	<!-- eslint-disable-next-line @typescript-eslint/no-unused-vars -->
	{#each $form.people as _, i}
		<div>
			<div>
				<label for="firstName">First Name</label>
				<input name="firstName" bind:value={$form.people[i].firstName} />
				{#if $errors.people?.[i]?.firstName}
					<p id="error-1">{$errors.people[i].firstName}</p>
				{/if}
			</div>

			<div>
				<label for="lastName">Last Name</label>
				<input name="lastName" bind:value={$form.people[i].lastName} />
				{#if $errors.people?.[i]?.lastName}
					<p id="error-2">{$errors.people[i].lastName}</p>
				{/if}
			</div>
		</div>
	{/each}

	<button type="submit">Submit</button>
</form>
